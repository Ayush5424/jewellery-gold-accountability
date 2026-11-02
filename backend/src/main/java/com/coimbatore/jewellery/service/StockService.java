package com.coimbatore.jewellery.service;

import com.coimbatore.jewellery.domain.accounting.GoldAccountingCalculator;
import com.coimbatore.jewellery.domain.enums.TransactionType;
import com.coimbatore.jewellery.repository.GoldLedgerEntryRepository;
import com.coimbatore.jewellery.repository.JobOrderRepository;
import com.coimbatore.jewellery.repository.LossAlertRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class StockService {

    private final GoldLedgerEntryRepository ledgerRepository;
    private final JobOrderRepository jobRepository;
    private final LossAlertRepository alertRepository;

    private static final BigDecimal SEEDED_VAULT_OPENING_FINE = new BigDecimal("15000.000");
    private static final BigDecimal SEEDED_REFINER_FINE = new BigDecimal("850.500");

    public StockService(GoldLedgerEntryRepository ledgerRepository,
                        JobOrderRepository jobRepository,
                        LossAlertRepository alertRepository) {
        this.ledgerRepository = ledgerRepository;
        this.jobRepository = jobRepository;
        this.alertRepository = alertRepository;
    }

    private BigDecimal safe(BigDecimal val) {
        return val != null ? val : BigDecimal.ZERO;
    }

    /**
     * Answers: "Where is every gram of fine gold right now?"
     */
    public Map<String, Object> getLiveStockSummary() {
        BigDecimal totalIssued = safe(ledgerRepository.sumFineWeightByType(TransactionType.ISSUE));
        BigDecimal totalJewelleryReceived = safe(ledgerRepository.sumFineWeightByType(TransactionType.RECEIPT_JEWELLERY));
        BigDecimal totalScrapReceived = safe(ledgerRepository.sumFineWeightByType(TransactionType.RECEIPT_SCRAP));
        BigDecimal totalFilingsReceived = safe(ledgerRepository.sumFineWeightByType(TransactionType.RECEIPT_FILINGS));

        BigDecimal totalRecovered = totalJewelleryReceived.add(totalScrapReceived).add(totalFilingsReceived);
        BigDecimal goldWithKarigars = totalIssued.subtract(totalRecovered).max(BigDecimal.ZERO)
                .setScale(GoldAccountingCalculator.WEIGHT_SCALE, GoldAccountingCalculator.ROUNDING_MODE);

        BigDecimal currentVaultFine = SEEDED_VAULT_OPENING_FINE.subtract(totalIssued).add(totalRecovered)
                .setScale(GoldAccountingCalculator.WEIGHT_SCALE, GoldAccountingCalculator.ROUNDING_MODE);

        BigDecimal refinerFine = SEEDED_REFINER_FINE
                .setScale(GoldAccountingCalculator.WEIGHT_SCALE, GoldAccountingCalculator.ROUNDING_MODE);

        BigDecimal totalTrackedFine = currentVaultFine.add(goldWithKarigars).add(refinerFine)
                .setScale(GoldAccountingCalculator.WEIGHT_SCALE, GoldAccountingCalculator.ROUNDING_MODE);

        long pendingAlertsCount = alertRepository.countByStatus(com.coimbatore.jewellery.domain.enums.AlertStatus.PENDING_REVIEW);

        Map<String, Object> summary = new HashMap<>();
        summary.put("vaultFineGold", currentVaultFine);
        summary.put("goldWithKarigars", goldWithKarigars);
        summary.put("goldAtRefiner", refinerFine);
        summary.put("totalTrackedFineGold", totalTrackedFine);
        summary.put("pendingAlertsCount", pendingAlertsCount);
        summary.put("totalIssuedFine", totalIssued.setScale(3, GoldAccountingCalculator.ROUNDING_MODE));
        summary.put("totalRecoveredFine", totalRecovered.setScale(3, GoldAccountingCalculator.ROUNDING_MODE));
        return summary;
    }
}
