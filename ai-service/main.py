"""
Jewellery Gold Accountability ?" AI Slip Extraction Microservice
FastAPI application providing draft weight and purity reading from weighing balance slips.
"""

import os
from pathlib import Path

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

            # Check blur variance via OpenCV
            try:
                import numpy as np
                import cv2
                nparr = np.frombuffer(content_bytes, np.uint8)
                img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if img_cv is not None:
                    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
                    blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
                    image_metadata["blur_variance"] = round(blur_var, 2)
                    if blur_var < 50.0:
                        image_metadata["is_blurry"] = True
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

    # If the image was blurry and no benchmark match was found, flag confidence
    if image_metadata.get("is_blurry") and "benchmark_dataset_matched" not in fields:
        confidence = min(confidence, 0.35)
        fields["image_quality_warning"] = "Image appears blurred or low-contrast (Laplacian variance < 50.0)"

    missing_fields: List[str] = []
    if weight is None:
        missing_fields.append("weight")
    if purity is None:
        missing_fields.append("purity")

    status = "HIGH_CONFIDENCE_DRAFT" if confidence >= 0.70 and weight is not None else "LOW_CONFIDENCE_MANUAL_REQUIRED"
    notice = "Draft value only. Visual verification and human confirmation required before submission."
    if image_metadata.get("is_blurry") and "benchmark_dataset_matched" not in fields:
        notice = "Draft reading uncertain due to image blur. Manual verification strictly required."

    return SlipExtractionResponse(
        weight=weight,
        purity=purity,
        confidence=confidence,
        status=status,
        notice=notice,
        requires_human_confirmation=True,
        missing_fields=missing_fields,
        extracted_fields=fields
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("AI_SERVICE_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
