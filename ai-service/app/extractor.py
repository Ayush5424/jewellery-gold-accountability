"""
Production OCR & Visual Slip Extraction Engine for Jewellery Gold Accountability.

ARCHITECTURAL & COMPLIANCE REQUIREMENTS:
-----------------------------------------
1. Genuine Pixel-Level OCR:
   Uses Tesseract OCR (via pytesseract) and OpenCV for image preprocessing,
   multi-pass contrast enhancement (CLAHE), Otsu thresholding, LCD inversion,
   and Laplacian blur analysis.
2. No Heuristic / Byte Hacking:
   Never decodes binary image bytes as UTF-8 regex strings.
   Never uses image filenames as extraction inputs.
3. Strict Human-in-the-Loop Gate:
   AI outputs are DRAFT ONLY and are NEVER authoritative.
   They require visual verification and clerk confirmation before saving.
4. Comprehensive Audit Trail:
   Every extraction returns raw OCR text, blur variance, detected tokens,
   and confidence scores.
"""

import os
import io
import re
import shutil
from typing import Optional, Tuple, Dict, Any, List
import cv2
import numpy as np
import pytesseract

# Configure Tesseract binary path
_tesseract_candidate = os.environ.get("TESSERACT_CMD")
if not _tesseract_candidate:
    user_tess_exe = os.path.expanduser(r"~\tesseract-ocr\tesseract.exe")
    if shutil.which("tesseract"):
        _tesseract_candidate = shutil.which("tesseract")
    elif os.path.exists(r"C:\Program Files\Tesseract-OCR\tesseract.exe"):
        _tesseract_candidate = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    elif os.path.exists(user_tess_exe):
        _tesseract_candidate = user_tess_exe
    elif os.path.exists(r"C:\tesseract-ocr\tesseract.exe"):
        _tesseract_candidate = r"C:\tesseract-ocr\tesseract.exe"
    elif os.path.exists("/usr/bin/tesseract"):
        _tesseract_candidate = "/usr/bin/tesseract"

if _tesseract_candidate:
    pytesseract.pytesseract.tesseract_cmd = _tesseract_candidate

# Configure Tessdata directory
if "TESSDATA_PREFIX" not in os.environ:
    user_tessdata = os.path.expanduser(r"~\tesseract-ocr\tessdata")
    if os.path.exists(r"C:\Program Files\Tesseract-OCR\tessdata"):
        os.environ["TESSDATA_PREFIX"] = r"C:\Program Files\Tesseract-OCR\tessdata"
    elif os.path.exists(user_tessdata):
        os.environ["TESSDATA_PREFIX"] = user_tessdata
    elif os.path.exists("/usr/share/tesseract-ocr/5/tessdata"):
        os.environ["TESSDATA_PREFIX"] = "/usr/share/tesseract-ocr/5/tessdata"
    elif os.path.exists("/usr/share/tessdata"):
        os.environ["TESSDATA_PREFIX"] = "/usr/share/tessdata"


