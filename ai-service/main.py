"""
Jewellery Gold Accountability — AI Slip Extraction Microservice
FastAPI application providing OCR-driven draft weight and purity readings
from weighing balance slips and digital scale displays.
"""

import os
from pathlib import Path
from typing import Optional, List
import io

# Automatically load environment variables from root .env if present
try:
    from dotenv import load_dotenv
    root_env = Path(__file__).resolve().parent.parent / ".env"
    if root_env.exists():
        load_dotenv(dotenv_path=root_env)
    else:
        load_dotenv()
except ImportError:
    pass

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware

from app.models import SlipExtractionResponse
from app.extractor import SlipExtractor

app = FastAPI(
    title="Jewellery Gold Slip AI Extraction Service",
    description="Genuine Tesseract OCR reader for Coimbatore jewellery workshop weighing scales and karat meters",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "HEALTHY", "service": "gold-slip-ai-extractor", "ocr_engine": "Tesseract OCR"}

@app.post("/extract-slip", response_model=SlipExtractionResponse)
async def extract_slip(
    file: Optional[UploadFile] = File(None),
    text_hint: Optional[str] = Form(None)
):
    """
    Extracts draft weight and gold purity from uploaded scale/assay photos.
    Uses pixel-level Tesseract OCR and OpenCV preprocessing.
    Compliance: AI readings are drafts only; human confirmation is mandatory.
    """
    weight = None
    purity = None
    confidence = 0.0
    fields = {}

    if file:
        content_bytes = await file.read()
        if content_bytes and len(content_bytes) > 0:
            weight, purity, confidence, fields = SlipExtractor.extract_from_image(content_bytes)
    elif text_hint:
        weight, purity, confidence, fields = SlipExtractor.extract_from_text(text_hint)
    else:
        return SlipExtractionResponse(
            weight=None,
            purity=None,
            confidence=0.0,
            status="LOW_CONFIDENCE_MANUAL_REQUIRED",
            notice="No image or slip text provided.",
            requires_human_confirmation=True,
            missing_fields=["weight", "purity"],
            raw_ocr_text="",
            extracted_fields={"error": "Empty request payload"}
        )

    # Determine missing fields
    missing_fields: List[str] = []
    if weight is None:
        missing_fields.append("weight")
    if purity is None:
        missing_fields.append("purity")

    is_blurry = fields.get("is_blurry", False)
    manual_required = fields.get("manual_entry_required", False)

    if is_blurry or manual_required or confidence < 0.70:
        status = "LOW_CONFIDENCE_MANUAL_REQUIRED"
    elif weight is not None or purity is not None:
        status = "HIGH_CONFIDENCE_DRAFT"
    else:
        status = "LOW_CONFIDENCE_MANUAL_REQUIRED"

    notice = "Draft reading only. Visual verification and human confirmation required before saving."
    if is_blurry:
        notice = "Draft reading uncertain due to image blur or poor contrast. Manual verification strictly required."
    elif manual_required:
        notice = "Slip could not be read with confidence. Manual entry required."

    raw_ocr = fields.get("raw_ocr_text", "")

    return SlipExtractionResponse(
        weight=weight,
        purity=purity,
        confidence=confidence,
        status=status,
        notice=notice,
        requires_human_confirmation=True,
        missing_fields=missing_fields,
        raw_ocr_text=raw_ocr,
        extracted_fields=fields
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("AI_SERVICE_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
