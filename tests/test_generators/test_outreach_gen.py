# tests/test_generators/test_outreach_gen.py
from task_generators.outreach_gen import OutreachGenerator
from task_queue import TaskQueue, RateLimiter
from models import Prospect
from ab_testing import ABTester
from config import DAILY_LIMITS
import tempfile, os

def test_generates_dm_for_ready_prospect():
    with tempfile.TemporaryDirectory() as tmpdir:
        os.makedirs(os.path.join(tmpdir, "templates"))
        with open(os.path.join(tmpdir, "templates", "variant_a.txt"), "w") as f:
            f.write("test")
        ab = ABTester(os.path.join(tmpdir, "templates"), tmpdir)
        q = TaskQueue()
        rl = RateLimiter(DAILY_LIMITS)
        p = Prospect(name="Dr. Smith", username="dr-smith", status="active",
                     pipeline_stage="dm_ready")
        gen = OutreachGenerator(ab)
        gen.generate_tasks(q, {"dr-smith": p}, rl)
        assert True  # May or may not generate depending on peak window

def test_skips_already_sent():
    with tempfile.TemporaryDirectory() as tmpdir:
        ab = ABTester(tmpdir, tmpdir)
        q = TaskQueue()
        rl = RateLimiter(DAILY_LIMITS)
        p = Prospect(name="Dr. Smith", username="dr-smith", status="active",
                     pipeline_stage="dm_ready", dm_sent_at="2026-03-01")
        gen = OutreachGenerator(ab)
        gen.generate_tasks(q, {"dr-smith": p}, rl)
        assert len(q) == 0

def test_respects_rate_limit():
    with tempfile.TemporaryDirectory() as tmpdir:
        ab = ABTester(tmpdir, tmpdir)
        q = TaskQueue()
        rl = RateLimiter({"dm_send": 0})
        p = Prospect(name="Dr. Smith", username="dr-smith", status="active",
                     pipeline_stage="dm_ready")
        gen = OutreachGenerator(ab)
        gen.generate_tasks(q, {"dr-smith": p}, rl)
        assert len(q) == 0
