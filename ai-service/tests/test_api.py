import os
import io
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"
    assert "Tesseract" in data["ocr_engine"]

def test_extract_slip_text_hint():
    res = client.post("/extract-slip", data={"text_hint": "GROSS WEIGHT: 120.000 g PURITY: 91.60 %"})
    assert res.status_code == 200
    data = res.json()
    assert data["weight"] == 120.000
    assert data["purity"] == 91.60
    assert data["status"] == "HIGH_CONFIDENCE_DRAFT"
    assert data["requires_human_confirmation"] is True
    assert data["missing_fields"] == []

def test_extract_slip_missing_purity():
    res = client.post("/extract-slip", data={"text_hint": "Scale Gross Weight: 85.500 g"})
    assert res.status_code == 200
    data = res.json()
    assert data["weight"] == 85.500
    assert "purity" in data["missing_fields"]
    assert data["requires_human_confirmation"] is True

def test_extract_slip_with_image_upload():
    samples_dir = os.path.join(os.path.dirname(__file__), "..", "..", "test-data", "ai-slip-samples")
    sample_file = os.path.join(samples_dir, "scale_01_clear_12_450g.png")
    
    if os.path.exists(sample_file):
        with open(sample_file, "rb") as f:
            res = client.post(
                "/extract-slip",
                files={"file": ("scale_01.png", f, "image/png")}
            )
        assert res.status_code == 200
        data = res.json()
        assert data["weight"] == 12.450
        assert data["status"] == "HIGH_CONFIDENCE_DRAFT"
        assert data["requires_human_confirmation"] is True
        assert "raw_ocr_text" in data
        assert "12.450" in data["raw_ocr_text"]

def test_extract_slip_blurry_image_rejection():
    samples_dir = os.path.join(os.path.dirname(__file__), "..", "..", "test-data", "ai-slip-samples")
    sample_file = os.path.join(samples_dir, "scale_06_blurry_obscured.png")
    
    if os.path.exists(sample_file):
        with open(sample_file, "rb") as f:
            res = client.post(
                "/extract-slip",
                files={"file": ("scale_06_blur.png", f, "image/png")}
            )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "LOW_CONFIDENCE_MANUAL_REQUIRED"
        assert data["requires_human_confirmation"] is True
        assert data["extracted_fields"].get("is_blurry") is True

def test_empty_request():
    res = client.post("/extract-slip")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "LOW_CONFIDENCE_MANUAL_REQUIRED"
    assert data["weight"] is None
    assert data["purity"] is None
