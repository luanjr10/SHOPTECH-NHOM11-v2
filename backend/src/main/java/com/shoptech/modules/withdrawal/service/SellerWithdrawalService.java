package com.shoptech.modules.withdrawal.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.response.PagedResult;
import com.shoptech.common.response.Pagination;
import com.shoptech.modules.seller.entity.SellerProfile;
import com.shoptech.modules.seller.entity.SellerWallet;
import com.shoptech.modules.withdrawal.dto.CreateWithdrawalRequest;
import com.shoptech.modules.withdrawal.entity.WalletTransaction;
import com.shoptech.modules.withdrawal.entity.WithdrawalRequest;
import com.shoptech.modules.withdrawal.repository.WalletTransactionRepository;
import com.shoptech.modules.withdrawal.repository.WithdrawalRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/** Seller Center — ví của tôi và yêu cầu rút tiền (admin duyệt ở WithdrawalService). */
@Service
@RequiredArgsConstructor
public class SellerWithdrawalService {

    private static final int TRANSACTIONS_PER_PAGE = 20;
    private static final int WITHDRAWALS_PER_PAGE = 15;
    private static final Sort NEWEST = Sort.by("createdAt").descending().and(Sort.by("id").descending());

    private final WalletService walletService;
    private final WalletTransactionRepository transactionRepository;
    private final WithdrawalRequestRepository withdrawalRepository;
    private final RequestValidator requestValidator;

    @Transactional
    public SellerWallet wallet(SellerProfile profile) {
        return walletService.getOrCreate(profile.getId());
    }

    @Transactional
    public PagedResult<WalletTransaction> transactions(SellerProfile profile, Integer page, Integer perPage) {
        SellerWallet wallet = walletService.getOrCreate(profile.getId());
        return PagedResult.of(transactionRepository.findBySellerWalletId(wallet.getId(),
                Pagination.of(page, perPage, TRANSACTIONS_PER_PAGE, NEWEST)));
    }

    @Transactional(readOnly = true)
    public PagedResult<WithdrawalRequest> list(SellerProfile profile, Integer page, Integer perPage) {
        return PagedResult.of(withdrawalRepository.findBySellerProfileId(profile.getId(),
                Pagination.of(page, perPage, WITHDRAWALS_PER_PAGE, NEWEST)));
    }

    @Transactional
    public WithdrawalRequest create(SellerProfile profile, CreateWithdrawalRequest request) {
        requestValidator.validate(request).throwIfFailed();

        SellerWallet wallet = walletService.getOrCreate(profile.getId());
        if (request.amount().compareTo(wallet.getWithdrawableBalance()) > 0) {
            throw ApiException.unprocessable("Số tiền rút vượt quá số dư có thể rút");
        }

        WithdrawalRequest w = new WithdrawalRequest();
        w.setSellerProfileId(profile.getId());
        w.setAmount(request.amount());
        w.setMethod(request.method());
        w.setStatus(WithdrawalRequest.PENDING);
        w.setBankAccount(request.bankAccount().trim());
        w.setBankName(request.bankName().trim());
        w.setNote(request.note() == null || request.note().isBlank() ? null : request.note().trim());
        w.setCreatedAt(Instant.now());
        w.setUpdatedAt(w.getCreatedAt());
        withdrawalRepository.saveAndFlush(w);

        // Khoá ví + kiểm tra lại số dư (tránh hai yêu cầu đồng thời cùng vượt số dư); lỗi → rollback cả yêu cầu.
        walletService.reserveForWithdrawal(profile.getId(), request.amount(), w.getId());
        return w;
    }
}
