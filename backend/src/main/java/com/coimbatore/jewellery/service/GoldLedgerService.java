package com.coimbatore.jewellery.service;

import com.coimbatore.jewellery.common.exception.BusinessValidationException;
import com.coimbatore.jewellery.common.exception.EntityNotFoundException;
import com.coimbatore.jewellery.common.exception.IllegalStateTransitionException;
import com.coimbatore.jewellery.domain.accounting.GoldAccountingCalculator;
import com.coimbatore.jewellery.domain.entity.GoldLedgerEntry;
import com.coimbatore.jewellery.domain.entity.JobOrder;
import com.coimbatore.jewellery.domain.entity.Karigar;
import com.coimbatore.jewellery.domain.enums.JobStatus;
import com.coimbatore.jewellery.domain.enums.TransactionType;
import com.coimbatore.jewellery.repository.GoldLedgerEntryRepository;
import com.coimbatore.jewellery.repository.JobOrderRepository;
import com.coimbatore.jewellery.repository.KarigarRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class GoldLedgerService {

    private final GoldLedgerEntryRepository ledgerRepository;
    private final JobOrderRepository jobRepository;
    private final KarigarRepository karigarRepository;
    private final VoucherGeneratorService voucherGenerator;

    public GoldLedgerService(GoldLedgerEntryRepository ledgerRepository,
                             JobOrderRepository jobRepository,
                             KarigarRepository karigarRepository,
                             VoucherGeneratorService voucherGenerator) {
        this.ledgerRepository = ledgerRepository;
        this.jobRepository = jobRepository;
        this.karigarRepository = karigarRepository;
        this.voucherGenerator = voucherGenerator;
    }

    /**
     * Issues gold to a karigar against a job.
     * Transitions job from OPEN -> IN_PROGRESS.
     */
    public GoldLedgerEntry recordGoldIssue(Long jobId,
                                          BigDecimal grossWeight,
                                          BigDecimal purity,
                                          String remarks,
                                          boolean aiExtracted,
                                          String idempotencyKey,
                                          String createdBy) {
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<GoldLedgerEntry> existing = ledgerRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                return existing.get();
            }
        }

        JobOrder job = jobRepository.findById(jobId)
                .orElseThrow(() -> new EntityNotFoundException("Job not found: " + jobId));

        if (job.getStatus() == JobStatus.RECONCILED) {
            throw new IllegalStateTransitionException("Cannot issue gold to an already RECONCILED job " + job.getJobCode());
        }

        BigDecimal fineWeight = GoldAccountingCalculator.calculateFineWeight(grossWeight, purity);

        GoldLedgerEntry entry = new GoldLedgerEntry();
        entry.setVoucherNumber(voucherGenerator.generateVoucherNumber());
        entry.setTransactionType(TransactionType.ISSUE);
        entry.setJobOrder(job);
        entry.setKarigar(job.getKarigar());
        entry.setGrossWeight(grossWeight.setScale(GoldAccountingCalculator.WEIGHT_SCALE, GoldAccountingCalculator.ROUNDING_MODE));
        entry.setPurity(purity.setScale(GoldAccountingCalculator.PURITY_SCALE, GoldAccountingCalculator.ROUNDING_MODE));
        entry.setFineWeight(fineWeight);
        entry.setItemDescription(job.getItemCategory().name() + " - Initial Fine Gold Issue");
        entry.setRemarks(remarks);
        entry.setAiExtracted(aiExtracted);
        entry.setIdempotencyKey(idempotencyKey);
        entry.setCreatedBy(createdBy != null ? createdBy : "SYSTEM");
        entry.setCreatedAt(Instant.now());

        GoldLedgerEntry saved = ledgerRepository.save(entry);

        // Update Job summary derived transactionally from ledger
        recomputeAndSyncJobBalances(job);
        if (job.getStatus() == JobStatus.OPEN) {
            job.setStatus(JobStatus.IN_PROGRESS);
        }
        jobRepository.save(job);

        return saved;
    }

    /**
     * Records gold received from karigar (finished jewellery, scrap, or filings).
     */
    public GoldLedgerEntry recordGoldReceipt(Long jobId,
                                            TransactionType type,
                                            BigDecimal grossWeight,
                                            BigDecimal purity,
                                            String huid,
                                            String itemDescription,
                                            String remarks,
                                            boolean aiExtracted,
                                            String idempotencyKey,
                                            String createdBy) {
        if (type == TransactionType.ISSUE || type == TransactionType.ADJUSTMENT_REVERSAL) {
            throw new BusinessValidationException("Invalid receipt transaction type: " + type);
        }

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<GoldLedgerEntry> existing = ledgerRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                return existing.get();
            }
        }

        JobOrder job = jobRepository.findById(jobId)
                .orElseThrow(() -> new EntityNotFoundException("Job not found: " + jobId));

        if (job.getStatus() == JobStatus.RECONCILED) {
            throw new IllegalStateTransitionException("Cannot record receipt on an already RECONCILED job " + job.getJobCode());
        }

        BigDecimal fineWeight = GoldAccountingCalculator.calculateFineWeight(grossWeight, purity);

        GoldLedgerEntry entry = new GoldLedgerEntry();
        entry.setVoucherNumber(voucherGenerator.generateVoucherNumber());
        entry.setTransactionType(type);
        entry.setJobOrder(job);
        entry.setKarigar(job.getKarigar());
        entry.setGrossWeight(grossWeight.setScale(GoldAccountingCalculator.WEIGHT_SCALE, GoldAccountingCalculator.ROUNDING_MODE));
        entry.setPurity(purity.setScale(GoldAccountingCalculator.PURITY_SCALE, GoldAccountingCalculator.ROUNDING_MODE));
        entry.setFineWeight(fineWeight);
        entry.setHuid(huid);
        entry.setItemDescription(itemDescription);
        entry.setRemarks(remarks);
        entry.setAiExtracted(aiExtracted);
        entry.setIdempotencyKey(idempotencyKey);
        entry.setCreatedBy(createdBy != null ? createdBy : "SYSTEM");
        entry.setCreatedAt(Instant.now());

        GoldLedgerEntry saved = ledgerRepository.save(entry);

        // Update Job summary derived transactionally from ledger
        recomputeAndSyncJobBalances(job);
        jobRepository.save(job);

        return saved;
    }

    /**
     * Controlled reversal mechanism: creates an ADJUSTMENT_REVERSAL referencing the original voucher.
     * Original ledger entries are NEVER deleted or overwritten.
     */
    public GoldLedgerEntry createReversalEntry(String originalVoucherNumber, String reason, String createdBy) {
        GoldLedgerEntry original = ledgerRepository.findByVoucherNumber(originalVoucherNumber)
                .orElseThrow(() -> new EntityNotFoundException("Voucher not found: " + originalVoucherNumber));

        if (original.isReversal()) {
            throw new BusinessValidationException("Cannot reverse a reversal voucher: " + originalVoucherNumber);
        }

        GoldLedgerEntry reversal = new GoldLedgerEntry();
        reversal.setVoucherNumber(voucherGenerator.generateVoucherNumber());
        reversal.setTransactionType(TransactionType.ADJUSTMENT_REVERSAL);
        reversal.setJobOrder(original.getJobOrder());
        reversal.setKarigar(original.getKarigar());
        reversal.setGrossWeight(original.getGrossWeight().negate());
        reversal.setPurity(original.getPurity());
        reversal.setFineWeight(original.getFineWeight().negate());
        reversal.setItemDescription("REVERSAL of " + original.getVoucherNumber());
        reversal.setRemarks("Reason: " + reason);
        reversal.setReversal(true);
        reversal.setReversalOfVoucher(original.getVoucherNumber());
        reversal.setCreatedBy(createdBy != null ? createdBy : "SUPERVISOR");
        reversal.setCreatedAt(Instant.now());

        GoldLedgerEntry saved = ledgerRepository.save(reversal);

        if (original.getJobOrder() != null) {
            recomputeAndSyncJobBalances(original.getJobOrder());
            jobRepository.save(original.getJobOrder());
        }

        return saved;
    }

    /**
     * Recalculates JobOrder balances strictly from ledger entries.
     */
    public void recomputeAndSyncJobBalances(JobOrder job) {
        List<GoldLedgerEntry> entries = ledgerRepository.findByJobOrderIdOrderByCreatedAtAsc(job.getId());

        BigDecimal issuedFine = BigDecimal.ZERO;
        BigDecimal recoveredFine = BigDecimal.ZERO;

        for (GoldLedgerEntry entry : entries) {
            switch (entry.getTransactionType()) {
                case ISSUE -> issuedFine = issuedFine.add(entry.getFineWeight());
                case RECEIPT_JEWELLERY, RECEIPT_SCRAP, RECEIPT_FILINGS -> recoveredFine = recoveredFine.add(entry.getFineWeight());
                case ADJUSTMENT_REVERSAL -> {
                    // If reversing an issue, reduce issued; if reversing a receipt, reduce recovered
                    if (entry.getFineWeight().compareTo(BigDecimal.ZERO) < 0) {
                        // Negated fine weight was stored
                        issuedFine = issuedFine.add(entry.getFineWeight());
                    }
                }
            }
        }

        job.setIssuedFineWeight(issuedFine.setScale(3, GoldAccountingCalculator.ROUNDING_MODE));
        job.setRecoveredFineWeight(recoveredFine.setScale(3, GoldAccountingCalculator.ROUNDING_MODE));
        job.setOutstandingFineWeight(issuedFine.subtract(recoveredFine).setScale(3, GoldAccountingCalculator.ROUNDING_MODE));
    }
}
