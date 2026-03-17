# tests/test_healthcare.py
from healthcare import is_healthcare_professional, HEALTHCARE_KEYWORDS

def test_chiropractor_detected():
    is_hcp, kws = is_healthcare_professional("Dr. Jane Smith, DC - Chiropractic Wellness Center")
    assert is_hcp
    assert "dc" in kws or "chiropractic" in kws

def test_physical_therapist_detected():
    is_hcp, kws = is_healthcare_professional("John Doe, DPT - Sports Rehabilitation")
    assert is_hcp

def test_non_healthcare_rejected():
    is_hcp, kws = is_healthcare_professional("Software Engineer at Google")
    assert not is_hcp
    assert kws == []

def test_case_insensitive():
    is_hcp, _ = is_healthcare_professional("CHIROPRACTOR at ABC Clinic")
    assert is_hcp

def test_keywords_list_not_empty():
    assert len(HEALTHCARE_KEYWORDS) > 20
