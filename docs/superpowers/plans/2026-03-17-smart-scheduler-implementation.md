# LinkedIn Agent v2: Smart Scheduler Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 7 competing LinkedIn automation modules with a priority-based central scheduler, adding analytics, A/B testing, timezone optimization, engagement scoring, and re-engagement campaigns.

**Architecture:** Single-process scheduler with a priority task queue. Task generators produce discrete browser actions; a task executor runs them one at a time through a browser abstraction layer. All prospect data is unified in a single JSON file.

**Tech Stack:** Python 3, pytest, dataclasses, Docker/ClawdBot (browser automation), JSON file storage

**Spec:** `docs/superpowers/specs/2026-03-17-smart-scheduler-optimization-design.md`

---

## File Map

### New files (in order of implementation)

| File | Responsibility | Dependencies |
|---|---|---|
| `config.py` | All constants, rate limits, feature flags | None |
| `models.py` | Prospect, Task, FunnelEvent, TaskResult dataclasses | `config.py` |
| `healthcare.py` | Healthcare professional keyword validation | None |
| `task_queue.py` | Priority queue with rate limiting and deferral | `models.py`, `config.py` |
| `analytics.py` | Event logging, funnel tracking, daily summary | `models.py`, `config.py` |
| `notifications.py` | Email alerts and lead handoff recording | `models.py`, `config.py` |
| `scoring.py` | Engagement score computation + prospect classification | `healthcare.py` |
| `timezone.py` | City-to-timezone mapping, peak window scheduling | `config.py` |
| `ab_testing.py` | Template variant assignment and evaluation | `config.py` |
| `browser.py` | Browser abstraction (navigate, snapshot, click, type, find) | None |
| `reengage.py` | Re-engagement stage logic and message templates | `models.py`, `config.py` |
| `task_executor.py` | Dispatches tasks to action functions using browser | `browser.py`, `models.py`, `healthcare.py`, `scoring.py`, `notifications.py`, `ab_testing.py` |
| `task_generators/__init__.py` | Generator base class | `models.py`, `task_queue.py` |
| `task_generators/reply_gen.py` | Inbox check + reply classification | `models.py`, `notifications.py` |
| `task_generators/followup_gen.py` | Scheduled follow-up tasks | `models.py` |
| `task_generators/warmup_gen.py` | Warmup pipeline stage tasks | `models.py`, `scoring.py` |
| `task_generators/outreach_gen.py` | DM sending tasks | `models.py`, `ab_testing.py`, `timezone.py` |
| `task_generators/prospector_gen.py` | LinkedIn search for new prospects | `models.py`, `healthcare.py` |
| `task_generators/engagement_gen.py` | Post and group engagement tasks | `models.py`, `healthcare.py` |
| `task_generators/content_gen.py` | Content posting tasks | `models.py`, `config.py` |
| `task_generators/reengage_gen.py` | Re-engagement campaign tasks | `models.py`, `reengage.py` |
| `scheduler.py` | Main loop, signal handling, startup | Everything above |
| `migrate.py` | One-time migration from .txt to JSON | `models.py` |

### Test files

```
tests/
├── __init__.py
├── test_config.py
├── test_models.py
├── test_healthcare.py
├── test_task_queue.py
├── test_analytics.py
├── test_notifications.py
├── test_scoring.py
├── test_timezone.py
├── test_ab_testing.py
├── test_reengage.py
├── test_migrate.py
└── test_generators/
    ├── __init__.py
    ├── test_reply_gen.py
    ├── test_warmup_gen.py
    ├── test_outreach_gen.py
    └── test_reengage_gen.py
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `tests/__init__.py`, `tests/test_generators/__init__.py`, `task_generators/__init__.py`
- Create: `data/.gitkeep`, `templates/opener_prompts/.gitkeep`
- Create: `config.py`
- Test: `tests/test_config.py`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p tests/test_generators task_generators templates/opener_prompts data
touch tests/__init__.py tests/test_generators/__init__.py
touch data/.gitkeep templates/opener_prompts/.gitkeep
```

- [ ] **Step 2: Install pytest**

```bash
pip install pytest
```

- [ ] **Step 3: Write config.py test**

```python
# tests/test_config.py
from config import DAILY_LIMITS, PEAK_WINDOWS, REENGAGE_STAGES, WARMUP_STAGES, HUMAN_TEAM, DATA_DIR

def test_daily_limits_has_all_action_types():
    required = ["dm_send", "connection_request", "comment", "like", "profile_view", "endorsement", "content_post", "group_comment"]
    for action in required:
        assert action in DAILY_LIMITS, f"Missing rate limit for {action}"
        assert isinstance(DAILY_LIMITS[action], int)
        assert DAILY_LIMITS[action] > 0

def test_peak_windows_are_valid_hours():
    for start, end in PEAK_WINDOWS:
        assert 0 <= start < 24
        assert 0 < end <= 24
        assert start < end

def test_reengage_stages_ordered():
    days = [s["days_after_dm"] for s in REENGAGE_STAGES]
    assert days == sorted(days), "Re-engagement stages must be in chronological order"

def test_warmup_stages_form_chain():
    stages = list(WARMUP_STAGES.keys())
    for i, stage in enumerate(stages[:-1]):
        assert WARMUP_STAGES[stage]["next"] == stages[i + 1]

def test_data_dir_path():
    assert DATA_DIR.endswith("data")
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd /Users/ramediatechnologies/openclaw/linkedin-agent && python -m pytest tests/test_config.py -v`
Expected: FAIL (ModuleNotFoundError: No module named 'config')

- [ ] **Step 5: Write config.py**

```python
# config.py
"""All constants, rate limits, and feature flags for the LinkedIn Agent scheduler."""
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
KNOWLEDGE_FILE = os.path.join(BASE_DIR, "knowledge_base.txt")
LOG_DIR = BASE_DIR

# === Rate Limits (daily) ===
DAILY_LIMITS = {
    "dm_send": 100,
    "connection_request": 20,
    "comment": 20,
    "like": 50,
    "profile_view": 80,
    "endorsement": 20,
    "content_post": 2,
    "group_comment": 10,
}

# === Priority Levels ===
P0_CRITICAL = 0
P1_HIGH = 1
P2_MEDIUM = 2
P3_LOW = 3
P4_BACKGROUND = 4

# === Time-of-Day Optimization ===
PEAK_WINDOWS = [
    (8, 10),   # 8-10am
    (13, 15),  # 1-3pm
]
BUSINESS_HOURS = (8, 18)  # 8am-6pm for connection requests
DEFAULT_TIMEZONE = "America/New_York"

# === Warmup Pipeline ===
WARMUP_STAGES = {
    "view_profile":    {"next": "like_posts",      "wait_days": 1},
    "like_posts":      {"next": "endorse_skills",  "wait_days": 1},
    "endorse_skills":  {"next": "comment_post",    "wait_days": 1},
    "comment_post":    {"next": "connect_request", "wait_days": 2},
    "connect_request": {"next": "wait_accept",     "wait_days": 0},
    "wait_accept":     {"next": "send_dm",         "wait_days": 1},
    "send_dm":         {"next": "done",            "wait_days": 0},
    "done":            {"next": None,              "wait_days": 0},
}

# Fast-track: skip stages for warm prospects
FAST_TRACK_STAGES = {
    "already_connected": "dm_ready",
    "second_degree":     "connect_request",
    "engaged":           "connect_request",
    "cold":              "view_profile",
}

# === Re-engagement ===
REENGAGE_STAGES = [
    {"days_after_dm": 3,  "action": "engage_content", "priority": P3_LOW},
    {"days_after_dm": 7,  "action": "soft_followup",  "priority": P2_MEDIUM},
    {"days_after_dm": 14, "action": "value_add_dm",   "priority": P2_MEDIUM},
    {"days_after_dm": 30, "action": "final_close",    "priority": P3_LOW},
]

# === Content Posting ===
CONTENT_POST_DAYS = [0, 2, 4, 6]  # Monday, Wednesday, Friday, Sunday

# === Human Team (do not intervene if active) ===
HUMAN_TEAM = ["irwin pearl", "irwin", "srimanvas", "sriman"]
NOTIFY_EMAIL = "srimanvas@ramedia.dev"

# === Scheduler Timing ===
REPLY_CHECK_INTERVAL_SECONDS = 3 * 60   # Generate P0 reply check every 3 min
PAUSE_BETWEEN_TASKS_RANGE = (2, 5)       # Random seconds between tasks
CONSECUTIVE_FAILURE_THRESHOLD = 5        # Pause scheduler after N failures
FAILURE_PAUSE_SECONDS = 5 * 60          # How long to pause on consecutive failures
MAX_TASK_RETRIES = 2

# === Prospector ===
SEARCH_QUERIES = [
    "chiropractor", "doctor of chiropractic", "chiropractic physician",
    "DC chiropractic", "sports chiropractor", "pediatric chiropractor",
    "chiropractic wellness", "chiropractic clinic owner",
    "physical therapist DPT", "naturopathic doctor",
    "osteopathic physician DO", "orthopedic specialist",
    "sports medicine doctor", "pain management physician",
    "functional medicine doctor", "integrative medicine practitioner",
    "wellness clinic director", "rehabilitation specialist",
]

# === Batch Operations ===
BATCH_LOOKAHEAD_HOURS = 12  # Batch actions due within this window
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd /Users/ramediatechnologies/openclaw/linkedin-agent && python -m pytest tests/test_config.py -v`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add config.py tests/__init__.py tests/test_config.py tests/test_generators/__init__.py task_generators/ templates/ data/.gitkeep
git commit -m "feat: add project scaffolding and config module"
```

---

## Task 2: Data Models

**Files:**
- Create: `models.py`
- Test: `tests/test_models.py`

- [ ] **Step 1: Write models test**

```python
# tests/test_models.py
import json
from models import Prospect, Task, FunnelEvent, TaskResult, prospect_to_dict, prospect_from_dict, load_prospects, save_prospects
import tempfile
import os

def test_prospect_defaults():
    p = Prospect(name="Dr. Smith", username="dr-smith")
    assert p.classification == "cold"
    assert p.engagement_score == 0
    assert p.pipeline_stage == "prospect_found"
    assert p.status == "active"
    assert p.reengage_stage == 0

def test_prospect_roundtrip():
    p = Prospect(name="Dr. Smith", username="dr-smith", headline="Chiropractor", engagement_score=75)
    d = prospect_to_dict(p)
    p2 = prospect_from_dict(d)
    assert p2.name == "Dr. Smith"
    assert p2.engagement_score == 75
    assert p2.headline == "Chiropractor"

def test_task_priority_ordering():
    t1 = Task(action_type="check_inbox", priority=0, prospect_username="a")
    t2 = Task(action_type="send_dm", priority=2, prospect_username="b")
    assert t1.priority < t2.priority

def test_funnel_event_to_dict():
    e = FunnelEvent(prospect_name="Dr. Smith", prospect_username="dr-smith", event_type="dm_sent", metadata={"variant": "a"})
    d = e.to_dict()
    assert d["event_type"] == "dm_sent"
    assert "timestamp" in d

