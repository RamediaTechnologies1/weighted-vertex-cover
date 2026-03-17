#!/usr/bin/env python3
"""
Orchestrator v3 - Runs ALL LinkedIn automation modules in PARALLEL.

All 7 modules run as separate processes simultaneously. They share a single
browser session via BrowserLock — only one module uses the browser at a time,
but all modules are active and ready to work.

Modules:
1. Reply Handler     - Monitor inbox, email leads (every 5 min)
2. Outreach Bot      - Send DMs to connections (every 3-5 min)
3. Warm-Up Engine    - View profiles, like, endorse, connect (every 30 min)
4. Post Engager      - Comment on healthcare posts + follow-up DMs (every 2 hr)
5. Group Engager     - Engage in LinkedIn groups (every 3 hr)
6. Prospector        - Search for new chiropractors (every 4 hr)
7. Content Poster    - Post credibility content (every 6 hr)

Each module has its own internal scheduling and sleep intervals.
The browser lock ensures they take turns using the browser.
"""
import subprocess
import time
import os
import sys
import signal
from datetime import datetime

LOG_FILE = os.path.expanduser("~/openclaw/linkedin-agent/orchestrator.log")
BASE_DIR = os.path.expanduser("~/openclaw/linkedin-agent")

# All modules to run in parallel
MODULES = {
    "outreach":      "linkedin_bot.py",
    "replies":       "reply_handler.py",
    "warmup":        "warmup_engine.py",
    "post_engage":   "post_engager.py",
    "group_engage":  "group_engager.py",
    "prospector":    "prospector.py",
    "content_post":  "content_poster.py",
}

# How long to wait before restarting a crashed module
RESTART_DELAY = 30

processes = {}


def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [ORCHESTRATOR] {msg}"
    print(line)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")


def cleanup(signum=None, frame=None):
    log("Shutting down all modules...")
    for name, proc in processes.items():
        try:
            proc.terminate()
            proc.wait(timeout=5)
            log(f"  Stopped {name}")
        except Exception:
            try:
                proc.kill()
                log(f"  Force-killed {name}")
            except Exception:
                pass
    log("All modules stopped.")
    sys.exit(0)


signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)


def start_module(module_name):
    """Start a module as a background process."""
    script = os.path.join(BASE_DIR, MODULES[module_name])
    if not os.path.exists(script):
        log(f"ERROR: {script} not found, cannot start {module_name}")
        return None

    log(f"  Starting {module_name}...")
    proc = subprocess.Popen(
        [sys.executable, script],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        cwd=BASE_DIR,
    )
    processes[module_name] = proc
    log(f"  {module_name} started (PID: {proc.pid})")
    return proc


def check_and_restart_modules():
    """Check if any modules have crashed and restart them."""
    for name in list(MODULES.keys()):
        proc = processes.get(name)

        if proc is None or proc.poll() is not None:
            exit_code = proc.returncode if proc else "never started"
            if proc is not None:
                log(f"  {name} exited (code: {exit_code}), restarting...")
            start_module(name)
            time.sleep(2)  # Stagger restarts


def get_daily_stats():
    """Get today's activity counts from tracking files."""
    today = datetime.now().strftime("%Y-%m-%d")

    def count_today(filepath):
        count = 0
        if os.path.exists(filepath):
            with open(filepath) as f:
                for line in f:
                    if today in line:
                        count += 1
        return count

    stats = {
        "outreach_sent": count_today(os.path.join(BASE_DIR, "messaged.txt")),
        "comments_posted": count_today(os.path.join(BASE_DIR, "commented_posts.txt")),
        "group_comments": count_today(os.path.join(BASE_DIR, "group_comments.txt")),
        "warmup_actions": count_today(os.path.join(BASE_DIR, "warmup_pipeline.txt")),
        "prospects_found": count_today(os.path.join(BASE_DIR, "prospects_found.txt")),
        "content_posts": count_today(os.path.join(BASE_DIR, "posted_content.txt")),
    }
    return stats


def main():
    log("=" * 60)
    log("ORCHESTRATOR v3 — PARALLEL MODE")
    log("=" * 60)
    log(f"Launching {len(MODULES)} modules in parallel:")
    for name, script in MODULES.items():
        log(f"  - {name} ({script})")
    log("All modules share a single browser via BrowserLock")
    log("=" * 60)

    # Launch all modules
    for name in MODULES:
        start_module(name)
        time.sleep(3)  # Stagger launches by 3 seconds

    log(f"All {len(MODULES)} modules launched!")

    # Monitor loop — check health and log stats
    while True:
        time.sleep(60)  # Check every minute

        # Check for crashed modules and restart
        check_and_restart_modules()

        # Log stats every 15 minutes
        if datetime.now().minute % 15 == 0:
            stats = get_daily_stats()
            alive = sum(1 for p in processes.values() if p and p.poll() is None)
            log(f"STATUS: {alive}/{len(MODULES)} modules alive | Stats: {stats}")


if __name__ == "__main__":
    main()
