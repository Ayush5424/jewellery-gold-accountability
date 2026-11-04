from main import health_check, extract_slip
from fastapi import UploadFile
import io

def test_health():
    res = health_check()
    assert res["status"] == "HEALTHY"

def test_extract_slip_endpoint():
    res = extract_slip(None, "Coimbatore Workshop Gross Weight: 120.000g Purity: 91.60%")
    assert res.weight == 120.0
    assert res.purity == 91.6
    assert res.status == "HIGH_CONFIDENCE_DRAFT"
    assert res.confidence >= 0.70
    assert res.requires_human_confirmation is True
    assert res.missing_fields == []

def test_extract_slip_missing_purity():
    res = extract_slip(None, "Scale Gross Weight: 85.500g")
    assert res.weight == 85.500
    assert "purity" in res.missing_fields
    assert res.requires_human_confirmation is True

def test_extract_slip_with_image_upload():
    # Create a small valid test PNG image in memory using PIL
    from PIL import Image
    buf = io.BytesIO()
    img = Image.new('RGB', (100, 50), color=(255, 255, 255))
    img.save(buf, format='PNG')
    buf.seek(0)

    upload = UploadFile(filename="slip_scale_120g_916.png", file=buf)
    res = extract_slip(upload, "Weight: 120.000g 916 Hallmarked")
    assert res.weight == 120.000
    assert res.purity == 91.60
    assert "image_metadata" in res.extracted_fields
    assert res.extracted_fields["image_metadata"]["format"] == "PNG"
