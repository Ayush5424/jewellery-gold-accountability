package com.coimbatore.jewellery;

import com.coimbatore.jewellery.common.exception.IllegalStateTransitionException;
import com.coimbatore.jewellery.domain.entity.GoldLedgerEntry;
import com.coimbatore.jewellery.domain.entity.JobOrder;
import com.coimbatore.jewellery.domain.entity.Karigar;
import com.coimbatore.jewellery.domain.entity.LossAlert;
import com.coimbatore.jewellery.domain.enums.AlertStatus;
import com.coimbatore.jewellery.domain.enums.AlertType;
import com.coimbatore.jewellery.domain.enums.ItemCategory;
import com.coimbatore.jewellery.domain.enums.JobStatus;
import com.coimbatore.jewellery.domain.enums.TransactionType;
import com.coimbatore.jewellery.service.GoldLedgerService;
import com.coimbatore.jewellery.service.JobReconciliationService;
import com.coimbatore.jewellery.service.StockService;
import com.coimbatore.jewellery.service.VoucherGeneratorService;
import com.coimbatore.jewellery.support.InMemoryRepositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GoldDomainWorkflowTest {

    private InMemoryKarigarRepository karigarRepo;
    private InMemoryJobOrderRepository jobRepo;
    private InMemoryGoldLedgerEntryRepository ledgerRepo;
    private InMemoryLossAlertRepository alertRepo;

    private VoucherGeneratorService voucherGenerator;
    private GoldLedgerService ledgerService;
    private JobReconciliationService reconciliationService;
    private StockService stockService;

    @BeforeEach
    void setUp() {
        karigarRepo = new InMemoryKarigarRepository();
        jobRepo = new InMemoryJobOrderRepository();
        ledgerRepo = new InMemoryGoldLedgerEntryRepository();
        alertRepo = new InMemoryLossAlertRepository();
        voucherGenerator = new VoucherGeneratorService();

        ledgerService = new GoldLedgerService(ledgerRepo, jobRepo, karigarRepo, voucherGenerator);
        reconciliationService = new JobReconciliationService(jobRepo, karigarRepo, alertRepo, ledgerService);
        stockService = new StockService(ledgerRepo, jobRepo, alertRepo);

        ReflectionTestUtils.setField(reconciliationService, "minCompletedJobsForDrift", 5);
        ReflectionTestUtils.setField(reconciliationService, "historicalDriftTolerancePct", new BigDecimal("0.10"));
    }

    @Test
    @DisplayName("Complete Murugesan S Benchmark Workflow (Issue, Receipts, Interim Balance 3.893g, Reconcile, Immutability)")
    void testMurugesanSBenchmarkWorkflow() {
        // 1. Setup Karigar
        Karigar murugesan = new Karigar("KRG-001", "Murugesan S", "+91 98422 10001", "Coimbatore Main Workshop", "murugesan");
        murugesan.setHistoricalLossAvgPct(new BigDecimal("0.08"));
        murugesan.setCompletedJobsCount(6);
        murugesan = karigarRepo.save(murugesan);

        // 2. Create Job in OPEN state
        JobOrder job = new JobOrder("JOB-2026-001", murugesan, ItemCategory.CHAIN, "916 Hallmarked Chain Order", new BigDecimal("1.20"));
        job = jobRepo.save(job);
        assertThat(job.getStatus()).isEqualTo(JobStatus.OPEN);

        // 3. Issue Gold: 120.000g gross @ 91.60% purity -> 109.920g fine
        GoldLedgerEntry issueEntry = ledgerService.recordGoldIssue(
                job.getId(),
                new BigDecimal("120.000"),
                new BigDecimal("91.60"),
                "Initial 24kt refined gold bar issued",
                false,
                "uuid-req-issue-001",
                "clerk_ram"
        );

        assertThat(issueEntry.getVoucherNumber()).startsWith("VCH-");
        assertThat(issueEntry.getTransactionType()).isEqualTo(TransactionType.ISSUE);
        assertThat(issueEntry.getFineWeight()).isEqualByComparingTo("109.920");

        // Verify Job state transitioned to IN_PROGRESS and balances synced
        JobOrder jobAfterIssue = jobRepo.findById(job.getId()).orElseThrow();
        assertThat(jobAfterIssue.getStatus()).isEqualTo(JobStatus.IN_PROGRESS);
        assertThat(jobAfterIssue.getIssuedFineWeight()).isEqualByComparingTo("109.920");
        assertThat(jobAfterIssue.getRecoveredFineWeight()).isEqualByComparingTo("0.000");
        assertThat(jobAfterIssue.getOutstandingFineWeight()).isEqualByComparingTo("109.920");

        // 4. Duplicate request idempotency test
        GoldLedgerEntry duplicateAttempt = ledgerService.recordGoldIssue(
                job.getId(),
                new BigDecimal("120.000"),
                new BigDecimal("91.60"),
                "Retry after network timeout",
                false,
                "uuid-req-issue-001",
                "clerk_ram"
        );
        assertThat(duplicateAttempt.getId()).isEqualTo(issueEntry.getId());
        assertThat(ledgerRepo.findByJobOrderIdOrderByCreatedAtAsc(job.getId())).hasSize(1);

        // 5. Jewellery Receipt: 112.450g gross @ 91.60% purity -> 103.004g fine
        GoldLedgerEntry jewelleryReceipt = ledgerService.recordGoldReceipt(
                job.getId(),
                TransactionType.RECEIPT_JEWELLERY,
                new BigDecimal("112.450"),
                new BigDecimal("91.60"),
                "HUID916001",
                "Finished 916 Chain with BIS hallmark",
                "Delivered to showroom vault",
                false,
                "uuid-req-rcpt-jewellery-001",
                "clerk_ram"
        );
        assertThat(jewelleryReceipt.getFineWeight()).isEqualByComparingTo("103.004");

        // 6. Scrap Receipt: 3.300g gross @ 91.60% purity -> 3.023g fine
        GoldLedgerEntry scrapReceipt = ledgerService.recordGoldReceipt(
                job.getId(),
                TransactionType.RECEIPT_SCRAP,
                new BigDecimal("3.300"),
                new BigDecimal("91.60"),
                null,
                "Melting scrap returned",
                "Clean workshop scrap",
                false,
                "uuid-req-rcpt-scrap-001",
                "clerk_ram"
        );
        assertThat(scrapReceipt.getFineWeight()).isEqualByComparingTo("3.023");

        // 7. Verify Interim Balances match assessment specification exactly:
        // Recovered = 103.004 + 3.023 = 106.027
        // Remaining outstanding working gold with Murugesan = 109.920 - 106.027 = 3.893g
        JobOrder interimJob = jobRepo.findById(job.getId()).orElseThrow();
        assertThat(interimJob.getRecoveredFineWeight()).isEqualByComparingTo("106.027");
        assertThat(interimJob.getOutstandingFineWeight()).isEqualByComparingTo("3.893");

        // 8. Filings Receipt: 3.000g gross @ 91.60% purity -> 2.748g fine
        GoldLedgerEntry filingsReceipt = ledgerService.recordGoldReceipt(
                job.getId(),
                TransactionType.RECEIPT_FILINGS,
                new BigDecimal("3.000"),
                new BigDecimal("91.60"),
                null,
                "Bench filings vacuum collection",
                "Filings collected from workstation",
                false,
                "uuid-req-rcpt-filings-001",
                "clerk_ram"
        );
        assertThat(filingsReceipt.getFineWeight()).isEqualByComparingTo("2.748");

        // 9. Move job to READY_FOR_RECONCILIATION
        JobOrder readyJob = reconciliationService.markReadyForReconciliation(job.getId());
        assertThat(readyJob.getStatus()).isEqualTo(JobStatus.READY_FOR_RECONCILIATION);

        // 10. Finance Head finalizes reconciliation:
        // Recovered = 103.004 + 3.023 + 2.748 = 108.775g
        // Actual loss = 109.920 - 108.775 = 1.145g
        // Allowed loss = 109.920 * 1.20% = 1.319g
        // Excess loss = 1.145 - 1.319 = -0.174g (within allowance)
        JobOrder reconciledJob = reconciliationService.finalizeReconciliation(job.getId(), "finance_head_saravanan");
        assertThat(reconciledJob.getStatus()).isEqualTo(JobStatus.RECONCILED);
        assertThat(reconciledJob.getActualLoss()).isEqualByComparingTo("1.145");
        assertThat(reconciledJob.getExcessLoss()).isEqualByComparingTo("-0.174");
        assertThat(reconciledJob.getReconciledBy()).isEqualTo("finance_head_saravanan");

        // 11. Immutability verification: Cannot issue or receive on RECONCILED job
        final Long closedJobId = job.getId();
        assertThatThrownBy(() -> ledgerService.recordGoldIssue(
                closedJobId,
                new BigDecimal("10.000"),
                new BigDecimal("91.60"),
                "Illegal issue on closed job",
                false,
                null,
                "clerk_ram"
        )).isInstanceOf(IllegalStateTransitionException.class)
          .hasMessageContaining("Cannot issue gold to an already RECONCILED job");

        // 12. Check Live Stock Statement is transactionally accurate
        Map<String, Object> stock = stockService.getLiveStockSummary();
        assertThat(stock).containsKey("totalTrackedFineGold");
        assertThat(stock).containsKey("vaultFineGold");
        assertThat(stock).containsKey("goldWithKarigars");
    }

    @Test
    @DisplayName("Loss Alert generation on excessive loss above agreed wastage allowance")
    void testExcessLossAlertWorkflow() {
        Karigar siva = new Karigar("KRG-002", "Sivakumar P", "+91 98422 10002", "Coimbatore Main Workshop", "sivakumar");
        siva.setHistoricalLossAvgPct(new BigDecimal("0.10"));
        siva.setCompletedJobsCount(8);
        siva = karigarRepo.save(siva);

        JobOrder job = new JobOrder("JOB-2026-002", siva, ItemCategory.RING, "Signet Ring Order", new BigDecimal("1.00"));
        job = jobRepo.save(job);

        // Issue: 100.000g gross @ 91.60% = 91.600g fine (allowed loss = 0.916g)
        ledgerService.recordGoldIssue(job.getId(), new BigDecimal("100.000"), new BigDecimal("91.60"), "Bar", false, null, "clerk_ram");

        // Return only 88.000g fine total (actual loss = 3.600g, excess = 3.600 - 0.916 = 2.684g)
        ledgerService.recordGoldReceipt(job.getId(), TransactionType.RECEIPT_JEWELLERY, new BigDecimal("96.070"), new BigDecimal("91.60"), null, "Rings", null, false, null, "clerk_ram");

        reconciliationService.markReadyForReconciliation(job.getId());
        reconciliationService.finalizeReconciliation(job.getId(), "finance_head_saravanan");

        List<LossAlert> alerts = alertRepo.findAllByOrderByCreatedAtDesc();
        assertThat(alerts).isNotEmpty();

        final Long excessJobId = job.getId();
        LossAlert alert = alerts.stream().filter(a -> a.getJobOrder().getId().equals(excessJobId)).findFirst().orElseThrow();
        assertThat(alert.getAlertType()).isEqualTo(AlertType.EXCESS_OVER_ALLOWANCE);
        assertThat(alert.getStatus()).isEqualTo(AlertStatus.PENDING_REVIEW);
        assertThat(alert.getReason()).contains("exceeds agreed wastage allowance");
        assertThat(alert.getReason()).doesNotContain("theft", "steal", "fraud", "stolen");
    }

    @Test
    @DisplayName("Controlled Reversal cancels an erroneous voucher and adjusts balances")
    void testReversalMechanism() {
        Karigar k = karigarRepo.save(new Karigar("KRG-003", "Rajan M", "+91 98422 10003", "Workshop", "rajan"));
        JobOrder job = jobRepo.save(new JobOrder("JOB-2026-003", k, ItemCategory.BANGLES, "Bangles", new BigDecimal("1.50")));

        GoldLedgerEntry issue1 = ledgerService.recordGoldIssue(job.getId(), new BigDecimal("50.000"), new BigDecimal("91.60"), "Bar 1", false, null, "clerk");
        assertThat(jobRepo.findById(job.getId()).orElseThrow().getIssuedFineWeight()).isEqualByComparingTo("45.800");

        // Reverse the entry
        GoldLedgerEntry reversal = ledgerService.createReversalEntry(issue1.getVoucherNumber(), "Scale Tare Error", "supervisor");
        assertThat(reversal.getTransactionType()).isEqualTo(TransactionType.ADJUSTMENT_REVERSAL);
        assertThat(reversal.getFineWeight()).isEqualByComparingTo("-45.800");

        // Balances updated
        JobOrder updated = jobRepo.findById(job.getId()).orElseThrow();
        assertThat(updated.getIssuedFineWeight()).isEqualByComparingTo("0.000");
    }
}
