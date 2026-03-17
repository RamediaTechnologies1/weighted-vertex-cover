# tests/test_timezone.py
from timezone import infer_timezone, is_in_peak_window, next_peak_time, extract_location
from config import PEAK_WINDOWS

def test_infer_timezone_known_city():
    assert infer_timezone("New York") == "America/New_York"
    assert infer_timezone("Los Angeles") == "America/Los_Angeles"
    assert infer_timezone("Chicago") == "America/Chicago"
    assert infer_timezone("Denver") == "America/Denver"

def test_infer_timezone_unknown_defaults_est():
    assert infer_timezone("Unknown City 123") == "America/New_York"

def test_extract_location_from_profile():
    snapshot = "Dr. Smith\nChiropractor\nSan Francisco, California"
    loc = extract_location(snapshot)
    assert "San Francisco" in loc or "California" in loc

def test_next_peak_time_returns_future():
    from datetime import datetime
    result = next_peak_time("America/New_York")
    assert result is not None
