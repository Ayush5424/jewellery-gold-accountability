"""
Jewellery Gold Accountability — AI Slip Extraction Microservice
FastAPI application providing draft weight and purity reading from weighing balance slips.
"""

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

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

    if file:
        filename = file.filename
        try:
            content_bytes = file.file.read()
            raw_content = content_bytes.decode("utf-8", errors="ignore")
        except Exception:
            raw_content = ""

    if text_hint:
        raw_content = f"{raw_content} {text_hint}".strip()

    weight, purity, confidence, fields = SlipExtractor.extract_from_text(raw_content, filename)

    status = "HIGH_CONFIDENCE_DRAFT" if confidence >= 0.70 and weight is not None else "LOW_CONFIDENCE_MANUAL_REQUIRED"

    return SlipExtractionResponse(
        weight=weight,
        purity=purity,
        confidence=confidence,
        status=status,
        notice="Draft value only. Visual verification and human confirmation required before submission.",
        extracted_fields=fields
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
