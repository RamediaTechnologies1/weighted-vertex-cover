#!/usr/bin/env python3
"""
Reply Handler - Monitors LinkedIn inbox for prospect replies.

RULES:
- Only respond to messages related to BioPosture / healthcare / our products
- Ignore ALL off-topic messages completely
- If anyone shows interest -> immediately email srimanvas@ramedia.dev
- If a human (Irwin or team) is already chatting -> DO NOT intervene
- Schedule follow-ups after a delay (1 day or as prospect requests)
- Never be pushy, never reply to unrelated conversations
"""
import subprocess
import smtplib
import time
import re
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from shared_lock import BrowserLock, safe_append, safe_read_lines, safe_write

TRACKING_FILE = os.path.expanduser("~/openclaw/linkedin-agent/messaged.txt")
CONVERSATIONS_FILE = os.path.expanduser("~/openclaw/linkedin-agent/conversations.txt")
FOLLOWUP_FILE = os.path.expanduser("~/openclaw/linkedin-agent/followups.txt")
HANDOFF_FILE = os.path.expanduser("~/openclaw/linkedin-agent/handoff.txt")
LOG_FILE = os.path.expanduser("~/openclaw/linkedin-agent/reply.log")
KNOWLEDGE_FILE = os.path.expanduser("~/openclaw/linkedin-agent/knowledge_base.txt")

NOTIFY_EMAIL = "srimanvas@ramedia.dev"
CHECK_INTERVAL = 5 * 60  # Check inbox every 5 minutes

# Human team members - if these names appear as recent senders, DO NOT intervene
HUMAN_TEAM = [
    "irwin pearl", "irwin", "srimanvas", "sriman",
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

def run_cmd_args(args):
    """Run command with explicit arg list (no shell interpretation)."""
    result = subprocess.run(args, capture_output=True, text=True)
    return result.stdout + result.stderr

def load_knowledge_base():
    with open(KNOWLEDGE_FILE, "r") as f:
        return f.read()

def get_messaged_list():
    if not os.path.exists(TRACKING_FILE):
        return set()
    with open(TRACKING_FILE) as f:
        return set(line.split("|")[0].strip() for line in f if line.strip())

def get_conversation_state():
    """Load conversation tracking: {name: {reply_count, status, last_reply, followup_at}}"""
    state = {}
    if not os.path.exists(CONVERSATIONS_FILE):
        return state
    with open(CONVERSATIONS_FILE) as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) >= 3:
                name = parts[0]
                state[name] = {
                    "reply_count": int(parts[1]),
                    "status": parts[2],  # active, handed_off, closed, followup_scheduled
                    "last_reply": parts[3] if len(parts) > 3 else "",
                    "followup_at": parts[4] if len(parts) > 4 else "",
                }
    return state

def save_conversation_state(state):
    with open(CONVERSATIONS_FILE, "w") as f:
        for name, data in state.items():
            followup = data.get("followup_at", "")
            f.write(f"{name}|{data['reply_count']}|{data['status']}|{data.get('last_reply', '')}|{followup}\n")

def get_followups():
    """Load scheduled follow-ups: {name: {followup_at, username, message}}"""
    followups = {}
    if not os.path.exists(FOLLOWUP_FILE):
        return followups
    with open(FOLLOWUP_FILE) as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) >= 4:
                followups[parts[0]] = {
                    "followup_at": parts[1],
                    "username": parts[2],
                    "status": parts[3],  # pending, sent
                }
    return followups

def save_followup(name, followup_at, username, status="pending"):
    followups = get_followups()
    followups[name] = {
        "followup_at": followup_at,
        "username": username,
        "status": status,
    }
    with open(FOLLOWUP_FILE, "w") as f:
        for n, data in followups.items():
            f.write(f"{n}|{data['followup_at']}|{data['username']}|{data['status']}\n")

def record_handoff(name, reason):
    with open(HANDOFF_FILE, "a") as f:
        f.write(f"{name}|{reason}|{datetime.now()}\n")

