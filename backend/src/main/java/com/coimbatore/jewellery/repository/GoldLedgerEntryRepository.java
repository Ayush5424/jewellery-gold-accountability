package com.coimbatore.jewellery.repository;

import com.coimbatore.jewellery.domain.entity.GoldLedgerEntry;
import com.coimbatore.jewellery.domain.enums.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface GoldLedgerEntryRepository extends JpaRepository<GoldLedgerEntry, Long> {
    Optional<GoldLedgerEntry> findByVoucherNumber(String voucherNumber);
    Optional<GoldLedgerEntry> findByIdempotencyKey(String idempotencyKey);

    List<GoldLedgerEntry> findByJobOrderIdOrderByCreatedAtAsc(Long jobOrderId);
    List<GoldLedgerEntry> findByKarigarIdOrderByCreatedAtDesc(Long karigarId);
    List<GoldLedgerEntry> findTop50ByOrderByCreatedAtDesc();

    @Query("SELECT SUM(e.fineWeight) FROM GoldLedgerEntry e WHERE e.jobOrder.id = :jobId AND e.transactionType = :type")
    BigDecimal sumFineWeightByJobAndType(@Param("jobId") Long jobId, @Param("type") TransactionType type);

    @Query("SELECT SUM(e.fineWeight) FROM GoldLedgerEntry e WHERE e.karigar.id = :karigarId AND e.transactionType = :type")
    BigDecimal sumFineWeightByKarigarAndType(@Param("karigarId") Long karigarId, @Param("type") TransactionType type);

    @Query("SELECT SUM(e.fineWeight) FROM GoldLedgerEntry e WHERE e.transactionType = :type")
    BigDecimal sumFineWeightByType(@Param("type") TransactionType type);

    @Query("SELECT SUM(e.fineWeight) FROM GoldLedgerEntry e WHERE e.transactionType = :type AND e.createdAt < :cutoff")
    BigDecimal sumFineWeightByTypeBefore(@Param("type") TransactionType type, @Param("cutoff") Instant cutoff);

    @Query("SELECT SUM(e.fineWeight) FROM GoldLedgerEntry e WHERE e.transactionType = :type AND e.createdAt BETWEEN :start AND :end")
    BigDecimal sumFineWeightByTypeBetween(@Param("type") TransactionType type, @Param("start") Instant start, @Param("end") Instant end);
}