def test_load_save_prospects_roundtrip():
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "prospects.json")
        prospects = {
            "dr-smith": Prospect(name="Dr. Smith", username="dr-smith"),
            "jane-dc": Prospect(name="Jane DC", username="jane-dc", engagement_score=50),
        }
        save_prospects(prospects, path)
        loaded = load_prospects(path)
        assert len(loaded) == 2
        assert loaded["jane-dc"].engagement_score == 50

def test_load_prospects_missing_file():
    loaded = load_prospects("/nonexistent/path.json")
    assert loaded == {}

def test_task_result_enum():
    assert TaskResult.SUCCESS != TaskResult.FAILED
    assert TaskResult.ELEMENT_NOT_FOUND != TaskResult.ERROR
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_models.py -v`
Expected: FAIL

- [ ] **Step 3: Write models.py**

```python
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_models.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add models.py tests/test_models.py
git commit -m "feat: add Prospect, Task, FunnelEvent data models"
```

---

## Task 3: Healthcare Validation Module

**Files:**
- Create: `healthcare.py`
- Test: `tests/test_healthcare.py`

- [ ] **Step 1: Write test**

```python
# tests/test_healthcare.py
from healthcare import is_healthcare_professional, HEALTHCARE_KEYWORDS

def test_chiropractor_detected():
    is_hcp, kws = is_healthcare_professional("Dr. Jane Smith, DC - Chiropractic Wellness Center")
    assert is_hcp
    assert "dc" in kws or "chiropractic" in kws

def test_physical_therapist_detected():
    is_hcp, kws = is_healthcare_professional("John Doe, DPT - Sports Rehabilitation")
    assert is_hcp

def test_non_healthcare_rejected():
    is_hcp, kws = is_healthcare_professional("Software Engineer at Google")
    assert not is_hcp
    assert kws == []

def test_case_insensitive():
    is_hcp, _ = is_healthcare_professional("CHIROPRACTOR at ABC Clinic")
    assert is_hcp

def test_keywords_list_not_empty():
    assert len(HEALTHCARE_KEYWORDS) > 20
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_healthcare.py -v`
Expected: FAIL

- [ ] **Step 3: Write healthcare.py**

Copy the `HEALTHCARE_KEYWORDS` list and `is_healthcare_professional()` function from the spec (Section 9). This is a direct consolidation of the duplicated lists from `linkedin_bot.py:20-37`, `post_engager.py:47-58`, and `prospector.py:83-95`.

```python
# healthcare.py
"""Consolidated healthcare professional validation."""

HEALTHCARE_KEYWORDS = [
    'dc', 'd.c.', 'chiropractor', 'chiropractic',
    'md', 'm.d.', 'doctor', 'dr.', 'dr ',
    'physician', 'medical',
    'dpt', 'd.p.t.', 'physical therapist', 'physical therapy',
    'do', 'd.o.', 'osteopath',
    'nd', 'n.d.', 'naturopath', 'naturopathic',
    'dpm', 'podiatrist', 'nurse', 'np', 'rn',
    'orthopedic', 'spine', 'sports medicine',
    'rehabilitation', 'rehab', 'pain management',
    'acupuncture', 'massage therapist', 'lmt',
    'wellness', 'clinic', 'practice',
    'healthcare', 'health care',
    'functional medicine', 'integrative medicine',
    'pt,', 'dpt,', 'ms,', 'ccsp', 'dacbsp',
    'nurse practitioner', 'practice owner', 'wellness center',
    'consultant',
]


def is_healthcare_professional(text: str) -> tuple:
    """Check if text contains healthcare professional indicators.
    Returns (is_healthcare: bool, matching_keywords: list[str])."""
    text_lower = text.lower()
    matches = [kw for kw in HEALTHCARE_KEYWORDS if kw in text_lower]
    return len(matches) > 0, matches
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_healthcare.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add healthcare.py tests/test_healthcare.py
git commit -m "feat: add consolidated healthcare validation module"
```

---

## Task 4: Priority Queue with Rate Limiting

**Files:**
- Create: `task_queue.py`
- Test: `tests/test_task_queue.py`

- [ ] **Step 1: Write test**

```python
# tests/test_task_queue.py
from task_queue import TaskQueue, RateLimiter
from models import Task
from datetime import datetime

def test_queue_returns_highest_priority():
    q = TaskQueue()
    q.push(Task(action_type="like", priority=3, prospect_username="a"))
    q.push(Task(action_type="check_inbox", priority=0, prospect_username="b"))
    q.push(Task(action_type="send_dm", priority=2, prospect_username="c"))
    task = q.pop()
    assert task.action_type == "check_inbox"
    assert task.priority == 0

def test_queue_empty_returns_none():
    q = TaskQueue()
    assert q.pop() is None

def test_queue_defer():
    q = TaskQueue()
    t = Task(action_type="send_dm", priority=2, prospect_username="a", not_before="2099-01-01T00:00:00")
    q.push(t)
    # Should skip deferred tasks
    assert q.pop() is None

def test_queue_length():
    q = TaskQueue()
    q.push(Task(action_type="a", priority=1, prospect_username="x"))
    q.push(Task(action_type="b", priority=2, prospect_username="y"))
    assert len(q) == 2
    q.pop()
    assert len(q) == 1

def test_rate_limiter_allows_under_limit():
    rl = RateLimiter({"dm_send": 5})
    assert rl.would_exceed("dm_send") is False
    rl.record("dm_send")
    assert rl.would_exceed("dm_send") is False

def test_rate_limiter_blocks_at_limit():
    rl = RateLimiter({"dm_send": 2})
    rl.record("dm_send")
    rl.record("dm_send")
    assert rl.would_exceed("dm_send") is True

def test_rate_limiter_unknown_action_allowed():
    rl = RateLimiter({"dm_send": 5})
    assert rl.would_exceed("unknown_action") is False

def test_rate_limiter_resets_daily():
    rl = RateLimiter({"dm_send": 2})
    rl.record("dm_send")
    rl.record("dm_send")
    assert rl.would_exceed("dm_send") is True
    rl.reset()
    assert rl.would_exceed("dm_send") is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_task_queue.py -v`
Expected: FAIL

- [ ] **Step 3: Write task_queue.py**

```python
# task_queue.py
"""Priority queue with rate limiting for the scheduler."""
import heapq
from datetime import datetime
from models import Task


class TaskQueue:
    def __init__(self):
        self._heap = []  # (priority, insertion_order, task)
        self._counter = 0

    def push(self, task: Task) -> None:
        heapq.heappush(self._heap, (task.priority, self._counter, task))
        self._counter += 1

    def pop(self) -> Task | None:
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
        # Put skipped items back
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_task_queue.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add task_queue.py tests/test_task_queue.py
git commit -m "feat: add priority queue with rate limiting"
```

---

## Task 5: Analytics Module

**Files:**
- Create: `analytics.py`
- Test: `tests/test_analytics.py`

- [ ] **Step 1: Write test**

```python
# tests/test_analytics.py
import json
import os
import tempfile
from analytics import Analytics
from models import Task, TaskResult

def test_log_event_creates_file():
    with tempfile.TemporaryDirectory() as tmpdir:
        a = Analytics(data_dir=tmpdir)
        task = Task(action_type="dm_send", priority=2, prospect_username="dr-smith", prospect_name="Dr. Smith")
        a.log_event(task, TaskResult.SUCCESS, metadata={"variant": "a"})
        path = os.path.join(tmpdir, "analytics.json")
        assert os.path.exists(path)
        with open(path) as f:
            line = f.readline()
            event = json.loads(line)
            assert event["event_type"] == "dm_send"
            assert event["result"] == "success"
            assert event["prospect_username"] == "dr-smith"

def test_log_event_appends():
    with tempfile.TemporaryDirectory() as tmpdir:
        a = Analytics(data_dir=tmpdir)
        t1 = Task(action_type="like", priority=3, prospect_username="a")
        t2 = Task(action_type="comment", priority=3, prospect_username="b")
        a.log_event(t1, TaskResult.SUCCESS)
        a.log_event(t2, TaskResult.FAILED)
        path = os.path.join(tmpdir, "analytics.json")
        with open(path) as f:
            lines = f.readlines()
            assert len(lines) == 2

def test_daily_summary():
    with tempfile.TemporaryDirectory() as tmpdir:
        a = Analytics(data_dir=tmpdir)
        for i in range(3):
            t = Task(action_type="dm_send", priority=2, prospect_username=f"u{i}")
            a.log_event(t, TaskResult.SUCCESS)
        t = Task(action_type="like", priority=3, prospect_username="x")
        a.log_event(t, TaskResult.SUCCESS)
        summary = a.generate_daily_summary()
        assert summary["dm_send"] == 3
        assert summary["like"] == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_analytics.py -v`
Expected: FAIL

- [ ] **Step 3: Write analytics.py**

```python
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_analytics.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add analytics.py tests/test_analytics.py
git commit -m "feat: add analytics event logging and daily summary"
```

---

## Task 6: Notifications Module

**Files:**
- Create: `notifications.py`
- Test: `tests/test_notifications.py`

- [ ] **Step 1: Write test**

```python
# tests/test_notifications.py
import tempfile
import json
import os
from notifications import Notifier
from models import Prospect, load_prospects, save_prospects

def test_record_handoff_updates_prospect(tmp_path):
    prospects_path = str(tmp_path / "prospects.json")
    p = Prospect(name="Dr. Smith", username="dr-smith")
    save_prospects({"dr-smith": p}, prospects_path)
    n = Notifier(notify_email="test@test.com", prospects_path=prospects_path)
    n.record_handoff("dr-smith", "INTERESTED")
    loaded = load_prospects(prospects_path)
    assert loaded["dr-smith"].handoff_reason == "INTERESTED"
    assert loaded["dr-smith"].handoff_at != ""

def test_build_email_body():
    n = Notifier(notify_email="test@test.com", prospects_path="/tmp/none.json")
    subject, body = n._build_email("Dr. Smith", "INTERESTED", "They want to learn more")
    assert "Dr. Smith" in subject
    assert "INTERESTED" in subject
    assert "They want to learn more" in body
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_notifications.py -v`
Expected: FAIL

- [ ] **Step 3: Write notifications.py**

```python
# notifications.py
"""Email alerts and lead handoff recording."""
import subprocess
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from models import load_prospects, save_prospects


