"""DM sending task generator."""
from datetime import datetime
from models import Task, Prospect
from config import P2_MEDIUM
from timezone import is_in_peak_window
from task_generators import BaseGenerator


class OutreachGenerator(BaseGenerator):
    def __init__(self, ab_tester):
        self._ab_tester = ab_tester

    def generate_tasks(self, queue, prospects, rate_limiter, **kwargs):
        if rate_limiter.would_exceed("dm_send"):
            return
        for username, p in prospects.items():
            if p.pipeline_stage != "dm_ready" or p.status != "active":
                continue
            if p.dm_sent_at:
                continue
            if not is_in_peak_window(p.timezone):
                continue
            variant_info = self._ab_tester.assign_variant(username)
            queue.push(Task(
                action_type="send_dm",
                priority=P2_MEDIUM,
                prospect_username=username,
                prospect_name=p.name,
                metadata={"variant_info": variant_info},
            ))
