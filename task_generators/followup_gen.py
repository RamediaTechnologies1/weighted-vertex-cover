"""Scheduled follow-up task generator."""
from datetime import datetime
from models import Task
from config import P1_HIGH, HUMAN_TEAM
from task_generators import BaseGenerator


class FollowupGenerator(BaseGenerator):
    def generate_tasks(self, queue, prospects, rate_limiter, **kwargs):
        now = datetime.now()
        for username, p in prospects.items():
            if p.followup_status != "pending" or not p.followup_at:
                continue
            try:
                followup_time = datetime.fromisoformat(p.followup_at)
            except ValueError:
                continue
            if now >= followup_time:
                queue.push(Task(
                    action_type="send_followup",
                    priority=P1_HIGH,
                    prospect_username=username,
                    prospect_name=p.name,
                ))
