package com.coimbatore.jewellery.service;

import com.coimbatore.jewellery.common.exception.BusinessValidationException;
import com.coimbatore.jewellery.common.exception.EntityNotFoundException;
import com.coimbatore.jewellery.common.exception.IllegalStateTransitionException;
import com.coimbatore.jewellery.domain.accounting.GoldAccountingCalculator;
import com.coimbatore.jewellery.domain.entity.JobOrder;
import com.coimbatore.jewellery.domain.entity.Karigar;
import com.coimbatore.jewellery.domain.entity.LossAlert;
import com.coimbatore.jewellery.domain.enums.AlertStatus;
import com.coimbatore.jewellery.domain.enums.AlertType;
import com.coimbatore.jewellery.domain.enums.JobStatus;
import com.coimbatore.jewellery.repository.JobOrderRepository;
import com.coimbatore.jewellery.repository.KarigarRepository;
import com.coimbatore.jewellery.repository.LossAlertRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;

@Service
@Transactional
public class JobReconciliationService {

    private final JobOrderRepository jobRepository;
    private final KarigarRepository karigarRepository;
    private final LossAlertRepository alertRepository;
    private final GoldLedgerService ledgerService;

    @Value("${app.loss-detection.min-completed-jobs-for-drift:5}")
    private int minCompletedJobsForDrift;

    @Value("${app.loss-detection.historical-drift-tolerance-pct:0.10}")
    private BigDecimal historicalDriftTolerancePct;

    public JobReconciliationService(JobOrderRepository jobRepository,
                                    KarigarRepository karigarRepository,
                                    LossAlertRepository alertRepository,
                                    GoldLedgerService ledgerService) {
        this.jobRepository = jobRepository;
        this.karigarRepository = karigarRepository;
        this.alertRepository = alertRepository;
        this.ledgerService = ledgerService;
    }

    /**
     * Issue Clerk marks job as READY_FOR_RECONCILIATION once all jewellery, scrap, and filings are returned.
     */
    public JobOrder markReadyForReconciliation(Long jobId) {
        JobOrder job = jobRepository.findById(jobId)
                .orElseThrow(() -> new EntityNotFoundException("Job not found: " + jobId));

        if (job.getStatus() != JobStatus.IN_PROGRESS) {
            throw new IllegalStateTransitionException("Only IN_PROGRESS jobs can move to READY_FOR_RECONCILIATION. Current status: " + job.getStatus());
        }

        ledgerService.recomputeAndSyncJobBalances(job);
        job.setStatus(JobStatus.READY_FOR_RECONCILIATION);
        return jobRepository.save(job);
    }