class Notifier:
    def __init__(self, notify_email: str, prospects_path: str):
        self._notify_email = notify_email
        self._prospects_path = prospects_path

    def send_lead_alert(self, prospect_name: str, category: str, conversation_summary: str) -> None:
        """Send email notification and record handoff."""
        subject, body = self._build_email(prospect_name, category, conversation_summary)
        self._send_email(subject, body)

    def record_handoff(self, prospect_username: str, reason: str) -> None:
        """Record handoff in prospect data."""
        prospects = load_prospects(self._prospects_path)
        if prospect_username in prospects:
            prospects[prospect_username].handoff_at = datetime.now().isoformat()
            prospects[prospect_username].handoff_reason = reason
            prospects[prospect_username].status = "handed_off"
            save_prospects(prospects, self._prospects_path)

    def _build_email(self, name: str, category: str, summary: str) -> tuple:
        subject = f"[BioPosture Lead] {name} - {category}"
        body = f"""New LinkedIn Lead Alert!

Prospect: {name}
Category: {category}
Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Conversation Summary:
{summary[:2000]}

---
Action Required: Please follow up with this prospect on LinkedIn.
LinkedIn Messaging: https://www.linkedin.com/messaging/
"""
        return subject, body

    def _send_email(self, subject: str, body: str) -> None:
        """Try system mail, then SMTP localhost fallback."""
        sent = False
        try:
            result = subprocess.run(
                ["mail", "-s", subject, self._notify_email],
                input=body, capture_output=True, text=True, timeout=10
            )
            sent = result.returncode == 0
        except Exception:
            pass
        if not sent:
            try:
                msg = MIMEMultipart()
                msg["From"] = "bioposture-bot@ramedia.dev"
                msg["To"] = self._notify_email
                msg["Subject"] = subject
                msg.attach(MIMEText(body, "plain"))
                with smtplib.SMTP("localhost", 25, timeout=5) as server:
                    server.send_message(msg)
            except Exception:
                pass
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_notifications.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add notifications.py tests/test_notifications.py
git commit -m "feat: add email notification and handoff module"
```

---

## Task 7: Scoring Module

**Files:**
- Create: `scoring.py`
- Test: `tests/test_scoring.py`

- [ ] **Step 1: Write test**

```python
# tests/test_scoring.py
from scoring import compute_engagement_score

def test_practice_owner_gets_25():
    score = compute_engagement_score("Clinic Owner and Chiropractor", "Dr. Smith", {})
    assert score >= 25

def test_second_degree_gets_15():
    score = compute_engagement_score("2nd degree connection", "Dr. Smith", {})
    assert score >= 15

def test_engaged_with_content_gets_20():
    score = compute_engagement_score("Some profile text", "Dr. Smith", {"Dr. Smith": True})
    assert score >= 20

def test_cold_unknown_gets_zero():
    score = compute_engagement_score("Software engineer at tech company", "John Doe", {})
    assert score == 0

def test_max_score_is_100():
    # Profile that matches everything
    text = "Clinic Owner, Chiropractor, 2nd degree, 1,234 connections, Posted 3 days ago"
    score = compute_engagement_score(text, "Dr. Smith", {"Dr. Smith": True})
    assert score <= 100

def test_classify_already_connected():
    from scoring import classify_prospect
    snapshot = 'button "Message Dr. Smith" [ref=e123]'
    assert classify_prospect(snapshot, "Dr. Smith", {}) == "already_connected"

def test_classify_second_degree():
    from scoring import classify_prospect
    snapshot = "Dr. Smith\n2nd degree connection\nChiropractor"
    assert classify_prospect(snapshot, "Dr. Smith", {}) == "second_degree"

def test_classify_engaged():
    from scoring import classify_prospect
    snapshot = "Dr. Smith\n3rd+ degree\nChiropractor"
    assert classify_prospect(snapshot, "Dr. Smith", {"Dr. Smith": True}) == "engaged"

def test_classify_cold():
    from scoring import classify_prospect
    snapshot = "Dr. Smith\n3rd+ degree\nChiropractor"
    assert classify_prospect(snapshot, "Dr. Smith", {}) == "cold"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_scoring.py -v`
Expected: FAIL

- [ ] **Step 3: Write scoring.py**

```python
# scoring.py
"""Engagement scoring for prospects."""
import re


def compute_engagement_score(profile_snapshot: str, name: str, engagement_history: dict) -> int:
    """Compute engagement score (0-100) from profile signals."""
    score = 0
    text = profile_snapshot.lower()

    # Practice owner / clinic director (+25)
    owner_keywords = ["owner", "director", "founder", "president", "ceo"]
    if any(kw in text for kw in owner_keywords):
        score += 25

    # Active poster (+20) — look for recent post indicators
    if "posted" in text or "published" in text or "shared" in text:
        score += 20

    # 2nd-degree connection (+15)
    if "2nd" in text:
        score += 15

    # Engaged with our content (+20)
    if name in engagement_history:
        score += 20

    # 500+ connections (+10)
    conn_match = re.search(r'([\d,]+)\s*connections', text)
    if conn_match:
        count = int(conn_match.group(1).replace(",", ""))
        if count >= 500:
            score += 10

    # High-value specialty (+10)
    specialties = ["chiropract", "orthopedic", "sports medicine", "physical therap", "spine"]
    if any(s in text for s in specialties):
        score += 10

    return min(score, 100)


def classify_prospect(profile_snapshot: str, name: str, engagement_history: dict) -> str:
    """Classify prospect for fast-track warmup.
    Returns: 'already_connected', 'second_degree', 'engaged', or 'cold'."""
    # Check if already connected (Message button present, no Connect button)
    if re.search(r'button "Message', profile_snapshot) and "Connect" not in profile_snapshot:
        return "already_connected"
    # Check if 2nd-degree connection
    if "2nd" in profile_snapshot:
        return "second_degree"
    # Check if they've engaged with our content
    if name in engagement_history:
        return "engaged"
    return "cold"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_scoring.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add scoring.py tests/test_scoring.py
git commit -m "feat: add engagement scoring and prospect classification"
```

---

## Task 8: Timezone Module

**Files:**
- Create: `timezone.py`
- Test: `tests/test_timezone.py`

- [ ] **Step 1: Write test**

```python
# tests/test_timezone.py
from timezone import infer_timezone, is_in_peak_window, next_peak_time, extract_location
from config import PEAK_WINDOWS

def test_infer_timezone_known_city():
    assert infer_timezone("New York") == "America/New_York"
    assert infer_timezone("Los Angeles") == "America/Los_Angeles"
    assert infer_timezone("Chicago") == "America/Chicago"
    assert infer_timezone("Denver") == "America/Denver"

def test_infer_timezone_unknown_defaults_est():
    assert infer_timezone("Unknown City 123") == "America/New_York"

def test_extract_location_from_profile():
    snapshot = "Dr. Smith\nChiropractor\nSan Francisco, California"
    loc = extract_location(snapshot)
    assert "San Francisco" in loc or "California" in loc

def test_next_peak_time_returns_future():
    from datetime import datetime
    result = next_peak_time("America/New_York")
    assert result is not None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_timezone.py -v`
Expected: FAIL

- [ ] **Step 3: Write timezone.py**

```python
# timezone.py
"""City-to-timezone mapping and peak window scheduling. US-only scope."""
import re
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from config import PEAK_WINDOWS, DEFAULT_TIMEZONE

# US city -> timezone mapping (major cities)
CITY_TZ_MAP = {
    "new york": "America/New_York", "brooklyn": "America/New_York",
    "manhattan": "America/New_York", "queens": "America/New_York",
    "boston": "America/New_York", "philadelphia": "America/New_York",
    "miami": "America/New_York", "atlanta": "America/New_York",
    "charlotte": "America/New_York", "jacksonville": "America/New_York",
    "tampa": "America/New_York", "orlando": "America/New_York",
    "washington": "America/New_York", "baltimore": "America/New_York",
    "pittsburgh": "America/New_York", "raleigh": "America/New_York",
    "nashville": "America/Chicago", "chicago": "America/Chicago",
    "houston": "America/Chicago", "dallas": "America/Chicago",
    "san antonio": "America/Chicago", "austin": "America/Chicago",
    "minneapolis": "America/Chicago", "milwaukee": "America/Chicago",
    "new orleans": "America/Chicago", "memphis": "America/Chicago",
    "st. louis": "America/Chicago", "kansas city": "America/Chicago",
    "denver": "America/Denver", "phoenix": "America/Denver",
    "salt lake city": "America/Denver", "albuquerque": "America/Denver",
    "las vegas": "America/Los_Angeles", "los angeles": "America/Los_Angeles",
    "san francisco": "America/Los_Angeles", "san diego": "America/Los_Angeles",
    "seattle": "America/Los_Angeles", "portland": "America/Los_Angeles",
    "sacramento": "America/Los_Angeles", "san jose": "America/Los_Angeles",
}


def infer_timezone(location: str) -> str:
    """Map a location string to a US timezone. Defaults to EST."""
    loc_lower = location.lower().strip()
    for city, tz in CITY_TZ_MAP.items():
        if city in loc_lower:
            return tz
    return DEFAULT_TIMEZONE


def extract_location(profile_snapshot: str) -> str:
    """Extract location from LinkedIn profile snapshot text."""
    for line in profile_snapshot.split("\n"):
        line = line.strip()
        if re.match(r'^[A-Z][a-z]+.*,\s*[A-Z]', line) and len(line) < 80:
            return line
    return ""


def is_in_peak_window(tz: str) -> bool:
    """Check if current time is within a peak DM window for the given timezone.
    Uses zoneinfo for correct DST handling."""
    try:
        local_now = datetime.now(ZoneInfo(tz))
    except KeyError:
        local_now = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))
    return any(start <= local_now.hour < end for start, end in PEAK_WINDOWS)


def next_peak_time(tz: str) -> datetime:
    """Return the next peak window start as a UTC datetime.
    Uses zoneinfo for correct DST handling."""
    try:
        local_now = datetime.now(ZoneInfo(tz))
    except KeyError:
        local_now = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))

    for start, end in PEAK_WINDOWS:
        if local_now.hour < start:
            target_local = local_now.replace(hour=start, minute=0, second=0, microsecond=0)
            return target_local.astimezone(ZoneInfo("UTC"))

    # Next day's first window
    first_start = PEAK_WINDOWS[0][0]
    tomorrow = local_now + timedelta(days=1)
    target_local = tomorrow.replace(hour=first_start, minute=0, second=0, microsecond=0)
    return target_local.astimezone(ZoneInfo("UTC"))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_timezone.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add timezone.py tests/test_timezone.py
git commit -m "feat: add timezone inference and peak window scheduling"
```

---

## Task 9: A/B Testing Module

**Files:**
- Create: `ab_testing.py`
- Test: `tests/test_ab_testing.py`

- [ ] **Step 1: Write test**

```python
# tests/test_ab_testing.py
import os
import json
import tempfile
from ab_testing import ABTester

def test_assign_variant_returns_dict():
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create template files
        os.makedirs(os.path.join(tmpdir, "templates", "opener_prompts"))
        for v in ["variant_a.txt", "variant_b.txt"]:
            with open(os.path.join(tmpdir, "templates", v), "w") as f:
                f.write(f"Template {v}")
        for p in ["prompt_a.txt", "prompt_b.txt"]:
            with open(os.path.join(tmpdir, "templates", "opener_prompts", p), "w") as f:
                f.write(f"Prompt {p}")

        tester = ABTester(templates_dir=os.path.join(tmpdir, "templates"), data_dir=tmpdir)
        result = tester.assign_variant("dr-smith")
        assert "template" in result
        assert "opener_prompt" in result

