#!/usr/bin/env python3
"""
Active Prospector - Searches LinkedIn for chiropractors and healthcare
professionals, then feeds them into the warmup pipeline.

Strategy:
- Search LinkedIn for chiropractors by title, location, keywords
- Verify they are genuine healthcare professionals
- Add qualified prospects to the warmup pipeline
- Avoid duplicates (already messaged, in pipeline, or skipped)

No Premium required — uses LinkedIn's free people search.
"""
import subprocess
import time
import re
import os
from datetime import datetime
from shared_lock import BrowserLock, safe_append, safe_read_lines, safe_write

LOG_FILE = os.path.expanduser("~/openclaw/linkedin-agent/prospector.log")
MESSAGED_FILE = os.path.expanduser("~/openclaw/linkedin-agent/messaged.txt")
SKIPPED_FILE = os.path.expanduser("~/openclaw/linkedin-agent/skipped.txt")
PIPELINE_FILE = os.path.expanduser("~/openclaw/linkedin-agent/warmup_pipeline.txt")
PROSPECT_LOG_FILE = os.path.expanduser("~/openclaw/linkedin-agent/prospects_found.txt")

MAX_PROSPECTS_PER_SESSION = 20
WAIT_BETWEEN_SEARCHES = 30  # seconds between search navigations

# Targeted search queries — chiropractors and healthcare professionals
SEARCH_QUERIES = [
    # Chiropractor-specific
    "chiropractor",
    "doctor of chiropractic",
    "chiropractic physician",
    "DC chiropractic",
    "sports chiropractor",
    "pediatric chiropractor",
    "chiropractic wellness",
    "chiropractic clinic owner",
    # Other healthcare
    "physical therapist DPT",
    "naturopathic doctor",
    "osteopathic physician DO",
    "orthopedic specialist",
    "sports medicine doctor",
    "pain management physician",
    "functional medicine doctor",
    "integrative medicine practitioner",
    "wellness clinic director",
    "rehabilitation specialist",
]

# US cities/regions to target (can be expanded)
TARGET_LOCATIONS = [
    "United States",
    "New York",
    "Los Angeles",
    "Chicago",
    "Houston",
    "Phoenix",
    "Philadelphia",
    "San Antonio",
    "San Diego",
    "Dallas",
    "Austin",
    "Jacksonville",
    "San Francisco",
    "Charlotte",
    "Seattle",
    "Denver",
    "Nashville",
    "Atlanta",
    "Miami",
    "Portland",
    "Las Vegas",
    "Tampa",
    "Minneapolis",
    "Boston",
]

# Keywords that confirm healthcare professional status
HEALTHCARE_CONFIRM_KEYWORDS = [
    'dc', 'd.c.', 'chiropractor', 'chiropractic',
    'md', 'm.d.', 'doctor', 'dr.',
    'physician', 'dpt', 'd.p.t.', 'physical therapist',
    'do', 'd.o.', 'osteopath', 'nd', 'n.d.', 'naturopath',
    'dpm', 'podiatrist', 'nurse practitioner',
    'orthopedic', 'spine', 'sports medicine',
    'rehabilitation', 'pain management',
    'acupuncture', 'massage therapist', 'lmt',
    'functional medicine', 'integrative medicine',
    'clinic', 'practice owner', 'wellness center',
    'ccsp', 'dacbsp', 'pt,', 'dpt,',
]


def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")


