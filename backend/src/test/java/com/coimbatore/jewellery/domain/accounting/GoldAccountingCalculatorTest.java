package com.coimbatore.jewellery.domain.accounting;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GoldAccountingCalculatorTest {

    @Test
    @DisplayName("Calculate fine gold for 120.000g at 91.60% purity returns 109.920g")
    void testStandardFineGoldCalculation() {
        BigDecimal gross = new BigDecimal("120.000");
        BigDecimal purity = new BigDecimal("91.60");

        BigDecimal fine = GoldAccountingCalculator.calculateFineWeight(gross, purity);

        assertThat(fine).isEqualByComparingTo("109.920");
    }

    @Test
    @DisplayName("Verify Part 3 Assignment Sample Calculation (120g @ 91.60% with 3% wastage)")
    void testPart3AssignmentSampleCalculation() {
        // Issue: 120.000g @ 91.60% -> 109.920g fine, allowed wastage: 3.00%
        BigDecimal grossIssue = new BigDecimal("120.000");
        BigDecimal purity = new BigDecimal("91.60");
        BigDecimal issuedFine = GoldAccountingCalculator.calculateFineWeight(grossIssue, purity);
        assertThat(issuedFine).isEqualByComparingTo("109.920");

        BigDecimal allowedWastagePct = new BigDecimal("3.00");
        BigDecimal allowedLoss = GoldAccountingCalculator.calculateAllowedLoss(issuedFine, allowedWastagePct);
        // 109.920 * 3 / 100 = 3.2976 -> rounds to 3.298g
        assertThat(allowedLoss).isEqualByComparingTo("3.298");

        // Receipt 1: Jewellery 112.450g @ 91.60% -> 103.004g
        BigDecimal r1Fine = GoldAccountingCalculator.calculateFineWeight(new BigDecimal("112.450"), purity);
        assertThat(r1Fine).isEqualByComparingTo("103.004");

        // Receipt 2: Scrap 3.300g @ 91.60% -> 3.023g
        BigDecimal r2Fine = GoldAccountingCalculator.calculateFineWeight(new BigDecimal("3.300"), purity);
        assertThat(r2Fine).isEqualByComparingTo("3.023");

        // Total recovered fine
        BigDecimal recoveredFine = GoldAccountingCalculator.calculateRecoveredFineWeight(r1Fine, r2Fine, BigDecimal.ZERO);
        assertThat(recoveredFine).isEqualByComparingTo("106.027");

        // Outstanding fine gold before reconciliation: 3.893g
        BigDecimal outstanding = issuedFine.subtract(recoveredFine);
        assertThat(outstanding).isEqualByComparingTo("3.893");

        // Actual loss after reconciliation: 3.893g
        BigDecimal actualLoss = GoldAccountingCalculator.calculateActualLoss(issuedFine, recoveredFine);
        assertThat(actualLoss).isEqualByComparingTo("3.893");

        // Excess loss: 3.893 - 3.298 = 0.595g
        BigDecimal excessLoss = GoldAccountingCalculator.calculateExcessLoss(actualLoss, allowedLoss);
        assertThat(excessLoss).isEqualByComparingTo("0.595");
    }

    @Test
    @DisplayName("Verify Murugesan S reference benchmark dataset exact precision")
    void testMurugesanSBenchmarkDataset() {
        // Issue
        BigDecimal issueGross = new BigDecimal("120.000");
        BigDecimal issuePurity = new BigDecimal("91.60");
        BigDecimal issuedFine = GoldAccountingCalculator.calculateFineWeight(issueGross, issuePurity);
        assertThat(issuedFine).isEqualByComparingTo("109.920");

        // Jewellery Receipt
        BigDecimal jewelleryGross = new BigDecimal("112.450");
        BigDecimal jewelleryFine = GoldAccountingCalculator.calculateFineWeight(jewelleryGross, issuePurity);
        // 112.450 * 91.60 / 100 = 103.0042 -> rounds to 103.004
        assertThat(jewelleryFine).isEqualByComparingTo("103.004");

        // Scrap Receipt
        BigDecimal scrapGross = new BigDecimal("3.300");
        BigDecimal scrapFine = GoldAccountingCalculator.calculateFineWeight(scrapGross, issuePurity);
        // 3.300 * 91.60 / 100 = 3.0228 -> rounds to 3.023
        assertThat(scrapFine).isEqualByComparingTo("3.023");

        // Filings Receipt (none recorded yet at interim stage)
        BigDecimal filingsFine = BigDecimal.ZERO;

        BigDecimal recoveredFine = GoldAccountingCalculator.calculateRecoveredFineWeight(jewelleryFine, scrapFine, filingsFine);
        assertThat(recoveredFine).isEqualByComparingTo("106.027");

        // Remaining gold balance
        BigDecimal remaining = GoldAccountingCalculator.calculateActualLoss(issuedFine, recoveredFine);
        assertThat(remaining).isEqualByComparingTo("3.893");
    }

    @Test
    @DisplayName("Calculate allowed wastage and detect excess loss correctly")
    void testAllowedAndExcessLoss() {
        BigDecimal issuedFine = new BigDecimal("109.920");
        BigDecimal allowedWastagePct = new BigDecimal("1.20"); // 1.20%

        // 109.920 * 1.20 / 100 = 1.31904 -> rounds to 1.319
        BigDecimal allowedLoss = GoldAccountingCalculator.calculateAllowedLoss(issuedFine, allowedWastagePct);
        assertThat(allowedLoss).isEqualByComparingTo("1.319");

        // Case 1: Reconciled actual loss is 1.250g (within allowance)
        BigDecimal actualLoss1 = new BigDecimal("1.250");
        BigDecimal excessLoss1 = GoldAccountingCalculator.calculateExcessLoss(actualLoss1, allowedLoss);
        assertThat(excessLoss1).isEqualByComparingTo("-0.069");
        assertThat(excessLoss1.compareTo(BigDecimal.ZERO)).isLessThan(0); // No excess loss

        // Case 2: Reconciled actual loss is 1.600g (breaches allowance)
        BigDecimal actualLoss2 = new BigDecimal("1.600");
        BigDecimal excessLoss2 = GoldAccountingCalculator.calculateExcessLoss(actualLoss2, allowedLoss);
        assertThat(excessLoss2).isEqualByComparingTo("0.281");
        assertThat(excessLoss2.compareTo(BigDecimal.ZERO)).isGreaterThan(0); // Excess loss alert required
    }

    @Test
    @DisplayName("Calculate loss percentage relative to issued fine weight")
    void testLossPercentage() {
        BigDecimal actualLoss = new BigDecimal("0.231");
        BigDecimal issuedFine = new BigDecimal("109.920");

        // 0.231 * 100 / 109.920 = 0.21015% -> 0.21%
        BigDecimal lossPct = GoldAccountingCalculator.calculateLossPercentage(actualLoss, issuedFine);
        assertThat(lossPct).isEqualByComparingTo("0.21");
    }

    @ParameterizedTest
    @ValueSource(strings = {"0.000", "-1.000", "-0.001"})
    @DisplayName("Reject invalid gross weights")
    void testInvalidGrossWeights(String weight) {
        assertThatThrownBy(() -> GoldAccountingCalculator.validateGrossWeight(new BigDecimal(weight)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0.00", "-0.01", "100.01", "120.00"})
    @DisplayName("Reject invalid purity values")
    void testInvalidPurities(String purity) {
        assertThatThrownBy(() -> GoldAccountingCalculator.validatePurity(new BigDecimal(purity)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
