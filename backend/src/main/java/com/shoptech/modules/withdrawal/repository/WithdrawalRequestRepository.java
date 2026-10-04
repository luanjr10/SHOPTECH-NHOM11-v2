package com.shoptech.modules.withdrawal.repository;

import com.shoptech.modules.withdrawal.entity.WithdrawalRequest;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Optional;

public interface WithdrawalRequestRepository extends JpaRepository<WithdrawalRequest, Long> {

    @Query("select w from WithdrawalRequest w where :status is null or w.status = :status")
    Page<WithdrawalRequest> search(@Param("status") String status, Pageable pageable);

    /** Khoá dòng khi duyệt/từ chối để hai admin không xử lý trùng một yêu cầu. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from WithdrawalRequest w where w.id = :id")
    Optional<WithdrawalRequest> findByIdForUpdate(@Param("id") Long id);

    Optional<WithdrawalRequest> findFirstByPayoutReference(String payoutReference);

    Page<WithdrawalRequest> findBySellerProfileId(Long sellerProfileId, Pageable pageable);

    @Query("select coalesce(sum(w.amount), 0) from WithdrawalRequest w where w.status = 'approved'")
    BigDecimal sumApproved();
}
