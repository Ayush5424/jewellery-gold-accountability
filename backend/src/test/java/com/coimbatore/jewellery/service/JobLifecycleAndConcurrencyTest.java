package com.coimbatore.jewellery.service;

import com.coimbatore.jewellery.domain.accounting.GoldAccountingCalculator;
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
import com.coimbatore.jewellery.support.InMemoryRepositories.InMemoryGoldLedgerEntryRepository;
import com.coimbatore.jewellery.support.InMemoryRepositories.InMemoryJobOrderRepository;
import com.coimbatore.jewellery.support.InMemoryRepositories.InMemoryKarigarRepository;
import com.coimbatore.jewellery.support.InMemoryRepositories.InMemoryLossAlertRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JobLifecycleAndConcurrencyTest {

    private InMemoryKarigarRepository karigarRepo;
    private InMemoryJobOrderRepository jobRepo;
    private InMemoryGoldLedgerEntryRepository ledgerRepo;
    private InMemoryLossAlertRepository alertRepo;

    private VoucherGeneratorService voucherGenerator;
    private GoldLedgerService ledgerService;
    private JobReconciliationService reconciliationService;

    @BeforeEach
    void setUp() {
        karigarRepo = new InMemoryKarigarRepository();
        jobRepo = new InMemoryJobOrderRepository();
        ledgerRepo = new InMemoryGoldLedgerEntryRepository();
        alertRepo = new InMemoryLossAlertRepository();
        voucherGenerator = new VoucherGeneratorService();

        ledgerService = new GoldLedgerService(ledgerRepo, jobRepo, karigarRepo, voucherGenerator);
        reconciliationService = new JobReconciliationService(jobRepo, karigarRepo, alertRepo, ledgerService);

        ReflectionTestUtils.setField(reconciliationService, "minCompletedJobsForDrift", 5);
        ReflectionTestUtils.setField(reconciliationService, "historicalDriftTolerancePct", new BigDecimal("0.10"));
    }

    @Test
    @DisplayName("Lifecycle State Machine: Strict OPEN -> IN_PROGRESS -> READY_FOR_RECONCILIATION -> RECONCILED")
    void testStrictJobLifecycleStateMachine() {
        Karigar k = karigarRepo.save(new Karigar("KRG-010", "Dhandapani G", "+91 98422 10010", "RS Puram", "dhandapani"));
        JobOrder job = jobRepo.save(new JobOrder("JOB-LIFECYCLE-1", k, ItemCategory.BANGLES, "Gold Bangles", new BigDecimal("1.20")));

        assertThat(job.getStatus()).isEqualTo(JobStatus.OPEN);

        // 1. Cannot jump from OPEN directly to READY_FOR_RECONCILIATION
        assertThatThrownBy(() -> reconciliationService.markReadyForReconciliation(job.getId()))
                .isInstanceOf(IllegalStateTransitionException.class)
                .hasMessageContaining("Only IN_PROGRESS jobs can move to READY_FOR_RECONCILIATION");

        // 2. Cannot jump from OPEN directly to RECONCILED
        assertThatThrownBy(() -> reconciliationService.finalizeReconciliation(job.getId(), "finance_head"))
                .isInstanceOf(IllegalStateTransitionException.class)
                .hasMessageContaining("Only jobs in READY_FOR_RECONCILIATION can be reconciled");

        // 3. Issue gold transitions job from OPEN to IN_PROGRESS
        ledgerService.recordGoldIssue(job.getId(), new BigDecimal("100.000"), new BigDecimal("91.60"), "Bar 24K", false, null, "clerk");
        JobOrder inProgressJob = jobRepo.findById(job.getId()).orElseThrow();
        assertThat(inProgressJob.getStatus()).isEqualTo(JobStatus.IN_PROGRESS);

        // 4. Cannot jump from IN_PROGRESS directly to RECONCILED without READY_FOR_RECONCILIATION
        assertThatThrownBy(() -> reconciliationService.finalizeReconciliation(job.getId(), "finance_head"))
                .isInstanceOf(IllegalStateTransitionException.class)
                .hasMessageContaining("Only jobs in READY_FOR_RECONCILIATION can be reconciled");

        // 5. Receive gold
        ledgerService.recordGoldReceipt(job.getId(), TransactionType.RECEIPT_JEWELLERY, new BigDecimal("98.500"), new BigDecimal("91.60"), "HUID-B01", "Bangles", null, false, null, "clerk");

        // 6. Transition to READY_FOR_RECONCILIATION
        reconciliationService.markReadyForReconciliation(job.getId());
        JobOrder readyJob = jobRepo.findById(job.getId()).orElseThrow();
        assertThat(readyJob.getStatus()).isEqualTo(JobStatus.READY_FOR_RECONCILIATION);

        // 7. Finance Head finalizes reconciliation
        reconciliationService.finalizeReconciliation(job.getId(), "finance_head_saravanan");
        JobOrder reconciledJob = jobRepo.findById(job.getId()).orElseThrow();
        assertThat(reconciledJob.getStatus()).isEqualTo(JobStatus.RECONCILED);

        // 8. Reconciled job is completely locked against new receipts or issues
        assertThatThrownBy(() -> ledgerService.recordGoldReceipt(job.getId(), TransactionType.RECEIPT_SCRAP, new BigDecimal("1.000"), new BigDecimal("91.60"), null, "Late scrap", null, false, null, "clerk"))
                .isInstanceOf(IllegalStateTransitionException.class)
                .hasMessageContaining("Cannot record receipt on an already RECONCILED job");

        // 9. Controlled Reopening transitions back to READY_FOR_RECONCILIATION
        reconciliationService.reopenReconciledJob(job.getId(), "Auditor scale adjustment requested", "finance_supervisor");
        JobOrder reopenedJob = jobRepo.findById(job.getId()).orElseThrow();
        assertThat(reopenedJob.getStatus()).isEqualTo(JobStatus.READY_FOR_RECONCILIATION);
        assertThat(reopenedJob.getDescription()).contains("[REOPENED: Auditor scale adjustment requested by finance_supervisor]");
    }

    @Test
    @DisplayName("Historical Drift Alert requires >= 5 completed jobs to avoid statistical noise")
    void testHistoricalDriftSampleThresholds() {
        // Karigar with only 2 completed jobs (< 5 threshold)
        Karigar juniorKarigar = karigarRepo.save(new Karigar("KRG-020", "Velusamy Junior", "+91 98422 10020", "Workshop", "velu_jr"));
        juniorKarigar.setHistoricalLossAvgPct(new BigDecimal("0.08"));
        juniorKarigar.setCompletedJobsCount(2); // Low sample size
        juniorKarigar = karigarRepo.save(juniorKarigar);

        JobOrder job1 = jobRepo.save(new JobOrder("JOB-DRIFT-LOW-SAMPLE", juniorKarigar, ItemCategory.CHAIN, "Chain", new BigDecimal("2.00")));
        ledgerService.recordGoldIssue(job1.getId(), new BigDecimal("100.000"), new BigDecimal("91.60"), "Bar", false, null, "clerk");
        // Recover 91.350g fine (loss = 0.250g or 0.27%, which is well above baseline 0.08% + 0.10% = 0.18%, but within 2.00% wastage allowance)
        ledgerService.recordGoldReceipt(job1.getId(), TransactionType.RECEIPT_JEWELLERY, new BigDecimal("99.727"), new BigDecimal("91.60"), null, "Chain", null, false, null, "clerk");

        reconciliationService.markReadyForReconciliation(job1.getId());
        reconciliationService.finalizeReconciliation(job1.getId(), "finance_head");

        // Verify NO historical drift alert created because completedJobsCount < 5
        List<LossAlert> alerts = alertRepo.findAllByOrderByCreatedAtDesc();
        assertThat(alerts.stream().filter(a -> a.getAlertType() == AlertType.HISTORICAL_DRIFT)).isEmpty();

        // Now test Karigar with 7 completed jobs (>= 5 threshold)
        Karigar veteranKarigar = karigarRepo.save(new Karigar("KRG-021", "Shanmugam Veteran", "+91 98422 10021", "Workshop", "shanmugam_vet"));
        veteranKarigar.setHistoricalLossAvgPct(new BigDecimal("0.08"));
        veteranKarigar.setCompletedJobsCount(7); // Sufficient sample size
        veteranKarigar = karigarRepo.save(veteranKarigar);

        JobOrder job2 = jobRepo.save(new JobOrder("JOB-DRIFT-HIGH-SAMPLE", veteranKarigar, ItemCategory.CHAIN, "Chain", new BigDecimal("2.00")));
        ledgerService.recordGoldIssue(job2.getId(), new BigDecimal("100.000"), new BigDecimal("91.60"), "Bar", false, null, "clerk");
        ledgerService.recordGoldReceipt(job2.getId(), TransactionType.RECEIPT_JEWELLERY, new BigDecimal("99.727"), new BigDecimal("91.60"), null, "Chain", null, false, null, "clerk");

        reconciliationService.markReadyForReconciliation(job2.getId());
        reconciliationService.finalizeReconciliation(job2.getId(), "finance_head");

        // Veteran karigar DOES trigger HISTORICAL_DRIFT alert because sample size >= 5
        List<LossAlert> alertsAfter = alertRepo.findAllByOrderByCreatedAtDesc();
        LossAlert driftAlert = alertsAfter.stream()
                .filter(a -> a.getJobOrder().getId().equals(job2.getId()) && a.getAlertType() == AlertType.HISTORICAL_DRIFT)
                .findFirst()
                .orElse(null);

        assertThat(driftAlert).isNotNull();
        assertThat(driftAlert.getStatus()).isEqualTo(AlertStatus.PENDING_REVIEW);
        assertThat(driftAlert.getReason()).contains("above the karigar's recent baseline");
        assertThat(driftAlert.getReason()).doesNotContain("theft", "steal", "fraud");
    }

    @Test
    @DisplayName("Concurrency-safe voucher number generation under multi-threaded execution")
    void testConcurrentVoucherGeneration() throws InterruptedException {
        int threadCount = 50;
        ExecutorService executor = Executors.newFixedThreadPool(10);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(threadCount);

        Set<String> generatedVouchers = Collections.synchronizedSet(new HashSet<>());
        List<Throwable> exceptions = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    String voucher = voucherGenerator.generateVoucherNumber();
                    generatedVouchers.add(voucher);
                } catch (Throwable t) {
                    exceptions.add(t);
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean completed = finishLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();
        assertThat(exceptions).isEmpty();
        // Exactly 50 unique vouchers generated without collisions
        assertThat(generatedVouchers).hasSize(threadCount);
        for (String vch : generatedVouchers) {
            assertThat(vch).matches("^VCH-\\d{8}-\\d{6}$");
        }
    }
}
