"""Prospect search task generator."""
import time
from models import Task
from config import P3_LOW, SEARCH_QUERIES
from task_generators import BaseGenerator


class ProspectorGenerator(BaseGenerator):
    def __init__(self):
        self._last_run = 0
        self._query_index = 0

    def generate_tasks(self, queue, prospects, rate_limiter, **kwargs):
        now = time.time()
        if now - self._last_run < 4 * 3600:
            return
        self._last_run = now
        query = SEARCH_QUERIES[self._query_index % len(SEARCH_QUERIES)]
        self._query_index += 1
        queue.push(Task(
            action_type="search_prospects",
            priority=P3_LOW,
            metadata={"query": query},
        ))
