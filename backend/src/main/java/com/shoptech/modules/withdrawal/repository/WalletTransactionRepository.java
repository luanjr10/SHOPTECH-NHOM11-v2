package com.shoptech.modules.withdrawal.repository;

import com.shoptech.modules.withdrawal.entity.WalletTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {

    Page<WalletTransaction> findBySellerWalletId(Long sellerWalletId, Pageable pageable);
}
