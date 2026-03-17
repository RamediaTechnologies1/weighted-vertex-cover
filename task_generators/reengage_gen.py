"""Re-engagement campaign task generator."""
from models import Task
from reengage import get_reengage_action, REENGAGE_TEMPLATES
from task_generators import BaseGenerator


class ReengageGenerator(BaseGenerator):
    def generate_tasks(self, queue, prospects, rate_limiter, **kwargs):
        for username, p in prospects.items():
            if p.status != "dm_sent":
                continue
            if p.reply_count > 0:
                continue
            action = get_reengage_action(p)
            if action is None:
                continue
            action_type = "reengage_content" if action["action"] == "engage_content" else "reengage_dm"
            template_key = action["action"] if action["action"] in REENGAGE_TEMPLATES else "soft_followup"
            queue.push(Task(
                action_type=action_type,
                priority=action["priority"],
                prospect_username=username,
                prospect_name=p.name,
                metadata={"stage_index": action["stage_index"], "template_key": template_key},
            ))