def send_email_notification(prospect_name, conversation_summary, category):
    """Send immediate email to srimanvas@ramedia.dev when someone shows interest."""
    try:
        subject = f"[BioPosture Lead] {prospect_name} - {category}"
        body = f"""New LinkedIn Lead Alert!

Prospect: {prospect_name}
Category: {category}
Time: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

Conversation Summary:
{conversation_summary[:2000]}

---
Action Required: Please follow up with this prospect on LinkedIn.
LinkedIn Messaging: https://www.linkedin.com/messaging/
"""
        # Use system mail command as fallback
        # Try sendmail/mail command available on macOS
        mail_cmd = f'echo {repr(body)} | mail -s {repr(subject)} {NOTIFY_EMAIL}'
        result = run_cmd(mail_cmd)
        log(f"  Email notification sent to {NOTIFY_EMAIL} for {prospect_name}")
        log(f"  Mail result: {result[:200]}")

        # Also try using Python smtplib with localhost
        try:
            msg = MIMEMultipart()
            msg['From'] = 'bioposture-bot@ramedia.dev'
            msg['To'] = NOTIFY_EMAIL
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))
            with smtplib.SMTP('localhost', 25, timeout=5) as server:
                server.send_message(msg)
            log(f"  SMTP email also sent to {NOTIFY_EMAIL}")
        except Exception as smtp_err:
            log(f"  SMTP fallback failed (non-critical): {smtp_err}")

    except Exception as e:
        log(f"  ERROR sending email notification: {e}")
        # Log to handoff file as backup so nothing is lost
        record_handoff(prospect_name, f"EMAIL_FAILED|{category}|{conversation_summary[:500]}")

def navigate_to_messaging():
    log("Navigating to messaging inbox...")
    run_cmd('docker exec openclaw clawdbot browser navigate "https://www.linkedin.com/messaging/"')
    time.sleep(5)

def get_snapshot():
    return run_cmd('docker exec openclaw clawdbot browser snapshot --format text 2>/dev/null')

def find_conversations_from_messaged(snapshot, messaged_names):
    """Find conversation threads from people we've previously messaged."""
    conversations = []
    lines = snapshot.split("\n")

    for i, line in enumerate(lines):
        for name in messaged_names:
            first_name = name.split()[0]
            last_name = name.split()[-1] if len(name.split()) > 1 else ""
            if (len(first_name) > 2 and first_name.lower() in line.lower()):
                if last_name and last_name.lower() in line.lower():
                    for k in range(max(0, i - 3), min(len(lines), i + 3)):
                        ref_match = re.search(r'\[ref=(e\d+)\]', lines[k])
                        if ref_match:
                            conversations.append({
                                "name": name,
                                "ref": ref_match.group(1),
                                "line": line.strip()
                            })
                            break
                    break

    seen = set()
    unique = []
    for c in conversations:
        if c["name"] not in seen:
            seen.add(c["name"])
            unique.append(c)

    return unique

def open_conversation(ref):
    run_cmd(f'docker exec openclaw clawdbot browser click {ref}')
    time.sleep(3)

def get_last_reply_text(snapshot):
    lines = snapshot.split("\n")
    recent = "\n".join(lines[-100:])
    return recent

def is_human_in_conversation(conversation_text):
    """Check if a human team member has recently replied in this conversation.
    If so, the bot should NOT intervene."""
    last_messages = conversation_text.lower()[-1000:]
    for human in HUMAN_TEAM:
        if human in last_messages:
            return True
    return False

