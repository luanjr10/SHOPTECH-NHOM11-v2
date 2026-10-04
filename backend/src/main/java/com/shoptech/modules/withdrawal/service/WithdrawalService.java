package com.shoptech.modules.withdrawal.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.response.PagedResult;
import com.shoptech.common.response.Pagination;
import com.shoptech.config.AppProperties;
import com.shoptech.modules.payment.gateway.MomoGateway;
import com.shoptech.modules.payment.gateway.OnePayGateway;
import com.shoptech.modules.payment.gateway.PaymentGatewayException;
import com.shoptech.modules.payment.gateway.SePayGateway;
import com.shoptech.modules.payment.gateway.VnpayGateway;
import com.shoptech.modules.seller.entity.SellerProfile;
import com.shoptech.modules.seller.repository.SellerProfileRepository;
import com.shoptech.modules.user.dto.UserSummary;
import com.shoptech.modules.user.entity.User;
import com.shoptech.modules.user.repository.UserRepository;
import com.shoptech.modules.withdrawal.dto.WithdrawalResponse;
import com.shoptech.modules.withdrawal.entity.WithdrawalRequest;
import com.shoptech.modules.withdrawal.repository.WithdrawalRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.RoundingMode;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WithdrawalService {

    private static final int PER_PAGE = 15;

    private final WithdrawalRequestRepository withdrawalRepository;
    private final SellerProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final WalletService walletService;
    private final MomoGateway momoGateway;
    private final VnpayGateway vnpayGateway;
    private final OnePayGateway onePayGateway;
    private final SePayGateway sePayGateway;
    private final AppProperties props;

    @Transactional(readOnly = true)
    public PagedResult<WithdrawalResponse> list(String status, Integer page, Integer perPage) {
        Page<WithdrawalRequest> result = withdrawalRepository.search(status == null || status.isBlank() ? null : status,
                Pagination.of(page, perPage, PER_PAGE, Sort.by("createdAt").descending()));
        return PagedResult.of(new PageImpl<>(view(result.getContent()), result.getPageable(), result.getTotalElements()));
    }

    /** Duyệt yêu cầu chuyển khoản ngân hàng (admin đã tự chuyển tiền cho người bán). */
    @Transactional
    public WithdrawalResponse approve(Long id, Long reviewerId) {
        WithdrawalRequest w = lockPending(id);
        if (!WithdrawalRequest.METHOD_BANK.equals(w.getMethod())) {
            throw ApiException.unprocessable("Phương thức '" + w.getMethod()
                    + "' phải duyệt qua cổng thanh toán sandbox, không dùng nút Duyệt trực tiếp.");
        }
        markPaid(w, reviewerId);
        return view(List.of(w)).get(0);
    }

    @Transactional
    public WithdrawalResponse reject(Long id, String note, Long reviewerId) {
        if (note != null && note.trim().length() > 255) {
            throw ApiException.unprocessable("Lý do từ chối không được vượt quá 255 ký tự");
        }
        WithdrawalRequest w = lockPending(id);
        w.setStatus(WithdrawalRequest.REJECTED);
        if (note != null && !note.isBlank()) {
            w.setNote(note.trim());
        }
        w.setReviewedBy(reviewerId);
        w.setReviewedAt(Instant.now());
        walletService.refundWithdrawal(w.getSellerProfileId(), w.getAmount(), w.getId());
        withdrawalRepository.saveAndFlush(w);
        return view(List.of(w)).get(0);
    }

    /** Tạo link giải ngân qua cổng thanh toán (MoMo / VNPay / OnePay / SePay). */
    @Transactional
    public String createPaymentUrl(Long id, Long reviewerId, String clientIp) {
        WithdrawalRequest w = lockPending(id);
        if (WithdrawalRequest.METHOD_BANK.equals(w.getMethod())) {
            throw ApiException.unprocessable("Chuyển khoản ngân hàng không qua cổng thanh toán — dùng nút \"Duyệt\" trực tiếp.");
        }
        w.setReviewedBy(reviewerId);
        long amount = w.getAmount().setScale(0, RoundingMode.HALF_UP).longValueExact();
        String info = "Giai ngan rut tien ShopTech #" + w.getId();
        long now = Instant.now().getEpochSecond();
        try {
            String url = switch (w.getMethod()) {
                case "momo" -> {
                    String ref = momoGateway.partnerCode() + "-WD" + w.getId() + "-" + now;
                    String payUrl = momoGateway.createPaymentUrl(ref, amount, info,
                            props.backendUrl("/api/payments/momo/withdrawal-return"));
                    w.setPayoutReference(ref);
                    yield payUrl;
                }
                case "vnpay" -> {
                    String ref = "WD" + w.getId() + "-" + now;
                    w.setPayoutReference(ref);
                    yield vnpayGateway.createPaymentUrl(ref, amount, info,
                            props.backendUrl("/api/payments/vnpay/withdrawal-return"), clientIp);
                }
                case "onepay" -> {
                    String ref = "WD" + w.getId() + "-" + now;
                    w.setPayoutReference(ref);
                    yield onePayGateway.createPaymentUrl(ref, amount, info,
                            props.backendUrl("/api/payments/onepay/withdrawal-return"), clientIp);
                }
                case "sepay" -> props.backendUrl("/api/admin/withdrawals/" + w.getId() + "/sepay-redirect");
                default -> throw ApiException.unprocessable("Phương thức '" + w.getMethod() + "' không được hỗ trợ.");
            };
            withdrawalRepository.save(w);
            return url;
        } catch (PaymentGatewayException e) {
            log.warn("Tạo link giải ngân thất bại cho yêu cầu #{}: {}", w.getId(), e.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, e.getMessage());
        }
    }

    /** Dựng form tự gửi sang SePay; mã tham chiếu mới được ghi lại để đối chiếu khi SePay trả về. */
    @Transactional
    public SePayGateway.CheckoutForm sepayCheckout(Long id) {
        WithdrawalRequest w = withdrawalRepository.findByIdForUpdate(id)
                .filter(x -> "sepay".equals(x.getMethod()) && WithdrawalRequest.PENDING.equals(x.getStatus()))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy yêu cầu rút tiền"));
        String ref = "WD" + w.getId() + "-" + Instant.now().getEpochSecond();
        String back = props.backendUrl("/api/payments/sepay/withdrawal-return/" + w.getId() + "?status=");
        var form = sePayGateway.checkoutForm(ref, w.getAmount().setScale(0, RoundingMode.HALF_UP).longValueExact(),
                "Giai ngan rut tien ShopTech #" + w.getId(), back + "success", back + "error", back + "cancel");
        w.setPayoutReference(ref);
        withdrawalRepository.save(w);
        return form;
    }

    /**
     * Cổng đã xác nhận thanh toán (chữ ký hợp lệ) → hoàn tất yêu cầu. Gọi lại nhiều lần vẫn an toàn:
     * yêu cầu không còn "pending" thì bỏ qua.
     */
    @Transactional
    public Long finalizeByReference(String reference) {
        if (reference == null) {
            return null;
        }
        return withdrawalRepository.findFirstByPayoutReference(reference)
                .map(w -> finalizePayout(w.getId()))
                .orElse(null);
    }

    @Transactional
    public Long finalizePayout(Long id) {
        WithdrawalRequest w = withdrawalRepository.findByIdForUpdate(id).orElse(null);
        if (w == null) {
            return null;
        }
        if (WithdrawalRequest.PENDING.equals(w.getStatus())) {
            markPaid(w, w.getReviewedBy());
        }
        return w.getId();
    }

    /** SePay trả về không có chữ ký, nên chỉ chấp nhận khi đúng phương thức và đã khởi tạo thanh toán. */
    @Transactional(readOnly = true)
    public boolean isSepayPayoutInProgress(Long id) {
        return withdrawalRepository.findById(id)
                .filter(w -> "sepay".equals(w.getMethod()) && w.getPayoutReference() != null)
                .isPresent();
    }

    public String adminRedirect(Long withdrawalId, boolean success) {
        String url = props.adminUrl().replaceAll("/+$", "") + "/withdrawals?payout=" + (success ? "success" : "failed");
        return withdrawalId == null ? url : url + "&id=" + withdrawalId;
    }

    // ------------------------------------------------------------------

    private void markPaid(WithdrawalRequest w, Long reviewerId) {
        Instant now = Instant.now();
        w.setStatus(WithdrawalRequest.APPROVED);
        w.setPaidAt(now);
        w.setReviewedBy(reviewerId);
        w.setReviewedAt(now);
        walletService.payout(w.getSellerProfileId(), w.getAmount(), w.getId());
        withdrawalRepository.saveAndFlush(w);
    }

    private WithdrawalRequest lockPending(Long id) {
        WithdrawalRequest w = withdrawalRepository.findByIdForUpdate(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy yêu cầu rút tiền"));
        if (!WithdrawalRequest.PENDING.equals(w.getStatus())) {
            throw ApiException.unprocessable("Yêu cầu này đã được xử lý");
        }
        return w;
    }

    private List<WithdrawalResponse> view(List<WithdrawalRequest> list) {
        Map<Long, SellerProfile> profiles = profileRepository.findAllById(list.stream()
                        .map(WithdrawalRequest::getSellerProfileId).filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(SellerProfile::getId, p -> p));
        Set<Long> userIds = new HashSet<>();
        profiles.values().forEach(p -> userIds.add(p.getUserId()));
        list.forEach(w -> {
            if (w.getReviewedBy() != null) {
                userIds.add(w.getReviewedBy());
            }
        });
        Map<Long, User> users = userRepository.findAllById(userIds).stream().collect(Collectors.toMap(User::getId, u -> u));

        return list.stream().map(w -> {
            SellerProfile p = profiles.get(w.getSellerProfileId());
            User reviewer = w.getReviewedBy() == null ? null : users.get(w.getReviewedBy());
            return new WithdrawalResponse(w,
                    p == null ? null : new WithdrawalResponse.Seller(p, UserSummary.of(users.get(p.getUserId()), props)),
                    reviewer == null ? null : new WithdrawalResponse.Reviewer(reviewer.getId(), reviewer.getName()));
        }).toList();
    }
}
