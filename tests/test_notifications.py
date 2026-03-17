# tests/test_notifications.py
import tempfile
import json
import os
from notifications import Notifier
from models import Prospect, load_prospects, save_prospects

def test_record_handoff_updates_prospect(tmp_path):
    prospects_path = str(tmp_path / "prospects.json")
    p = Prospect(name="Dr. Smith", username="dr-smith")
    save_prospects({"dr-smith": p}, prospects_path)
    n = Notifier(notify_email="test@test.com", prospects_path=prospects_path)
    n.record_handoff("dr-smith", "INTERESTED")
    loaded = load_prospects(prospects_path)
    assert loaded["dr-smith"].handoff_reason == "INTERESTED"
    assert loaded["dr-smith"].handoff_at != ""

def test_build_email_body():
    n = Notifier(notify_email="test@test.com", prospects_path="/tmp/none.json")
    subject, body = n._build_email("Dr. Smith", "INTERESTED", "They want to learn more")
    assert "Dr. Smith" in subject
    assert "INTERESTED" in subject
    assert "They want to learn more" in body
