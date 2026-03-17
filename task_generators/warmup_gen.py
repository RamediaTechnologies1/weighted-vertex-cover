"""Warmup pipeline task generator."""
from datetime import datetime, timedelta
from models import Task, Prospect
from config import WARMUP_STAGES, FAST_TRACK_STAGES, P1_HIGH, P2_MEDIUM, P3_LOW, BATCH_LOOKAHEAD_HOURS
from scoring import compute_engagement_score
from task_generators import BaseGenerator


class WarmupGenerator(BaseGenerator):
    def generate_tasks(self, queue, prospects, rate_limiter, **kwargs):
        now = datetime.now()
        for username, p in prospects.items():
            if p.status not in ("active",) or p.pipeline_stage in ("done", "dm_ready", "dm_sent", "prospect_found"):
                continue
            stage_config = WARMUP_STAGES.get(p.pipeline_stage)
            if not stage_config:
                continue
            if p.last_action_at:
                try:
                    last = datetime.fromisoformat(p.last_action_at)
                    wait_days = stage_config["wait_days"]
                    if (now - last).days < wait_days:
                        continue
                except ValueError:
                    pass
            if p.engagement_score >= 70:
                priority = P1_HIGH
            elif p.engagement_score >= 40:
                priority = P2_MEDIUM
            else:
                priority = P3_LOW
            if p.pipeline_stage in ("connect_request", "wait_accept", "send_dm"):
                priority = P1_HIGH
            elif p.pipeline_stage in ("endorse_skills", "comment_post"):
                priority = P2_MEDIUM
            queue.push(Task(
                action_type=p.pipeline_stage,
                priority=priority,
                prospect_username=username,
                prospect_name=p.name,
            ))
