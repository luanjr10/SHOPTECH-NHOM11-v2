package com.shoptech.modules.withdrawal.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.modules.seller.entity.SellerWallet;
import com.shoptech.modules.seller.repository.SellerWalletRepository;
import com.shoptech.modules.withdrawal.entity.WalletTransaction;
import com.shoptech.modules.withdrawal.repository.WalletTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Cập nhật số dư ví người bán cho luồng rút tiền, mỗi thay đổi đều ghi nhật ký wallet_transactions.
 * Khi seller tạo yêu cầu rút, tiền đã được trừ khỏi "có thể rút"; duyệt → trừ tổng số dư,
 * từ chối → hoàn lại vào "có thể rút".
 */
@Service
@RequiredArgsConstructor
public class WalletService {

    private static final String WITHDRAWAL = "withdrawal_request";
    private static final String SELLER_ORDER = "seller_order";

    private final SellerWalletRepository walletRepository;
    private final WalletTransactionRepository transactionRepository;

    /** Ví của người bán (tạo ví rỗng nếu chưa có — firstOrCreate). */
    @Transactional
    public SellerWallet getOrCreate(Long sellerProfileId) {
        return walletRepository.findBySellerProfileId(sellerProfileId).orElseGet(() -> {
            SellerWallet wallet = new SellerWallet();
            wallet.setSellerProfileId(sellerProfileId);
            return walletRepository.saveAndFlush(wallet);
        });
    }

    /**
     * Seller tạo yêu cầu rút: khoá ví, kiểm tra đủ "có thể rút" rồi giữ chỗ số tiền đó.
     * Ném 422 khi vượt số dư — gọi trong cùng transaction với việc lưu yêu cầu rút.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void reserveForWithdrawal(Long sellerProfileId, BigDecimal amount, Long withdrawalId) {
        SellerWallet wallet = walletRepository.findBySellerProfileIdForUpdate(sellerProfileId)
                .orElseThrow(() -> ApiException.unprocessable("Số tiền rút vượt quá số dư có thể rút"));
        if (amount.compareTo(wallet.getWithdrawableBalance()) > 0) {
            throw ApiException.unprocessable("Số tiền rút vượt quá số dư có thể rút");
        }
        wallet.setWithdrawableBalance(wallet.getWithdrawableBalance().subtract(amount).max(BigDecimal.ZERO));
        touch(wallet);
        log(wallet, "hold", amount, WITHDRAWAL, withdrawalId, "Giữ chỗ yêu cầu rút tiền");
    }

    /** Rút tiền được duyệt: trừ tổng số dư. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void payout(Long sellerProfileId, BigDecimal amount, Long withdrawalId) {
        walletRepository.findBySellerProfileIdForUpdate(sellerProfileId).ifPresent(wallet -> {
            wallet.setBalance(wallet.getBalance().subtract(amount).max(BigDecimal.ZERO));
            touch(wallet);
            log(wallet, "debit", amount, WITHDRAWAL, withdrawalId, "Rút tiền được duyệt");
        });
    }

    /** Từ chối rút: hoàn tiền về số dư có thể rút. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void refundWithdrawal(Long sellerProfileId, BigDecimal amount, Long withdrawalId) {
        walletRepository.findBySellerProfileIdForUpdate(sellerProfileId).ifPresent(wallet -> {
            wallet.setWithdrawableBalance(wallet.getWithdrawableBalance().add(amount));
            touch(wallet);
            log(wallet, "refund", amount, WITHDRAWAL, withdrawalId, "Từ chối rút, hoàn tiền vào ví");
        });
    }

    /** Bàn giao vận chuyển: giữ phần thực nhận của đơn (tăng tổng số dư + đang giữ). */
    @Transactional(propagation = Propagation.MANDATORY)
    public void holdForOrder(Long sellerProfileId, BigDecimal amount, Long sellerOrderId) {
        walletRepository.findBySellerProfileIdForUpdate(sellerProfileId).ifPresent(wallet -> {
            wallet.setPendingBalance(wallet.getPendingBalance().add(amount));
            wallet.setBalance(wallet.getBalance().add(amount));
            touch(wallet);
            log(wallet, "hold", amount, SELLER_ORDER, sellerOrderId, "Giữ tiền đơn hàng");
        });
    }

    /** Khách xác nhận đã nhận hàng: chuyển phần thực nhận từ "đang giữ" sang "có thể rút". */
    @Transactional(propagation = Propagation.MANDATORY)
    public void releaseForOrder(Long sellerProfileId, BigDecimal amount, Long sellerOrderId) {
        walletRepository.findBySellerProfileIdForUpdate(sellerProfileId).ifPresent(wallet -> {
            wallet.setPendingBalance(wallet.getPendingBalance().subtract(amount).max(BigDecimal.ZERO));
            wallet.setWithdrawableBalance(wallet.getWithdrawableBalance().add(amount));
            touch(wallet);
            log(wallet, "release", amount, SELLER_ORDER, sellerOrderId, "Đơn hoàn thành, tiền có thể rút");
        });
    }

    /** Huỷ đơn đang giao: bỏ phần tiền đã giữ ở holdForOrder. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void reverseOrderHold(Long sellerProfileId, BigDecimal amount, Long sellerOrderId) {
        walletRepository.findBySellerProfileIdForUpdate(sellerProfileId).ifPresent(wallet -> {
            wallet.setPendingBalance(wallet.getPendingBalance().subtract(amount).max(BigDecimal.ZERO));
            wallet.setBalance(wallet.getBalance().subtract(amount).max(BigDecimal.ZERO));
            touch(wallet);
            log(wallet, "refund", amount, SELLER_ORDER, sellerOrderId, "Hủy đơn, hoàn phần giữ chỗ");
        });
    }

    private void touch(SellerWallet wallet) {
        wallet.setUpdatedAt(Instant.now());
        walletRepository.save(wallet);
    }

    private void log(SellerWallet wallet, String type, BigDecimal amount, String referenceType, Long referenceId,
                     String description) {
        WalletTransaction tx = new WalletTransaction();
        tx.setSellerWalletId(wallet.getId());
        tx.setType(type);
        tx.setAmount(amount);
        tx.setBalanceAfter(wallet.getBalance());
        tx.setReferenceType(referenceType);
        tx.setReferenceId(referenceId);
        tx.setDescription(description);
        transactionRepository.save(tx);
    }
}
