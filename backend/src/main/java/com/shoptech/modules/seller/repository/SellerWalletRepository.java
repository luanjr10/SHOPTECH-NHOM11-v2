package com.shoptech.modules.seller.repository;

import com.shoptech.modules.seller.entity.SellerWallet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Optional;

public interface SellerWalletRepository extends JpaRepository<SellerWallet, Long> {

    boolean existsBySellerProfileId(Long sellerProfileId);

    Optional<SellerWallet> findBySellerProfileId(Long sellerProfileId);

    /** Khoá ví khi cộng/trừ số dư để tránh ghi đè lẫn nhau. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from SellerWallet w where w.sellerProfileId = :profileId")
    Optional<SellerWallet> findBySellerProfileIdForUpdate(@Param("profileId") Long profileId);

    @Query("select coalesce(sum(w.pendingBalance), 0) from SellerWallet w")
    BigDecimal sumPending();

    @Query("select coalesce(sum(w.withdrawableBalance), 0) from SellerWallet w")
    BigDecimal sumWithdrawable();
}
