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
│   ├── followup_gen.py    — Scheduled follow-ups from reply requests (P1)
│   ├── warmup_gen.py      — Warmup pipeline stage tasks (P1-P3)
│   ├── outreach_gen.py    — DM sending tasks (P2)
│   ├── prospector_gen.py  — Search for new prospects (P3)
│   ├── engagement_gen.py  — Post/group engagement tasks (P4)
│   ├── content_gen.py     — Content posting tasks (P4)
│   └── reengage_gen.py    — Re-engagement campaign tasks (P2-P3)
├── task_executor.py       — Executes browser tasks (replaces BrowserLock)
├── browser.py             — Browser abstraction layer (navigate, snapshot, click, type, find)
├── analytics.py           — Event logging and funnel tracking
├── notifications.py       — Email alerts and lead handoff
├── scoring.py             — Engagement scoring for prospects
├── ab_testing.py          — Template variant assignment and tracking
├── timezone.py            — Prospect timezone inference and DM scheduling
├── reengage.py            — Re-engagement campaign logic
├── healthcare.py          — Healthcare professional validation (consolidated keywords)
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
    "connection_request": 20,  # Global limit — applies across all task generators
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

### Browser Abstraction Layer (browser.py)

All browser interactions go through a shared abstraction instead of raw `docker exec` subprocess calls scattered across modules:

```python
class Browser:
    def navigate(self, url: str) -> None:
        """Navigate to URL, wait for page load."""
        run_cmd(f'docker exec openclaw clawdbot browser navigate "{url}"')
        time.sleep(5)

    def snapshot(self) -> str:
        """Get current page snapshot as text."""
        return run_cmd('docker exec openclaw clawdbot browser snapshot --format text 2>/dev/null')

    def click(self, ref: str) -> None:
        """Click element by ref."""
        run_cmd(f'docker exec openclaw clawdbot browser click {ref}')
        time.sleep(2)

    def type_text(self, ref: str, text: str) -> None:
        """Type text into element by ref (uses arg list, no shell escaping)."""
        run_cmd_args(["docker", "exec", "openclaw", "clawdbot", "browser", "type", ref, text])

    def press(self, keys: str) -> None:
        """Press key combination (e.g., 'Shift+Enter')."""
        run_cmd(f'docker exec openclaw clawdbot browser press "{keys}"')

    def evaluate(self, fn: str, ref: str = None) -> str:
        """Execute JavaScript function on page or element."""
        ...

    def scroll(self, pixels: int = 800) -> None:
        """Scroll page down."""
        ...

    def find_element(self, pattern: str, snapshot: str = None) -> Optional[str]:
        """Find element ref by regex pattern in snapshot. Returns ref or None."""
        if snapshot is None:
            snapshot = self.snapshot()
        match = re.search(pattern, snapshot)
        return match.group(1) if match else None

    def find_all_elements(self, pattern: str, snapshot: str = None) -> list[str]:
        """Find all element refs matching pattern."""
        ...
```

Task generators and `task_executor.py` use `Browser` methods rather than constructing raw subprocess commands. This centralizes the ClawdBot interaction, makes snapshot regex patterns reusable, and simplifies testing.

### AI Interaction Interface

AI text generation (personalized openers, comments, reply classification, post content) continues to use ClawdBot's built-in agent via `docker exec openclaw clawdbot agent --message '...' --session-id ...`. A thin wrapper centralizes prompt construction and response parsing:

```python
class AIAgent:
    def generate(self, prompt: str, session_id: str = "default") -> str:
        """Send prompt to ClawdBot agent, return parsed response text."""
        escaped = prompt.replace("'", "").replace('"', '').replace('\n', ' ')[:6000]
        result = run_cmd(f"docker exec openclaw clawdbot agent --message '{escaped}' --session-id {session_id} 2>/dev/null")
        return self._parse_response(result)

    def _parse_response(self, raw: str) -> str:
        """Extract usable text from ClawdBot agent response."""
        for line in raw.strip().split('\n'):
            line = line.strip().strip('"').strip("'")
            if line and not line.startswith('[') and not line.startswith('(') and len(line) > 10:
                return line
        return ""
```

Session IDs are used per task type (e.g., `personalize`, `classify_reply`, `warmup_comment`, `content_post`) to maintain context isolation.

### Error Handling & Resilience

