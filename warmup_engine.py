#!/usr/bin/env python3
"""
Warm-Up Engine - Warms up target chiropractors before messaging.

Pipeline stages for each prospect:
  Stage 1: View their profile (they get a notification)
  Stage 2: Like 1-2 of their recent posts
  Stage 3: Endorse 1-2 of their skills
  Stage 4: Comment on one of their posts (via post_engager)
  Stage 5: Send connection request with personalized note
  Stage 6: Once accepted → DM via outreach bot

Each stage happens on a different day to look natural.
"""
import subprocess
import time
import re
import os
from datetime import datetime, timedelta
from shared_lock import BrowserLock, safe_append, safe_read_lines, safe_write

LOG_FILE = os.path.expanduser("~/openclaw/linkedin-agent/warmup.log")
PIPELINE_FILE = os.path.expanduser("~/openclaw/linkedin-agent/warmup_pipeline.txt")
KNOWLEDGE_FILE = os.path.expanduser("~/openclaw/linkedin-agent/knowledge_base.txt")
MESSAGED_FILE = os.path.expanduser("~/openclaw/linkedin-agent/messaged.txt")

# Pipeline stages and minimum days between each
STAGES = {
    "view_profile": {"next": "like_posts", "wait_days": 1},
    "like_posts": {"next": "endorse_skills", "wait_days": 1},
    "endorse_skills": {"next": "comment_post", "wait_days": 1},
    "comment_post": {"next": "connect_request", "wait_days": 2},
    "connect_request": {"next": "wait_accept", "wait_days": 0},
    "wait_accept": {"next": "send_dm", "wait_days": 1},
    "send_dm": {"next": "done", "wait_days": 0},
    "done": {"next": None, "wait_days": 0},
}

MAX_ACTIONS_PER_SESSION = 15  # Max warmup actions per run
WAIT_BETWEEN_ACTIONS = 60  # 1 minute between actions


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
    result = subprocess.run(args, capture_output=True, text=True)
    return result.stdout + result.stderr


def get_snapshot():
    return run_cmd('docker exec openclaw clawdbot browser snapshot --format text 2>/dev/null')


def scroll_page():
    run_cmd("docker exec openclaw clawdbot browser evaluate --fn '() => window.scrollBy(0, 800)'")
    time.sleep(1.5)


def load_pipeline():
    """Load warmup pipeline: {name: {username, stage, last_action, added_date}}"""
    pipeline = {}
    if not os.path.exists(PIPELINE_FILE):
        return pipeline
    with open(PIPELINE_FILE) as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) >= 4:
                pipeline[parts[0]] = {
                    "username": parts[1],
                    "stage": parts[2],
                    "last_action": parts[3],
                    "added_date": parts[4] if len(parts) > 4 else parts[3],
                }
    return pipeline


def save_pipeline(pipeline):
    with open(PIPELINE_FILE, "w") as f:
        for name, data in pipeline.items():
            f.write(f"{name}|{data['username']}|{data['stage']}|{data['last_action']}|{data.get('added_date', data['last_action'])}\n")


def add_to_pipeline(name, username):
    """Add a new prospect to the warmup pipeline."""
    pipeline = load_pipeline()
    if name not in pipeline:
        now = str(datetime.now())
        pipeline[name] = {
            "username": username,
            "stage": "view_profile",
            "last_action": now,
            "added_date": now,
        }
        save_pipeline(pipeline)
        log(f"Added {name} (@{username}) to warmup pipeline")
    return pipeline


def get_ready_prospects():
    """Get prospects whose next action is due."""
    pipeline = load_pipeline()
    ready = []
    now = datetime.now()

    for name, data in pipeline.items():
        stage = data["stage"]
        if stage == "done":
            continue

        stage_config = STAGES.get(stage, {})
        wait_days = stage_config.get("wait_days", 1)

        try:
            last_action = datetime.strptime(data["last_action"].split(".")[0], "%Y-%m-%d %H:%M:%S")
            days_since = (now - last_action).days
            if days_since >= wait_days:
                ready.append({"name": name, **data, "days_waiting": days_since})
        except ValueError:
            ready.append({"name": name, **data, "days_waiting": 0})

    return ready


# === STAGE ACTIONS ===

