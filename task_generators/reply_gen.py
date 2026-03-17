"""Inbox check and reply classification task generator."""
import time
from datetime import datetime
from models import Task
from config import P0_CRITICAL, REPLY_CHECK_INTERVAL_SECONDS, HUMAN_TEAM
from task_generators import BaseGenerator


class ReplyGenerator(BaseGenerator):
    def __init__(self):
        self._last_check = 0

    def generate_tasks(self, queue, prospects, rate_limiter, **kwargs):
        now = time.time()
        if now - self._last_check < REPLY_CHECK_INTERVAL_SECONDS:
            return
        self._last_check = now
        queue.push(Task(
            action_type="check_inbox",
            priority=P0_CRITICAL,
            metadata={"check_time": datetime.now().isoformat()},
        ))