def classify_reply(name, conversation_text, knowledge_base):
    """Use AI to classify the reply. Returns category only - we decide action separately.

    Categories:
    - INTERESTED: Wants to learn more, asks positive questions
    - QUESTION: Specific question about product/program
    - NOT_INTERESTED: Clearly declines
    - OFF_TOPIC: Message is unrelated to BioPosture/healthcare/our products
    - READY_TO_SIGN_UP: Wants to register or speak to someone
    - FOLLOWUP_REQUEST: Asks to be contacted later / specific timing
    """
    first_name = name.split()[0]

    prompt = f"""Analyze this LinkedIn conversation with {name}. They previously received our outreach about BioPosture Doctor Network (infrared mattresses for healthcare professionals).

CONVERSATION (recent messages):
{conversation_text[:3000]}

Classify their LATEST reply into EXACTLY ONE category:
- INTERESTED: They want to learn more or are positively engaging about BioPosture
- QUESTION: They ask a specific question about BioPosture products or doctor network
- NOT_INTERESTED: They clearly decline or say no
- OFF_TOPIC: Their message is completely unrelated to BioPosture, healthcare products, sleep, or our offering
- READY_TO_SIGN_UP: They explicitly want to register, sign up, or talk to someone to proceed
- FOLLOWUP_REQUEST: They ask to be contacted later, say they are busy now, or request a specific time

Also extract any specific timing they mention for follow-up (e.g. "next week", "in a few days", "Monday").

Format:
CATEGORY: [category]
TIMING: [any timing mentioned, or NONE]
SUMMARY: [one line summary of their message]"""

    escaped = prompt.replace("'", "").replace('"', '').replace('\n', ' ')[:6000]
    result = run_cmd(f"docker exec openclaw clawdbot agent --message '{escaped}' --session-id classify_reply 2>/dev/null")

    category = "OFF_TOPIC"
    timing = "NONE"
    summary = ""

    for line in result.strip().split('\n'):
        line = line.strip()
        if line.startswith("CATEGORY:"):
            category = line.replace("CATEGORY:", "").strip().upper()
        elif line.startswith("TIMING:"):
            timing = line.replace("TIMING:", "").strip()
        elif line.startswith("SUMMARY:"):
            summary = line.replace("SUMMARY:", "").strip()

    return category, timing, summary

def schedule_followup(name, username, timing_hint):
    """Schedule a follow-up message based on timing hint or default to 1 day."""
    # Parse timing hint to determine follow-up date
    now = datetime.now()

    if timing_hint and timing_hint.upper() != "NONE":
        timing_lower = timing_hint.lower()
        if "week" in timing_lower:
            followup_at = now + timedelta(days=7)
        elif "few days" in timing_lower or "couple days" in timing_lower:
            followup_at = now + timedelta(days=3)
        elif "month" in timing_lower:
            followup_at = now + timedelta(days=30)
        elif "tomorrow" in timing_lower:
            followup_at = now + timedelta(days=1)
        elif "monday" in timing_lower:
            days_ahead = 0 - now.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            followup_at = now + timedelta(days=days_ahead)
        elif "tuesday" in timing_lower:
            days_ahead = 1 - now.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            followup_at = now + timedelta(days=days_ahead)
        elif "wednesday" in timing_lower:
            days_ahead = 2 - now.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            followup_at = now + timedelta(days=days_ahead)
        elif "thursday" in timing_lower:
            days_ahead = 3 - now.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            followup_at = now + timedelta(days=days_ahead)
        elif "friday" in timing_lower:
            days_ahead = 4 - now.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            followup_at = now + timedelta(days=days_ahead)
        else:
            # Default: 1 day
            followup_at = now + timedelta(days=1)
    else:
        # Default follow-up: 1 day later
        followup_at = now + timedelta(days=1)

    followup_str = followup_at.strftime("%Y-%m-%d %H:%M:%S")
    save_followup(name, followup_str, username, status="pending")
    log(f"  Follow-up scheduled for {name} at {followup_str}")

def send_followup_message(name, username):
    """Send a gentle follow-up reminder."""
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

    messaging_url = f"https://www.linkedin.com/messaging/thread/new/?recipient={username}"
    log(f"Sending follow-up to {name}...")
    run_cmd(f'docker exec openclaw clawdbot browser navigate "{messaging_url}"')
    time.sleep(4)

    snapshot = get_snapshot()
    textbox_match = re.search(r'textbox "Write a message[^"]*" \[ref=(e\d+)\]', snapshot)
    if not textbox_match:
        log(f"ERROR: No textbox found for follow-up to {name}")
        return False

    textbox_ref = textbox_match.group(1)
    run_cmd_args(["docker", "exec", "openclaw", "clawdbot", "browser", "type", textbox_ref, followup_msg])
    time.sleep(2)

    snapshot = get_snapshot()
    send_match = re.search(r'button "Send" \[ref=(e\d+)\]', snapshot)
    if not send_match:
        log(f"ERROR: No send button for follow-up to {name}")
        return False

    run_cmd(f'docker exec openclaw clawdbot browser click {send_match.group(1)}')
    time.sleep(2)

    log(f"SUCCESS: Follow-up sent to {name}")
    return True