def action_view_profile(name, username):
    """Visit their LinkedIn profile so they get a 'viewed your profile' notification."""
    log(f"  [VIEW] Visiting {name}'s profile...")
    profile_url = f"https://www.linkedin.com/in/{username}/"
    run_cmd(f'docker exec openclaw clawdbot browser navigate "{profile_url}"')
    time.sleep(5)

    # Scroll down to show engagement
    for _ in range(3):
        scroll_page()

    snapshot = get_snapshot()
    if username in snapshot or name.split()[0] in snapshot:
        log(f"  [VIEW] Successfully viewed {name}'s profile")
        return True
    else:
        log(f"  [VIEW] Profile may not have loaded for {name}")
        return True  # Still count it


def action_like_posts(name, username):
    """Visit their profile and like 1-2 of their recent posts."""
    log(f"  [LIKE] Looking for {name}'s recent posts...")

    # Navigate to their recent activity
    activity_url = f"https://www.linkedin.com/in/{username}/recent-activity/all/"
    run_cmd(f'docker exec openclaw clawdbot browser navigate "{activity_url}"')
    time.sleep(5)

    # Scroll to load posts
    for _ in range(2):
        scroll_page()

    snapshot = get_snapshot()

    # Find Like buttons
    like_matches = re.findall(r'button "(?:Like|React Like)[^"]*" \[ref=(e\d+)\]', snapshot)

    if not like_matches:
        # Try alternate patterns
        like_matches = re.findall(r'button[^[]*[Ll]ike[^[]*\[ref=(e\d+)\]', snapshot)

    likes_done = 0
    for ref in like_matches[:2]:  # Like at most 2 posts
        log(f"  [LIKE] Liking a post by {name}...")
        run_cmd(f'docker exec openclaw clawdbot browser click {ref}')
        time.sleep(3)
        likes_done += 1

    if likes_done > 0:
        log(f"  [LIKE] Liked {likes_done} post(s) by {name}")
        return True
    else:
        log(f"  [LIKE] No likeable posts found for {name}, advancing anyway")
        return True  # Skip stage if no posts


def action_endorse_skills(name, username):
    """Visit their profile and endorse 1-2 skills."""
    log(f"  [ENDORSE] Looking for {name}'s skills to endorse...")

    profile_url = f"https://www.linkedin.com/in/{username}/"
    run_cmd(f'docker exec openclaw clawdbot browser navigate "{profile_url}"')
    time.sleep(5)

    # Scroll down to skills section
    for _ in range(5):
        scroll_page()

    snapshot = get_snapshot()

    # Find endorsement buttons
    # LinkedIn shows "Endorse [Skill]" buttons
    endorse_matches = re.findall(r'button "Endorse ([^"]+)" \[ref=(e\d+)\]', snapshot)

    if not endorse_matches:
        # Try alternate: look for skill + buttons near it
        endorse_matches = re.findall(r'button[^[]*[Ee]ndorse[^[]*\[ref=(e\d+)\]', snapshot)

    endorsements_done = 0
    for match in endorse_matches[:2]:
        if isinstance(match, tuple):
            skill_name, ref = match
            log(f"  [ENDORSE] Endorsing {name} for '{skill_name}'")
        else:
            ref = match
            log(f"  [ENDORSE] Endorsing a skill for {name}")

        run_cmd(f'docker exec openclaw clawdbot browser click {ref}')
        time.sleep(3)
        endorsements_done += 1

    if endorsements_done > 0:
        log(f"  [ENDORSE] Endorsed {endorsements_done} skill(s) for {name}")
        return True
    else:
        log(f"  [ENDORSE] No endorsable skills found for {name}, advancing anyway")
        return True


