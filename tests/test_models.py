# tests/test_models.py
import json
from models import Prospect, Task, FunnelEvent, TaskResult, prospect_to_dict, prospect_from_dict, load_prospects, save_prospects
import tempfile
import os

def test_prospect_defaults():
    p = Prospect(name="Dr. Smith", username="dr-smith")
    assert p.classification == "cold"
    assert p.engagement_score == 0
    assert p.pipeline_stage == "prospect_found"
    assert p.status == "active"
    assert p.reengage_stage == 0

def test_prospect_roundtrip():
    p = Prospect(name="Dr. Smith", username="dr-smith", headline="Chiropractor", engagement_score=75)
    d = prospect_to_dict(p)
    p2 = prospect_from_dict(d)
    assert p2.name == "Dr. Smith"
    assert p2.engagement_score == 75
    assert p2.headline == "Chiropractor"

def test_task_priority_ordering():
    t1 = Task(action_type="check_inbox", priority=0, prospect_username="a")
    t2 = Task(action_type="send_dm", priority=2, prospect_username="b")
    assert t1.priority < t2.priority

def test_funnel_event_to_dict():
    e = FunnelEvent(prospect_name="Dr. Smith", prospect_username="dr-smith", event_type="dm_sent", metadata={"variant": "a"})
    d = e.to_dict()
    assert d["event_type"] == "dm_sent"
    assert "timestamp" in d

def test_load_save_prospects_roundtrip():
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "prospects.json")
        prospects = {
            "dr-smith": Prospect(name="Dr. Smith", username="dr-smith"),
            "jane-dc": Prospect(name="Jane DC", username="jane-dc", engagement_score=50),
        }
        save_prospects(prospects, path)
        loaded = load_prospects(path)
        assert len(loaded) == 2
        assert loaded["jane-dc"].engagement_score == 50

def test_load_prospects_missing_file():
    loaded = load_prospects("/nonexistent/path.json")
    assert loaded == {}

def test_task_result_enum():
    assert TaskResult.SUCCESS != TaskResult.FAILED
    assert TaskResult.ELEMENT_NOT_FOUND != TaskResult.ERROR