def process_due_followups():
    """Check for and send any follow-ups that are due."""
    followups = get_followups()
    now = datetime.now()
    sent_count = 0

    for name, data in followups.items():
        if data["status"] != "pending":
            continue

        try:
            followup_at = datetime.strptime(data["followup_at"], "%Y-%m-%d %H:%M:%S")
        except ValueError:
            continue

        if now >= followup_at:
            log(f"Follow-up due for {name} (was scheduled for {data['followup_at']})")

            # Before sending follow-up, check if human is already in conversation
            # Navigate to their conversation first
            messaging_url = f"https://www.linkedin.com/messaging/thread/new/?recipient={data['username']}"
            run_cmd(f'docker exec openclaw clawdbot browser navigate "{messaging_url}"')
            time.sleep(4)
            conv_snapshot = get_snapshot()
            conv_text = get_last_reply_text(conv_snapshot)

            if is_human_in_conversation(conv_text):
                log(f"  Human is active in conversation with {name}, skipping follow-up")
                save_followup(name, data["followup_at"], data["username"], status="human_active")
                continue

            if send_followup_message(name, data["username"]):
                save_followup(name, data["followup_at"], data["username"], status="sent")
                sent_count += 1
                # Also notify via email
                send_email_notification(name, f"Follow-up sent to {name}", "FOLLOWUP_SENT")
            time.sleep(5)

    return sent_count

