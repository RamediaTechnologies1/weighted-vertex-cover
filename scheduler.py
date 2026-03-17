# scheduler.py
"""Central scheduler — main entry point replacing orchestrator.py."""
import os
import sys
import time
import signal
import random
from datetime import datetime

from config import (
    DATA_DIR, TEMPLATES_DIR, DAILY_LIMITS, PAUSE_BETWEEN_TASKS_RANGE,
    CONSECUTIVE_FAILURE_THRESHOLD, FAILURE_PAUSE_SECONDS, NOTIFY_EMAIL,
    MAX_TASK_RETRIES, BASE_DIR, WARMUP_STAGES,
)
from models import Task, TaskResult, load_prospects, save_prospects
from task_queue import TaskQueue, RateLimiter
from task_executor import TaskExecutor
from analytics import Analytics
from notifications import Notifier
from ab_testing import ABTester

from task_generators.reply_gen import ReplyGenerator
from task_generators.followup_gen import FollowupGenerator
from task_generators.warmup_gen import WarmupGenerator
from task_generators.outreach_gen import OutreachGenerator
from task_generators.prospector_gen import ProspectorGenerator
from task_generators.engagement_gen import EngagementGenerator
from task_generators.content_gen import ContentGenerator
from task_generators.reengage_gen import ReengageGenerator

LOG_FILE = os.path.join(BASE_DIR, "scheduler.log")
PROSPECTS_PATH = os.path.join(DATA_DIR, "prospects.json")

running = True


def log(msg: str) -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [SCHEDULER] {msg}"
    print(line)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")


def handle_shutdown(signum, frame):
    global running
    log("Shutdown signal received, finishing current task...")
    running = False


signal.signal(signal.SIGINT, handle_shutdown)
signal.signal(signal.SIGTERM, handle_shutdown)


def main():
    log("=" * 60)
    log("LinkedIn Agent v2 — Central Scheduler")
    log("=" * 60)

    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(TEMPLATES_DIR, exist_ok=True)

    analytics = Analytics(data_dir=DATA_DIR)
    notifier = Notifier(notify_email=NOTIFY_EMAIL, prospects_path=PROSPECTS_PATH)
    ab_tester = ABTester(templates_dir=TEMPLATES_DIR, data_dir=DATA_DIR)
    rate_limiter = RateLimiter(DAILY_LIMITS)
    queue = TaskQueue()

    prospects = load_prospects(PROSPECTS_PATH)
    log(f"Loaded {len(prospects)} prospects")

    executor = TaskExecutor(prospects, analytics, notifier, ab_tester)

    generators = [
        ReplyGenerator(),
        FollowupGenerator(),
        WarmupGenerator(),
        OutreachGenerator(ab_tester),
        ProspectorGenerator(),
        EngagementGenerator(),
        ContentGenerator(),
        ReengageGenerator(),
    ]

    consecutive_failures = 0
    last_daily_reset = datetime.now().date()
    last_save = time.time()

    log(f"Starting scheduler with {len(generators)} generators")

    while running:
        try:
            today = datetime.now().date()
            if today != last_daily_reset:
                rate_limiter.reset()
                summary = analytics.generate_daily_summary(last_daily_reset.isoformat())
                analytics.save_daily_summary(summary)
                log(f"Daily reset. Yesterday's stats: {summary}")
                last_daily_reset = today

            for gen in generators:
                try:
                    gen.generate_tasks(queue, prospects, rate_limiter)
                except Exception as e:
                    log(f"Generator error: {e}")

            task = queue.pop()

            if task is None:
                time.sleep(30)
                continue

            if rate_limiter.would_exceed(task.action_type):
                log(f"Rate limit reached for {task.action_type}, skipping")
                continue

            log(f"Executing: {task.action_type} for {task.prospect_name or 'N/A'}")
            result = executor.run(task)

            analytics.log_event(task, result)

            if result == TaskResult.SUCCESS:
                consecutive_failures = 0
                rate_limiter.record(task.action_type)

                if task.prospect_username and task.prospect_username in prospects:
                    p = prospects[task.prospect_username]
                    p.last_action_at = datetime.now().isoformat()
                    p.last_processed_at = datetime.now().isoformat()

                    if task.action_type in WARMUP_STAGES:
                        next_stage = WARMUP_STAGES[task.action_type].get("next")
                        if next_stage:
                            p.pipeline_stage = next_stage

                    if task.action_type == "send_dm":
                        p.status = "dm_sent"
                        p.dm_sent_at = datetime.now().isoformat()
                        variant_info = task.metadata.get("variant_info", {})
                        p.template_variant = variant_info.get("template", "")
                        p.opener_prompt_variant = variant_info.get("opener_prompt", "")

                    if task.action_type == "send_followup":
                        p.followup_status = "sent"

                    if task.action_type in ("reengage_content", "reengage_dm"):
                        stage_idx = task.metadata.get("stage_index", 0)
                        p.reengage_stage = stage_idx + 1
                        p.reengage_last_at = datetime.now().isoformat()
                        if p.reengage_stage >= 4:
                            p.status = "closed"

                    if task.action_type == "wait_accept" and result == TaskResult.SUCCESS:
                        p.connected = True
                        p.pipeline_stage = "dm_ready"

                    if task.action_type == "connect_request":
                        p.connect_requested_at = datetime.now().isoformat()

                log(f"Result: {result.value}")

            elif result in (TaskResult.FAILED, TaskResult.ERROR):
                consecutive_failures += 1
                if task.retry_count < MAX_TASK_RETRIES:
                    task.retry_count += 1
                    queue.push(task)
                    log(f"Retrying task (attempt {task.retry_count})")

                if consecutive_failures >= CONSECUTIVE_FAILURE_THRESHOLD:
                    log(f"{CONSECUTIVE_FAILURE_THRESHOLD} consecutive failures, pausing {FAILURE_PAUSE_SECONDS}s")
                    time.sleep(FAILURE_PAUSE_SECONDS)
                    consecutive_failures = 0

            if time.time() - last_save > 60:
                save_prospects(prospects, PROSPECTS_PATH)
                last_save = time.time()

            pause = random.uniform(*PAUSE_BETWEEN_TASKS_RANGE)
            time.sleep(pause)

        except Exception as e:
            log(f"Scheduler error: {e}")
            time.sleep(10)

    save_prospects(prospects, PROSPECTS_PATH)
    log("Scheduler stopped.")


if __name__ == "__main__":
    main()
