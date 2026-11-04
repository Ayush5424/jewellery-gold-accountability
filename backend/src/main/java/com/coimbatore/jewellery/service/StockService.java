package com.coimbatore.jewellery.service;

import com.coimbatore.jewellery.domain.accounting.GoldAccountingCalculator;
import com.coimbatore.jewellery.domain.enums.TransactionType;
import com.coimbatore.jewellery.repository.GoldLedgerEntryRepository;
import com.coimbatore.jewellery.repository.JobOrderRepository;
import com.coimbatore.jewellery.repository.LossAlertRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
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
     * Live realtime aggregate across all database records.
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
        summary.put("openingBalanceFineGold", SEEDED_VAULT_OPENING_FINE);
        summary.put("vaultFineGold", currentVaultFine);
        summary.put("goldWithKarigars", goldWithKarigars);
        summary.put("goldAtRefiner", refinerFine);
        summary.put("totalTrackedFineGold", totalTrackedFine);
        summary.put("pendingAlertsCount", pendingAlertsCount);
        summary.put("totalIssuedFine", totalIssued.setScale(3, GoldAccountingCalculator.ROUNDING_MODE));
        summary.put("totalRecoveredFine", totalRecovered.setScale(3, GoldAccountingCalculator.ROUNDING_MODE));
        summary.put("returnedJewelleryFine", totalJewelleryReceived.setScale(3, GoldAccountingCalculator.ROUNDING_MODE));
        summary.put("returnedScrapFine", totalScrapReceived.setScale(3, GoldAccountingCalculator.ROUNDING_MODE));
        summary.put("returnedFilingsFine", totalFilingsReceived.setScale(3, GoldAccountingCalculator.ROUNDING_MODE));
        summary.put("closingBalanceFineGold", totalTrackedFine);
        return summary;
    }

    /**
     * Reconciles daily stock movements for a specific date:
     * Opening Balance + Day Receipts - Day Issues = Closing Vault Balance.
     * Conserves mass with Karigar WIP and Refiner balances.
     */
    public Map<String, Object> getDailyStockStatement(String dateStr) {
        LocalDate date;
        try {
            date = (dateStr != null && !dateStr.isBlank()) ? LocalDate.parse(dateStr) : LocalDate.now();
        } catch (Exception e) {
            date = LocalDate.now();
        }

        Instant startOfDay = date.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant endOfDay = date.atTime(23, 59, 59, 999999999).atZone(ZoneOffset.UTC).toInstant();

        // 1. Prior movements before start of this date
        BigDecimal priorIssued = safe(ledgerRepository.sumFineWeightByTypeBefore(TransactionType.ISSUE, startOfDay));
        BigDecimal priorJewellery = safe(ledgerRepository.sumFineWeightByTypeBefore(TransactionType.RECEIPT_JEWELLERY, startOfDay));
        BigDecimal priorScrap = safe(ledgerRepository.sumFineWeightByTypeBefore(TransactionType.RECEIPT_SCRAP, startOfDay));
        BigDecimal priorFilings = safe(ledgerRepository.sumFineWeightByTypeBefore(TransactionType.RECEIPT_FILINGS, startOfDay));
        BigDecimal priorRecovered = priorJewellery.add(priorScrap).add(priorFilings);

        BigDecimal openingVaultFine = SEEDED_VAULT_OPENING_FINE.subtract(priorIssued).add(priorRecovered)
                .setScale(GoldAccountingCalculator.WEIGHT_SCALE, GoldAccountingCalculator.ROUNDING_MODE);

        // 2. Day's movements on this date
        BigDecimal dayIssued = safe(ledgerRepository.sumFineWeightByTypeBetween(TransactionType.ISSUE, startOfDay, endOfDay));
        BigDecimal dayJewellery = safe(ledgerRepository.sumFineWeightByTypeBetween(TransactionType.RECEIPT_JEWELLERY, startOfDay, endOfDay));
        BigDecimal dayScrap = safe(ledgerRepository.sumFineWeightByTypeBetween(TransactionType.RECEIPT_SCRAP, startOfDay, endOfDay));
        BigDecimal dayFilings = safe(ledgerRepository.sumFineWeightByTypeBetween(TransactionType.RECEIPT_FILINGS, startOfDay, endOfDay));
        BigDecimal dayRecovered = dayJewellery.add(dayScrap).add(dayFilings);

        // 3. Day's closing vault balance
        BigDecimal closingVaultFine = openingVaultFine.subtract(dayIssued).add(dayRecovered)
                .setScale(GoldAccountingCalculator.WEIGHT_SCALE, GoldAccountingCalculator.ROUNDING_MODE);

        // 4. Cumulative movements up to end of this date
        BigDecimal cumulativeIssued = priorIssued.add(dayIssued);
        BigDecimal cumulativeRecovered = priorRecovered.add(dayRecovered);
        BigDecimal goldWithKarigars = cumulativeIssued.subtract(cumulativeRecovered).max(BigDecimal.ZERO)
                .setScale(GoldAccountingCalculator.WEIGHT_SCALE, GoldAccountingCalculator.ROUNDING_MODE);

        BigDecimal refinerFine = SEEDED_REFINER_FINE
                .setScale(GoldAccountingCalculator.WEIGHT_SCALE, GoldAccountingCalculator.ROUNDING_MODE);

        BigDecimal totalTrackedFine = closingVaultFine.add(goldWithKarigars).add(refinerFine)
                .setScale(GoldAccountingCalculator.WEIGHT_SCALE, GoldAccountingCalculator.ROUNDING_MODE);

        long pendingAlertsCount = alertRepository.countByStatus(com.coimbatore.jewellery.domain.enums.AlertStatus.PENDING_REVIEW);

        Map<String, Object> summary = new HashMap<>();
        summary.put("statementDate", date.toString());
        summary.put("openingBalanceFineGold", openingVaultFine);
        summary.put("vaultFineGold", closingVaultFine);
        summary.put("goldWithKarigars", goldWithKarigars);
        summary.put("goldAtRefiner", refinerFine);
        summary.put("totalTrackedFineGold", totalTrackedFine);
        summary.put("pendingAlertsCount", pendingAlertsCount);
        summary.put("totalIssuedFine", dayIssued.setScale(3, GoldAccountingCalculator.ROUNDING_MODE));
        summary.put("totalRecoveredFine", dayRecovered.setScale(3, GoldAccountingCalculator.ROUNDING_MODE));
        summary.put("returnedJewelleryFine", dayJewellery.setScale(3, GoldAccountingCalculator.ROUNDING_MODE));
        summary.put("returnedScrapFine", dayScrap.setScale(3, GoldAccountingCalculator.ROUNDING_MODE));
        summary.put("returnedFilingsFine", dayFilings.setScale(3, GoldAccountingCalculator.ROUNDING_MODE));
        summary.put("closingBalanceFineGold", totalTrackedFine);
        summary.put("companyName", "Coimbatore Fine Jewellery Ltd.");
        return summary;
    }

    /**
     * Generates a Tally-compatible XML stock journal voucher export.
     */
    public String generateTallyXmlExport(String statementDate) {
        Map<String, Object> stock = getDailyStockStatement(statementDate);
        return String.format("""
                <ENVELOPE>
                    <HEADER>
                        <TALLYREQUEST>Import Data</TALLYREQUEST>
                    </HEADER>
                    <BODY>
                        <IMPORTDATA>
                            <REQUESTDESC>
                                <REPORTNAME>Stock Summary</REPORTNAME>
                            </REQUESTDESC>
                            <REQUESTDATA>
                                <TALLYMESSAGE xmlns:UDF="TallyUDF">
                                    <VOUCHER VCHTYPE="Stock Journal" ACTION="Create" OBJVIEW="Inventory Voucher View">
                                        <DATE>%s</DATE>
                                        <VOUCHERTYPENAME>Stock Journal</VOUCHERTYPENAME>
                                        <NARRATION>Coimbatore Gold Accountability Reconciliation Statement</NARRATION>
                                        <ALLINVENTORYENTRIES.LIST>
                                            <STOCKITEMNAME>24KT Fine Gold Bullion</STOCKITEMNAME>
                                            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                                            <ACTUALQTY>%s g</ACTUALQTY>
                                            <BILLEDQTY>%s g</BILLEDQTY>
                                            <BATCHNAME>Vault Central Safe</BATCHNAME>
                                        </ALLINVENTORYENTRIES.LIST>
                                        <ALLINVENTORYENTRIES.LIST>
                                            <STOCKITEMNAME>916 Karigar In-Hand Working Gold</STOCKITEMNAME>
                                            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                                            <ACTUALQTY>%s g</ACTUALQTY>
                                            <BILLEDQTY>%s g</BILLEDQTY>
                                            <BATCHNAME>Workshop Bench WIP</BATCHNAME>
                                        </ALLINVENTORYENTRIES.LIST>
                                        <ALLINVENTORYENTRIES.LIST>
                                            <STOCKITEMNAME>Refining Acid Recovery Dust</STOCKITEMNAME>
                                            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                                            <ACTUALQTY>%s g</ACTUALQTY>
                                            <BILLEDQTY>%s g</BILLEDQTY>
                                            <BATCHNAME>Certified Refiner Lot</BATCHNAME>
                                        </ALLINVENTORYENTRIES.LIST>
                                    </VOUCHER>
                                </TALLYMESSAGE>
                            </REQUESTDATA>
                        </IMPORTDATA>
                    </BODY>
                </ENVELOPE>
                """,
                statementDate.replace("-", ""),
                stock.get("vaultFineGold"),
                stock.get("vaultFineGold"),
                stock.get("goldWithKarigars"),
                stock.get("goldWithKarigars"),
                stock.get("goldAtRefiner"),
                stock.get("goldAtRefiner")
        );
    }
}
