"""Post and group engagement task generator."""
import time
from models import Task
from config import P4_BACKGROUND
from task_generators import BaseGenerator


class EngagementGenerator(BaseGenerator):
    def __init__(self):
        self._last_post_engage = 0
        self._last_group_engage = 0

    def generate_tasks(self, queue, prospects, rate_limiter, **kwargs):
        now = time.time()
        if now - self._last_post_engage >= 2 * 3600:
            if not rate_limiter.would_exceed("comment"):
                self._last_post_engage = now
                queue.push(Task(
                    action_type="engage_post",
                    priority=P4_BACKGROUND,
                    metadata={"query": "chiropractic health wellness"},
                ))
        if now - self._last_group_engage >= 3 * 3600:
            if not rate_limiter.would_exceed("group_comment"):
                self._last_group_engage = now
                queue.push(Task(
                    action_type="engage_group",
                    priority=P4_BACKGROUND,
                    metadata={},
                ))
