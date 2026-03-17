# LinkedIn Agent v2: Smart Scheduler + Deep Optimization

**Date:** 2026-03-17
**Status:** Approved
**Goal:** Maximize connections and BioPosture network signups from a single LinkedIn account by replacing the 7 independent modules with a priority-based central scheduler, adding conversion analytics, A/B testing, time-of-day optimization, engagement scoring, and re-engagement campaigns.

---

## 1. Architecture: Central Task Scheduler

### Problem

The current system runs 7 independent Python processes (`linkedin_bot.py`, `reply_handler.py`, `warmup_engine.py`, `post_engager.py`, `group_engager.py`, `prospector.py`, `content_poster.py`) competing for a single browser via file-based locking (`shared_lock.py`). Each module has fixed sleep intervals regardless of what's actually needed. Browser time is wasted on lock contention and idle sleeps.

### Solution

Replace all 7 modules with a **single-process central scheduler** (`scheduler.py`) that maintains a priority queue of discrete browser tasks.

### Components

```
scheduler.py (main entry point)
├── task_queue.py          — Priority queue of pending browser tasks
├── task_generators/       — Produce tasks based on schedules and state
│   ├── reply_gen.py       — Check inbox for replies (P0)
│   ├── warmup_gen.py      — Warmup pipeline stage tasks (P1-P3)
│   ├── outreach_gen.py    — DM sending tasks (P2)
│   ├── prospector_gen.py  — Search for new prospects (P3)
│   ├── engagement_gen.py  — Post/group engagement tasks (P4)
│   └── content_gen.py     — Content posting tasks (P4)
├── task_executor.py       — Executes browser tasks (replaces BrowserLock)
├── analytics.py           — Event logging and funnel tracking
├── scoring.py             — Engagement scoring for prospects
├── ab_testing.py          — Template variant assignment and tracking
├── timezone.py            — Prospect timezone inference and DM scheduling
├── reengage.py            — Re-engagement campaign logic
├── config.py              — All constants, rate limits, feature flags
└── models.py              — Data classes for Prospect, Task, FunnelEvent, etc.
```

### Priority Levels

| Priority | Category | Examples | Frequency |
|----------|----------|----------|-----------|
| P0 | Critical | Check inbox for new replies | Every 3 min |
| P1 | High | Send follow-ups, warmup stages near DM (connect_request, send_dm) | As ready |
| P2 | Medium | Send outreach DMs, mid-stage warmup (endorse, comment) | As ready |
| P3 | Low | Early warmup (view profile, like posts), prospecting | As ready |
| P4 | Background | Content posting, feed likes, group comments | Scheduled |

### Execution Loop

```python
while running:
    # 1. Run all task generators to populate queue
    for generator in generators:
        generator.generate_tasks(queue, state)

    # 2. Pick highest-priority task
    task = queue.pop_highest_priority()

    if task is None:
        sleep(30)  # Nothing to do
        continue

    # 3. Check rate limits
    if rate_limiter.would_exceed(task.action_type):
        queue.defer(task, next_available_time)
        continue

    # 4. Execute
    result = executor.run(task)

    # 5. Log analytics
    analytics.log_event(task, result)

    # 6. Update state (advance pipeline, record messaged, etc.)
    state.update(task, result)

    # 7. Brief pause between actions (2-5 seconds, randomized)
    sleep(random.uniform(2, 5))
```

### Rate Limits (config.py)

```python
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
```

### Data Storage

Migrate from pipe-delimited `.txt` files to structured JSON files for easier querying:

- `data/prospects.json` — All prospects with full state
- `data/analytics.json` — Event log (append-only)
- `data/templates.json` — A/B test variants and stats
- `data/config.json` — Runtime config overrides
- `data/daily_summary.json` — Auto-generated daily stats

Legacy `.txt` files will be read on first run for migration, then deprecated.

---

## 2. Smart Fast-Track & Batch Operations

### Fast-Track Rules

When a prospect enters the pipeline, the scheduler visits their profile once to classify them:

