# AI Scale-Slip & Karat-Meter Photo-Reading Test Report
**Jewellery Gold Accountability Platform**  
*End-to-End Image Extraction Audit & Verification*

---

## 1. Executive Summary

This report documents the rigorous, evidence-based end-to-end audit of the AI photo-reading feature of the Jewellery Gold Accountability System against the original Isocode Labs assignment requirements:

1. **AI Reading of Scale Displays & Karat-Meter Slips**: Evaluated using 12 realistic synthetic photographic test fixtures (6 digital scales, 6 karat-meter slips) generated with realistic fonts, LCD backlights, thermal paper textures, perspective angles, glare, and blur.
2. **Side-by-Side Verification**: Verified in the React frontend ([`AiSlipExtractionPage.tsx`](../frontend/src/pages/AiSlipExtractionPage.tsx)) where the original photographic slip is rendered in Column 1 directly adjacent to the extracted values and confirmation form in Column 2.
3. **Discrepancy Mismatch Gate**: Verified in the frontend. When typed values differ from AI readings, saving to the ledger is strictly blocked until the Issue Clerk acknowledges the discrepancy and records a manual override reason.
4. **Human-in-the-Loop Confirmation**: Verified end-to-end. AI outputs are non-authoritative candidate drafts; no transaction can be recorded into the authoritative PostgreSQL gold ledger without authenticated clerk review and confirmation.

---

## 2. Test Dataset & Ground-Truth Manifest

All test samples are stored in [`test-data/ai-slip-samples/`](./ai-slip-samples/) and cataloged in [`manifest.json`](./ai-slip-samples/manifest.json).

| # | Filename | Category | Photographic Condition | Ground-Truth Weight | Ground-Truth Purity | Expected Behavior |
| :-: | :--- | :--- | :--- | :-: | :-: | :--- |
| **01** | `scale_01_clear_12_450g.png` | Digital Scale | Clear, sharp LCD | 12.450 g | — | Successful Extraction |
| **02** | `scale_02_clear_25_680g.png` | Digital Scale | Clear, sharp LCD | 25.680 g | — | Successful Extraction |
| **03** | `scale_03_clear_8_125g.png` | Digital Scale | Clear, sharp LCD | 8.125 g | — | Successful Extraction |
| **04** | `scale_04_angled_15_300g.png` | Digital Scale | 3D perspective angled | 15.300 g | — | Successful Extraction |
| **05** | `scale_05_glare_45_200g.png` | Digital Scale | Specular reflection / glare | 45.200 g | — | Extraction or Glare Warning |
| **06** | `scale_06_blurry_obscured.png` | Digital Scale | Severe defocus blur & shadow | 30.100 g | — | Low Confidence / Blur Warning |
| **07** | `purity_01_clear_22k_9160.png` | Karat-Meter | Clear 22K thermal slip | — | 91.60 % | Successful Extraction |
| **08** | `purity_02_clear_18k_7500.png` | Karat-Meter | Clear 18K thermal slip | — | 75.00 % | Successful Extraction |
| **09** | `purity_03_clear_20k_8333.png` | Karat-Meter | Clear 20K thermal slip | — | 83.33 % | Successful Extraction |
| **10** | `slip_04_dual_weight_purity_50g_9160.png` | Karat-Meter | Dual weight & purity slip | 50.000 g | 91.60 % | Successful Dual Extraction |
| **11** | `slip_05_rotated_poor_light.png` | Karat-Meter | 12° rotated, lighting gradient | — | 91.60 % | Extraction or Warning |
| **12** | `slip_06_obscured_missing_purity.png` | Karat-Meter | Weight present; purity torn | 34.250 g | — | Partial Extraction / Warning |

---

## 3. Actual AI Microservice API Execution Results

* **Endpoint Tested**: `POST http://localhost:8000/extract-slip` (multipart/form-data upload)
* **Microservice Implementation**: FastAPI, OpenCV (`cv2`), PIL, heuristic regex parser ([`ai-service/app/extractor.py`](../ai-service/app/extractor.py)).
* **Execution Date**: 2026-11-05 13:16:45 IST

### Detailed Sample-by-Sample Results Table

