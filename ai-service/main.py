"""
Jewellery Gold Accountability — AI Slip Extraction Microservice
FastAPI application providing draft weight and purity reading from weighing balance slips.
"""

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import io

from app.models import SlipExtractionResponse
from app.extractor import SlipExtractor

app = FastAPI(
    title="Jewellery Gold Slip AI Extraction Service",
    description="Draft reader for Coimbatore jewellery workshop digital scale slips",
    version="1.0.0"
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
    return {"status": "HEALTHY", "service": "gold-slip-ai-extractor"}

@app.post("/extract-slip", response_model=SlipExtractionResponse)
def extract_slip(
    file: Optional[UploadFile] = File(None),
    text_hint: Optional[str] = Form(None)
):
    raw_content = ""
    filename = None
    image_metadata = {}

    if file:
        filename = file.filename
        try:
            content_bytes = file.file.read()
            # Check if it's an image via PIL
            try:
                from PIL import Image
                img = Image.open(io.BytesIO(content_bytes))
                image_metadata = {
                    "format": img.format,
                    "width": img.width,
                    "height": img.height,
                    "mode": img.mode,
                }
            except Exception:
                pass

            # Also attempt decoding text if it's a plain slip text/ascii format
            raw_content = content_bytes.decode("utf-8", errors="ignore")
        except Exception:
            raw_content = ""

    if text_hint:
        raw_content = f"{raw_content} {text_hint}".strip()

    weight, purity, confidence, fields = SlipExtractor.extract_from_text(raw_content, filename)
    if image_metadata:
        fields["image_metadata"] = image_metadata

    missing_fields: List[str] = []
    if weight is None:
        missing_fields.append("weight")
    if purity is None:
        missing_fields.append("purity")

    status = "HIGH_CONFIDENCE_DRAFT" if confidence >= 0.70 and weight is not None else "LOW_CONFIDENCE_MANUAL_REQUIRED"

    return SlipExtractionResponse(
        weight=weight,
        purity=purity,
        confidence=confidence,
        status=status,
        notice="Draft value only. Visual verification and human confirmation required before submission.",
        requires_human_confirmation=True,
        missing_fields=missing_fields,
        extracted_fields=fields
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
