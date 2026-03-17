# tests/test_generators/test_warmup_gen.py
from task_generators.warmup_gen import WarmupGenerator
from task_queue import TaskQueue, RateLimiter
from models import Prospect
from config import DAILY_LIMITS
from datetime import datetime, timedelta

def test_generates_task_for_due_prospect():
    q = TaskQueue()
    rl = RateLimiter(DAILY_LIMITS)
    p = Prospect(name="Dr. Smith", username="dr-smith", status="active",
                 pipeline_stage="view_profile",
                 last_action_at=(datetime.now() - timedelta(days=2)).isoformat())
    gen = WarmupGenerator()
    gen.generate_tasks(q, {"dr-smith": p}, rl)
    assert len(q) == 1

def test_skips_prospect_not_due():
    q = TaskQueue()
    rl = RateLimiter(DAILY_LIMITS)
    p = Prospect(name="Dr. Smith", username="dr-smith", status="active",
                 pipeline_stage="view_profile",
                 last_action_at=datetime.now().isoformat())
    gen = WarmupGenerator()
    gen.generate_tasks(q, {"dr-smith": p}, rl)
    assert len(q) == 0

def test_skips_done_prospects():
    q = TaskQueue()
    rl = RateLimiter(DAILY_LIMITS)
    p = Prospect(name="Dr. Smith", username="dr-smith", status="active",
                 pipeline_stage="done")
    gen = WarmupGenerator()
    gen.generate_tasks(q, {"dr-smith": p}, rl)
    assert len(q) == 0

def test_high_score_gets_higher_priority():
    q = TaskQueue()
    rl = RateLimiter(DAILY_LIMITS)
    p = Prospect(name="Dr. Smith", username="dr-smith", status="active",
                 pipeline_stage="like_posts", engagement_score=80,
                 last_action_at=(datetime.now() - timedelta(days=2)).isoformat())
    gen = WarmupGenerator()
    gen.generate_tasks(q, {"dr-smith": p}, rl)
    task = q.pop()
    assert task.priority <= 1
