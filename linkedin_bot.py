#!/usr/bin/env python3
import subprocess
import time
import re
import os
from datetime import datetime
from shared_lock import BrowserLock, safe_append, safe_read_lines

TRACKING_FILE = os.path.expanduser("~/openclaw/linkedin-agent/messaged.txt")
SKIPPED_FILE = os.path.expanduser("~/openclaw/linkedin-agent/skipped.txt")
LOG_FILE = os.path.expanduser("~/openclaw/linkedin-agent/outreach.log")
TEMPLATE_FILE = os.path.expanduser("~/openclaw/linkedin-agent/message-template.txt")

MAX_MESSAGES_PER_DAY = 100
WAIT_BETWEEN_MESSAGES = 5 * 60    # 5 min between messages (normal mode)
FAST_WAIT_BETWEEN_MESSAGES = 3 * 60  # 3 min between messages (catch-up mode)
FAST_MODE_DURATION = 6 * 60 * 60  # 6 hours of fast mode

# Keywords to identify healthcare professionals
HEALTHCARE_KEYWORDS = [
    'dc', 'd.c.', 'chiropractor', 'chiropractic',
    'md', 'm.d.', 'doctor', 'dr.', 'dr ',
    'physician', 'medical',
    'dpt', 'd.p.t.', 'physical therapist', 'physical therapy',
    'do', 'd.o.', 'osteopath',
    'nd', 'n.d.', 'naturopath', 'naturopathic',
    'dpm', 'podiatrist',
    'nurse', 'np', 'rn',
    'orthopedic', 'spine', 'sports medicine',
    'rehabilitation', 'rehab',
    'wellness', 'clinic', 'practice',
    'pain management', 'acupuncture',
    'massage therapist', 'lmt',
    'healthcare', 'health care',
    'pt,', 'dpt,', 'ms,', 'ccsp', 'dacbsp',
    'functional medicine', 'consultant'
]

def load_message_template():
    with open(TEMPLATE_FILE, "r") as f:
        return f.read().strip()

def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")

