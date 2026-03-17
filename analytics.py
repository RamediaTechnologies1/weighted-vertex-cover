# analytics.py
"""Event logging, funnel tracking, and daily summary generation."""
import json
import os
from datetime import datetime
from models import Task, TaskResult


class Analytics:
    def __init__(self, data_dir: str):
        self._data_dir = data_dir
        self._analytics_file = os.path.join(data_dir, "analytics.json")
        os.makedirs(data_dir, exist_ok=True)

    def log_event(self, task: Task, result: TaskResult, metadata: dict = None) -> None:
        """Append an analytics event (one JSON object per line)."""
        event = {
            "timestamp": datetime.now().isoformat(),
            "event_type": task.action_type,
            "prospect_name": task.prospect_name,
            "prospect_username": task.prospect_username,
            "result": result.value,
            "priority": task.priority,
            "metadata": metadata or task.metadata,
        }
        with open(self._analytics_file, "a") as f:
            f.write(json.dumps(event) + "\n")

    def generate_daily_summary(self, date_str: str = None) -> dict:
        """Generate summary counts for today (or given date)."""
        if date_str is None:
            date_str = datetime.now().strftime("%Y-%m-%d")
        counts = {}
        if not os.path.exists(self._analytics_file):
            return counts
        with open(self._analytics_file) as f:
            for line in f:
                try:
                    event = json.loads(line.strip())
                    if event.get("timestamp", "").startswith(date_str) and event.get("result") == "success":
                        action = event["event_type"]
                        counts[action] = counts.get(action, 0) + 1
                except (json.JSONDecodeError, KeyError):
                    continue
        return counts

    def save_daily_summary(self, summary: dict) -> None:
        """Write daily summary to data/daily_summary.json."""
        path = os.path.join(self._data_dir, "daily_summary.json")
        with open(path, "w") as f:
            json.dump({"date": datetime.now().strftime("%Y-%m-%d"), "summary": summary}, f, indent=2)
