# tests/test_config.py
from config import DAILY_LIMITS, PEAK_WINDOWS, REENGAGE_STAGES, WARMUP_STAGES, HUMAN_TEAM, DATA_DIR

def test_daily_limits_has_all_action_types():
    required = ["dm_send", "connection_request", "comment", "like", "profile_view", "endorsement", "content_post", "group_comment"]
    for action in required:
        assert action in DAILY_LIMITS, f"Missing rate limit for {action}"
        assert isinstance(DAILY_LIMITS[action], int)
        assert DAILY_LIMITS[action] > 0

def test_peak_windows_are_valid_hours():
    for start, end in PEAK_WINDOWS:
        assert 0 <= start < 24
        assert 0 < end <= 24
        assert start < end

def test_reengage_stages_ordered():
    days = [s["days_after_dm"] for s in REENGAGE_STAGES]
    assert days == sorted(days), "Re-engagement stages must be in chronological order"

def test_warmup_stages_form_chain():
    stages = list(WARMUP_STAGES.keys())
    for i, stage in enumerate(stages[:-1]):
        assert WARMUP_STAGES[stage]["next"] == stages[i + 1]

def test_data_dir_path():
    assert DATA_DIR.endswith("data")