| Prospect Type | Detection | Warmup Path | Days to DM |
|---|---|---|---|
| Already connected | "Message" button on profile, no "Connect" | DM immediately | 0 |
| Quick accepter | Connection accepted < 24h | DM immediately | 0 |
| 2nd-degree connection | Profile shows "2nd" | connect → wait → DM | 1-2 |
| Engaged with our content | Name in commented_posts/liked_posts | connect → wait → DM | 1-2 |
| Cold prospect | None of the above | Full pipeline (view → like → endorse → comment → connect → wait → DM) | 6-7 |

### Classification Implementation

```python
def classify_prospect(profile_snapshot: str, name: str) -> str:
    """Returns: 'already_connected', 'second_degree', 'engaged', 'cold'"""
    if has_message_button(profile_snapshot):
        return "already_connected"
    if "2nd" in profile_snapshot:
        return "second_degree"
    if name_in_engagement_history(name):
        return "engaged"
    return "cold"
```

The warmup generator uses this classification to determine which stages to queue.

### Batch Operations

When visiting a profile for any reason, check if additional actions are due or due within 12 hours:

```python
def get_batchable_actions(prospect, current_action):
    """Return additional actions to perform during this profile visit."""
    batchable = []
    if current_action == "view_profile":
        if prospect.stage_due_within("like_posts", hours=12):
            batchable.append("like_posts")
    if current_action in ("view_profile", "like_posts"):
        if prospect.stage_due_within("endorse_skills", hours=12):
            batchable.append("endorse_skills")
    return batchable
```

This saves ~5-10 seconds of navigation overhead per batched action and compresses the pipeline without making it look less natural (actions still happen on the same profile visit a human would make).

---

## 3. Conversion Analytics & A/B Testing

### Funnel Events

Every action produces a structured analytics event:

```python
@dataclass
class FunnelEvent:
    timestamp: str
    prospect_name: str
    prospect_username: str
    event_type: str  # prospect_found, warmup_started, stage_completed, connected,
                     # dm_sent, reply_received, reply_category, handoff, signup
    metadata: dict   # stage name, template variant, reply category, score, etc.
```

Events are appended to `data/analytics.json` (one JSON object per line for easy parsing).

### Daily Summary

Auto-generated at midnight (or on demand):

```
=== Daily Summary: 2026-03-17 ===
Pipeline: 45 total | 12 in warmup | 8 connected today | 5 DMs sent
Replies: 3 received | 1 INTERESTED | 1 QUESTION | 1 NOT_INTERESTED
Reply rate (7d rolling): 18%
Conversion to interest (7d): 8%
Best template: variant_b (24% reply rate, n=52) vs variant_a (12%, n=48)
Top prospect score: Dr. Smith (score: 85, stage: connect_request)
Re-engagement: 2 stage-1, 1 stage-2 sent today
```

Written to `data/daily_summary.json` and logged to `analytics.log`.

### A/B Testing

**Template storage** — `templates/` directory:

```
templates/
├── variant_a.txt    — Current template
├── variant_b.txt    — Alternative template (e.g. shorter, different CTA)
├── variant_c.txt    — Another alternative
└── opener_prompts/
    ├── prompt_a.txt — AI opener prompt variant A
    └── prompt_b.txt — AI opener prompt variant B
```

**Assignment:**
- Each prospect is randomly assigned a template variant at DM time
- Assignment is recorded in prospect data and analytics
- Both the message body template AND the AI opener prompt can be varied independently

**Evaluation:**
- After 50+ sends per variant, calculate reply rate with confidence interval
- Auto-promote: if variant B has statistically significant higher reply rate (p < 0.05), make it the new default
- Retire underperforming variants
- Log promotions/retirements to analytics

**Implementation:**

```python
class ABTester:
    def assign_variant(self, prospect_name: str) -> dict:
        """Returns {"template": "variant_b.txt", "opener_prompt": "prompt_a.txt"}"""
        ...

    def record_outcome(self, prospect_name: str, replied: bool, category: str):
        ...

    def evaluate_variants(self) -> dict:
        """Returns stats per variant and promotion recommendations."""
        ...
```