def check_for_new_replies():
    """Main function to check inbox and handle replies."""
    knowledge_base = load_knowledge_base()
    messaged_names = get_messaged_list()
    conv_state = get_conversation_state()

    if not messaged_names:
        log("No messaged contacts found")
        return

    log(f"Checking replies from {len(messaged_names)} messaged contacts...")

    navigate_to_messaging()
    time.sleep(3)

    snapshot = get_snapshot()
    conversations = find_conversations_from_messaged(snapshot, messaged_names)
    log(f"Found {len(conversations)} conversations from messaged contacts")

    for conv in conversations:
        name = conv["name"]

        # Skip if already handed off or closed
        if name in conv_state:
            if conv_state[name]["status"] in ("handed_off", "closed"):
                continue

        # Open the conversation
        log(f"Opening conversation with {name}...")
        open_conversation(conv["ref"])
        time.sleep(3)

        conv_snapshot = get_snapshot()
        conversation_text = get_last_reply_text(conv_snapshot)

        # === RULE: If a human team member is in the conversation, DO NOT intervene ===
        if is_human_in_conversation(conversation_text):
            log(f"  HUMAN ACTIVE in conversation with {name} - not intervening")
            conv_state[name] = {
                "reply_count": conv_state.get(name, {}).get("reply_count", 0),
                "status": "human_active",
                "last_reply": str(datetime.now()),
                "followup_at": "",
            }
            save_conversation_state(conv_state)
            continue

        # Check if the last message is from us (bot) - if so, skip
        last_lines = conversation_text.strip().split("\n")[-10:]
        last_block = "\n".join(last_lines).lower()
        if "bioposture.com/doctor-registration" in last_block or "irwinpearl@bioposture" in last_block:
            log(f"  Last message appears to be ours, skipping {name}")
            continue

        # Check if there's actually a new reply from them
        first_name = name.split()[0]
        if first_name.lower() not in last_block and name.lower() not in conversation_text.lower()[-500:]:
            log(f"  No new reply detected from {name}")
            continue

        log(f"  New reply detected from {name}!")

        reply_count = conv_state.get(name, {}).get("reply_count", 0) + 1

        # === CLASSIFY THE REPLY ===
        category, timing, summary = classify_reply(name, conversation_text, knowledge_base)
        log(f"  Category: {category}")
        log(f"  Timing: {timing}")
        log(f"  Summary: {summary}")

        # === RULE: OFF-TOPIC -> Completely ignore, do nothing ===
        if category == "OFF_TOPIC":
            log(f"  OFF-TOPIC message from {name} - ignoring completely")
            conv_state[name] = {
                "reply_count": reply_count,
                "status": "ignored_offtopic",
                "last_reply": str(datetime.now()),
                "followup_at": "",
            }
            save_conversation_state(conv_state)
            continue

        # === RULE: INTERESTED or READY_TO_SIGN_UP -> Email srimanvas@ramedia.dev IMMEDIATELY ===
        if category in ("INTERESTED", "READY_TO_SIGN_UP", "QUESTION"):
            log(f"  LEAD ALERT: {name} is {category}!")
            send_email_notification(name, f"Category: {category}\nSummary: {summary}\n\nConversation:\n{conversation_text[-1500:]}", category)
            record_handoff(name, f"{category}|emailed_srimanvas")

            conv_state[name] = {
                "reply_count": reply_count,
                "status": "handed_off",
                "last_reply": str(datetime.now()),
                "followup_at": "",
            }
            save_conversation_state(conv_state)

            # Do NOT auto-reply - let the human handle it
            log(f"  Handed off to srimanvas@ramedia.dev - NOT auto-replying")
            continue

        # === RULE: NOT_INTERESTED -> Close conversation, no follow-up ===
        if category == "NOT_INTERESTED":
            log(f"  {name} is not interested - closing conversation")
            conv_state[name] = {
                "reply_count": reply_count,
                "status": "closed",
                "last_reply": str(datetime.now()),
                "followup_at": "",
            }
            save_conversation_state(conv_state)
            continue

        # === RULE: FOLLOWUP_REQUEST -> Schedule follow-up based on their timing ===
        if category == "FOLLOWUP_REQUEST":
            log(f"  {name} requested follow-up (timing: {timing})")
            # Find username from messaged file or conversation
            username = ""
            username_match = re.search(r'/in/([^/"\]]+)/', conversation_text)
            if username_match:
                username = username_match.group(1)

            schedule_followup(name, username, timing)
            conv_state[name] = {
                "reply_count": reply_count,
                "status": "followup_scheduled",
                "last_reply": str(datetime.now()),
                "followup_at": timing,
            }
            save_conversation_state(conv_state)

            # Also email so human is aware
            send_email_notification(name, f"Follow-up requested.\nTiming: {timing}\nSummary: {summary}", "FOLLOWUP_REQUEST")
            continue

        # === Default: Any other category -> just log and schedule a gentle follow-up ===
        log(f"  Unhandled category '{category}' for {name} - scheduling default follow-up")
        username_match = re.search(r'/in/([^/"\]]+)/', conversation_text)
        username = username_match.group(1) if username_match else ""
        schedule_followup(name, username, "NONE")  # Default 1-day follow-up

        conv_state[name] = {
            "reply_count": reply_count,
            "status": "followup_scheduled",
            "last_reply": str(datetime.now()),
            "followup_at": "",
        }
        save_conversation_state(conv_state)

    save_conversation_state(conv_state)
    log("Reply check complete")

def main():
    log("=" * 60)
    log("Reply Handler Started")
    log("=" * 60)
    log(f"Notification email: {NOTIFY_EMAIL}")
    log("Rules: OFF_TOPIC=ignore | INTERESTED/QUESTION/READY=email srimanvas | Human active=don't intervene")

    while True:
        try:
            with BrowserLock("reply_handler"):
                # Phase 1: Check for new replies
                check_for_new_replies()

                # Phase 2: Process any due follow-ups
                log("Checking for due follow-ups...")
                followups_sent = process_due_followups()
                if followups_sent:
                    log(f"Sent {followups_sent} follow-up messages")

        except Exception as e:
            log(f"ERROR: {e}")

        log(f"Next check in {CHECK_INTERVAL // 60} minutes...")
        time.sleep(CHECK_INTERVAL)

if __name__ == "__main__":
    main()
