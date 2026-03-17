# tests/test_analytics.py
import json
import os
import tempfile
from analytics import Analytics
from models import Task, TaskResult

def test_log_event_creates_file():
    with tempfile.TemporaryDirectory() as tmpdir:
        a = Analytics(data_dir=tmpdir)
        task = Task(action_type="dm_send", priority=2, prospect_username="dr-smith", prospect_name="Dr. Smith")
        a.log_event(task, TaskResult.SUCCESS, metadata={"variant": "a"})
        path = os.path.join(tmpdir, "analytics.json")
        assert os.path.exists(path)
        with open(path) as f:
            line = f.readline()
            event = json.loads(line)
            assert event["event_type"] == "dm_send"
            assert event["result"] == "success"
            assert event["prospect_username"] == "dr-smith"

def test_log_event_appends():
    with tempfile.TemporaryDirectory() as tmpdir:
        a = Analytics(data_dir=tmpdir)
        t1 = Task(action_type="like", priority=3, prospect_username="a")
        t2 = Task(action_type="comment", priority=3, prospect_username="b")
        a.log_event(t1, TaskResult.SUCCESS)
        a.log_event(t2, TaskResult.FAILED)
        path = os.path.join(tmpdir, "analytics.json")
        with open(path) as f:
            lines = f.readlines()
            assert len(lines) == 2

def test_daily_summary():
    with tempfile.TemporaryDirectory() as tmpdir:
        a = Analytics(data_dir=tmpdir)
        for i in range(3):
            t = Task(action_type="dm_send", priority=2, prospect_username=f"u{i}")
            a.log_event(t, TaskResult.SUCCESS)
        t = Task(action_type="like", priority=3, prospect_username="x")
        a.log_event(t, TaskResult.SUCCESS)
        summary = a.generate_daily_summary()
        assert summary["dm_send"] == 3
        assert summary["like"] == 1