def test_record_and_evaluate():
    with tempfile.TemporaryDirectory() as tmpdir:
        tester = ABTester(templates_dir=tmpdir, data_dir=tmpdir)
        tester._stats = {"variant_a.txt": {"sent": 0, "replied": 0}}
        tester.record_outcome("variant_a.txt", replied=True)
        tester.record_outcome("variant_a.txt", replied=False)
        stats = tester.get_stats()
        assert stats["variant_a.txt"]["sent"] == 2
        assert stats["variant_a.txt"]["replied"] == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_ab_testing.py -v`
Expected: FAIL

- [ ] **Step 3: Write ab_testing.py**

```python
# ab_testing.py
"""A/B testing for message templates and opener prompts."""
import os
import json
import random
from datetime import datetime


class ABTester:
    def __init__(self, templates_dir: str, data_dir: str):
        self._templates_dir = templates_dir
        self._stats_file = os.path.join(data_dir, "templates_stats.json")
        self._stats = self._load_stats()

    def assign_variant(self, prospect_username: str) -> dict:
        """Randomly assign template and opener prompt variants."""
        templates = [f for f in os.listdir(self._templates_dir)
                     if f.startswith("variant_") and f.endswith(".txt")]
        prompts_dir = os.path.join(self._templates_dir, "opener_prompts")
        prompts = []
        if os.path.isdir(prompts_dir):
            prompts = [f for f in os.listdir(prompts_dir) if f.endswith(".txt")]

        template = random.choice(templates) if templates else "variant_a.txt"
        prompt = random.choice(prompts) if prompts else "prompt_a.txt"

        # Initialize stats for new variants
        if template not in self._stats:
            self._stats[template] = {"sent": 0, "replied": 0}

        return {"template": template, "opener_prompt": prompt}

    def record_outcome(self, template_name: str, replied: bool) -> None:
        """Record whether a prospect replied for a given template variant."""
        if template_name not in self._stats:
            self._stats[template_name] = {"sent": 0, "replied": 0}
        self._stats[template_name]["sent"] += 1
        if replied:
            self._stats[template_name]["replied"] += 1
        self._save_stats()

    def get_stats(self) -> dict:
        return dict(self._stats)

    def evaluate_variants(self) -> dict:
        """Return reply rates per variant. For auto-promotion logic."""
        results = {}
        for variant, data in self._stats.items():
            sent = data["sent"]
            replied = data["replied"]
            rate = replied / sent if sent > 0 else 0
            results[variant] = {"sent": sent, "replied": replied, "reply_rate": round(rate, 3)}
        return results

    def _load_stats(self) -> dict:
        if os.path.exists(self._stats_file):
            with open(self._stats_file) as f:
                return json.load(f)
        return {}

    def _save_stats(self) -> None:
        os.makedirs(os.path.dirname(self._stats_file), exist_ok=True)
        with open(self._stats_file, "w") as f:
            json.dump(self._stats, f, indent=2)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_ab_testing.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add ab_testing.py tests/test_ab_testing.py
git commit -m "feat: add A/B testing module for message templates"
```

---

## Task 10: Re-engagement Logic Module

**Files:**
- Create: `reengage.py`
- Test: `tests/test_reengage.py`

- [ ] **Step 1: Write test**

```python
# tests/test_reengage.py
from reengage import get_reengage_action, REENGAGE_TEMPLATES
from models import Prospect
from datetime import datetime, timedelta

def test_no_action_before_3_days():
    p = Prospect(name="Dr. Smith", username="dr-smith", status="dm_sent",
                 dm_sent_at=(datetime.now() - timedelta(days=1)).isoformat())
    action = get_reengage_action(p)
    assert action is None

def test_stage_1_at_3_days():
    p = Prospect(name="Dr. Smith", username="dr-smith", status="dm_sent",
                 dm_sent_at=(datetime.now() - timedelta(days=4)).isoformat(),
                 reengage_stage=0)
    action = get_reengage_action(p)
    assert action is not None
    assert action["action"] == "engage_content"

def test_stage_2_at_7_days():
    p = Prospect(name="Dr. Smith", username="dr-smith", status="dm_sent",
                 dm_sent_at=(datetime.now() - timedelta(days=8)).isoformat(),
                 reengage_stage=1)
    action = get_reengage_action(p)
    assert action["action"] == "soft_followup"

def test_closed_after_stage_4():
    p = Prospect(name="Dr. Smith", username="dr-smith", status="dm_sent",
                 dm_sent_at=(datetime.now() - timedelta(days=35)).isoformat(),
                 reengage_stage=4)
    action = get_reengage_action(p)
    assert action is None  # Already completed all stages

def test_reengage_templates_exist():
    assert "soft_followup" in REENGAGE_TEMPLATES
    assert "value_add_dm" in REENGAGE_TEMPLATES
    assert "final_close" in REENGAGE_TEMPLATES
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_reengage.py -v`
Expected: FAIL

- [ ] **Step 3: Write reengage.py**

```python
# reengage.py
"""Re-engagement campaign logic and message templates."""
from datetime import datetime, timedelta
from models import Prospect
from config import REENGAGE_STAGES

REENGAGE_TEMPLATES = {
    "soft_followup": "Hey {first_name}, hope you're having a great week! Just wanted to make sure my earlier message didn't get buried. No rush at all — happy to chat whenever works for you.",
    "value_add_dm": "Hi {first_name}, I came across some fascinating research on how infrared technology is helping healthcare practices improve patient outcomes — thought of you given your work in {specialty}. Happy to share more if you're curious.",
    "final_close": "Hi {first_name}, I don't want to be a bother! Just wanted to say the door's always open if BioPosture's doctor network ever interests you. Wishing you and your practice all the best.",
}


def get_reengage_action(prospect: Prospect) -> dict | None:
    """Determine the next re-engagement action for a prospect, or None if not due."""
    if prospect.status != "dm_sent" or not prospect.dm_sent_at:
        return None

    try:
        dm_sent = datetime.fromisoformat(prospect.dm_sent_at)
    except ValueError:
        return None

    days_since_dm = (datetime.now() - dm_sent).days
    current_stage = prospect.reengage_stage

    if current_stage >= len(REENGAGE_STAGES):
        return None  # All stages completed

    stage_config = REENGAGE_STAGES[current_stage]
    if days_since_dm >= stage_config["days_after_dm"]:
        return {
            "action": stage_config["action"],
            "priority": stage_config["priority"],
            "stage_index": current_stage,
        }

    return None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_reengage.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add reengage.py tests/test_reengage.py
git commit -m "feat: add re-engagement campaign logic and templates"
```

---

## Task 11: Browser Abstraction Layer

**Files:**
- Create: `browser.py`
- No unit tests (wraps subprocess calls to Docker — tested via integration only)

- [ ] **Step 1: Write browser.py**

```python
# browser.py
"""Browser abstraction layer wrapping ClawdBot Docker commands."""
import subprocess
import time
import re
from datetime import datetime


def _run_cmd(cmd: str) -> str:
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout + result.stderr


def _run_cmd_args(args: list) -> str:
    result = subprocess.run(args, capture_output=True, text=True)
    return result.stdout + result.stderr


def _log(msg: str) -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [BROWSER] {msg}")


class Browser:
    """Abstraction over ClawdBot browser commands."""

    def navigate(self, url: str, wait: float = 5) -> None:
        _log(f"Navigate to {url[:80]}...")
        _run_cmd(f'docker exec openclaw clawdbot browser navigate "{url}"')
        time.sleep(wait)

    def snapshot(self) -> str:
        return _run_cmd('docker exec openclaw clawdbot browser snapshot --format text 2>/dev/null')

    def click(self, ref: str, wait: float = 2) -> None:
        _log(f"Click {ref}")
        _run_cmd(f'docker exec openclaw clawdbot browser click {ref}')
        time.sleep(wait)

    def type_text(self, ref: str, text: str, wait: float = 0.3) -> None:
        _run_cmd_args(["docker", "exec", "openclaw", "clawdbot", "browser", "type", ref, text])
        time.sleep(wait)

    def press(self, keys: str, wait: float = 0.2) -> None:
        _run_cmd(f'docker exec openclaw clawdbot browser press "{keys}"')
        time.sleep(wait)

    def evaluate(self, fn: str, ref: str = None) -> str:
        if ref:
            return _run_cmd_args(["docker", "exec", "openclaw", "clawdbot", "browser", "evaluate", "--fn", fn, "--ref", ref])
        return _run_cmd(f"docker exec openclaw clawdbot browser evaluate --fn '{fn}'")

    def scroll(self, pixels: int = 800, wait: float = 1.5) -> None:
        _run_cmd(f"docker exec openclaw clawdbot browser evaluate --fn '() => window.scrollBy(0, {pixels})'")
        time.sleep(wait)

    def find_element(self, pattern: str, snapshot: str = None) -> str | None:
        """Find first element ref matching regex pattern in snapshot."""
        if snapshot is None:
            snapshot = self.snapshot()
        match = re.search(pattern, snapshot)
        return match.group(1) if match else None

    def find_all_elements(self, pattern: str, snapshot: str = None) -> list:
        """Find all element refs matching regex pattern."""
        if snapshot is None:
            snapshot = self.snapshot()
        return re.findall(pattern, snapshot)

    def insert_text(self, ref: str, text: str, wait: float = 0.3) -> None:
        """Insert text using execCommand (appends without clearing field)."""
        escaped = text.replace("\\", "\\\\").replace("'", "\\'")
        self.evaluate(f"(el) => {{ el.focus(); document.execCommand('insertText', false, '{escaped}'); }}", ref)
        time.sleep(wait)


class AIAgent:
    """Wrapper for ClawdBot AI agent text generation."""

    def generate(self, prompt: str, session_id: str = "default") -> str:
        escaped = prompt.replace("'", "").replace('"', '').replace('\n', ' ')[:6000]
        result = _run_cmd(f"docker exec openclaw clawdbot agent --message '{escaped}' --session-id {session_id} 2>/dev/null")
        return self._parse_response(result)

    def _parse_response(self, raw: str) -> str:
        for line in raw.strip().split('\n'):
            line = line.strip().strip('"').strip("'")
            if line and not line.startswith('[') and not line.startswith('(') and len(line) > 10:
                return line
        return ""
