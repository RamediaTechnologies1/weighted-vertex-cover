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
