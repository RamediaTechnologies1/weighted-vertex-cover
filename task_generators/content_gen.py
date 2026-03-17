"""Content posting task generator."""
import time
from datetime import datetime
from models import Task
from config import P4_BACKGROUND, CONTENT_POST_DAYS
from task_generators import BaseGenerator

CONTENT_THEMES = [
    "Sleep health tips for healthcare professionals",
    "Infrared/Celliant technology science",
    "Doctor partnership success stories",
    "Patient outcome improvements",
    "Practice revenue diversification",
    "Sleep and pain management connection",
    "Wellness industry trends",
    "BioPosture product features",
    "Healthcare professional testimonials",
    "Sleep hygiene education",
    "Practice marketing tips",
    "Industry event/conference highlights",
]


class ContentGenerator(BaseGenerator):
    def __init__(self):
        self._last_post = 0
        self._theme_index = 0

    def generate_tasks(self, queue, prospects, rate_limiter, **kwargs):
        now = datetime.now()
        if now.weekday() not in CONTENT_POST_DAYS:
            return
        if rate_limiter.would_exceed("content_post"):
            return
        if time.time() - self._last_post < 6 * 3600:
            return
        self._last_post = time.time()
        theme = CONTENT_THEMES[self._theme_index % len(CONTENT_THEMES)]
        self._theme_index += 1
        queue.push(Task(
            action_type="post_content",
            priority=P4_BACKGROUND,
            metadata={"theme": theme},
        ))