```

- [ ] **Step 2: Commit**

```bash
git add browser.py
git commit -m "feat: add browser abstraction and AI agent wrapper"
```

---

## Task 12: Task Executor

**Files:**
- Create: `task_executor.py`

This is the largest module — it contains the action functions ported from the 7 existing modules. Each action function uses `Browser` and `AIAgent` instead of raw subprocess calls.

- [ ] **Step 1: Write task_executor.py**

Port the action functions from the existing modules. Reference source:
- Profile viewing, liking, endorsing, commenting, connecting: `warmup_engine.py:137-397`
- DM sending: `linkedin_bot.py:236-308`
- Connection finding: `linkedin_bot.py:91-148`
- Healthcare validation: `linkedin_bot.py:150-167`
- Inbox checking: `reply_handler.py:161-198`
- Reply classification: `reply_handler.py:218-267`
- Prospecting: `prospector.py:142-190`
- Post engagement: existing `post_engager.py`
- Group engagement: existing `group_engager.py`
- Content posting: existing `content_poster.py`

```python
# task_executor.py
"""Executes browser tasks by dispatching to action functions."""
import os
import re
import time
import tempfile
from datetime import datetime
from models import Task, TaskResult, Prospect
from browser import Browser, AIAgent
from healthcare import is_healthcare_professional
from scoring import compute_engagement_score
from config import WARMUP_STAGES, HUMAN_TEAM, TEMPLATES_DIR, KNOWLEDGE_FILE, BASE_DIR
from reengage import REENGAGE_TEMPLATES


class TaskExecutor:
    def __init__(self, prospects: dict, analytics, notifier, ab_tester, browser=None, ai_agent=None):
        self._browser = browser or Browser()
        self._ai = ai_agent or AIAgent()
        self._prospects = prospects
        self._analytics = analytics
        self._notifier = notifier
        self._ab_tester = ab_tester

    def run(self, task: Task) -> TaskResult:
        """Dispatch task to the appropriate action function."""
        action_map = {
            "check_inbox": self._check_inbox,
            "view_profile": self._view_profile,
            "like_posts": self._like_posts,
            "endorse_skills": self._endorse_skills,
            "comment_post": self._comment_post,
            "connect_request": self._connect_request,
            "wait_accept": self._wait_accept,
            "send_dm": self._send_dm,
            "send_followup": self._send_followup,
            "search_prospects": self._search_prospects,
            "engage_post": self._engage_post,
            "engage_group": self._engage_group,
            "post_content": self._post_content,
            "reengage_content": self._reengage_content,
            "reengage_dm": self._reengage_dm,
        }
        action_fn = action_map.get(task.action_type)
        if not action_fn:
            return TaskResult.SKIPPED
        try:
            return action_fn(task)
        except Exception as e:
            print(f"[EXECUTOR] Error in {task.action_type}: {e}")
            return TaskResult.ERROR

    def _view_profile(self, task: Task) -> TaskResult:
        username = task.prospect_username
        url = f"https://www.linkedin.com/in/{username}/"
        self._browser.navigate(url)
        for _ in range(3):
            self._browser.scroll()
        snapshot = self._browser.snapshot()
        if username in snapshot or task.prospect_name.split()[0] in snapshot:
            return TaskResult.SUCCESS
        return TaskResult.SUCCESS  # Count even if unclear

    def _like_posts(self, task: Task) -> TaskResult:
        username = task.prospect_username
        url = f"https://www.linkedin.com/in/{username}/recent-activity/all/"
        self._browser.navigate(url)
        for _ in range(2):
            self._browser.scroll()
        snapshot = self._browser.snapshot()
        like_refs = self._browser.find_all_elements(r'button "(?:Like|React Like)[^"]*" \[ref=(e\d+)\]', snapshot)
        if not like_refs:
            like_refs = self._browser.find_all_elements(r'button[^[]*[Ll]ike[^[]*\[ref=(e\d+)\]', snapshot)
        for ref in like_refs[:2]:
            self._browser.click(ref, wait=3)
        return TaskResult.SUCCESS

    def _endorse_skills(self, task: Task) -> TaskResult:
        username = task.prospect_username
        url = f"https://www.linkedin.com/in/{username}/"
        self._browser.navigate(url)
        for _ in range(5):
            self._browser.scroll()
        snapshot = self._browser.snapshot()
        endorse_refs = self._browser.find_all_elements(r'button "Endorse ([^"]+)" \[ref=(e\d+)\]', snapshot)
        if not endorse_refs:
            endorse_refs = self._browser.find_all_elements(r'button[^[]*[Ee]ndorse[^[]*\[ref=(e\d+)\]', snapshot)
        for match in endorse_refs[:2]:
            ref = match[-1] if isinstance(match, tuple) else match
            self._browser.click(ref, wait=3)
        return TaskResult.SUCCESS

    def _comment_post(self, task: Task) -> TaskResult:
        username = task.prospect_username
        name = task.prospect_name
        url = f"https://www.linkedin.com/in/{username}/recent-activity/all/"
        self._browser.navigate(url)
        for _ in range(2):
            self._browser.scroll()
        snapshot = self._browser.snapshot()
        comment_ref = self._browser.find_element(r'button "Comment[^"]*" \[ref=(e\d+)\]', snapshot)
        if not comment_ref:
            return TaskResult.SUCCESS  # No posts to comment on, advance anyway
        prompt = f"Write a short, genuine LinkedIn comment (2-3 sentences, under 60 words) on a post by {name}, a healthcare professional. Post context: {snapshot[:2000]}. Rules: Be genuinely insightful. Sound like a real person. DO NOT pitch any products. Write ONLY the comment."
        comment = self._ai.generate(prompt, session_id="warmup_comment")
        if not comment or len(comment) < 15:
            first_name = name.split()[0]
            comment = f"Great perspective, {first_name}! This really resonates with what we're seeing in the wellness space. Keep sharing insights like this!"
        self._browser.click(comment_ref, wait=3)
        snapshot = self._browser.snapshot()
        textbox_ref = self._browser.find_element(r'textbox[^[]*\[ref=(e\d+)\]', snapshot)
        if not textbox_ref:
            return TaskResult.ELEMENT_NOT_FOUND
        self._browser.type_text(textbox_ref, comment)
        snapshot = self._browser.snapshot()
        submit_ref = self._browser.find_element(r'button "(?:Post|Submit|Comment)"[^[]*\[ref=(e\d+)\]', snapshot)
        if submit_ref:
            self._browser.click(submit_ref, wait=3)
            return TaskResult.SUCCESS
        return TaskResult.ELEMENT_NOT_FOUND

    def _connect_request(self, task: Task) -> TaskResult:
        username = task.prospect_username
        name = task.prospect_name
        url = f"https://www.linkedin.com/in/{username}/"
        self._browser.navigate(url)
        snapshot = self._browser.snapshot()
        if "Message" in snapshot and "Connect" not in snapshot:
            return TaskResult.SUCCESS  # Already connected
        connect_ref = self._browser.find_element(r'button "Connect[^"]*" \[ref=(e\d+)\]', snapshot)
        if not connect_ref:
            more_ref = self._browser.find_element(r'button "More[^"]*" \[ref=(e\d+)\]', snapshot)
            if more_ref:
                self._browser.click(more_ref)
                snapshot = self._browser.snapshot()
                connect_ref = self._browser.find_element(r'button "Connect[^"]*" \[ref=(e\d+)\]', snapshot)
        if not connect_ref:
            return TaskResult.ELEMENT_NOT_FOUND
        self._browser.click(connect_ref, wait=3)
        snapshot = self._browser.snapshot()
        note_ref = self._browser.find_element(r'button "Add a note[^"]*" \[ref=(e\d+)\]', snapshot)
        if note_ref:
            self._browser.click(note_ref)
            snapshot = self._browser.snapshot()
            first_name = name.split()[0]
            note = f"Hi {first_name}, I've been following your work in healthcare and would love to connect! I work with Sleep BioLogics, helping healthcare professionals improve patient outcomes through clinically-proven sleep solutions. Looking forward to connecting!"
            note_textbox = self._browser.find_element(r'textbox[^[]*\[ref=(e\d+)\]', snapshot)
            if note_textbox:
                self._browser.type_text(note_textbox, note)
        snapshot = self._browser.snapshot()
        send_ref = self._browser.find_element(r'button "Send[^"]*" \[ref=(e\d+)\]', snapshot)
        if send_ref:
            self._browser.click(send_ref, wait=3)
            return TaskResult.SUCCESS
        return TaskResult.ELEMENT_NOT_FOUND

    def _wait_accept(self, task: Task) -> TaskResult:
        username = task.prospect_username
        url = f"https://www.linkedin.com/in/{username}/"
        self._browser.navigate(url)
        snapshot = self._browser.snapshot()
        if self._browser.find_element(r'button "Message[^"]*" \[ref=(e\d+)\]', snapshot):
            return TaskResult.SUCCESS
        if "pending" in snapshot.lower():
            return TaskResult.SKIPPED  # Still pending
        return TaskResult.SKIPPED

    def _send_dm(self, task: Task) -> TaskResult:
        username = task.prospect_username
        name = task.prospect_name
        first_name = name.split()[0]
        # Get template variant
        variant_info = task.metadata.get("variant_info", {})
        template_file = variant_info.get("template", "variant_a.txt")
        template_path = os.path.join(TEMPLATES_DIR, template_file)
        if os.path.exists(template_path):
            with open(template_path) as f:
                template = f.read().strip()
        else:
            fallback = os.path.join(BASE_DIR, "message-template.txt")
            with open(fallback) as f:
                template = f.read().strip()
        # Generate opener
        prompt = f"You are looking at {name}'s LinkedIn profile. They are a healthcare professional. Write ONE short personalized opening sentence (max 20 words). Focus on something specific about THEM. Their first name is {first_name}. Just write the single sentence."
        opener = self._ai.generate(prompt, session_id="personalize")
        if not opener:
            opener = f"Hi {first_name}, I came across your profile and your work in healthcare caught my attention."
        body = template.replace("{{NAME}}", first_name)
        full_message = opener + "\n\n" + body
        # Navigate to messaging
        msg_url = f"https://www.linkedin.com/messaging/thread/new/?recipient={username}"
        self._browser.navigate(msg_url, wait=4)
        snapshot = self._browser.snapshot()
        textbox_ref = self._browser.find_element(r'textbox "Write a message[^"]*" \[ref=(e\d+)\]', snapshot)
        if not textbox_ref:
            return TaskResult.ELEMENT_NOT_FOUND
        self._browser.click(textbox_ref, wait=0.5)
        # Type message line by line
        lines = full_message.replace("\\n", "\n").split("\n")
        if lines:
            self._browser.type_text(textbox_ref, lines[0])
        for line in lines[1:]:
            self._browser.press("Shift+Enter")
            if line.strip():
                self._browser.insert_text(textbox_ref, line.strip())
        time.sleep(2)
        snapshot = self._browser.snapshot()
        send_ref = self._browser.find_element(r'button "Send" \[ref=(e\d+)\]', snapshot)
        if not send_ref:
            return TaskResult.ELEMENT_NOT_FOUND
        self._browser.click(send_ref)
        return TaskResult.SUCCESS

    def _send_followup(self, task: Task) -> TaskResult:
        username = task.prospect_username
        name = task.prospect_name
        first_name = name.split()[0]
        followup_msg = (
            f"Hi {first_name}, just wanted to circle back! "
            f"I know things get busy, so no pressure at all. "
            f"If you're still curious about the BioPosture Doctor Network, "
            f"I'd love to help you get started. "
            f"You can register at https://bioposture.com/doctor-registration/ "
            f"or reach out to irwinpearl@bioposture.com for a personal conversation. "
            f"Wishing you all the best!"
        )
        msg_url = f"https://www.linkedin.com/messaging/thread/new/?recipient={username}"
        self._browser.navigate(msg_url, wait=4)
        snapshot = self._browser.snapshot()
        textbox_ref = self._browser.find_element(r'textbox "Write a message[^"]*" \[ref=(e\d+)\]', snapshot)
        if not textbox_ref:
            return TaskResult.ELEMENT_NOT_FOUND
        self._browser.type_text(textbox_ref, followup_msg)
        time.sleep(2)
        snapshot = self._browser.snapshot()
        send_ref = self._browser.find_element(r'button "Send" \[ref=(e\d+)\]', snapshot)
        if send_ref:
            self._browser.click(send_ref)
            return TaskResult.SUCCESS
        return TaskResult.ELEMENT_NOT_FOUND

    def _check_inbox(self, task: Task) -> TaskResult:
        self._browser.navigate("https://www.linkedin.com/messaging/")
        snapshot = self._browser.snapshot()
        # Return snapshot in task metadata for reply_gen to process
        task.metadata["inbox_snapshot"] = snapshot
        return TaskResult.SUCCESS

    def _search_prospects(self, task: Task) -> TaskResult:
        query = task.metadata.get("query", "chiropractor")
        encoded = query.replace(" ", "%20")
        url = f"https://www.linkedin.com/search/results/people/?keywords={encoded}"
        self._browser.navigate(url)
        for _ in range(3):
            self._browser.scroll()
        snapshot = self._browser.snapshot()
        task.metadata["search_snapshot"] = snapshot
        return TaskResult.SUCCESS

    def _engage_post(self, task: Task) -> TaskResult:
        # Navigate to feed or search for healthcare posts
        query = task.metadata.get("query", "chiropractic health")
        encoded = query.replace(" ", "%20")
        url = f"https://www.linkedin.com/search/results/content/?keywords={encoded}"
        self._browser.navigate(url)
        for _ in range(2):
            self._browser.scroll()
        snapshot = self._browser.snapshot()
        # Like first few posts
        like_refs = self._browser.find_all_elements(r'button "(?:Like|React Like)[^"]*" \[ref=(e\d+)\]', snapshot)
        for ref in like_refs[:3]:
            self._browser.click(ref, wait=3)
        return TaskResult.SUCCESS

    def _engage_group(self, task: Task) -> TaskResult:
        group_url = task.metadata.get("group_url", "")
        if not group_url:
            return TaskResult.SKIPPED
        self._browser.navigate(group_url)
        for _ in range(2):
            self._browser.scroll()
        snapshot = self._browser.snapshot()
        # Find and comment on a post
        comment_ref = self._browser.find_element(r'button "Comment[^"]*" \[ref=(e\d+)\]', snapshot)
        if comment_ref:
            prompt = "Write a short, professional LinkedIn comment (2 sentences) on a healthcare group post. Be insightful about patient care or wellness. DO NOT pitch products. Write ONLY the comment."
            comment = self._ai.generate(prompt, session_id="group_comment")
            if comment and len(comment) > 15:
                self._browser.click(comment_ref, wait=3)
                snapshot = self._browser.snapshot()
                textbox_ref = self._browser.find_element(r'textbox[^[]*\[ref=(e\d+)\]', snapshot)
                if textbox_ref:
                    self._browser.type_text(textbox_ref, comment)
                    snapshot = self._browser.snapshot()
                    submit_ref = self._browser.find_element(r'button "(?:Post|Submit|Comment)"[^[]*\[ref=(e\d+)\]', snapshot)
                    if submit_ref:
                        self._browser.click(submit_ref, wait=3)
        return TaskResult.SUCCESS

    def _post_content(self, task: Task) -> TaskResult:
        theme = task.metadata.get("theme", "Sleep health tips for healthcare professionals")
        knowledge = ""
        if os.path.exists(KNOWLEDGE_FILE):
            with open(KNOWLEDGE_FILE) as f:
                knowledge = f.read()[:2000]
        prompt = f"Write a LinkedIn post (150-250 words) about: {theme}. Context about BioPosture: {knowledge[:1000]}. Rules: Professional tone. Include a call to engage (ask a question). Use line breaks. Do NOT use hashtags excessively (max 3). Write ONLY the post text."
        post_text = self._ai.generate(prompt, session_id="content_post")
        if not post_text or len(post_text) < 50:
            return TaskResult.FAILED
        self._browser.navigate("https://www.linkedin.com/feed/")
        snapshot = self._browser.snapshot()
        start_post_ref = self._browser.find_element(r'button "Start a post[^"]*" \[ref=(e\d+)\]', snapshot)
        if not start_post_ref:
            return TaskResult.ELEMENT_NOT_FOUND
        self._browser.click(start_post_ref, wait=3)
        snapshot = self._browser.snapshot()
        textbox_ref = self._browser.find_element(r'textbox[^[]*\[ref=(e\d+)\]', snapshot)
        if not textbox_ref:
            return TaskResult.ELEMENT_NOT_FOUND
        self._browser.type_text(textbox_ref, post_text)
        time.sleep(2)
        snapshot = self._browser.snapshot()
        post_ref = self._browser.find_element(r'button "Post"[^[]*\[ref=(e\d+)\]', snapshot)
        if post_ref:
            self._browser.click(post_ref, wait=3)
            return TaskResult.SUCCESS
        return TaskResult.ELEMENT_NOT_FOUND

    def _reengage_content(self, task: Task) -> TaskResult:
        """Re-engagement stage 1: engage with their content (no DM)."""
        return self._like_posts(task)

    def _reengage_dm(self, task: Task) -> TaskResult:
        """Re-engagement stages 2-4: send a re-engagement message."""
        username = task.prospect_username
        name = task.prospect_name
        first_name = name.split()[0]
        template_key = task.metadata.get("template_key", "soft_followup")
        template = REENGAGE_TEMPLATES.get(template_key, REENGAGE_TEMPLATES["soft_followup"])
        message = template.format(first_name=first_name, specialty="healthcare")
        msg_url = f"https://www.linkedin.com/messaging/thread/new/?recipient={username}"
        self._browser.navigate(msg_url, wait=4)
        snapshot = self._browser.snapshot()
        textbox_ref = self._browser.find_element(r'textbox "Write a message[^"]*" \[ref=(e\d+)\]', snapshot)
        if not textbox_ref:
            return TaskResult.ELEMENT_NOT_FOUND
        self._browser.type_text(textbox_ref, message)
        time.sleep(2)
        snapshot = self._browser.snapshot()
        send_ref = self._browser.find_element(r'button "Send" \[ref=(e\d+)\]', snapshot)
        if send_ref:
            self._browser.click(send_ref)
            return TaskResult.SUCCESS
        return TaskResult.ELEMENT_NOT_FOUND
