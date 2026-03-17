# tests/test_scoring.py
from scoring import compute_engagement_score

def test_practice_owner_gets_25():
    score = compute_engagement_score("Clinic Owner and Chiropractor", "Dr. Smith", {})
    assert score >= 25

def test_second_degree_gets_15():
    score = compute_engagement_score("2nd degree connection", "Dr. Smith", {})
    assert score >= 15

def test_engaged_with_content_gets_20():
    score = compute_engagement_score("Some profile text", "Dr. Smith", {"Dr. Smith": True})
    assert score >= 20

def test_cold_unknown_gets_zero():
    score = compute_engagement_score("Software engineer at tech company", "John Doe", {})
    assert score == 0

def test_max_score_is_100():
    text = "Clinic Owner, Chiropractor, 2nd degree, 1,234 connections, Posted 3 days ago"
    score = compute_engagement_score(text, "Dr. Smith", {"Dr. Smith": True})
    assert score <= 100

def test_classify_already_connected():
    from scoring import classify_prospect
    snapshot = 'button "Message Dr. Smith" [ref=e123]'
    assert classify_prospect(snapshot, "Dr. Smith", {}) == "already_connected"

def test_classify_second_degree():
    from scoring import classify_prospect
    snapshot = "Dr. Smith\n2nd degree connection\nChiropractor"
    assert classify_prospect(snapshot, "Dr. Smith", {}) == "second_degree"

def test_classify_engaged():
    from scoring import classify_prospect
    snapshot = "Dr. Smith\n3rd+ degree\nChiropractor"
    assert classify_prospect(snapshot, "Dr. Smith", {"Dr. Smith": True}) == "engaged"

def test_classify_cold():
    from scoring import classify_prospect
    snapshot = "Dr. Smith\n3rd+ degree\nChiropractor"
    assert classify_prospect(snapshot, "Dr. Smith", {}) == "cold"
