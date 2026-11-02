package com.coimbatore.jewellery.domain.accounting;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * Domain-level precision calculator for gold accounting.
 * Strictly uses BigDecimal arithmetic with standard rounding.
 * Weights are kept to 3 decimal places (0.001 g).
 * Purities and loss percentages are kept to 2 decimal places (0.01 %).
 */
public final class GoldAccountingCalculator {

    public static final int WEIGHT_SCALE = 3;
    public static final int PURITY_SCALE = 2;
    public static final int PERCENT_SCALE = 2;
    public static final RoundingMode ROUNDING_MODE = RoundingMode.HALF_UP;

    public static final BigDecimal HUNDRED = new BigDecimal("100.00");
    public static final BigDecimal ZERO_WEIGHT = BigDecimal.ZERO.setScale(WEIGHT_SCALE, ROUNDING_MODE);
    public static final BigDecimal ZERO_PERCENT = BigDecimal.ZERO.setScale(PERCENT_SCALE, ROUNDING_MODE);

    private GoldAccountingCalculator() {
        // utility class
    }

    /**
     * Calculates fine gold weight:
     * fineWeight = grossWeight * purity / 100
     */
    public static BigDecimal calculateFineWeight(BigDecimal grossWeight, BigDecimal purity) {
        validateGrossWeight(grossWeight);
        validatePurity(purity);

        return grossWeight.multiply(purity)
                .divide(HUNDRED, WEIGHT_SCALE, ROUNDING_MODE);
    }

    /**
     * Calculates allowed loss based on agreed wastage percentage:
     * allowedLoss = issuedFineWeight * allowedWastagePercent / 100
     */
    public static BigDecimal calculateAllowedLoss(BigDecimal issuedFineWeight, BigDecimal allowedWastagePercent) {
        Objects.requireNonNull(issuedFineWeight, "Issued fine weight cannot be null");
        Objects.requireNonNull(allowedWastagePercent, "Allowed wastage percent cannot be null");

        if (issuedFineWeight.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Issued fine weight cannot be negative");
        }
        if (allowedWastagePercent.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Allowed wastage percent cannot be negative");
        }

        return issuedFineWeight.multiply(allowedWastagePercent)
                .divide(HUNDRED, WEIGHT_SCALE, ROUNDING_MODE);
    }

    /**
     * Sums recovered fine weights from finished jewellery, scrap, and filings.
     */
    public static BigDecimal calculateRecoveredFineWeight(BigDecimal jewelleryFine, BigDecimal scrapFine, BigDecimal filingsFine) {
        BigDecimal j = jewelleryFine != null ? jewelleryFine : ZERO_WEIGHT;
        BigDecimal s = scrapFine != null ? scrapFine : ZERO_WEIGHT;
        BigDecimal f = filingsFine != null ? filingsFine : ZERO_WEIGHT;

        return j.add(s).add(f).setScale(WEIGHT_SCALE, ROUNDING_MODE);
    }

    /**
     * Calculates actual loss:
     * actualLoss = issuedFineWeight - recoveredFineWeight
     */
    public static BigDecimal calculateActualLoss(BigDecimal issuedFineWeight, BigDecimal recoveredFineWeight) {
        Objects.requireNonNull(issuedFineWeight, "Issued fine weight cannot be null");
        Objects.requireNonNull(recoveredFineWeight, "Recovered fine weight cannot be null");

        return issuedFineWeight.subtract(recoveredFineWeight).setScale(WEIGHT_SCALE, ROUNDING_MODE);
    }

    /**
     * Calculates excess loss:
     * excessLoss = actualLoss - allowedLoss
     * If positive, excess loss has occurred over the allowance.
     */
    public static BigDecimal calculateExcessLoss(BigDecimal actualLoss, BigDecimal allowedLoss) {
        Objects.requireNonNull(actualLoss, "Actual loss cannot be null");
        Objects.requireNonNull(allowedLoss, "Allowed loss cannot be null");

        return actualLoss.subtract(allowedLoss).setScale(WEIGHT_SCALE, ROUNDING_MODE);
    }

    /**
     * Calculates loss percentage relative to issued fine weight:
     * lossPct = (actualLoss * 100) / issuedFineWeight
     */
    public static BigDecimal calculateLossPercentage(BigDecimal actualLoss, BigDecimal issuedFineWeight) {
        Objects.requireNonNull(actualLoss, "Actual loss cannot be null");
        Objects.requireNonNull(issuedFineWeight, "Issued fine weight cannot be null");

        if (issuedFineWeight.compareTo(BigDecimal.ZERO) == 0) {
            return ZERO_PERCENT;
        }

        return actualLoss.multiply(HUNDRED)
                .divide(issuedFineWeight, PERCENT_SCALE, ROUNDING_MODE);
    }

    /**
     * Validates that gross weight is strictly positive.
     */
    public static void validateGrossWeight(BigDecimal grossWeight) {
        Objects.requireNonNull(grossWeight, "Gross weight cannot be null");
        if (grossWeight.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Gross weight must be strictly positive: " + grossWeight);
        }
    }

    /**
     * Validates purity is between 0.01% and 100.00%.
     */
    public static void validatePurity(BigDecimal purity) {
        Objects.requireNonNull(purity, "Purity cannot be null");
        if (purity.compareTo(BigDecimal.ZERO) <= 0 || purity.compareTo(HUNDRED) > 0) {
            throw new IllegalArgumentException("Purity must be between 0.01% and 100.00%: " + purity);
        }
    }
}