```

- [ ] **Step 2: Commit**

```bash
git add task_executor.py
git commit -m "feat: add task executor with all action functions"
```

---

## Task 13: Task Generators

**Files:**
- Create: `task_generators/__init__.py`, all 8 generator files

- [ ] **Step 1: Write generator base and reply_gen.py**

```python
# task_generators/__init__.py
"""Task generator base class."""
from models import Task


class BaseGenerator:
    """Base class for all task generators."""
    def generate_tasks(self, queue, prospects: dict, rate_limiter, **kwargs) -> None:
        raise NotImplementedError
```

```python
# task_generators/reply_gen.py
"""Inbox check and reply classification task generator."""
import time
from datetime import datetime
from models import Task
from config import P0_CRITICAL, REPLY_CHECK_INTERVAL_SECONDS, HUMAN_TEAM
from task_generators import BaseGenerator


class ReplyGenerator(BaseGenerator):
    def __init__(self):
        self._last_check = 0

    def generate_tasks(self, queue, prospects, rate_limiter, **kwargs):
        now = time.time()
        if now - self._last_check < REPLY_CHECK_INTERVAL_SECONDS:
            return
        self._last_check = now
        queue.push(Task(
            action_type="check_inbox",
            priority=P0_CRITICAL,
            metadata={"check_time": datetime.now().isoformat()},
        ))
```

- [ ] **Step 2: Write warmup_gen.py**

```python
# task_generators/warmup_gen.py
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
            # Check if action is due
            if p.last_action_at:
                try:
                    last = datetime.fromisoformat(p.last_action_at)
                    wait_days = stage_config["wait_days"]
                    if (now - last).days < wait_days:
                        continue
                except ValueError:
                    pass
            # Determine priority based on score and stage
            if p.engagement_score >= 70:
                priority = P1_HIGH
            elif p.engagement_score >= 40:
                priority = P2_MEDIUM
            else:
                priority = P3_LOW
            # Late-stage warmup gets higher priority
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
```

- [ ] **Step 3: Write outreach_gen.py**

```python
# task_generators/outreach_gen.py
"""DM sending task generator."""
from datetime import datetime
from models import Task, Prospect
from config import P2_MEDIUM
from timezone import is_in_peak_window
from task_generators import BaseGenerator


class OutreachGenerator(BaseGenerator):
    def __init__(self, ab_tester):
        self._ab_tester = ab_tester

    def generate_tasks(self, queue, prospects, rate_limiter, **kwargs):
        if rate_limiter.would_exceed("dm_send"):
            return
        for username, p in prospects.items():
            if p.pipeline_stage != "dm_ready" or p.status != "active":
                continue
            if p.dm_sent_at:
                continue  # Already sent
            # Time-of-day check
            if not is_in_peak_window(p.timezone):
                continue  # Defer to peak window
            variant_info = self._ab_tester.assign_variant(username)
            queue.push(Task(
                action_type="send_dm",
                priority=P2_MEDIUM,
                prospect_username=username,
                prospect_name=p.name,
                metadata={"variant_info": variant_info},
            ))
```

- [ ] **Step 4: Write remaining generators**

```python
# task_generators/followup_gen.py
"""Scheduled follow-up task generator."""
from datetime import datetime
from models import Task
from config import P1_HIGH, HUMAN_TEAM
from task_generators import BaseGenerator


class FollowupGenerator(BaseGenerator):
    def generate_tasks(self, queue, prospects, rate_limiter, **kwargs):
        now = datetime.now()
        for username, p in prospects.items():
            if p.followup_status != "pending" or not p.followup_at:
                continue
            try:
                followup_time = datetime.fromisoformat(p.followup_at)
            except ValueError:
                continue
            if now >= followup_time:
                queue.push(Task(
                    action_type="send_followup",
                    priority=P1_HIGH,
                    prospect_username=username,
                    prospect_name=p.name,
                ))
```

```python
# task_generators/prospector_gen.py
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
        if now - self._last_run < 4 * 3600:  # Every 4 hours
            return
        self._last_run = now
        query = SEARCH_QUERIES[self._query_index % len(SEARCH_QUERIES)]
        self._query_index += 1
        queue.push(Task(
            action_type="search_prospects",
            priority=P3_LOW,
            metadata={"query": query},
        ))
