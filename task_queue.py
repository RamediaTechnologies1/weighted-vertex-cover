# task_queue.py
"""Priority queue with rate limiting for the scheduler."""
import heapq
from datetime import datetime
from typing import Optional
from models import Task


class TaskQueue:
    def __init__(self):
        self._heap = []
        self._counter = 0

    def push(self, task: Task) -> None:
        heapq.heappush(self._heap, (task.priority, self._counter, task))
        self._counter += 1

    def pop(self) -> Optional[Task]:
        """Pop highest-priority (lowest number) task that is not deferred."""
        now = datetime.now().isoformat()
        skipped = []
        result = None
        while self._heap:
            priority, order, task = heapq.heappop(self._heap)
            if task.not_before and task.not_before > now:
                skipped.append((priority, order, task))
                continue
            result = task
            break
        for item in skipped:
            heapq.heappush(self._heap, item)
        return result

    def defer(self, task: Task, not_before: str) -> None:
        task.not_before = not_before
        self.push(task)

    def clear(self) -> None:
        self._heap.clear()

    def __len__(self) -> int:
        return len(self._heap)


class RateLimiter:
    def __init__(self, daily_limits: dict):
        self._limits = daily_limits
        self._counts: dict = {}

    def would_exceed(self, action_type: str) -> bool:
        limit = self._limits.get(action_type)
        if limit is None:
            return False
        return self._counts.get(action_type, 0) >= limit

    def record(self, action_type: str) -> None:
        self._counts[action_type] = self._counts.get(action_type, 0) + 1

    def reset(self) -> None:
        self._counts.clear()

    def get_counts(self) -> dict:
        return dict(self._counts)
