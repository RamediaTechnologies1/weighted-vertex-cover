# tests/test_task_queue.py
from task_queue import TaskQueue, RateLimiter
from models import Task
from datetime import datetime

def test_queue_returns_highest_priority():
    q = TaskQueue()
    q.push(Task(action_type="like", priority=3, prospect_username="a"))
    q.push(Task(action_type="check_inbox", priority=0, prospect_username="b"))
    q.push(Task(action_type="send_dm", priority=2, prospect_username="c"))
    task = q.pop()
    assert task.action_type == "check_inbox"
    assert task.priority == 0

def test_queue_empty_returns_none():
    q = TaskQueue()
    assert q.pop() is None

def test_queue_defer():
    q = TaskQueue()
    t = Task(action_type="send_dm", priority=2, prospect_username="a", not_before="2099-01-01T00:00:00")
    q.push(t)
    assert q.pop() is None

def test_queue_length():
    q = TaskQueue()
    q.push(Task(action_type="a", priority=1, prospect_username="x"))
    q.push(Task(action_type="b", priority=2, prospect_username="y"))
    assert len(q) == 2
    q.pop()
    assert len(q) == 1

def test_rate_limiter_allows_under_limit():
    rl = RateLimiter({"dm_send": 5})
    assert rl.would_exceed("dm_send") is False
    rl.record("dm_send")
    assert rl.would_exceed("dm_send") is False

def test_rate_limiter_blocks_at_limit():
    rl = RateLimiter({"dm_send": 2})
    rl.record("dm_send")
    rl.record("dm_send")
    assert rl.would_exceed("dm_send") is True

def test_rate_limiter_unknown_action_allowed():
    rl = RateLimiter({"dm_send": 5})
    assert rl.would_exceed("unknown_action") is False

def test_rate_limiter_resets_daily():
    rl = RateLimiter({"dm_send": 2})
    rl.record("dm_send")
    rl.record("dm_send")
    assert rl.would_exceed("dm_send") is True
    rl.reset()
    assert rl.would_exceed("dm_send") is False