| # | Filename | Ground-Truth (Exp) | Extracted (Act) | Confidence | OpenCV Blur Var | Quality Flag | API Evaluation Verdict |
| :-: | :--- | :--- | :--- | :-: | :-: | :---: | :--- |
| **01** | `scale_01_clear_12_450g.png` | `12.450 g`, `—` | `3.300 g`, `91.60 %` | 0.95 | 1045.46 | Sharp | **INCORRECT** (False Benchmark Collision) |
| **02** | `scale_02_clear_25_680g.png` | `25.680 g`, `—` | `3.300 g`, `91.60 %` | 0.95 | 1058.94 | Sharp | **INCORRECT** (False Benchmark Collision) |
| **03** | `scale_03_clear_8_125g.png` | `8.125 g`, `—` | `3.300 g`, `91.60 %` | 0.95 | 1027.42 | Sharp | **INCORRECT** (False Benchmark Collision) |
| **04** | `scale_04_angled_15_300g.png` | `15.300 g`, `—` | `3.300 g`, `91.60 %` | 0.95 | 459.98 | Sharp | **INCORRECT** (False Benchmark Collision) |
| **05** | `scale_05_glare_45_200g.png` | `45.200 g`, `—` | `3.300 g`, `91.60 %` | 0.95 | 77.56 | Sharp | **INCORRECT** (False Benchmark Collision) |
| **06** | `scale_06_blurry_obscured.png` | `30.100 g`, `—` | `None`, `None` | **0.20** | **1.03** | **BLURRY** | **CORRECT_WARNING** (Accurately Flagged Blur) |
| **07** | `purity_01_clear_22k_9160.png` | `—`, `91.60 %` | `3.300 g`, `91.60 %` | 0.95 | 3535.06 | Sharp | **PARTIAL** (Purity matched coincidentally) |
| **08** | `purity_02_clear_18k_7500.png` | `—`, `75.00 %` | `3.300 g`, `91.60 %` | 0.95 | 3519.20 | Sharp | **INCORRECT** (Missed 75.00% purity) |
| **09** | `purity_03_clear_20k_8333.png` | `—`, `83.33 %` | `3.300 g`, `91.60 %` | 0.95 | 3533.56 | Sharp | **INCORRECT** (Missed 83.33% purity) |
| **10** | `slip_04_dual_weight_purity_50g_9160.png` | `50.000 g`, `91.60 %` | `3.300 g`, `91.60 %` | 0.95 | 4016.06 | Sharp | **PARTIAL** (Purity matched; weight missed) |
| **11** | `slip_05_rotated_poor_light.png` | `—`, `91.60 %` | `3.300 g`, `91.60 %` | 0.95 | 843.03 | Sharp | **PARTIAL** (Purity matched coincidentally) |
| **12** | `slip_06_obscured_missing_purity.png` | `34.250 g`, `—` | `3.300 g`, `91.60 %` | 0.95 | **11.65** | **BLURRY** | **INCORRECT** (False purity assigned) |

### Statistical Summary
* **Total Images Tested**: 12
* **Correct Full Extractions**: **0 / 12 (0.0%)**
* **Correct Quality / Blur Rejections**: **1 / 12 (8.3%)** (`scale_06_blurry_obscured.png` accurately detected as blurred with variance 1.03)
* **Partial Extractions (Purity matched by coincidence)**: **3 / 12 (25.0%)** (Samples 07, 10, 11)
* **Incorrect Extractions**: **8 / 12 (66.7%)**
* **OpenCV Blur Detection Accuracy**: **2 / 2 (100%)** (Both blurry samples, Sample 06 with variance 1.03 and Sample 12 with variance 11.65, were correctly flagged with `is_blurry = True` based on the $\sigma^2 < 50.0$ threshold).

---

## 4. Root-Cause Analysis of API Extraction Deficiencies

An architectural inspection of [`ai-service/app/extractor.py`](../ai-service/app/extractor.py) and [`ai-service/main.py`](../ai-service/main.py) explains why the standalone OCR extraction fails on arbitrary real images:

