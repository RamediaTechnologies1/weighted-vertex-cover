# models.py
"""Data classes for the LinkedIn Agent scheduler."""
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
import json
import os
import tempfile


class TaskResult(Enum):
    SUCCESS = "success"
    FAILED = "failed"
    ELEMENT_NOT_FOUND = "element_not_found"
    ERROR = "error"
    SKIPPED = "skipped"


@dataclass
class Prospect:
    # Identity
    name: str
    username: str
    headline: str = ""
    location: str = ""

    # Classification
    classification: str = "cold"
    engagement_score: int = 0
    timezone: str = "America/New_York"

    # Pipeline state
    pipeline_stage: str = "prospect_found"
    last_action_at: str = ""
    connect_requested_at: str = ""

    # DM state
    dm_sent_at: str = ""
    template_variant: str = ""
    opener_prompt_variant: str = ""

    # Reply state
    reply_status: str = ""
    reply_category: str = ""
    reply_count: int = 0
    last_reply_at: str = ""

    # Follow-up state
    followup_at: str = ""
    followup_status: str = ""

    # Re-engagement state
    reengage_stage: int = 0
    reengage_last_at: str = ""

    # Handoff
    handoff_at: str = ""
    handoff_reason: str = ""

    # Engagement history
    profile_viewed: bool = False
    posts_liked: int = 0
    skills_endorsed: int = 0
    posts_commented: int = 0
    connected: bool = False

    # Metadata
    source: str = ""
    source_query: str = ""
    added_at: str = ""
    status: str = "active"
    last_processed_at: str = ""


@dataclass
class Task:
    action_type: str
    priority: int
    prospect_username: str = ""
    prospect_name: str = ""
    metadata: dict = field(default_factory=dict)
    not_before: str = ""
    retry_count: int = 0
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class FunnelEvent:
    prospect_name: str
    prospect_username: str
    event_type: str
    metadata: dict = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict:
        return asdict(self)


def prospect_to_dict(p: Prospect) -> dict:
    return asdict(p)


def prospect_from_dict(d: dict) -> Prospect:
    return Prospect(**{k: v for k, v in d.items() if k in Prospect.__dataclass_fields__})


def load_prospects(path: str) -> dict:
    """Load prospects from JSON file. Returns {username: Prospect}."""
    if not os.path.exists(path):
        return {}
    with open(path, "r") as f:
        raw = json.load(f)
    return {k: prospect_from_dict(v) for k, v in raw.items()}


def save_prospects(prospects: dict, path: str) -> None:
    """Save prospects to JSON file atomically. Expects {username: Prospect}."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    raw = {k: prospect_to_dict(v) for k, v in prospects.items()}
    with tempfile.NamedTemporaryFile("w", dir=os.path.dirname(path), delete=False, suffix=".tmp") as f:
        json.dump(raw, f, indent=2)
        tmppath = f.name
    os.replace(tmppath, path)