def action_comment_post(name, username):
    """Comment on one of their posts. Uses AI to generate a relevant comment."""
    log(f"  [COMMENT] Looking for {name}'s posts to comment on...")

    activity_url = f"https://www.linkedin.com/in/{username}/recent-activity/all/"
    run_cmd(f'docker exec openclaw clawdbot browser navigate "{activity_url}"')
    time.sleep(5)

    for _ in range(2):
        scroll_page()

    snapshot = get_snapshot()

    # Find comment buttons
    comment_matches = re.findall(r'button "Comment[^"]*" \[ref=(e\d+)\]', snapshot)
    if not comment_matches:
        comment_matches = re.findall(r'button[^[]*[Cc]omment[^[]*\[ref=(e\d+)\]', snapshot)

    if not comment_matches:
        log(f"  [COMMENT] No commentable posts found for {name}, advancing anyway")
        return True

    # Get post context for AI comment generation
    post_text = snapshot[:3000]
    first_name = name.split()[0]

    prompt = f"""Write a short, genuine LinkedIn comment (2-3 sentences, under 60 words) on a post by {name}, a healthcare professional.

Post context:
{post_text[:2000]}

Rules:
- Be genuinely insightful about their topic (sleep, health, wellness, chiropractic, patient care)
- Sound like a real person, warm and professional
- DO NOT pitch any products
- DO NOT include links
- Address them naturally
- End with something conversational

Write ONLY the comment."""

    escaped = prompt.replace("'", "").replace('"', '').replace('\n', ' ')[:4000]
    result = run_cmd(f"docker exec openclaw clawdbot agent --message '{escaped}' --session-id warmup_comment 2>/dev/null")

    comment = None
    for line in result.strip().split('\n'):
        line = line.strip().strip('"').strip("'")
        if line and not line.startswith('[') and not line.startswith('(') and 15 < len(line) < 400:
            comment = line
            break

    if not comment:
        comment = f"Great perspective, {first_name}! This really resonates with what we're seeing in the wellness space. Keep sharing insights like this!"

    # Click comment button
    ref = comment_matches[0]
    run_cmd(f'docker exec openclaw clawdbot browser click {ref}')
    time.sleep(3)

    # Find textbox and type
    snapshot = get_snapshot()
    textbox_match = re.search(r'textbox[^[]*\[ref=(e\d+)\]', snapshot)
    if not textbox_match:
        log(f"  [COMMENT] Comment textbox not found")
        return False

    textbox_ref = textbox_match.group(1)
    run_cmd_args(["docker", "exec", "openclaw", "clawdbot", "browser", "type", textbox_ref, comment])
    time.sleep(2)

    # Submit
    snapshot = get_snapshot()
    submit_match = re.search(r'button "(?:Post|Submit|Comment)"[^[]*\[ref=(e\d+)\]', snapshot)
    if not submit_match:
        submit_match = re.search(r'button[^[]*[Pp]ost[^[]*\[ref=(e\d+)\]', snapshot)

    if submit_match:
        run_cmd(f'docker exec openclaw clawdbot browser click {submit_match.group(1)}')
        time.sleep(3)
        log(f"  [COMMENT] Commented on {name}'s post: {comment[:80]}...")
        return True

    log(f"  [COMMENT] Submit button not found")
    return False


def action_connect_request(name, username):
    """Send a connection request with a personalized note."""
    log(f"  [CONNECT] Sending connection request to {name}...")

    profile_url = f"https://www.linkedin.com/in/{username}/"
    run_cmd(f'docker exec openclaw clawdbot browser navigate "{profile_url}"')
    time.sleep(5)

    snapshot = get_snapshot()

    # Check if already connected
    if "Message" in snapshot and "Connect" not in snapshot:
        log(f"  [CONNECT] Already connected with {name}")
        return True

    # Find Connect button
    connect_match = re.search(r'button "Connect[^"]*" \[ref=(e\d+)\]', snapshot)
    if not connect_match:
        # Try "More" menu first
        more_match = re.search(r'button "More[^"]*" \[ref=(e\d+)\]', snapshot)
        if more_match:
            run_cmd(f'docker exec openclaw clawdbot browser click {more_match.group(1)}')
            time.sleep(2)
            snapshot = get_snapshot()
            connect_match = re.search(r'button "Connect[^"]*" \[ref=(e\d+)\]', snapshot)
            if not connect_match:
                connect_match = re.search(r'[Cc]onnect[^[]*\[ref=(e\d+)\]', snapshot)

    if not connect_match:
        log(f"  [CONNECT] Connect button not found for {name}")
        return False

    # Click connect
    run_cmd(f'docker exec openclaw clawdbot browser click {connect_match.group(1)}')
    time.sleep(3)

    snapshot = get_snapshot()

    # Look for "Add a note" button
    note_match = re.search(r'button "Add a note[^"]*" \[ref=(e\d+)\]', snapshot)
    if note_match:
        run_cmd(f'docker exec openclaw clawdbot browser click {note_match.group(1)}')
        time.sleep(2)

        snapshot = get_snapshot()

        # Generate personalized connection note
        first_name = name.split()[0]
        note = (
            f"Hi {first_name}, I've been following your work in healthcare and would love to connect! "
            f"I work with Sleep BioLogics, helping healthcare professionals improve patient outcomes "
            f"through clinically-proven sleep solutions. Looking forward to connecting!"
        )

        # Find the note textbox
        note_textbox = re.search(r'textbox[^[]*\[ref=(e\d+)\]', snapshot)
        if note_textbox:
            run_cmd_args(["docker", "exec", "openclaw", "clawdbot", "browser", "type", note_textbox.group(1), note])
            time.sleep(2)

    # Click Send
    snapshot = get_snapshot()
    send_match = re.search(r'button "Send[^"]*" \[ref=(e\d+)\]', snapshot)
    if not send_match:
        send_match = re.search(r'button[^[]*[Ss]end[^[]*\[ref=(e\d+)\]', snapshot)

    if send_match:
        run_cmd(f'docker exec openclaw clawdbot browser click {send_match.group(1)}')
        time.sleep(3)
        log(f"  [CONNECT] Connection request sent to {name}")
        return True

    log(f"  [CONNECT] Send button not found")
    return False


