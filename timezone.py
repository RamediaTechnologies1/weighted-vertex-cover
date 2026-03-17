# timezone.py
"""City-to-timezone mapping and peak window scheduling. US-only scope."""
import re
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from config import PEAK_WINDOWS, DEFAULT_TIMEZONE

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
    """Check if current time is within a peak DM window for the given timezone."""
    try:
        local_now = datetime.now(ZoneInfo(tz))
    except KeyError:
        local_now = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))
    return any(start <= local_now.hour < end for start, end in PEAK_WINDOWS)


def next_peak_time(tz: str) -> datetime:
    """Return the next peak window start as a UTC datetime."""
    try:
        local_now = datetime.now(ZoneInfo(tz))
    except KeyError:
        local_now = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))

    for start, end in PEAK_WINDOWS:
        if local_now.hour < start:
            target_local = local_now.replace(hour=start, minute=0, second=0, microsecond=0)
            return target_local.astimezone(ZoneInfo("UTC"))

    first_start = PEAK_WINDOWS[0][0]
    tomorrow = local_now + timedelta(days=1)
    target_local = tomorrow.replace(hour=first_start, minute=0, second=0, microsecond=0)
    return target_local.astimezone(ZoneInfo("UTC"))