def run_cmd(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout + result.stderr

def run_cmd_args(args):
    """Run command with explicit arg list (no shell interpretation)."""
    result = subprocess.run(args, capture_output=True, text=True)
    return result.stdout + result.stderr

def get_messaged_list():
    if not os.path.exists(TRACKING_FILE):
        return set()
    with open(TRACKING_FILE) as f:
        return set(line.split("|")[0].strip() for line in f if line.strip())

def get_skipped_list():
    if not os.path.exists(SKIPPED_FILE):
        return set()
    with open(SKIPPED_FILE) as f:
        return set(line.split("|")[0].strip() for line in f if line.strip())

def record_messaged(name):
    with open(TRACKING_FILE, "a") as f:
        f.write(f"{name}|{datetime.now()}\n")

def record_skipped(name, reason):
    with open(SKIPPED_FILE, "a") as f:
        f.write(f"{name}|{reason}|{datetime.now()}\n")

def navigate_to_connections():
    log("Navigating to connections page...")
    run_cmd('docker exec openclaw clawdbot browser navigate "https://www.linkedin.com/mynetwork/invite-connect/connections/"')
    time.sleep(5)

def get_snapshot():
    return run_cmd('docker exec openclaw clawdbot browser snapshot --format text 2>/dev/null')

def scroll_page():
    run_cmd("docker exec openclaw clawdbot browser evaluate --fn '() => document.querySelector(\"main\").scrollBy(0, 2000)'")
    time.sleep(1.5)

def find_connections(snapshot):
    """Find all connections visible in the snapshot."""
    connections = []
    lines = snapshot.split("\n")
    
    for i, line in enumerate(lines):
        # Look for profile picture links
        if "profile picture" in line and "link" in line:
            # Match both apostrophe types: ' and '
            name_match = re.search(r'link "([^"]+)[\'\u2019]s profile picture"', line)
            
            if name_match:
                name = name_match.group(1)
                # Look in next few lines for the /in/ URL
                for j in range(i, min(i + 5, len(lines))):
                    url_match = re.search(r'/in/([^/"\]]+)/', lines[j])
                    if url_match:
                        username = url_match.group(1)
                        connections.append({"name": name, "username": username})
                        break
    
    return connections

def find_new_connection(messaged, skipped):
    """
    Scroll through connections page until we find someone not yet messaged or skipped.
    Returns the first unmessaged/unskipped connection, or None if none found.
    """
    navigate_to_connections()
    time.sleep(3)
    
    max_scroll_attempts = 50  # Scroll up to 50 times to find new people
    
    for scroll_num in range(max_scroll_attempts):
        snapshot = get_snapshot()
        connections = find_connections(snapshot)
        
        # Log found connections for debugging
        if scroll_num == 0:
            log(f"Found {len(connections)} connections visible")
            for c in connections[:5]:
                status = "DONE" if c["name"] in messaged else ("SKIP" if c["name"] in skipped else "NEW")
                log(f"  [{status}] {c['name']}")
        
        # Find first unmessaged/unskipped person
        for conn in connections:
            if conn["name"] not in messaged and conn["name"] not in skipped:
                log(f"Found new connection: {conn['name']}")
                return conn
        
        # All visible are already processed, scroll for more
        if scroll_num < max_scroll_attempts - 1:
            log(f"Scrolling to load more... ({scroll_num + 1}/{max_scroll_attempts})")
            for _ in range(3):  # Scroll 3 times
                scroll_page()
    
    log("No new connections found after scrolling")
    return None

def is_healthcare_professional(profile_snapshot, name):
    """Check if the person is a healthcare professional based on their profile."""
    profile_lower = profile_snapshot.lower()
    name_lower = name.lower()
    
    # Check name first (many have DC, DPT, MD in name)
    for keyword in HEALTHCARE_KEYWORDS:
        if keyword in name_lower:
            log(f"  -> Healthcare match in name: '{keyword}'")
            return True
    
    # Check profile content
    for keyword in HEALTHCARE_KEYWORDS:
        if keyword in profile_lower:
            log(f"  -> Healthcare match in profile: '{keyword}'")
            return True
    
    return False

def visit_profile_and_analyze(username, name):
    """
    Visit the person's profile, check if healthcare professional,
    and generate personalized opener.
    """
    first_name = name.split()[0]
    
    # Navigate to their profile
    profile_url = f"https://www.linkedin.com/in/{username}/"
    log(f"Visiting {name}'s profile...")
    run_cmd(f'docker exec openclaw clawdbot browser navigate "{profile_url}"')
    time.sleep(5)
    
    # Scroll to load content
    log("Loading profile content...")
    for _ in range(3):
        scroll_page()
    
    # Get profile snapshot
    snapshot = get_snapshot()
    
    # Check if healthcare professional
    if not is_healthcare_professional(snapshot, name):
        log(f"SKIP: {name} does not appear to be a healthcare professional")
        record_skipped(name, "not_healthcare")
        return None, False
    
    log(f"CONFIRMED: {name} is a healthcare professional")
    
    # Generate personalized opener using AI
    log(f"Generating personalized opener for {name}...")
    
    prompt = f"""You are looking at {name}'s LinkedIn profile. They are a healthcare professional.

Based on their profile (job title, company, specialization, posts), write ONE short personalized opening sentence (max 20 words).

Focus on something specific about THEM - their practice, specialization, or achievement.

Good examples:
- "Your work in sports rehabilitation at [Clinic] caught my attention!"
- "I see you specialize in spinal care - that aligns perfectly with what we do."
- "Congrats on your practice at [Name] - your patient-focused approach is impressive."

Just write the single sentence, nothing else.

Their first name is {first_name}.

Profile:
{snapshot[:5000]}"""
    
    escaped = prompt.replace("'", "").replace('"', '').replace('\n', ' ')[:6000]
    result = run_cmd(f"docker exec openclaw clawdbot agent --message '{escaped}' --session-id personalize 2>/dev/null")
    
    # Parse response
    opener = None
    for line in result.strip().split('\n'):
        line = line.strip().strip('"').strip("'")
        if line and not line.startswith('[') and not line.startswith('(') and 10 < len(line) < 200:
            opener = line
            break
    
    if not opener:
        opener = f"Hi {first_name}, I came across your profile and your work in healthcare caught my attention."
    
    log(f"Opener: {opener}")
    return opener, True

def send_message(name, username, template, opener):
    """Send formatted message with personalized opener."""

    messaging_url = f"https://www.linkedin.com/messaging/thread/new/?recipient={username}"
    log(f"Opening message composer...")
    run_cmd(f'docker exec openclaw clawdbot browser navigate "{messaging_url}"')
    time.sleep(4)

    snapshot = get_snapshot()
    textbox_match = re.search(r'textbox "Write a message[^"]*" \[ref=(e\d+)\]', snapshot)
    if not textbox_match:
        log(f"ERROR: No textbox found")
        return False

    textbox_ref = textbox_match.group(1)
    first_name = name.split()[0]

    # Build full message
    body = template.replace("{{NAME}}", first_name)
    full_message = opener + "\n\n" + body

    # Convert any literal \n sequences to actual newlines
    full_message = full_message.replace("\\n", "\n")

    log(f"Sending message ({len(full_message)} chars)...")

    # Click textbox to focus it first
    run_cmd(f'docker exec openclaw clawdbot browser click {textbox_ref}')
    time.sleep(0.5)

    # Build list of all lines (empty strings represent blank lines between paragraphs)
    all_lines = []
    paragraphs = full_message.split("\n\n")
    for i, paragraph in enumerate(paragraphs):
        lines = paragraph.split("\n")
        for line in lines:
            all_lines.append(line.strip() if line.strip() else "")
        # Add empty line between paragraphs
        if i < len(paragraphs) - 1:
            all_lines.append("")

    # Type first line using 'type' command (initializes the textbox)
    if all_lines:
        run_cmd_args(["docker", "exec", "openclaw", "clawdbot", "browser", "type", textbox_ref, all_lines[0]])
        time.sleep(0.3)

    # For remaining lines: Shift+Enter for newline, then execCommand to append text
    for line in all_lines[1:]:
        run_cmd('docker exec openclaw clawdbot browser press "Shift+Enter"')
        time.sleep(0.2)
        if line:
            # Use execCommand('insertText') to append without clearing the field
            escaped = line.replace("\\", "\\\\").replace("'", "\\'")
            run_cmd_args(["docker", "exec", "openclaw", "clawdbot", "browser", "evaluate",
                         "--fn", f"(el) => {{ el.focus(); document.execCommand('insertText', false, '{escaped}'); }}",
                         "--ref", textbox_ref])
            time.sleep(0.3)

    time.sleep(2)

    # Click Send
    snapshot = get_snapshot()
    send_match = re.search(r'button "Send" \[ref=(e\d+)\]', snapshot)
    if not send_match:
        log(f"ERROR: No send button found")
        return False

    run_cmd(f'docker exec openclaw clawdbot browser click {send_match.group(1)}')
    time.sleep(2)

    record_messaged(name)
    log(f"SUCCESS: Message sent to {name}")
    return True

def do_gap_work(wait_seconds):
    """Use the gap between messages productively instead of sleeping.

    Activities during gap time:
    1. Pre-analyze the next few connections (profile check + opener generation)
    2. Do warmup actions (view profiles, like posts, endorse skills)
    3. Like a post from someone we've already messaged
    """
    start = time.time()

    log(f"[GAP] Using {wait_seconds // 60} min gap productively...")

    # --- Activity 1: Pre-analyze next connections ---
    elapsed = time.time() - start
    if elapsed < wait_seconds - 30:
        log("[GAP] Pre-scanning next connections...")
        try:
            messaged = get_messaged_list()
            skipped = get_skipped_list()
            navigate_to_connections()
            time.sleep(3)
            snapshot = get_snapshot()
            connections = find_connections(snapshot)

            new_ones = [c for c in connections if c["name"] not in messaged and c["name"] not in skipped]
            if new_ones:
                log(f"[GAP] Found {len(new_ones)} upcoming connections to process")
                for c in new_ones[:3]:
                    log(f"[GAP]   Next up: {c['name']} (@{c['username']})")
        except Exception as e:
            log(f"[GAP] Pre-scan error: {e}")

    # --- Activity 2: Like a post from a recent connection ---
    elapsed = time.time() - start
    if elapsed < wait_seconds - 60:
        log("[GAP] Looking for posts to engage with...")
        try:
            run_cmd('docker exec openclaw clawdbot browser navigate "https://www.linkedin.com/feed/"')
            time.sleep(4)

            # Scroll feed
            for _ in range(2):
                scroll_page()

            snapshot = get_snapshot()

            # Find Like buttons on feed posts
            like_matches = re.findall(r'button "(?:Like|React Like)[^"]*" \[ref=(e\d+)\]', snapshot)
            if like_matches:
                # Like 1-2 posts
                for ref in like_matches[:2]:
                    run_cmd(f'docker exec openclaw clawdbot browser click {ref}')
                    time.sleep(2)
                    log(f"[GAP] Liked a post on feed")
        except Exception as e:
            log(f"[GAP] Feed engagement error: {e}")

    # --- Activity 3: View a prospect's profile (warmup) ---
    elapsed = time.time() - start
    pipeline_file = os.path.expanduser("~/openclaw/linkedin-agent/warmup_pipeline.txt")
    if elapsed < wait_seconds - 40 and os.path.exists(pipeline_file):
        try:
            with open(pipeline_file) as f:
                lines = f.readlines()

            for line in lines:
                parts = line.strip().split("|")
                if len(parts) >= 3 and parts[2] == "view_profile":
                    username = parts[1]
                    name = parts[0]
                    log(f"[GAP] Warmup: viewing {name}'s profile...")
                    profile_url = f"https://www.linkedin.com/in/{username}/"
                    run_cmd(f'docker exec openclaw clawdbot browser navigate "{profile_url}"')
                    time.sleep(4)
                    for _ in range(2):
                        scroll_page()
                    log(f"[GAP] Viewed {name}'s profile (warmup)")

                    # Update pipeline stage
                    updated_lines = []
                    for l in lines:
                        if l.startswith(f"{name}|"):
                            p = l.strip().split("|")
                            p[2] = "like_posts"
                            p[3] = str(datetime.now())
                            updated_lines.append("|".join(p) + "\n")
                        else:
                            updated_lines.append(l)
                    with open(pipeline_file, "w") as f:
                        f.writelines(updated_lines)
                    break
        except Exception as e:
            log(f"[GAP] Warmup error: {e}")

    # Sleep remaining time
    remaining = wait_seconds - (time.time() - start)
    if remaining > 5:
        log(f"[GAP] Done. Sleeping remaining {int(remaining)}s...")
        time.sleep(remaining)

    log("[GAP] Gap work complete")


def main():
    log("=" * 60)
    log("LinkedIn Bot - Healthcare Professionals Only")
    log("=" * 60)

    template = load_message_template()
    log(f"Template loaded ({len(template)} chars)")

    start_time = time.time()
    messages_sent = 0

    while messages_sent < MAX_MESSAGES_PER_DAY:
        messaged = get_messaged_list()
        skipped = get_skipped_list()
        log(f"Already messaged: {len(messaged)} | Skipped: {len(skipped)}")

        # Acquire browser lock for the full find → visit → send cycle
        with BrowserLock("linkedin_bot"):
            # Find a new connection (scrolls automatically)
            connection = find_new_connection(messaged, skipped)

            if not connection:
                log("No more new connections found. Waiting 5 minutes then retrying...")
                # Release lock during wait (exit context manager below)
            else:
                log("=" * 40)
                log(f"Processing: {connection['name']}")
                log("=" * 40)

                # Visit profile and check if healthcare
                opener, is_healthcare = visit_profile_and_analyze(connection["username"], connection["name"])

                if not is_healthcare:
                    log(f"Skipping {connection['name']} - not healthcare")
                    connection = None  # Signal to skip wait
                else:
                    # Send message
                    if send_message(connection["name"], connection["username"], template, opener):
                        messages_sent += 1
                        log(f"Messages sent today: {messages_sent}/{MAX_MESSAGES_PER_DAY}")
                    else:
                        log(f"Failed to send, moving on...")
                        connection = None

        # Browser lock released — sleep while other modules use the browser
        if connection is None:
            time.sleep(5)
            continue

        if messages_sent < MAX_MESSAGES_PER_DAY:
            elapsed = time.time() - start_time
            if elapsed < FAST_MODE_DURATION:
                wait_time = FAST_WAIT_BETWEEN_MESSAGES
                log(f"Gap: {wait_time // 60} min (fast mode — {int((FAST_MODE_DURATION - elapsed) // 60)} min left)")
            else:
                wait_time = WAIT_BETWEEN_MESSAGES
                log(f"Gap: {wait_time // 60} min (normal mode)")
            time.sleep(wait_time)

    log("=" * 60)
    log("Bot completed!")
    log("=" * 60)

if __name__ == "__main__":
    main()