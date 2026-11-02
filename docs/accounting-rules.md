# Coimbatore Jewellery Chain — Gold Accounting Rules

## 1. Core Principles
* **Single Source of Truth**: The immutable Gold Ledger (`gold_ledger_entry`) records all physical movements of fine gold. Balances, job totals, and vault statements are transactionally computed from the ledger.
* **No Direct Floating Point**: Float and double are strictly forbidden for weights and purity. All arithmetic uses `java.math.BigDecimal` with `RoundingMode.HALF_UP`.
* **Precision Standards**:
  * Gross & Fine Gold Weight: **3 decimal places** (`0.001 g`)
  * Purity Percentage: **2 decimal places** (`0.01 %`)
  * Loss & Variance: **3 decimal places** (`0.001 g`)

## 2. Fine Gold Formula
$$\text{fineWeight} = \frac{\text{grossWeight} \times \text{purity}}{100}$$

Example:
$$120.000\text{ g} \times \frac{91.60}{100} = 109.920\text{ g}$$

## 3. Wastage & Loss Equations for Job Reconciliation
* **Allowed Wastage / Loss**:
  $$\text{allowedLoss} = \text{issuedFineWeight} \times \frac{\text{allowedWastagePct}}{100}$$
* **Recovered Fine Weight**:
  $$\text{recoveredFineWeight} = \text{jewelleryFineWeight} + \text{scrapFineWeight} + \text{filingsFineWeight}$$
* **Actual Loss**:
  $$\text{actualLoss} = \text{issuedFineWeight} - \text{recoveredFineWeight}$$
* **Excess Loss**:
  $$\text{excessLoss} = \text{actualLoss} - \text{allowedLoss}$$

### Important Domain Invariant
An **unfinished** job (`OPEN` or `IN_PROGRESS`) has an **outstanding gold balance**, never an actual loss:
$$\text{outstandingFineWeight} = \text{issuedFineWeight} - \text{recoveredFineWeight}$$
Final loss is only evaluated when the job moves to `READY_FOR_RECONCILIATION` and is finalized as `RECONCILED` by the Finance Head.

## 4. Job Lifecycle State Transitions
1. `OPEN`: Order created, specifications assigned, allowed wastage percentage set.
2. `IN_PROGRESS`: Gold issued to karigar via `ISSUE` voucher(s).
3. `READY_FOR_RECONCILIATION`: Karigar has returned finished jewellery, scrap, and filings. Outstanding physical gold is accounted for.
4. `RECONCILED`: Reconciled by Finance Head. If `excessLoss > 0`, flagged with a review alert. Once reconciled, job is locked from further mutations unless formally reopened with a supervisor reversal entry.

## 5. Loss Detection Models
1. **Rule-Based Allowance Breach**:
   $$\text{actualLoss} > \text{allowedLoss}$$
   Generates a non-accusatory warning: *"Review recommended: actual loss exceeds agreed wastage allowance."*
2. **Historical Baseline Drift**:
   Evaluates a karigar's performance across their last $N$ completed jobs (minimum $N \ge 5$ required to avoid false positives). If:
   $$\text{currentLossPct} > \text{baselineAveragePct} + \text{driftTolerance}$$
   Generates: *"Review recommended: current loss is above the karigar's recent baseline."*
