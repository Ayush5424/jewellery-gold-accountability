import os
import io
import pytest
from PIL import Image, ImageDraw, ImageFont
import numpy as np

from app.extractor import SlipExtractor

def create_synthetic_scale_image(weight_text: str = "12.450 g", dark_lcd: bool = True) -> bytes:
    """Helper to create an in-memory PNG digital scale or slip image."""
    img = Image.new("RGB", (400, 200), color=(30, 30, 30) if dark_lcd else (255, 255, 255))
    draw = ImageDraw.Draw(img)
    text_color = (0, 255, 200) if dark_lcd else (0, 0, 0)
    # Draw simple clean text
    draw.text((50, 80), weight_text, fill=text_color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

def test_extract_from_text_standard():
    text = "METTLER TOLEDO PRECISION BALANCE\nGROSS WT: 112.450 g\nPURITY: 91.60 %"
    weight, purity, confidence, fields = SlipExtractor.extract_from_text(text)
    assert weight == 112.450
    assert purity == 91.60
    assert confidence >= 0.70

def test_extract_from_text_karat_grade():
    text = "XRF SPECTROMETER REPORT\nAU (GOLD): 75.00 %\nKARAT GRADE: 18K HALLMARK"
    weight, purity, confidence, fields = SlipExtractor.extract_from_text(text)
    assert weight is None  # No gross weight specified on assay
    assert purity == 75.00
    assert fields.get("detected_karat_token") == "18K"

def test_extract_from_text_millesimal():
    text = "GOLD BULLION RECEIPT - 999 FINE GOLD"
    weight, purity, confidence, fields = SlipExtractor.extract_from_text(text)
    assert purity == 99.90

def test_extract_from_text_low_confidence():
    text = "Completely unreadable garbled characters without any numbers or units"
    weight, purity, confidence, fields = SlipExtractor.extract_from_text(text)
    assert weight is None
    assert purity is None
    assert confidence <= 0.40

def test_extract_from_image_fixtures():
    # Test against real sample images from test-data if available
    samples_dir = os.path.join(os.path.dirname(__file__), "..", "..", "test-data", "ai-slip-samples")
    if os.path.exists(samples_dir):
        # 1. Scale 12.450g
        scale_path = os.path.join(samples_dir, "scale_01_clear_12_450g.png")
        if os.path.exists(scale_path):
            with open(scale_path, "rb") as f:
                w, p, c, m = SlipExtractor.extract_from_image(f.read())
            assert w == 12.450
            assert c >= 0.70
            assert "raw_ocr_text" in m

        # 2. Karat meter 91.60% (22K)
        purity_path = os.path.join(samples_dir, "purity_01_clear_22k_9160.png")
        if os.path.exists(purity_path):
            with open(purity_path, "rb") as f:
                w, p, c, m = SlipExtractor.extract_from_image(f.read())
            assert p == 91.60
            assert c >= 0.70

        # 3. Blurry image detection
        blur_path = os.path.join(samples_dir, "scale_06_blurry_obscured.png")
        if os.path.exists(blur_path):
            with open(blur_path, "rb") as f:
                w, p, c, m = SlipExtractor.extract_from_image(f.read())
            assert m.get("is_blurry") is True
            assert c <= 0.35