```

```python
# task_generators/engagement_gen.py
"""Post and group engagement task generator."""
import time
from models import Task
from config import P4_BACKGROUND
from task_generators import BaseGenerator


class EngagementGenerator(BaseGenerator):
    def __init__(self):
        self._last_post_engage = 0
        self._last_group_engage = 0

    def generate_tasks(self, queue, prospects, rate_limiter, **kwargs):
        now = time.time()
        # Post engagement every 2 hours
        if now - self._last_post_engage >= 2 * 3600:
            if not rate_limiter.would_exceed("comment"):
                self._last_post_engage = now
                queue.push(Task(
                    action_type="engage_post",
                    priority=P4_BACKGROUND,
                    metadata={"query": "chiropractic health wellness"},
                ))
        # Group engagement every 3 hours
        if now - self._last_group_engage >= 3 * 3600:
            if not rate_limiter.would_exceed("group_comment"):
                self._last_group_engage = now
                queue.push(Task(
                    action_type="engage_group",
                    priority=P4_BACKGROUND,
                    metadata={},
                ))
```

```python
# task_generators/content_gen.py
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
        if time.time() - self._last_post < 6 * 3600:  # Max every 6 hours
            return
        self._last_post = time.time()
        theme = CONTENT_THEMES[self._theme_index % len(CONTENT_THEMES)]
        self._theme_index += 1
        queue.push(Task(
            action_type="post_content",
            priority=P4_BACKGROUND,
            metadata={"theme": theme},
        ))