---

## 4. Time-of-Day Optimization & Engagement Scoring

### Time-of-Day Optimization

**Goal:** Send DMs during peak engagement windows when prospects are most likely to see and respond.

**Peak windows:** 8-10am and 1-3pm in the prospect's local timezone.

**Timezone inference:**
- Extract location from LinkedIn profile (city/state visible in profile snapshot)
- Map city → US timezone using a lightweight city-to-timezone dictionary
- If location unknown, default to EST

**Implementation:**
- When a DM task is generated, check if current time is within a peak window for the prospect's timezone
- If not, defer the task with a `not_before` timestamp set to the next peak window
- Warmup actions (likes, views, endorsements) are NOT time-gated — they can happen anytime
- Connection requests are lightly time-gated (business hours only, 8am-6pm prospect time)

```python
PEAK_WINDOWS = [
    (8, 10),   # 8-10am
    (13, 15),  # 1-3pm
]

def next_peak_time(prospect_tz: str) -> datetime:
    """Return the next peak window start in UTC."""
    ...
```

### Engagement Scoring

Each prospect gets a score (0-100) computed from their profile:

| Signal | Points | Detection |
|---|---|---|
| Practice owner / clinic director | +25 | Title contains "owner", "director", "founder" |
| Active poster (posted in last 30 days) | +20 | Recent activity page has posts |
| 2nd-degree connection | +15 | Profile shows "2nd" |
| Engaged with our content | +20 | Name in our engagement history files |
| 500+ connections | +10 | Profile shows connection count |
| High-value specialty (chiro, ortho, sports med) | +10 | Title/headline keywords |

**Score usage:**
- P1 warmup tasks for prospects scoring 70+ (prioritized)
- P2 warmup tasks for prospects scoring 40-69
- P3 warmup tasks for prospects scoring < 40
- Higher-scored prospects get richer AI context for personalization
- Daily summary highlights top-scored prospects

```python
def compute_engagement_score(profile_snapshot: str, name: str, engagement_history: dict) -> int:
    score = 0
    if is_practice_owner(profile_snapshot):
        score += 25
    if is_active_poster(profile_snapshot):
        score += 20
    if is_second_degree(profile_snapshot):
        score += 15
    if name_in_engagement_history(name, engagement_history):
        score += 20
    if has_500_plus_connections(profile_snapshot):
        score += 10
    if is_high_value_specialty(profile_snapshot):
        score += 10
    return min(score, 100)
```

---

## 5. Re-engagement Campaigns

For prospects who received a DM but didn't reply within 3 days.

### Stages

| Stage | Trigger | Action | Message Type |
|---|---|---|---|
| 1 | Day 3, no reply | Engage with their content (like + comment a recent post) | No DM — passive engagement only |
| 2 | Day 7, no reply | Soft follow-up DM | Casual, no pressure, "just checking in" |
| 3 | Day 14, no reply | Value-add DM | Share relevant content (infrared therapy article, case study) |
| 4 | Day 30, no reply | Final gracious close | Brief, leave door open, no further outreach |

After Stage 4: mark as `closed`. No more outreach.

### Implementation

The re-engagement generator checks `data/prospects.json` for prospects with:
- `status == "dm_sent"` and `dm_sent_at` older than stage threshold
- `reengage_stage` field tracks current stage (0-4)
- Each stage completion advances the counter

```python
REENGAGE_STAGES = [
    {"days_after_dm": 3,  "action": "engage_content", "priority": "P3"},
    {"days_after_dm": 7,  "action": "soft_followup",  "priority": "P2"},
    {"days_after_dm": 14, "action": "value_add_dm",   "priority": "P2"},
    {"days_after_dm": 30, "action": "final_close",    "priority": "P3"},
]
```

### Re-engagement Messages

