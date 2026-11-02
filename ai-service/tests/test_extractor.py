import pytest
from app.extractor import SlipExtractor

def test_extract_murugesan_benchmark():
    text = "Coimbatore Central Workshop - Slip #104 - Karigar: Murugesan S - Gross Weight: 120.000g - 916 Gold"
    weight, purity, confidence, fields = SlipExtractor.extract_from_text(text)
    
    assert weight == 120.000
    assert purity == 91.60
    assert confidence >= 0.70

def test_extract_digital_scale_slip():
    text = "METTLER TOLEDO PRECISION BALANCE\nDATE: 2026-11-02\nWT: 112.450 g\nPURITY: 91.60 %"
    weight, purity, confidence, fields = SlipExtractor.extract_from_text(text)
    
    assert weight == 112.450
    assert purity == 91.60
    assert confidence >= 0.80

def test_extract_scrap_slip():
    text = "WORKSHOP SCRAP RETURN\nNET WT: 3.300 g\nTOUCH: 91.60"
    weight, purity, confidence, fields = SlipExtractor.extract_from_text(text)
    
    assert weight == 3.300
    assert purity == 91.60

def test_low_confidence_unclear_input():
    text = "Random blurry text without numbers"
    weight, purity, confidence, fields = SlipExtractor.extract_from_text(text)
    
    assert weight is None
    assert confidence <= 0.40