Since the system is now single-process, errors must be caught per-task rather than relying on process restart:

**Task-level error handling:**
```python
try:
    result = executor.run(task)
except BrowserNavigationError:
    # Page didn't load — retry once, then skip
    task.retry_count += 1
    if task.retry_count < 2:
        queue.requeue(task, delay_seconds=30)
    else:
        analytics.log_event(task, TaskResult.FAILED)
        log(f"Task {task} failed after retries, skipping")
except ElementNotFoundError:
    # Expected element missing — skip, don't retry (UI may have changed)
    analytics.log_event(task, TaskResult.ELEMENT_NOT_FOUND)
except Exception as e:
    log(f"Unexpected error in task {task}: {e}")
    analytics.log_event(task, TaskResult.ERROR)
```

**Scheduler-level resilience:**
- The main `while running` loop wraps each iteration in a broad try/except — a single task failure never crashes the scheduler
- If 5+ consecutive tasks fail, pause for 5 minutes (possible browser/container issue)
- Log all errors to `scheduler.log` with full context
- On fatal crash (unrecoverable), the process exits with code 1 — use systemd/supervisord to auto-restart

### Logging

Single structured log file `scheduler.log` with component tags:

```
[2026-03-17 14:23:01] [SCHEDULER] Starting task: dm_send for Dr. Smith
[2026-03-17 14:23:06] [BROWSER] Navigate to https://linkedin.com/messaging/...
[2026-03-17 14:23:12] [OUTREACH] Message sent to Dr. Smith (variant_b)
[2026-03-17 14:23:12] [ANALYTICS] Event: dm_sent | Dr. Smith | variant_b
```

Log rotation: daily files (`scheduler-2026-03-17.log`) kept for 30 days.

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
- Scope: US-only prospects. International timezone support is deferred.
- If location unknown, default to EST (America/New_York)

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

## 6. Reply Processing Logic

### Reply Classification

When the reply generator (`reply_gen.py`) detects a new reply from a messaged contact, the reply is classified using AI into exactly one category:

| Category | Action | Auto-reply? |
|---|---|---|
| INTERESTED | Email `srimanvas@ramedia.dev` immediately, record handoff | No — human handles |
| QUESTION | Email `srimanvas@ramedia.dev` immediately, record handoff | No — human handles |
| READY_TO_SIGN_UP | Email `srimanvas@ramedia.dev` immediately, record handoff | No — human handles |
| NOT_INTERESTED | Close conversation, no follow-up | No |
| OFF_TOPIC | Ignore completely, do nothing | No |
| FOLLOWUP_REQUEST | Schedule follow-up based on timing they mention, email team | No |

The AI classification prompt extracts:
- **Category** (one of the above)
- **Timing** (any timing mentioned: "next week", "Monday", etc., or NONE)
- **Summary** (one-line summary of their message)

### Human Team Detection

Before processing any conversation, check if a human team member has recently been active in it. If so, the bot does NOT intervene.

```python
HUMAN_TEAM = ["irwin pearl", "irwin", "srimanvas", "sriman"]

def is_human_active(conversation_text: str) -> bool:
    """Check last 1000 chars of conversation for human team member names."""
    recent = conversation_text.lower()[-1000:]
    return any(name in recent for name in HUMAN_TEAM)
```

If `is_human_active()` returns True, set prospect status to `human_active` and skip all bot actions for that conversation.

### New Reply Detection