**Stage 2 (soft follow-up):**
AI-generated, warm and casual. Template: "Hey {first_name}, hope you're having a great week! Just wanted to make sure my earlier message didn't get buried. No rush at all — happy to chat whenever works for you."

**Stage 3 (value-add):**
AI-generated with knowledge base context. Shares a specific benefit relevant to their specialty. Template: "Hi {first_name}, I came across this about how infrared technology is helping {specialty} practices improve patient outcomes — thought of you. [brief insight]. Happy to share more if you're curious."

**Stage 4 (final close):**
Brief and gracious. Template: "Hi {first_name}, I don't want to be a bother! Just wanted to say the door's always open if BioPosture's doctor network ever interests you. Wishing you and your practice all the best."

---

## 6. File Structure

### New files to create

```
scheduler.py              — Main entry point (replaces orchestrator.py)
task_queue.py             — Priority queue implementation
task_executor.py          — Browser action executor
analytics.py              — Funnel event tracking and daily summaries
scoring.py                — Engagement scoring
ab_testing.py             — Template variant assignment and evaluation
timezone.py               — City-to-timezone mapping and peak window logic
reengage.py               — Re-engagement campaign logic
config.py                 — All constants, rate limits, feature flags
models.py                 — Data classes (Prospect, Task, FunnelEvent, etc.)
migrate.py                — One-time migration from .txt files to JSON

task_generators/
├── __init__.py
├── reply_gen.py          — Inbox check task generator
├── warmup_gen.py         — Warmup pipeline task generator
├── outreach_gen.py       — DM sending task generator
├── prospector_gen.py     — Prospect search task generator
├── engagement_gen.py     — Post/group engagement task generator
├── content_gen.py        — Content posting task generator
└── reengage_gen.py       — Re-engagement task generator

templates/
├── variant_a.txt         — Message template variant A (current)
├── variant_b.txt         — Message template variant B
└── opener_prompts/
    ├── prompt_a.txt      — AI opener prompt variant A
    └── prompt_b.txt      — AI opener prompt variant B

data/                     — Runtime data (gitignored)
├── prospects.json
├── analytics.json
├── templates_stats.json
├── daily_summary.json
└── config_overrides.json
```

### Files to deprecate (keep for reference but no longer executed)

```
orchestrator.py       → replaced by scheduler.py
linkedin_bot.py       → replaced by outreach_gen.py + task_executor.py
reply_handler.py      → replaced by reply_gen.py + task_executor.py
warmup_engine.py      → replaced by warmup_gen.py + task_executor.py
post_engager.py       → replaced by engagement_gen.py + task_executor.py
group_engager.py      → replaced by engagement_gen.py + task_executor.py
prospector.py         → replaced by prospector_gen.py + task_executor.py
content_poster.py     → replaced by content_gen.py + task_executor.py
```

### Files to keep as-is

```
shared_lock.py        — Still useful for file I/O safety (safe_append, etc.)
knowledge_base.txt    — Product info for AI prompts
message-template.txt  — Becomes templates/variant_a.txt
```

---

## 7. Migration Strategy

1. Create `migrate.py` that reads all existing `.txt` tracking files and converts to `data/prospects.json`
2. Copy `message-template.txt` to `templates/variant_a.txt`
3. Run migration once, verify data integrity
4. Start `scheduler.py` — it reads from `data/` directory
5. Old modules moved to `legacy/` directory for reference

---

## 8. Success Metrics

After implementation, track these to measure improvement:

| Metric | Current (estimated) | Target |
|---|---|---|
| Browser actions per hour | ~12 (lock contention) | ~30+ (no contention) |
| Days from prospect to DM (cold) | 6-7 | 6-7 (unchanged) |
| Days from prospect to DM (warm) | 6-7 | 1-2 (fast-tracked) |
| DMs sent per day | Unknown | 50-100 (within limits) |
| Reply rate | Unknown | Track, then optimize |
| Funnel visibility | None | Full funnel tracking |
| Template optimization | 1 template, no data | A/B tested, auto-optimized |