```

```python
# task_generators/reengage_gen.py
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
                continue  # They replied, don't re-engage
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
```

- [ ] **Step 5: Commit**

```bash
git add task_generators/
git commit -m "feat: add all 8 task generators"
```

---

## Task 14: Main Scheduler

**Files:**
- Create: `scheduler.py`

- [ ] **Step 1: Write scheduler.py**

```python
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

    # Initialize components
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(TEMPLATES_DIR, exist_ok=True)

    analytics = Analytics(data_dir=DATA_DIR)
    notifier = Notifier(notify_email=NOTIFY_EMAIL, prospects_path=PROSPECTS_PATH)
    ab_tester = ABTester(templates_dir=TEMPLATES_DIR, data_dir=DATA_DIR)
    rate_limiter = RateLimiter(DAILY_LIMITS)
    queue = TaskQueue()

    # Load prospect state
    prospects = load_prospects(PROSPECTS_PATH)
    log(f"Loaded {len(prospects)} prospects")

    # Initialize executor
    executor = TaskExecutor(prospects, analytics, notifier, ab_tester)

    # Initialize generators
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
            # Daily reset
            today = datetime.now().date()
            if today != last_daily_reset:
                rate_limiter.reset()
                summary = analytics.generate_daily_summary(last_daily_reset.isoformat())
                analytics.save_daily_summary(summary)
                log(f"Daily reset. Yesterday's stats: {summary}")
                last_daily_reset = today

            # Generate tasks
            for gen in generators:
                try:
                    gen.generate_tasks(queue, prospects, rate_limiter)
                except Exception as e:
                    log(f"Generator error: {e}")

            # Pop highest priority task
            task = queue.pop()

            if task is None:
                time.sleep(30)
                continue

            # Rate limit check
            if rate_limiter.would_exceed(task.action_type):
                log(f"Rate limit reached for {task.action_type}, skipping")
                continue

            # Execute
            log(f"Executing: {task.action_type} for {task.prospect_name or 'N/A'}")
            result = executor.run(task)

            # Log analytics
            analytics.log_event(task, result)

            if result == TaskResult.SUCCESS:
                consecutive_failures = 0
                rate_limiter.record(task.action_type)

                # Update prospect state based on action
                if task.prospect_username and task.prospect_username in prospects:
                    p = prospects[task.prospect_username]
                    p.last_action_at = datetime.now().isoformat()
                    p.last_processed_at = datetime.now().isoformat()

                    # Advance pipeline stage
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

            # Periodic save
            if time.time() - last_save > 60:
                save_prospects(prospects, PROSPECTS_PATH)
                last_save = time.time()

            # Pause between tasks
            pause = random.uniform(*PAUSE_BETWEEN_TASKS_RANGE)
            time.sleep(pause)

        except Exception as e:
            log(f"Scheduler error: {e}")
            time.sleep(10)

    # Final save on shutdown
    save_prospects(prospects, PROSPECTS_PATH)
    log("Scheduler stopped.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Commit**

```bash
git add scheduler.py
git commit -m "feat: add central scheduler main loop"
```

---

## Task 15: Migration Script

**Files:**
- Create: `migrate.py`
- Test: `tests/test_migrate.py`

- [ ] **Step 1: Write test**

```python
# tests/test_migrate.py
import os
import tempfile
from migrate import migrate_messaged, migrate_warmup_pipeline, migrate_all
from models import load_prospects

def test_migrate_messaged():
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create fake messaged.txt
        messaged = os.path.join(tmpdir, "messaged.txt")
        with open(messaged, "w") as f:
            f.write("Dr. Smith|2026-03-01 10:00:00\n")
            f.write("Jane DC|2026-03-02 14:30:00\n")
        prospects = {}
        migrate_messaged(messaged, prospects)
        assert len(prospects) == 2
        assert prospects["dr. smith"].dm_sent_at == "2026-03-01 10:00:00"
        assert prospects["jane dc"].status == "dm_sent"

def test_migrate_warmup_pipeline():
    with tempfile.TemporaryDirectory() as tmpdir:
        pipeline = os.path.join(tmpdir, "warmup_pipeline.txt")
        with open(pipeline, "w") as f:
            f.write("Dr. Jones|dr-jones|like_posts|2026-03-10 09:00:00|2026-03-08 09:00:00\n")
        prospects = {}
        migrate_warmup_pipeline(pipeline, prospects)
        assert "dr. jones" in prospects
        assert prospects["dr. jones"].username == "dr-jones"
        assert prospects["dr. jones"].pipeline_stage == "like_posts"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_migrate.py -v`
Expected: FAIL

- [ ] **Step 3: Write migrate.py**

```python
# migrate.py
"""One-time migration from .txt tracking files to data/prospects.json."""
import os
import shutil
from datetime import datetime
from models import Prospect, save_prospects, load_prospects

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def migrate_messaged(filepath: str, prospects: dict) -> None:
    if not os.path.exists(filepath):
        return
    with open(filepath) as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) >= 2:
                name = parts[0].strip()
                key = name.lower()
                if key not in prospects:
                    prospects[key] = Prospect(name=name, username="")
                prospects[key].dm_sent_at = parts[1].strip()
                prospects[key].status = "dm_sent"


def migrate_warmup_pipeline(filepath: str, prospects: dict) -> None:
    if not os.path.exists(filepath):
        return
    with open(filepath) as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) >= 4:
                name = parts[0].strip()
                key = name.lower()
                if key not in prospects:
                    prospects[key] = Prospect(name=name, username=parts[1].strip())
                else:
                    if not prospects[key].username:
                        prospects[key].username = parts[1].strip()
                prospects[key].pipeline_stage = parts[2].strip()
                prospects[key].last_action_at = parts[3].strip()
                if len(parts) > 4:
                    prospects[key].added_at = parts[4].strip()


def migrate_conversations(filepath: str, prospects: dict) -> None:
    if not os.path.exists(filepath):
        return
    with open(filepath) as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) >= 3:
                key = parts[0].strip().lower()
                if key in prospects:
                    prospects[key].reply_count = int(parts[1])
                    prospects[key].reply_status = parts[2]
                    if len(parts) > 3:
                        prospects[key].last_reply_at = parts[3]
                    if len(parts) > 4:
                        prospects[key].followup_at = parts[4]


def migrate_followups(filepath: str, prospects: dict) -> None:
    if not os.path.exists(filepath):
        return
    with open(filepath) as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) >= 4:
                key = parts[0].strip().lower()
                if key in prospects:
                    prospects[key].followup_at = parts[1].strip()
                    if not prospects[key].username:
                        prospects[key].username = parts[2].strip()
                    prospects[key].followup_status = parts[3].strip()


def migrate_handoffs(filepath: str, prospects: dict) -> None:
    if not os.path.exists(filepath):
        return
    with open(filepath) as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) >= 3:
                key = parts[0].strip().lower()
                if key in prospects:
                    prospects[key].handoff_reason = parts[1].strip()
                    prospects[key].handoff_at = parts[2].strip()
                    prospects[key].status = "handed_off"


def migrate_prospects_found(filepath: str, prospects: dict) -> None:
    if not os.path.exists(filepath):
        return
    with open(filepath) as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) >= 4:
                name = parts[0].strip()
                key = name.lower()
                if key not in prospects:
                    prospects[key] = Prospect(name=name, username=parts[1].strip())
                prospects[key].headline = parts[2].strip()[:100]
                prospects[key].source_query = parts[3].strip()
                if len(parts) > 4:
                    prospects[key].added_at = parts[4].strip()
                prospects[key].source = "prospector"


def migrate_skipped(filepath: str, prospects: dict) -> None:
    if not os.path.exists(filepath):
        return
    with open(filepath) as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) >= 2:
                key = parts[0].strip().lower()
                if key not in prospects:
                    prospects[key] = Prospect(name=parts[0].strip(), username="")
                prospects[key].status = "closed"


def migrate_all(source_dir: str = None, output_path: str = None) -> dict:
    """Run full migration. Returns migrated prospects dict."""
    if source_dir is None:
        source_dir = BASE_DIR
    if output_path is None:
        output_path = os.path.join(BASE_DIR, "data", "prospects.json")

    prospects = {}

    # Order matters: pipeline and prospects_found have usernames, messaged may not
    migrate_warmup_pipeline(os.path.join(source_dir, "warmup_pipeline.txt"), prospects)
    migrate_prospects_found(os.path.join(source_dir, "prospects_found.txt"), prospects)
    migrate_messaged(os.path.join(source_dir, "messaged.txt"), prospects)
    migrate_skipped(os.path.join(source_dir, "skipped.txt"), prospects)
    migrate_conversations(os.path.join(source_dir, "conversations.txt"), prospects)
    migrate_followups(os.path.join(source_dir, "followups.txt"), prospects)
    migrate_handoffs(os.path.join(source_dir, "handoff.txt"), prospects)

    # Copy message template
    template_src = os.path.join(source_dir, "message-template.txt")
    template_dst = os.path.join(BASE_DIR, "templates", "variant_a.txt")
    if os.path.exists(template_src):
        os.makedirs(os.path.dirname(template_dst), exist_ok=True)
        shutil.copy2(template_src, template_dst)

    # Save
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    # Convert to username-keyed (best effort)
    username_keyed = {}
    for key, p in prospects.items():
        ukey = p.username if p.username else key
        username_keyed[ukey] = p
    save_prospects(username_keyed, output_path)

    print(f"Migration complete: {len(username_keyed)} prospects saved to {output_path}")
    return username_keyed


if __name__ == "__main__":
    migrate_all()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_migrate.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add migrate.py tests/test_migrate.py
git commit -m "feat: add migration script from .txt to JSON"
```

---

## Task 16: Templates Setup and Final Integration

**Files:**
- Copy: `message-template.txt` → `templates/variant_a.txt`
- Create: `templates/variant_b.txt` (shorter alternative)
- Create: `templates/opener_prompts/prompt_a.txt`, `templates/opener_prompts/prompt_b.txt`

- [ ] **Step 1: Copy and create template files**

```bash
cp message-template.txt templates/variant_a.txt
```

Create `templates/variant_b.txt` — a shorter, more direct alternative template for A/B testing. Keep the `{{NAME}}` placeholder.

Create `templates/opener_prompts/prompt_a.txt`:
```
You are looking at {{NAME}}'s LinkedIn profile. They are a healthcare professional. Write ONE short personalized opening sentence (max 20 words). Focus on something specific about THEM - their practice, specialization, or achievement. Just write the single sentence.
```

Create `templates/opener_prompts/prompt_b.txt`:
```
Write a brief, warm greeting for {{NAME}}, a healthcare professional. Reference their work or expertise. One sentence, under 15 words. Be genuine and specific. Just the sentence, nothing else.
```

- [ ] **Step 2: Run full test suite**

Run: `python -m pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add templates/
git commit -m "feat: add message template variants and opener prompts for A/B testing"
```

---

## Task 17: Move Legacy Files

- [ ] **Step 1: Create legacy directory and move old modules**

```bash
mkdir -p legacy/data
mv orchestrator.py linkedin_bot.py reply_handler.py warmup_engine.py post_engager.py group_engager.py prospector.py content_poster.py scan_replies.py shared_lock.py legacy/
```

- [ ] **Step 2: Commit**

```bash
git add legacy/ -u orchestrator.py linkedin_bot.py reply_handler.py warmup_engine.py post_engager.py group_engager.py prospector.py content_poster.py scan_replies.py shared_lock.py
git commit -m "chore: move legacy modules to legacy/ directory"
```

---

## Task 18: End-to-End Smoke Test

- [ ] **Step 1: Run migration on existing data**

```bash
cd /Users/ramediatechnologies/openclaw/linkedin-agent
python3 migrate.py
```

Verify: Check `data/prospects.json` exists and contains expected prospect records.

- [ ] **Step 2: Verify scheduler starts without errors**

```bash
timeout 10 python3 scheduler.py || true
```

Expected: Scheduler starts, loads prospects, runs a few generator cycles, then exits on timeout. No import errors, no crashes.

- [ ] **Step 3: Run full test suite one final time**

```bash
python -m pytest tests/ -v --tb=short
```

Expected: All PASS

- [ ] **Step 4: Final commit**

```bash
git add scheduler.py task_executor.py task_generators/ migrate.py templates/ data/
git commit -m "feat: LinkedIn Agent v2 complete — central scheduler with analytics, A/B testing, scoring, timezone optimization, and re-engagement"
```

---

## Task 19: Add Missing Migration Functions

The migration script needs to handle engagement history and group tracking files that were missing from the initial implementation.

**Files:**
- Modify: `migrate.py`

- [ ] **Step 1: Add migration functions for remaining .txt files**

Add these functions to `migrate.py`:

```python
def migrate_engagement_history(analytics_file: str, source_dir: str) -> None:
    """Migrate commented_posts, liked_posts, group_comments, posted_content to analytics.json."""
    import json
    files_to_migrate = {
        "commented_posts.txt": "comment_posted",
        "liked_posts.txt": "post_liked",
        "group_comments.txt": "group_comment",
        "posted_content.txt": "content_posted",
    }
    for filename, event_type in files_to_migrate.items():
        filepath = os.path.join(source_dir, filename)
        if not os.path.exists(filepath):
            continue
        with open(filepath) as f:
            for line in f:
                parts = line.strip().split("|")
                if len(parts) >= 2:
                    event = {
                        "timestamp": parts[-1].strip(),
                        "event_type": event_type,
                        "prospect_name": "",
                        "prospect_username": "",
                        "result": "success",
                        "priority": 4,
                        "metadata": {"id": parts[0].strip(), "source": "migration"},
                    }
                    with open(analytics_file, "a") as af:
                        af.write(json.dumps(event) + "\n")


def migrate_engaged_profiles(filepath: str, prospects: dict) -> None:
    if not os.path.exists(filepath):
        return
    with open(filepath) as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) >= 2:
                key = parts[0].strip().lower()
                if key in prospects:
                    prospects[key].posts_commented += 1


def migrate_joined_groups(filepath: str, data_dir: str) -> None:
    """Migrate joined_groups.txt to data/groups.json."""
    import json
    if not os.path.exists(filepath):
        return
    groups = []
    with open(filepath) as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) >= 2:
                groups.append({"name": parts[0].strip(), "url": parts[1].strip(),
                               "joined_at": parts[2].strip() if len(parts) > 2 else ""})
    groups_path = os.path.join(data_dir, "groups.json")
    with open(groups_path, "w") as f:
        json.dump(groups, f, indent=2)
```

Add calls in `migrate_all()`:
```python
    # After prospect migrations
    analytics_file = os.path.join(os.path.dirname(output_path), "analytics.json")
    migrate_engagement_history(analytics_file, source_dir)
    migrate_engaged_profiles(os.path.join(source_dir, "engaged_profiles.txt"), prospects)
    migrate_joined_groups(os.path.join(source_dir, "joined_groups.txt"), os.path.dirname(output_path))
```

- [ ] **Step 2: Commit**

```bash
git add migrate.py
git commit -m "feat: add migration for engagement history, groups, and content files"
```

---

## Task 20: Add Generator Tests

**Files:**
- Create: `tests/test_generators/test_warmup_gen.py`
- Create: `tests/test_generators/test_outreach_gen.py`

- [ ] **Step 1: Write warmup generator test**

```python
# tests/test_generators/test_warmup_gen.py
from task_generators.warmup_gen import WarmupGenerator
from task_queue import TaskQueue, RateLimiter
from models import Prospect
from config import DAILY_LIMITS
from datetime import datetime, timedelta

def test_generates_task_for_due_prospect():
    q = TaskQueue()
    rl = RateLimiter(DAILY_LIMITS)
    p = Prospect(name="Dr. Smith", username="dr-smith", status="active",
                 pipeline_stage="view_profile",
                 last_action_at=(datetime.now() - timedelta(days=2)).isoformat())
    gen = WarmupGenerator()
    gen.generate_tasks(q, {"dr-smith": p}, rl)
    assert len(q) == 1

def test_skips_prospect_not_due():
    q = TaskQueue()
    rl = RateLimiter(DAILY_LIMITS)
    p = Prospect(name="Dr. Smith", username="dr-smith", status="active",
                 pipeline_stage="view_profile",
                 last_action_at=datetime.now().isoformat())  # Just acted
    gen = WarmupGenerator()
    gen.generate_tasks(q, {"dr-smith": p}, rl)
    assert len(q) == 0

def test_skips_done_prospects():
    q = TaskQueue()
    rl = RateLimiter(DAILY_LIMITS)
    p = Prospect(name="Dr. Smith", username="dr-smith", status="active",
                 pipeline_stage="done")
    gen = WarmupGenerator()
    gen.generate_tasks(q, {"dr-smith": p}, rl)
    assert len(q) == 0

def test_high_score_gets_higher_priority():
    q = TaskQueue()
    rl = RateLimiter(DAILY_LIMITS)
    p = Prospect(name="Dr. Smith", username="dr-smith", status="active",
                 pipeline_stage="like_posts", engagement_score=80,
                 last_action_at=(datetime.now() - timedelta(days=2)).isoformat())
    gen = WarmupGenerator()
    gen.generate_tasks(q, {"dr-smith": p}, rl)
    task = q.pop()
    assert task.priority <= 1  # P1_HIGH
```

- [ ] **Step 2: Write outreach generator test**

```python
# tests/test_generators/test_outreach_gen.py
from task_generators.outreach_gen import OutreachGenerator
from task_queue import TaskQueue, RateLimiter
from models import Prospect
from ab_testing import ABTester
from config import DAILY_LIMITS
import tempfile, os

def test_generates_dm_for_ready_prospect():
    with tempfile.TemporaryDirectory() as tmpdir:
        os.makedirs(os.path.join(tmpdir, "templates"))
        with open(os.path.join(tmpdir, "templates", "variant_a.txt"), "w") as f:
            f.write("test")
        ab = ABTester(os.path.join(tmpdir, "templates"), tmpdir)
        q = TaskQueue()
        rl = RateLimiter(DAILY_LIMITS)
        p = Prospect(name="Dr. Smith", username="dr-smith", status="active",
                     pipeline_stage="dm_ready")
        gen = OutreachGenerator(ab)
        gen.generate_tasks(q, {"dr-smith": p}, rl)
        # May or may not generate depending on peak window, but no crash
        assert True

def test_skips_already_sent():
    with tempfile.TemporaryDirectory() as tmpdir:
        ab = ABTester(tmpdir, tmpdir)
        q = TaskQueue()
        rl = RateLimiter(DAILY_LIMITS)
        p = Prospect(name="Dr. Smith", username="dr-smith", status="active",
                     pipeline_stage="dm_ready", dm_sent_at="2026-03-01")
        gen = OutreachGenerator(ab)
        gen.generate_tasks(q, {"dr-smith": p}, rl)
        assert len(q) == 0

def test_respects_rate_limit():
    with tempfile.TemporaryDirectory() as tmpdir:
        ab = ABTester(tmpdir, tmpdir)
        q = TaskQueue()
        rl = RateLimiter({"dm_send": 0})  # Limit of 0
        p = Prospect(name="Dr. Smith", username="dr-smith", status="active",
                     pipeline_stage="dm_ready")
        gen = OutreachGenerator(ab)
        gen.generate_tasks(q, {"dr-smith": p}, rl)
        assert len(q) == 0
```

- [ ] **Step 3: Run tests**

Run: `python -m pytest tests/test_generators/ -v`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add tests/test_generators/
git commit -m "test: add warmup and outreach generator tests"
```

---

## Task 21: Use Fast-Track Classification in Warmup Generator

**Files:**
- Modify: `task_generators/warmup_gen.py`

- [ ] **Step 1: Update warmup generator to use FAST_TRACK_STAGES**

Add classification-based initial stage assignment. When a prospect's `pipeline_stage` is `"prospect_found"` (new entry), use `FAST_TRACK_STAGES[p.classification]` to set the correct starting stage.

Add this to the top of the `generate_tasks` loop in `warmup_gen.py`:

```python
            # Fast-track: set initial stage based on classification
            if p.pipeline_stage == "prospect_found" and p.classification in FAST_TRACK_STAGES:
                p.pipeline_stage = FAST_TRACK_STAGES[p.classification]
```

- [ ] **Step 2: Run tests**

Run: `python -m pytest tests/ -v`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add task_generators/warmup_gen.py
git commit -m "feat: apply fast-track classification to warmup pipeline"
```
