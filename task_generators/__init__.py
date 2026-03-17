"""Task generator base class."""
from models import Task


class BaseGenerator:
    """Base class for all task generators."""
    def generate_tasks(self, queue, prospects: dict, rate_limiter, **kwargs) -> None:
        raise NotImplementedError