def action_wait_accept(name, username):
    """Check if connection request was accepted."""
    log(f"  [WAIT] Checking if {name} accepted connection...")

    profile_url = f"https://www.linkedin.com/in/{username}/"
    run_cmd(f'docker exec openclaw clawdbot browser navigate "{profile_url}"')
    time.sleep(5)

    snapshot = get_snapshot()

    # If "Message" button exists, they accepted
    message_match = re.search(r'button "Message[^"]*" \[ref=(e\d+)\]', snapshot)
    if message_match:
        log(f"  [WAIT] {name} accepted connection request!")
        return True

    # Check if "Pending" shows
    if "pending" in snapshot.lower():
        log(f"  [WAIT] Connection request to {name} still pending")
        return False

    log(f"  [WAIT] Status unclear for {name}, will check again")
    return False


def action_send_dm(name, username):
    """Send the outreach DM now that we're connected and warmed up."""
    log(f"  [DM] Sending outreach message to {name}...")

    # Load the message template
    template_file = os.path.expanduser("~/openclaw/linkedin-agent/message-template.txt")
    with open(template_file) as f:
        template = f.read().strip()

    first_name = name.split()[0]

    # Generate personalized opener referencing prior engagement
    prompt = f"""Write ONE short personalized opening sentence (max 25 words) for a LinkedIn message to {name}, a healthcare professional.

You have been engaging with their content recently (liked posts, commented, endorsed skills). Reference this warmly.

Good examples:
- "{first_name}, I've really enjoyed your recent posts on patient care — they align perfectly with my mission!"
- "Great connecting with you, {first_name}! Your work in chiropractic health has been inspiring to follow."

Write ONLY the sentence, nothing else."""

    escaped = prompt.replace("'", "").replace('"', '').replace('\n', ' ')[:3000]
    result = run_cmd(f"docker exec openclaw clawdbot agent --message '{escaped}' --session-id warmup_dm 2>/dev/null")

    opener = None
    for line in result.strip().split('\n'):
        line = line.strip().strip('"').strip("'")
        if line and not line.startswith('[') and not line.startswith('(') and 10 < len(line) < 200:
            opener = line
            break

    if not opener:
        opener = f"Great connecting with you, {first_name}! I've been following your work and it really resonates."

    # Build full message
    body = template.replace("{{NAME}}", first_name)
    full_message = opener + "\n\n" + body

    # Navigate to messaging
    messaging_url = f"https://www.linkedin.com/messaging/thread/new/?recipient={username}"
    run_cmd(f'docker exec openclaw clawdbot browser navigate "{messaging_url}"')
    time.sleep(4)

    snapshot = get_snapshot()
    textbox_match = re.search(r'textbox "Write a message[^"]*" \[ref=(e\d+)\]', snapshot)
    if not textbox_match:
        log(f"  [DM] No textbox found for {name}")
        return False

    textbox_ref = textbox_match.group(1)

    # Type message paragraph by paragraph
    paragraphs = full_message.split("\n\n")
    for i, paragraph in enumerate(paragraphs):
        lines = paragraph.split("\n")
        for j, line in enumerate(lines):
            if line.strip():
                run_cmd_args(["docker", "exec", "openclaw", "clawdbot", "browser", "type", textbox_ref, line.strip()])
                time.sleep(0.3)
            if j < len(lines) - 1:
                run_cmd(f"docker exec openclaw clawdbot browser press {textbox_ref} Shift+Enter")
                time.sleep(0.2)
        if i < len(paragraphs) - 1:
            run_cmd(f"docker exec openclaw clawdbot browser press {textbox_ref} Shift+Enter")
            time.sleep(0.2)
            run_cmd(f"docker exec openclaw clawdbot browser press {textbox_ref} Shift+Enter")
            time.sleep(0.2)

    time.sleep(2)

    # Click Send
    snapshot = get_snapshot()
    send_match = re.search(r'button "Send" \[ref=(e\d+)\]', snapshot)
    if not send_match:
        log(f"  [DM] Send button not found for {name}")
        return False

    run_cmd(f'docker exec openclaw clawdbot browser click {send_match.group(1)}')
    time.sleep(2)

    # Record in messaged file
    with open(MESSAGED_FILE, "a") as f:
        f.write(f"{name}|{datetime.now()}\n")

    log(f"  [DM] Outreach message sent to {name}!")
    return True


