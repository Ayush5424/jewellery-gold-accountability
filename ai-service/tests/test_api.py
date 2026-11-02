from main import health_check, extract_slip

def test_health():
    res = health_check()
    assert res["status"] == "HEALTHY"

def test_extract_slip_endpoint():
    res = extract_slip(None, "Coimbatore Workshop Gross Weight: 120.000g Purity: 91.60%")
    assert res.weight == 120.0
    assert res.purity == 91.6
    assert res.status == "HIGH_CONFIDENCE_DRAFT"
    assert res.confidence >= 0.70