1. **Absence of a Genuine Optical Character Recognition (OCR) Engine**:
   - The microservice does **not** integrate Tesseract OCR, EasyOCR, or a visual vision model.
   - When an image file (PNG/JPEG) is uploaded, [`main.py`](../ai-service/main.py#L88) executes:
     ```python
     raw_content = content_bytes.decode("utf-8", errors="ignore")
     ```
   - In standard compressed binary image files, decoding raw binary bytes as UTF-8 produces random ASCII characters rather than the printed text visually depicted on the image.

2. **Premature Short-Circuit on `"3g"` Substring Collision**:
   - In [`ai-service/app/extractor.py`](../ai-service/app/extractor.py#L56):
     ```python
     if "scrap_3g" in lower_text or "3.30" in lower_text or "3g" in lower_text:
         extracted_weight = 3.300
         extracted_purity = 91.60
         confidence = 0.95
         extracted_fields["benchmark_dataset_matched"] = "Clean_Scrap_Receipt_3.300g"
         return extracted_weight, extracted_purity, confidence, extracted_fields
     ```
   - In any binary PNG payload of 300KB–700KB, the 2-character ASCII sequence `"3g"` appears naturally by byte coincidence.
   - Consequently, the extractor erroneously matched the hardcoded `Clean_Scrap_Receipt_3.300g` benchmark rule on almost every image, overwriting the actual image content with `3.300 g` and `91.60%` at 95% confidence.

3. **What Actually Functions Reliably in the AI Service**:
   - **OpenCV Blur Variance Inspection**: `cv2.Laplacian(gray, cv2.CV_64F).var()` functions reliably. Sharp scale displays yielded variances $> 1000$, while blurred sample 06 yielded $1.03$ and obscured sample 12 yielded $11.65$. Both properly triggered `image_metadata.is_blurry = True`.
   - **Filename & Metadata Parsing**: When given text hints or descriptive filenames (e.g., `slip_issue_120g_murugesan.png`), the regex parser correctly extracts tokens.

---

## 5. Frontend Integration & Discrepancy Gate Verification

The complete end-to-end Issue Clerk workflow was verified against the business safeguards:

1. **Side-by-Side Photographic Display**:
   - Uploading a photo renders the visual image preview in Column 1 ([`AiSlipExtractionPage.tsx`](../frontend/src/pages/AiSlipExtractionPage.tsx#L358-L382)) directly alongside the draft candidate values and editable confirmation form in Column 2.
2. **Editable Weight & Purity Form**:
   - The clerk is never locked into the AI draft; `grossWeight` and `purity` are fully editable numeric inputs.
3. **Discrepancy Mismatch Gate**:
   - Implemented in [`AiSlipExtractionPage.tsx`](../frontend/src/pages/AiSlipExtractionPage.tsx#L162-L177).
   - If the clerk edits the weight or purity to correct an erroneous AI draft (e.g. typing `12.450 g` when AI suggested `3.300 g`):
     - The application immediately flags the mismatch:  
       `• Gross Weight: AI read 3.300 g vs Typed 12.450 g`
     - **Saving is strictly blocked**: The submit button is disabled (`Resolve Mismatch to Save`).
     - Clicking submit triggers error: `"Saving is blocked: The manually typed value differs from the AI reading."`
4. **Resolution Process**:
   - The clerk must provide an explicit explanation in the override reason field (e.g., *"Visual comparison of scale photograph confirms 12.450g; AI reading had optical reflection"*) and click **"Confirm Manual Override & Resolve"**.
   - Only after resolution is the button unlocked (`Confirm & Post Transaction to Ledger`).
   - The ledger entry records `aiExtracted: true` and appends `[Manual Override: <reason>]` to the immutable audit remarks.
5. **No Automatic Acceptance**:
   - Under no circumstances does the application automatically post an AI reading without manual review, job selection, and explicit button submission.

---

## 6. End-to-End Live Workflow Verification

The complete pipeline was tested across both running services (FastAPI on port 8000 and Spring Boot on port 8080):

1. **Authentication**: Issue clerk logged in via `POST /api/auth/login` (credentials `issue_clerk` / `clerk123`), receiving JWT bearer token.
2. **Image Upload**: Uploaded `test-data/ai-slip-samples/scale_01_clear_12_450g.png` to `POST http://localhost:8000/extract-slip`.
3. **Discrepancy Override**: Clerk detected the erroneous draft (`3.300 g`), typed the ground-truth value (`12.450 g`), and resolved the discrepancy with audit note *"Visual comparison of scale photograph confirms 12.450g gross weight; AI draft 3.300g overridden by Issue Clerk."*
4. **Authoritative Ledger Posting**: Posted to `POST /api/issue` with payload:
   ```json
   {
     "jobId": 3,
     "grossWeight": 12.450,
     "purity": 91.60,
     "remarks": "AI Scale Photo Verified [scale_01_clear_12_450g.png] [Manual Override: Visual comparison confirms 12.450g]",
     "aiExtracted": true,
     "idempotencyKey": "e2e-debug-issue-002"
   }
   ```
5. **Observed Output**:
   - **Voucher Number**: `VCH-20261105-979308`
   - **Gross Weight**: `12.450 g`
   - **Purity**: `91.60 %`
   - **Fine Gold Calculated**: `11.404 g` ($12.450 	imes 91.60 / 100$)
   - **AI Flag**: `true`
   - **Immutable Audit Remarks**: `"AI Scale Photo Verified [scale_01_clear_12_450g.png] [Manual Override: Visual comparison confirms 12.450g]"`

---

## 7. Conclusions & Requirements Assessment

| Assignment Requirement | Actual Status | Justification & Observable Evidence |
| :--- | :---: | :--- |
| **1. AI reads photos of scale displays / printouts** | **DEFICIENT / HEURISTIC ONLY** | The AI microservice lacks a real OCR engine (e.g. Tesseract). Image bytes decoded as UTF-8 cause false token collisions (the `"3g"` bug), preventing visual character reading from image pixels. |
| **2. Photo displayed alongside reading** | **SATISFIED (PASS)** | [`AiSlipExtractionPage.tsx`](../frontend/src/pages/AiSlipExtractionPage.tsx) renders the uploaded photo in Column 1 directly next to extracted fields in Column 2. |
| **3. Mismatch blocks saving until resolved** | **SATISFIED (PASS)** | When typed input differs from the AI reading, the submit CTA is disabled with `"Resolve Mismatch to Save"`. Clerk must provide an override explanation and acknowledge before posting. |
| **4. No automatic acceptance without human confirmation** | **SATISFIED (PASS)** | Verified end-to-end. AI readings populate draft inputs only; authenticated clerk review and button confirmation are mandatory before any write to PostgreSQL. |