A reply is "new" if:
1. The prospect's name appears in the recent messages (last 500 chars)
2. The last message is NOT from us (doesn't contain `bioposture.com/doctor-registration` or `irwinpearl@bioposture`)
3. The conversation hasn't already been processed (check `last_processed_at` timestamp on prospect)

---

## 7. Scheduled Follow-ups (from Reply Requests)

Distinct from re-engagement (Section 5), scheduled follow-ups handle prospects who **replied** asking to be contacted later.

### Trigger

When reply classification returns `FOLLOWUP_REQUEST` with a timing hint (e.g., "next week", "Monday", "in a few days").

### Timing Resolution

```python
TIMING_MAP = {
    "tomorrow": timedelta(days=1),
    "few days": timedelta(days=3),
    "couple days": timedelta(days=3),
    "week": timedelta(days=7),
    "month": timedelta(days=30),
}
# Day-of-week names resolve to next occurrence of that day
# Default (no timing or "NONE"): 1 day
```

### Follow-up Message

Gentle, respectful reminder:
> "Hi {first_name}, just wanted to circle back! I know things get busy, so no pressure at all. If you're still curious about the BioPosture Doctor Network, I'd love to help you get started. You can register at https://bioposture.com/doctor-registration/ or reach out to irwinpearl@bioposture.com for a personal conversation. Wishing you all the best!"

### Follow-up Generator (`followup_gen.py`)

Checks `data/prospects.json` for prospects with:
- `status == "followup_scheduled"` and `followup_at` in the past
- Before sending, verifies human is not already active in conversation
- After sending, updates status to `followup_sent` and notifies team via email

---

## 8. Email Notifications & Lead Handoff

### Purpose

The notification system is the primary mechanism for converting bot-generated leads into human sales conversations. When a prospect shows interest, the team must be notified immediately.

### Notification Triggers

| Event | Email Subject | Priority |
|---|---|---|
| Reply classified as INTERESTED | `[BioPosture Lead] {name} - INTERESTED` | Immediate |
| Reply classified as QUESTION | `[BioPosture Lead] {name} - QUESTION` | Immediate |
| Reply classified as READY_TO_SIGN_UP | `[BioPosture Lead] {name} - READY_TO_SIGN_UP` | Immediate |
| Reply classified as FOLLOWUP_REQUEST | `[BioPosture Lead] {name} - FOLLOWUP_REQUEST` | Immediate |
| Scheduled follow-up sent | `[BioPosture Lead] {name} - FOLLOWUP_SENT` | Info |
| Daily summary generated | `[BioPosture] Daily Summary - {date}` | Daily |

### Notification Channel

Primary: Email to `srimanvas@ramedia.dev`

```python
class Notifier:
    def send_lead_alert(self, prospect_name: str, category: str, conversation_summary: str):
        """Send immediate email notification for a hot lead."""
        subject = f"[BioPosture Lead] {prospect_name} - {category}"
        body = f"""New LinkedIn Lead Alert!

Prospect: {prospect_name}
Category: {category}
Time: {datetime.now()}

Conversation Summary:
{conversation_summary[:2000]}

---
Action Required: Please follow up with this prospect on LinkedIn.
LinkedIn Messaging: https://www.linkedin.com/messaging/
"""
        self._send_email(subject, body)
        self._record_handoff(prospect_name, category)

    def _send_email(self, subject: str, body: str):
        """Try system mail command, then SMTP localhost fallback."""
        ...

    def _record_handoff(self, name: str, reason: str):
        """Append to handoff log in data/prospects.json."""
        ...
```

### Handoff Tracking

All handoffs are recorded in the prospect's data:
- `handoff_at`: timestamp
- `handoff_reason`: category that triggered it
- `handoff_method`: "email" (or "email_failed" with backup logged)

If email fails, the handoff is still recorded in `data/prospects.json` so no lead is ever lost.

---

## 9. Healthcare Professional Validation

Consolidate the healthcare keyword matching (currently duplicated across 3 files with slightly different lists) into a single `healthcare.py` module.

```python
# Unified healthcare keywords (consolidated from linkedin_bot.py, post_engager.py, prospector.py)
HEALTHCARE_KEYWORDS = [
    # Chiropractic
    'dc', 'd.c.', 'chiropractor', 'chiropractic',
    # Medical
    'md', 'm.d.', 'doctor', 'dr.', 'dr ', 'physician', 'medical',
    # Physical therapy
    'dpt', 'd.p.t.', 'physical therapist', 'physical therapy',
    # Osteopathic
    'do', 'd.o.', 'osteopath',
    # Naturopathic
    'nd', 'n.d.', 'naturopath', 'naturopathic',
    # Other specialties
    'dpm', 'podiatrist', 'nurse', 'np', 'rn',
    'orthopedic', 'spine', 'sports medicine',
    'rehabilitation', 'rehab', 'pain management',
    'acupuncture', 'massage therapist', 'lmt',
    'wellness', 'clinic', 'practice',
    'healthcare', 'health care',
    'functional medicine', 'integrative medicine',
    # Credential abbreviations
    'pt,', 'dpt,', 'ms,', 'ccsp', 'dacbsp',
    'nurse practitioner', 'practice owner', 'wellness center',
    'consultant',
]

def is_healthcare_professional(text: str) -> tuple[bool, list[str]]:
    """Check if text contains healthcare professional indicators.
    Returns (is_healthcare, matching_keywords)."""
    text_lower = text.lower()
    matches = [kw for kw in HEALTHCARE_KEYWORDS if kw in text_lower]
    return len(matches) > 0, matches
```

Used by: `prospector_gen.py` (qualifying search results), `outreach_gen.py` (verifying connections before DM), `engagement_gen.py` (filtering posts to engage with).

---

## 10. Content Posting Schedule

The content generator (`content_gen.py`) preserves the existing posting strategy:

**Schedule:** Monday, Wednesday, Friday, and Sunday only. Maximum 2 posts per day.

**Content themes** (rotated):
1. Sleep health tips for healthcare professionals
2. Infrared/Celliant technology science
3. Doctor partnership success stories
4. Patient outcome improvements
5. Practice revenue diversification
6. Sleep and pain management connection
7. Wellness industry trends
8. BioPosture product features
9. Healthcare professional testimonials
10. Sleep hygiene education
11. Practice marketing tips
12. Industry event/conference highlights

Each theme has a specific AI prompt hint for generating the post. The content generator selects a theme that hasn't been used recently and generates a post via the AI agent.

---

## 11. Group Engagement Workflow

The engagement generator (`engagement_gen.py`) handles both post and group engagement:

**Group joining:**
- Search LinkedIn for healthcare groups: "chiropractor group", "physical therapy professionals", etc.
- Join up to 2 new groups per week
- Track joined groups in `data/prospects.json` (groups section)

**Group engagement:**
- Cycle through joined groups, comment on recent posts with healthcare-relevant insights
- After commenting on someone's post, check if they are a healthcare professional
- If qualified, add them to the warmup pipeline automatically (same as prospector)
- Track `group_comments` to avoid double-commenting

**Post engagement (non-group):**
- Search LinkedIn feed for healthcare posts using targeted queries
- Comment with insightful, non-salesy responses (AI-generated)
- Like posts from healthcare professionals
- After engaging, check if the post author is a new prospect

---

## 12. Prospect Data Model

The central data structure unifying all tracking files:

```python
@dataclass
class Prospect:
    # Identity
    name: str
    username: str
    headline: str = ""
    location: str = ""

    # Classification
    classification: str = "cold"  # cold, second_degree, engaged, already_connected
    engagement_score: int = 0
    timezone: str = "America/New_York"  # Inferred from location

    # Pipeline state
    pipeline_stage: str = "prospect_found"
    # Stages: prospect_found → view_profile → like_posts → endorse_skills →
    #         comment_post → connect_request → wait_accept → dm_ready → dm_sent
    last_action_at: str = ""
    connect_requested_at: str = ""  # For "quick accepter" detection

    # DM state
    dm_sent_at: str = ""
    template_variant: str = ""
    opener_prompt_variant: str = ""

    # Reply state
    reply_status: str = ""  # none, replied, interested, question, not_interested,
                            # off_topic, ready_to_sign_up, followup_request
    reply_category: str = ""
    reply_count: int = 0
    last_reply_at: str = ""

    # Follow-up state
    followup_at: str = ""
    followup_status: str = ""  # pending, sent, human_active

    # Re-engagement state
    reengage_stage: int = 0  # 0 = not started, 1-4 = stages
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
    source: str = ""  # prospector, group, connections, post_engagement
    source_query: str = ""  # Search query that found them
    added_at: str = ""
    status: str = "active"  # active, dm_sent, handed_off, closed,
                            # followup_scheduled, human_active, ignored_offtopic
    last_processed_at: str = ""
```

All prospect data is stored in `data/prospects.json` as a JSON object keyed by username:

```json
{
  "dr-jane-smith": { "name": "Dr. Jane Smith", "username": "dr-jane-smith", ... },
  "john-doe-dc": { "name": "John Doe, DC", "username": "john-doe-dc", ... }
}
```

---

## 13. File Structure

### New files to create

```
scheduler.py              — Main entry point (replaces orchestrator.py)
task_queue.py             — Priority queue implementation
task_executor.py          — Browser action executor
browser.py                — Browser abstraction layer
analytics.py              — Funnel event tracking and daily summaries
notifications.py          — Email alerts and lead handoff
scoring.py                — Engagement scoring
ab_testing.py             — Template variant assignment and evaluation
timezone.py               — City-to-timezone mapping and peak window logic
reengage.py               — Re-engagement campaign logic
healthcare.py             — Consolidated healthcare professional validation
config.py                 — All constants, rate limits, feature flags
models.py                 — Data classes (Prospect, Task, FunnelEvent, etc.)
migrate.py                — One-time migration from .txt files to JSON

task_generators/
├── __init__.py
├── reply_gen.py          — Inbox check + reply classification task generator
├── followup_gen.py       — Scheduled follow-up task generator
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

### Files to deprecate (moved to `legacy/` for reference)

```
orchestrator.py       → replaced by scheduler.py
linkedin_bot.py       → replaced by outreach_gen.py + task_executor.py
reply_handler.py      → replaced by reply_gen.py + notifications.py + task_executor.py
warmup_engine.py      → replaced by warmup_gen.py + task_executor.py
post_engager.py       → replaced by engagement_gen.py + task_executor.py
group_engager.py      → replaced by engagement_gen.py + task_executor.py
prospector.py         → replaced by prospector_gen.py + task_executor.py
content_poster.py     → replaced by content_gen.py + task_executor.py
scan_replies.py       → replaced by reply_gen.py + analytics daily summary
shared_lock.py        → no longer needed (single-process, no concurrent file access)
```

### Files to keep

```
knowledge_base.txt    — Product info for AI prompts (read by AIAgent)
message-template.txt  — Copied to templates/variant_a.txt during migration
```

---

## 14. Migration Strategy

### Source File Mapping

| Source File | Contains | Migrates To | Notes |
|---|---|---|---|
| `messaged.txt` | `name\|timestamp` | `data/prospects.json` → `dm_sent_at`, `status: "dm_sent"` | Core tracking |
| `skipped.txt` | `name\|reason\|timestamp` | `data/prospects.json` → `status: "closed"` | Prospects that failed healthcare check |
| `warmup_pipeline.txt` | `name\|username\|stage\|last_action\|added_date` | `data/prospects.json` → `pipeline_stage`, `last_action_at`, `added_at` | Active pipeline |
| `conversations.txt` | `name\|reply_count\|status\|last_reply\|followup_at` | `data/prospects.json` → `reply_count`, `reply_status`, `last_reply_at`, `followup_at` | Reply state |
| `followups.txt` | `name\|followup_at\|username\|status` | `data/prospects.json` → `followup_at`, `followup_status` | Scheduled follow-ups |
| `handoff.txt` | `name\|reason\|timestamp` | `data/prospects.json` → `handoff_at`, `handoff_reason` | Lead handoffs |
| `commented_posts.txt` | `post_id\|timestamp` | `data/analytics.json` as historical events | Engagement history |
| `engaged_profiles.txt` | `name\|username\|timestamp` | `data/prospects.json` → `posts_commented: True` | Cross-reference |
| `liked_posts.txt` | `post_id\|timestamp` | `data/analytics.json` as historical events | Engagement history |
| `joined_groups.txt` | `group_name\|url\|timestamp` | `data/prospects.json` (groups section) | Group tracking |
| `group_comments.txt` | `post_url\|timestamp` | `data/analytics.json` as historical events | Engagement history |
| `prospects_found.txt` | `name\|username\|headline\|query\|timestamp` | `data/prospects.json` → `headline`, `source_query`, `added_at` | Prospect discovery |
| `posted_content.txt` | `topic\|timestamp` | `data/analytics.json` as historical events | Content posting history |
| `leads_report.txt` | Scan results | Archive only (not migrated) | One-time utility output |
| `failed.txt` | Failed actions | Archive only (not migrated) | Debug log |
| `message-template.txt` | DM template text | `templates/variant_a.txt` | Direct copy |

### Migration Steps

1. Run `python3 migrate.py` — reads all `.txt` files, constructs unified `data/prospects.json`
2. Migration deduplicates by name (case-insensitive) and merges fields from multiple sources
3. Copy `message-template.txt` → `templates/variant_a.txt`
4. Verify: `migrate.py` prints summary of migrated records and any conflicts
5. Start `scheduler.py` — reads from `data/` directory
6. Move old modules to `legacy/` directory
7. Move old `.txt` tracking files to `legacy/data/` for reference

---

## 15. Success Metrics

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