# === STAGE DISPATCH ===

STAGE_ACTIONS = {
    "view_profile": action_view_profile,
    "like_posts": action_like_posts,
    "endorse_skills": action_endorse_skills,
    "comment_post": action_comment_post,
    "connect_request": action_connect_request,
    "wait_accept": action_wait_accept,
    "send_dm": action_send_dm,
}


def process_pipeline():
    """Process all ready prospects in the pipeline."""
    ready = get_ready_prospects()
    pipeline = load_pipeline()
    actions_done = 0

    log(f"Pipeline: {len(pipeline)} total, {len(ready)} ready for next action")

    for prospect in ready:
        if actions_done >= MAX_ACTIONS_PER_SESSION:
            log(f"Max actions ({MAX_ACTIONS_PER_SESSION}) reached for this session")
            break

        name = prospect["name"]
        username = prospect["username"]
        stage = prospect["stage"]

        log(f"Processing {name} — stage: {stage}")

        action_fn = STAGE_ACTIONS.get(stage)
        if not action_fn:
            log(f"  Unknown stage '{stage}' for {name}")
            continue

        with BrowserLock("warmup_engine"):
            success = action_fn(name, username)

        if success:
            # Advance to next stage
            next_stage = STAGES[stage]["next"]
            if next_stage:
                pipeline[name]["stage"] = next_stage
                pipeline[name]["last_action"] = str(datetime.now())
                log(f"  Advanced {name} to stage: {next_stage}")
            else:
                pipeline[name]["stage"] = "done"
                pipeline[name]["last_action"] = str(datetime.now())
                log(f"  Pipeline complete for {name}")
        else:
            # Keep at same stage, update timestamp so we retry later
            if stage == "wait_accept":
                # Don't update timestamp for wait_accept, check again next cycle
                pass
            else:
                pipeline[name]["last_action"] = str(datetime.now())
                log(f"  Action failed for {name}, will retry later")

        save_pipeline(pipeline)
        actions_done += 1

        if actions_done < MAX_ACTIONS_PER_SESSION:
            log(f"  Waiting {WAIT_BETWEEN_ACTIONS}s before next action...")
            time.sleep(WAIT_BETWEEN_ACTIONS)

    return actions_done


def main():
    log("=" * 60)
    log("Warm-Up Engine Started")
    log("=" * 60)

    while True:
        try:
            actions = process_pipeline()
            log(f"Completed {actions} warmup actions this cycle")
        except Exception as e:
            log(f"ERROR: {e}")

        log("Next warmup cycle in 30 minutes...")
        time.sleep(30 * 60)


if __name__ == "__main__":
    main()