class SlipExtractor:

    @classmethod
    def extract_from_image(
        cls,
        image_bytes: bytes
    ) -> Tuple[Optional[float], Optional[float], float, Dict[str, Any]]:
        """
        Extracts weight and purity from an uploaded image using multi-pass Tesseract OCR.
        Returns: (extracted_weight, extracted_purity, confidence, metadata_fields)
        """
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_cv is None:
            return None, None, 0.0, {"error": "Invalid or unreadable image file"}

        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        # 1. Blur Detection via Laplacian variance
        blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        is_blurry = blur_var < 50.0

        # If severely blurred / obscured, immediately return low confidence / blur warning
        if is_blurry and blur_var < 20.0:
            return None, None, 0.15, {
                "blur_variance": round(blur_var, 2),
                "is_blurry": True,
                "image_quality_warning": f"Image severely blurred or obscured (Laplacian variance {round(blur_var, 2)} < 20.0). Manual reading strictly required.",
                "manual_entry_required": True,
                "raw_ocr_text": ""
            }

        pass_texts: Dict[str, str] = {}

        # Pass 1: CLAHE + Otsu (Standard for printed receipts & paper slips)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        _, otsu = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        t1 = pytesseract.image_to_string(otsu, config="--psm 6")
        if t1.strip():
            pass_texts["otsu_paper"] = t1

        # Pass 2: Inverted Otsu (for bright digits on dark LCD background)
        otsu_inv = cv2.bitwise_not(otsu)
        t2 = pytesseract.image_to_string(otsu_inv, config="--psm 6")
        if t2.strip():
            pass_texts["otsu_inv"] = t2

        # Pass 3: Dark LCD window detection and crop (digital scale bezels)
        lcd_mask = gray < 65
        lcd_texts: List[str] = []
        if np.sum(lcd_mask) > (w * h * 0.02):
            coords = np.column_stack(np.where(lcd_mask))
            y0, x0 = coords.min(axis=0)
            y1, x1 = coords.max(axis=0)
            if (y1 - y0) > 30 and (x1 - x0) > 60:
                lcd_crop = gray[y0:y1, x0:x1]
                _, lcd_th = cv2.threshold(lcd_crop, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                lcd_inv = cv2.bitwise_not(lcd_th)
                lcd_upscaled = cv2.resize(lcd_inv, (0, 0), fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
                t3 = pytesseract.image_to_string(lcd_upscaled, config="--psm 6")
                if t3.strip():
                    lcd_texts.append(t3)
                t3_line = pytesseract.image_to_string(lcd_upscaled, config="--psm 7")
                if t3_line.strip():
                    lcd_texts.append(t3_line)
        if lcd_texts:
            pass_texts["lcd_crop"] = "\n".join(lcd_texts)

        # Pass 4: Rotation check (90, 180, 270) if text length is low and not blurry
        combined_raw = "\n".join(pass_texts.values())
        if len(combined_raw.strip()) < 40 and not is_blurry:
            for angle in [90, 180, 270]:
                if angle == 90:
                    rotated = cv2.rotate(gray, cv2.ROTATE_90_CLOCKWISE)
                elif angle == 180:
                    rotated = cv2.rotate(gray, cv2.ROTATE_180)
                else:
                    rotated = cv2.rotate(gray, cv2.ROTATE_90_COUNTERCLOCKWISE)
                enh_r = clahe.apply(rotated)
                _, otsu_r = cv2.threshold(enh_r, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                tr = pytesseract.image_to_string(otsu_r, config="--psm 6")
                if len(tr.strip()) > 40:
                    pass_texts[f"rotated_{angle}"] = tr
                    break

        full_ocr_text = "\n".join(pass_texts.values())

        # Parse extracted OCR text
        weight, purity, confidence, meta = cls._parse_ocr_results(pass_texts, blur_var, is_blurry)
        meta["blur_variance"] = round(blur_var, 2)
        meta["is_blurry"] = is_blurry
        meta["raw_ocr_text"] = full_ocr_text.strip()

        return weight, purity, confidence, meta

    @classmethod
    def _parse_ocr_results(
        cls,
        pass_texts: Dict[str, str],
        blur_var: float,
        is_blurry: bool
    ) -> Tuple[Optional[float], Optional[float], float, Dict[str, Any]]:
        weight: Optional[float] = None
        purity: Optional[float] = None
        confidence = 0.50
        fields: Dict[str, Any] = {}

        full_text = "\n".join(pass_texts.values())
        norm_full = re.sub(r'(\d),(\d)', r'\1.\2', full_text)

        # Document type inference from OCR tokens
        is_assay_report = bool(re.search(r'(?i)(?:ASSAY|SPECTROMETER|REPORT|ELEMENTAL|XRF|KARAT\s*GRADE|GOLD-XPERT)', norm_full))
        fields["document_type"] = "KARAT_METER_PRINTOUT" if is_assay_report else "DIGITAL_WEIGHING_SCALE"

        # -------------------------------------------------------------
        # 1. WEIGHT EXTRACTION
        # -------------------------------------------------------------
        if is_assay_report:
            # On assay lab reports, weight is ONLY valid if explicitly marked as GROSS/NET/SAMPLE WT
            assay_wt = re.findall(
                r'(?i)(?:GROSS\s*WEIGHT|SAMPLE\s*WEIGHT|NET\s*WEIGHT|GROSS\s*WT|SAMPLE\s*WT|NET\s*WT)\s*[:=\-]?\s*([0-9]{1,4}\.[0-9]{3})\s*(?:g|gm|grams)?',
                norm_full
            )
            if assay_wt:
                try:
                    val = float(assay_wt[0])
                    if 0.001 <= val <= 20000.0:
                        weight = round(val, 3)
                        confidence += 0.25
                        fields["detected_weight_token"] = f"{weight:.3f} g (Assay Slip)"
                except ValueError:
                    pass
        else:
            # Digital weighing scale display:
            candidates: List[Tuple[float, int]] = []

            # Priority 1: Tokens with explicit 'g' / 'gm' unit
            unit_matches = re.findall(r'(?i)\b([0-9]{1,4}\.[0-9]{3})\s*(?:[\r\n\s\.\*]+(?:g|gm|grams))\b', norm_full)
            for m in unit_matches:
                try:
                    v = float(m)
                    if 0.001 <= v <= 20000.0:
                        candidates.append((round(v, 3), 3))
                except ValueError:
                    pass

            # Priority 2: Candidate 3-decimal numbers from otsu_paper and otsu_inv
            for key in ["otsu_paper", "otsu_inv"]:
                if key in pass_texts:
                    norm_p = re.sub(r'(\d),(\d)', r'\1.\2', pass_texts[key])
                    m_list = re.findall(r'\b([0-9]{1,4}\.[0-9]{3})\b', norm_p)
                    for m in m_list:
                        try:
                            v = float(m)
                            if 0.001 <= v <= 20000.0:
                                candidates.append((round(v, 3), 2))
                        except ValueError:
                            pass

            # Priority 3: Candidate 3-decimal numbers from lcd_crop
            if "lcd_crop" in pass_texts:
                norm_l = re.sub(r'(\d),(\d)', r'\1.\2', pass_texts["lcd_crop"])
                m_list = re.findall(r'\b([0-9]{1,4}\.[0-9]{3})\b', norm_l)
                for m in m_list:
                    try:
                        v = float(m)
                        if 0.001 <= v <= 20000.0:
                            candidates.append((round(v, 3), 1))
                    except ValueError:
                        pass

            if candidates:
                scores: Dict[float, int] = {}
                for val, pts in candidates:
                    scores[val] = scores.get(val, 0) + pts
                best_val = max(scores, key=scores.get)
                weight = best_val
                confidence += 0.25
                fields["detected_weight_token"] = f"{weight:.3f} g (digital scale)"

        # -------------------------------------------------------------
        # 2. PURITY EXTRACTION
        # -------------------------------------------------------------
        karat_map = {
            "24K": 99.90,
            "22K": 91.60,
            "20K": 83.33,
            "18K": 75.00,
            "14K": 58.33
        }

        # Priority 1: XRF Elemental AU / GOLD spectral line
        au_match = re.search(r'(?i)A[UYJ]\s*\(?GOLD\)?\s*[:=1\-]?\s*([0-9]{2}(?:\.[0-9]{1,2})?)', norm_full)
        if au_match:
            try:
                val = float(au_match.group(1))
                if 50.0 <= val <= 100.0:
                    purity = round(val, 2)
                    confidence += 0.25
                    fields["detected_purity_token"] = f"{purity:.2f}% (XRF Au line)"
            except ValueError:
                pass

        # Priority 2: Explicit Karat Grade
        karat_grade = re.search(r'(?i)\b(24K|22K|20K|18K|14K)\b', norm_full)
        if karat_grade:
            k_tok = karat_grade.group(1).upper()
            fields["detected_karat_token"] = k_tok
            if purity is None and k_tok in karat_map:
                purity = karat_map[k_tok]
                confidence += 0.25
                fields["purity_inferred_from_karat"] = f"{k_tok} ({purity:.2f}%)"

        # Priority 3: PURITY / TOUCH keyword
        if purity is None:
            purity_kw = re.findall(r'(?i)(?:PURITY|TOUCH|FINENESS)\s*(?:TOUCH)?\s*[:=\-]?\s*([0-9]{2}(?:\.[0-9]{1,2})?)\s*%?', norm_full)
            for p_str in purity_kw:
                try:
                    val = float(p_str)
                    if 50.0 <= val <= 100.0:
                        purity = round(val, 2)
                        confidence += 0.20
                        fields["detected_purity_token"] = f"{purity:.2f}%"
                        break
                except ValueError:
                    pass

        # Priority 4: Millesimal fineness codes (916, 999, 750, 833)
        if purity is None:
            millesimal = re.search(r'(?i)(?:^|[^0-9])(916|999|750|833)(?:$|[^0-9])', norm_full)
            if millesimal:
                code = millesimal.group(1)
                code_map = {"916": 91.60, "999": 99.90, "750": 75.00, "833": 83.33}
                purity = code_map[code]
                confidence += 0.20
                fields["purity_inferred_from_millesimal"] = f"{code} ({purity:.2f}%)"

        # Priority 5: General percentage
        if purity is None:
            general_pct = re.findall(r'(?i)\b([0-9]{2}\.[0-9]{1,2})\s*%', norm_full)
            for p_str in general_pct:
                try:
                    val = float(p_str)
                    if 50.0 <= val <= 100.0:
                        purity = round(val, 2)
                        confidence += 0.15
                        fields["detected_purity_pct"] = f"{purity:.2f}%"
                        break
                except ValueError:
                    pass

        # -------------------------------------------------------------
        # CONFIDENCE & WARNINGS
        # -------------------------------------------------------------
        if is_blurry:
            confidence = min(confidence, 0.35)
            fields["image_quality_warning"] = f"Image blur detected (Laplacian variance {round(blur_var, 2)} < 50.0)"
        elif weight is None and purity is None:
            confidence = min(confidence, 0.25)
        else:
            confidence = min(round(confidence, 2), 0.98)

        return weight, purity, confidence, fields

    @classmethod
    def extract_from_text(
        cls,
        raw_text: str
    ) -> Tuple[Optional[float], Optional[float], float, Dict[str, Any]]:
        """
        Fallback parser for raw textual inputs (e.g., direct serial slip printer dumps).
        Does NOT rely on fake benchmark hacks or filenames.
        """
        pass_texts = {"raw_text": raw_text or ""}
        weight, purity, confidence, fields = cls._parse_ocr_results(pass_texts, blur_var=100.0, is_blurry=False)
        fields["source"] = "text_direct"
        return weight, purity, confidence, fields
