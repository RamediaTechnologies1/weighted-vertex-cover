# tests/test_reengage.py
from reengage import get_reengage_action, REENGAGE_TEMPLATES
from models import Prospect
from datetime import datetime, timedelta

def test_no_action_before_3_days():
    p = Prospect(name="Dr. Smith", username="dr-smith", status="dm_sent",
                 dm_sent_at=(datetime.now() - timedelta(days=1)).isoformat())
    action = get_reengage_action(p)
    assert action is None

def test_stage_1_at_3_days():
    p = Prospect(name="Dr. Smith", username="dr-smith", status="dm_sent",
                 dm_sent_at=(datetime.now() - timedelta(days=4)).isoformat(),
                 reengage_stage=0)
    action = get_reengage_action(p)
    assert action is not None
    assert action["action"] == "engage_content"

def test_stage_2_at_7_days():
    p = Prospect(name="Dr. Smith", username="dr-smith", status="dm_sent",
                 dm_sent_at=(datetime.now() - timedelta(days=8)).isoformat(),
                 reengage_stage=1)
    action = get_reengage_action(p)
    assert action["action"] == "soft_followup"

def test_closed_after_stage_4():
    p = Prospect(name="Dr. Smith", username="dr-smith", status="dm_sent",
                 dm_sent_at=(datetime.now() - timedelta(days=35)).isoformat(),
                 reengage_stage=4)
    action = get_reengage_action(p)
    assert action is None

def test_reengage_templates_exist():
    assert "soft_followup" in REENGAGE_TEMPLATES
    assert "value_add_dm" in REENGAGE_TEMPLATES
    assert "final_close" in REENGAGE_TEMPLATES