def run_cmd(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout + result.stderr


def get_snapshot():
    return run_cmd('docker exec openclaw clawdbot browser snapshot --format text 2>/dev/null')


def scroll_page():
    run_cmd("docker exec openclaw clawdbot browser evaluate --fn '() => window.scrollBy(0, 800)'")
    time.sleep(1.5)


def get_existing_names():
    """Get all names we've already messaged, skipped, or have in pipeline."""
    names = set()

    for filepath in [MESSAGED_FILE, SKIPPED_FILE, PIPELINE_FILE]:
        if os.path.exists(filepath):
            with open(filepath) as f:
                for line in f:
                    name = line.split("|")[0].strip()
                    if name:
                        names.add(name.lower())

    return names


def is_healthcare_professional(text):
    """Check if text contains healthcare professional indicators."""
    text_lower = text.lower()
    matches = [kw for kw in HEALTHCARE_CONFIRM_KEYWORDS if kw in text_lower]
    return len(matches) > 0, matches


def search_people(query, location=None):
    """Search LinkedIn for people matching query."""
    encoded_query = query.replace(" ", "%20")
    search_url = f"https://www.linkedin.com/search/results/people/?keywords={encoded_query}"

    if location:
        encoded_location = location.replace(" ", "%20")
        search_url += f"&geoUrn={encoded_location}"

    log(f"Searching: '{query}'" + (f" in {location}" if location else ""))
    run_cmd(f'docker exec openclaw clawdbot browser navigate "{search_url}"')
    time.sleep(5)


def extract_profiles_from_search(snapshot):
    """Extract profile names and usernames from search results."""
    profiles = []
    lines = snapshot.split("\n")

    for i, line in enumerate(lines):
        # Look for profile links in search results
        # Pattern: link "Name" followed by /in/username/
        profile_match = re.search(r'link "([^"]+)" \[ref=(e\d+)\]', line)

        if profile_match and "/in/" in line:
            name = profile_match.group(1)
            ref = profile_match.group(2)

            # Extract username
            username_match = re.search(r'/in/([^/"\]]+)/', line)
            if username_match:
                username = username_match.group(1)

                # Get headline from nearby lines (usually right after the name)
                headline = ""
                for j in range(i + 1, min(i + 5, len(lines))):
                    if lines[j].strip() and not lines[j].strip().startswith('[') and "link" not in lines[j]:
                        headline = lines[j].strip()
                        break

                profiles.append({
                    "name": name,
                    "username": username,
                    "headline": headline,
                    "ref": ref,
                    "line": line,
                })

    return profiles


def record_prospect(name, username, headline, source_query):
    """Record a found prospect for tracking."""
    with open(PROSPECT_LOG_FILE, "a") as f:
        f.write(f"{name}|{username}|{headline[:100]}|{source_query}|{datetime.now()}\n")


def add_to_warmup_pipeline(name, username):
    """Add prospect to the warmup pipeline (imported from warmup_engine)."""
    pipeline = {}
    if os.path.exists(PIPELINE_FILE):
        with open(PIPELINE_FILE) as f:
            for line in f:
                parts = line.strip().split("|")
                if len(parts) >= 4:
                    pipeline[parts[0]] = line.strip()

    if name not in pipeline:
        now = str(datetime.now())
        with open(PIPELINE_FILE, "a") as f:
            f.write(f"{name}|{username}|view_profile|{now}|{now}\n")
        return True
    return False


def prospect_session():
    """Run one prospecting session — search and qualify chiropractors."""
    existing_names = get_existing_names()
    prospects_found = 0
    queries_used = 0

    log(f"Known names to skip: {len(existing_names)}")

    for query in SEARCH_QUERIES:
        if prospects_found >= MAX_PROSPECTS_PER_SESSION:
            break

        with BrowserLock("prospector"):
            search_people(query)
            time.sleep(3)

            # Scroll to load more results
            for _ in range(3):
                scroll_page()

            snapshot = get_snapshot()
        profiles = extract_profiles_from_search(snapshot)
        log(f"  Found {len(profiles)} profiles for '{query}'")

        for profile in profiles:
            if prospects_found >= MAX_PROSPECTS_PER_SESSION:
                break

            name = profile["name"]
            username = profile["username"]
            headline = profile["headline"]

            # Skip if we already know this person
            if name.lower() in existing_names:
                continue

            # Skip if username looks invalid
            if len(username) < 3 or username in ("in", "pub", "company"):
                continue

            # Verify healthcare professional
            combined_text = f"{name} {headline}"
            is_hcp, keywords = is_healthcare_professional(combined_text)

            if not is_hcp:
                log(f"  SKIP: {name} — not healthcare ({headline[:60]})")
                continue

            log(f"  QUALIFIED: {name} ({', '.join(keywords[:3])}) — {headline[:60]}")

            # Add to warmup pipeline
            if add_to_warmup_pipeline(name, username):
                record_prospect(name, username, headline, query)
                prospects_found += 1
                existing_names.add(name.lower())  # Prevent duplicates within session
                log(f"  Added to pipeline ({prospects_found}/{MAX_PROSPECTS_PER_SESSION})")

        queries_used += 1
        time.sleep(WAIT_BETWEEN_SEARCHES)

        # Try next page of results if we need more
        if prospects_found < MAX_PROSPECTS_PER_SESSION:
            next_match = None
            with BrowserLock("prospector"):
                snapshot = get_snapshot()
                next_match = re.search(r'button "Next" \[ref=(e\d+)\]', snapshot)
                if next_match:
                    run_cmd(f'docker exec openclaw clawdbot browser click {next_match.group(1)}')
                    time.sleep(4)
                    snapshot = get_snapshot()
            if next_match:
                profiles = extract_profiles_from_search(snapshot)
                log(f"  Page 2: Found {len(profiles)} more profiles")

                for profile in profiles:
                    if prospects_found >= MAX_PROSPECTS_PER_SESSION:
                        break

                    name = profile["name"]
                    username = profile["username"]
                    headline = profile["headline"]

                    if name.lower() in existing_names:
                        continue
                    if len(username) < 3:
                        continue

                    combined_text = f"{name} {headline}"
                    is_hcp, keywords = is_healthcare_professional(combined_text)

                    if not is_hcp:
                        continue

                    log(f"  QUALIFIED: {name} ({', '.join(keywords[:3])})")

                    if add_to_warmup_pipeline(name, username):
                        record_prospect(name, username, headline, query)
                        prospects_found += 1
                        existing_names.add(name.lower())

    return prospects_found


def main():
    log("=" * 60)
    log("Active Prospector Started")
    log("=" * 60)

    while True:
        try:
            found = prospect_session()
            log(f"Session complete: {found} new prospects added to pipeline")
        except Exception as e:
            log(f"ERROR: {e}")

        # Run once every 4 hours
        log("Next prospecting session in 4 hours...")
        time.sleep(4 * 60 * 60)


if __name__ == "__main__":
    main()