    /**
     * Finance Head reviews and finalizes reconciliation.
     * Computes actual loss, checks allowance, evaluates historical drift, and creates alerts if needed.
     */
    public JobOrder finalizeReconciliation(Long jobId, String reconciledBy) {
        JobOrder job = jobRepository.findById(jobId)
                .orElseThrow(() -> new EntityNotFoundException("Job not found: " + jobId));

        if (job.getStatus() != JobStatus.READY_FOR_RECONCILIATION) {
            throw new IllegalStateTransitionException("Only jobs in READY_FOR_RECONCILIATION can be reconciled. Current status: " + job.getStatus());
        }

        ledgerService.recomputeAndSyncJobBalances(job);

        BigDecimal issuedFine = job.getIssuedFineWeight();
        BigDecimal recoveredFine = job.getRecoveredFineWeight();

        if (issuedFine.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessValidationException("Cannot reconcile job with 0.000g issued fine gold: " + job.getJobCode());
        }

        BigDecimal actualLoss = GoldAccountingCalculator.calculateActualLoss(issuedFine, recoveredFine);
        BigDecimal allowedLoss = GoldAccountingCalculator.calculateAllowedLoss(issuedFine, job.getAllowedWastagePercent());
        BigDecimal excessLoss = GoldAccountingCalculator.calculateExcessLoss(actualLoss, allowedLoss);
        BigDecimal actualLossPct = GoldAccountingCalculator.calculateLossPercentage(actualLoss, issuedFine);

        job.setActualLoss(actualLoss);
        job.setExcessLoss(excessLoss);
        job.setActualLossPct(actualLossPct);
        job.setStatus(JobStatus.RECONCILED);
        job.setReconciledAt(Instant.now());
        job.setReconciledBy(reconciledBy != null ? reconciledBy : "FINANCE_HEAD");

        JobOrder savedJob = jobRepository.save(job);

        // Evaluate Loss Alerts
        Karigar karigar = job.getKarigar();

        // 1. Rule-based Alert: Excess over agreed allowance
        if (excessLoss.compareTo(BigDecimal.ZERO) > 0) {
            LossAlert alert = new LossAlert();
            alert.setJobOrder(savedJob);
            alert.setKarigar(karigar);
            alert.setAlertType(AlertType.EXCESS_OVER_ALLOWANCE);
            alert.setActualLoss(actualLoss);
            alert.setAllowedLoss(allowedLoss);
            alert.setExcessLoss(excessLoss);
            alert.setActualLossPct(actualLossPct);
            alert.setAllowedLossPct(job.getAllowedWastagePercent());
            alert.setHistoricalBaselinePct(karigar.getHistoricalLossAvgPct());
            alert.setReason(String.format("Review recommended: actual loss of %s g exceeds agreed wastage allowance of %s g by %s g.",
                    actualLoss.toPlainString(), allowedLoss.toPlainString(), excessLoss.toPlainString()));
            alert.setStatus(AlertStatus.PENDING_REVIEW);
            alert.setCreatedAt(Instant.now());
            alertRepository.save(alert);
        }

        // 2. Historical Drift Alert (only if sufficient completed job history exists)
        if (karigar.getCompletedJobsCount() >= minCompletedJobsForDrift && karigar.getHistoricalLossAvgPct() != null) {
            BigDecimal baseline = karigar.getHistoricalLossAvgPct();
            BigDecimal threshold = baseline.add(historicalDriftTolerancePct);

            if (actualLossPct.compareTo(threshold) > 0) {
                LossAlert driftAlert = new LossAlert();
                driftAlert.setJobOrder(savedJob);
                driftAlert.setKarigar(karigar);
                driftAlert.setAlertType(AlertType.HISTORICAL_DRIFT);
                driftAlert.setActualLoss(actualLoss);
                driftAlert.setAllowedLoss(allowedLoss);
                driftAlert.setExcessLoss(excessLoss);
                driftAlert.setActualLossPct(actualLossPct);
                driftAlert.setAllowedLossPct(job.getAllowedWastagePercent());
                driftAlert.setHistoricalBaselinePct(baseline);
                driftAlert.setReason(String.format("Review recommended: current loss is %s%%, which is above the karigar's recent baseline of %s%%.",
                        actualLossPct.toPlainString(), baseline.toPlainString()));
                driftAlert.setStatus(AlertStatus.PENDING_REVIEW);
                driftAlert.setCreatedAt(Instant.now());
                alertRepository.save(driftAlert);
            }
        }

        // Update Karigar rolling baseline
        updateKarigarBaseline(karigar, actualLossPct);

        return savedJob;
    }

    /**
     * Controlled reopening of a reconciled job for supervisor corrections.
     */
    public JobOrder reopenReconciledJob(Long jobId, String reason, String reopenedBy) {
        JobOrder job = jobRepository.findById(jobId)
                .orElseThrow(() -> new EntityNotFoundException("Job not found: " + jobId));

        if (job.getStatus() != JobStatus.RECONCILED) {
            throw new IllegalStateTransitionException("Only RECONCILED jobs can be reopened. Current status: " + job.getStatus());
        }

        job.setStatus(JobStatus.READY_FOR_RECONCILIATION);
        job.setDescription(job.getDescription() + " [REOPENED: " + reason + " by " + reopenedBy + "]");
        return jobRepository.save(job);
    }

    private void updateKarigarBaseline(Karigar karigar, BigDecimal newLossPct) {
        int oldCount = karigar.getCompletedJobsCount();
        BigDecimal oldAvg = karigar.getHistoricalLossAvgPct() != null ? karigar.getHistoricalLossAvgPct() : BigDecimal.ZERO;

        BigDecimal totalLossSum = oldAvg.multiply(BigDecimal.valueOf(oldCount)).add(newLossPct);
        int newCount = oldCount + 1;
        BigDecimal newAvg = totalLossSum.divide(BigDecimal.valueOf(newCount), 2, RoundingMode.HALF_UP);

        karigar.setCompletedJobsCount(newCount);
        karigar.setHistoricalLossAvgPct(newAvg);
        karigarRepository.save(karigar);
    }
}
