package com.coimbatore.jewellery.domain.accounting;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Validates accounting calculations under both:
 * 1) The assignment pedagogical sample calculation benchmark (3.00% theoretical allowance).
 * 2) The realistic Coimbatore workshop baseline for plain chains (1.20% category allowance).
 */
@DisplayName("Benchmark Consistency Tests: 3.00% Theoretical vs 1.20% Workshop Standard")
class BenchmarkConsistencyTest {

    @Test
    @DisplayName("Theoretical Assignment Prompt Benchmark (3.00% Wastage Allowance)")
    void testAssignmentTheoreticalBenchmark() {
        // Issue: 120.000g @ 91.60%
        BigDecimal issuedGross = new BigDecimal("120.000");
        BigDecimal purity = new BigDecimal("91.60");
        BigDecimal issuedFine = GoldAccountingCalculator.calculateFineWeight(issuedGross, purity);
        assertEquals(new BigDecimal("109.920"), issuedFine);

        // Receipts: 112.450g jewellery + 3.300g scrap
        BigDecimal jewelleryGross = new BigDecimal("112.450");
        BigDecimal scrapGross = new BigDecimal("3.300");
        BigDecimal jewelleryFine = GoldAccountingCalculator.calculateFineWeight(jewelleryGross, purity);
        BigDecimal scrapFine = GoldAccountingCalculator.calculateFineWeight(scrapGross, purity);
        assertEquals(new BigDecimal("103.004"), jewelleryFine);
        assertEquals(new BigDecimal("3.023"), scrapFine);

        BigDecimal totalReturnedFine = jewelleryFine.add(scrapFine);
        assertEquals(new BigDecimal("106.027"), totalReturnedFine);

        // Actual interim loss
        BigDecimal actualLoss = GoldAccountingCalculator.calculateActualLoss(issuedFine, totalReturnedFine);
        assertEquals(new BigDecimal("3.893"), actualLoss);

        // Theoretical allowed wastage: 3.00%
        BigDecimal allowedWastagePct = new BigDecimal("3.00");
        BigDecimal allowedLoss = GoldAccountingCalculator.calculateAllowedLoss(issuedFine, allowedWastagePct);
        assertEquals(new BigDecimal("3.298"), allowedLoss);

        // Excess loss: 3.893 - 3.298 = 0.595g fine gold
        BigDecimal excessLoss = GoldAccountingCalculator.calculateExcessLoss(actualLoss, allowedLoss);
        assertEquals(new BigDecimal("0.595"), excessLoss);

        // Loss percentage relative to issued fine gold
        BigDecimal actualLossPct = GoldAccountingCalculator.calculateLossPercentage(actualLoss, issuedFine);
        assertEquals(new BigDecimal("3.54"), actualLossPct); // 3.893 / 109.920 = 3.5416% -> 3.54%
    }

    @Test
    @DisplayName("Realistic Coimbatore Workshop Benchmark (1.20% Chain Category Standard)")
    void testCoimbatoreWorkshopChainBenchmark() {
        BigDecimal issuedFine = new BigDecimal("109.920");
        BigDecimal interimReturnedFine = new BigDecimal("106.027");

        // Interim actual loss
        BigDecimal interimActualLoss = GoldAccountingCalculator.calculateActualLoss(issuedFine, interimReturnedFine);
        assertEquals(new BigDecimal("3.893"), interimActualLoss);

        // Workshop category baseline for plain chain: 1.20%
        BigDecimal chainAllowancePct = new BigDecimal("1.20");
        BigDecimal allowedLoss = GoldAccountingCalculator.calculateAllowedLoss(issuedFine, chainAllowancePct);
        assertEquals(new BigDecimal("1.319"), allowedLoss); // 109.920 * 1.2% = 1.31904 -> 1.319

        // Interim excess loss before filings returned
        BigDecimal interimExcessLoss = GoldAccountingCalculator.calculateExcessLoss(interimActualLoss, allowedLoss);
        assertEquals(new BigDecimal("2.574"), interimExcessLoss);

        // Karigar returns recovered dust/filings: 3.000g gross @ 91.60%
        BigDecimal filingsGross = new BigDecimal("3.000");
        BigDecimal purity = new BigDecimal("91.60");
        BigDecimal filingsFine = GoldAccountingCalculator.calculateFineWeight(filingsGross, purity);
        assertEquals(new BigDecimal("2.748"), filingsFine);

        // Final total returned
        BigDecimal finalReturnedFine = interimReturnedFine.add(filingsFine);
        assertEquals(new BigDecimal("108.775"), finalReturnedFine);

        // Final actual loss
        BigDecimal finalActualLoss = GoldAccountingCalculator.calculateActualLoss(issuedFine, finalReturnedFine);
        assertEquals(new BigDecimal("1.145"), finalActualLoss);

        // Final excess loss is 0.000g because 1.145g <= 1.319g allowed
        BigDecimal finalExcessLoss = GoldAccountingCalculator.calculateExcessLoss(finalActualLoss, allowedLoss);
        assertEquals(new BigDecimal("-0.174"), finalExcessLoss);
        assertTrue(finalExcessLoss.compareTo(BigDecimal.ZERO) <= 0, "No positive excess loss; artisan performed better than allowance");
    }
}
