#!/usr/bin/env python3
"""
One-time scan: Check LinkedIn messaging inbox for replies from all messaged contacts.
Outputs a leads report.
"""
import subprocess
import time
import re
import os
from datetime import datetime

MESSAGED_FILE = os.path.expanduser("~/openclaw/linkedin-agent/messaged.txt")
LEADS_FILE = os.path.expanduser("~/openclaw/linkedin-agent/leads_report.txt")

def run_cmd(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout + result.stderr

def get_snapshot():
    return run_cmd('docker exec openclaw clawdbot browser snapshot --format text 2>/dev/null')

def scroll_page():
    run_cmd("docker exec openclaw clawdbot browser evaluate --fn '() => document.querySelector(\"main\").scrollBy(0, 1000)'")
    time.sleep(1)

def get_messaged_list():
    names = []
    with open(MESSAGED_FILE) as f:
        for line in f:
            if line.strip():
                name = line.split("|")[0].strip()
                date = line.split("|")[1].strip() if "|" in line else ""
                names.append({"name": name, "date": date})
    return names

def main():
    print("=" * 60)
    print("SCANNING INBOX FOR REPLIES FROM ALL CONTACTS")
    print("=" * 60)

    messaged = get_messaged_list()
    print(f"Total contacts to check: {len(messaged)}")

    # Navigate to messaging
    print("\nNavigating to messaging inbox...")
    run_cmd('docker exec openclaw clawdbot browser navigate "https://www.linkedin.com/messaging/"')
    time.sleep(6)

    # Collect all visible conversation names by scrolling
    all_conversation_names = set()
    print("Scanning inbox conversations...")

    for scroll_round in range(15):  # Scroll 15 times to load conversations
        snapshot = get_snapshot()
        lines = snapshot.split("\n")

        for line in lines:
            # LinkedIn messaging shows conversation names
            name_match = re.search(r'link "([^"]+)" \[ref=(e\d+)\]', line)
            if name_match:
                all_conversation_names.add(name_match.group(1))

        scroll_page()
        print(f"  Scroll {scroll_round + 1}/15 — found {len(all_conversation_names)} conversations so far")

    print(f"\nTotal conversations visible in inbox: {len(all_conversation_names)}")

    # Now check each messaged person — open their conversation if it exists
    leads = []
    no_reply = []
    replied = []

    for i, contact in enumerate(messaged):
        name = contact["name"]
        first_name = name.split()[0]

        # Check if this person appears in inbox conversations
        found_in_inbox = False
        for conv_name in all_conversation_names:
            if first_name.lower() in conv_name.lower():
                # Check last name too if available
                last_name = name.split()[-1] if len(name.split()) > 1 else ""
                if last_name and last_name.lower() in conv_name.lower():
                    found_in_inbox = True
                    break
                elif not last_name:
                    found_in_inbox = True
                    break

        if not found_in_inbox:
            no_reply.append(contact)
            continue

        # Open the conversation to check for replies
        print(f"\n[{i+1}/{len(messaged)}] Checking {name}...")

        # Search for this person in messaging
        search_url = f"https://www.linkedin.com/messaging/?searchTerm={first_name.replace(' ', '%20')}"
        run_cmd(f'docker exec openclaw clawdbot browser navigate "{search_url}"')
        time.sleep(4)

        snapshot = get_snapshot()

        # Find and click on the conversation
        conv_ref = None
        lines = snapshot.split("\n")
        for li, line in enumerate(lines):
            if first_name.lower() in line.lower():
                last_name = name.split()[-1] if len(name.split()) > 1 else ""
                if last_name and last_name.lower() in line.lower():
                    ref_match = re.search(r'\[ref=(e\d+)\]', line)
                    if ref_match:
                        conv_ref = ref_match.group(1)
                        break
                    # Check nearby lines for ref
                    for k in range(max(0, li-3), min(len(lines), li+3)):
                        ref_match = re.search(r'\[ref=(e\d+)\]', lines[k])
                        if ref_match:
                            conv_ref = ref_match.group(1)
                            break
                    if conv_ref:
                        break

        if not conv_ref:
            no_reply.append(contact)
            print(f"  No conversation found for {name}")
            continue

        # Click to open conversation
        run_cmd(f'docker exec openclaw clawdbot browser click {conv_ref}')
        time.sleep(3)

        # Read the conversation
        snapshot = get_snapshot()
        conv_lines = snapshot.split("\n")

        # Get the last ~50 lines of the conversation
        recent = "\n".join(conv_lines[-60:])

        # Check if they replied (look for messages NOT from us)
        # Our messages contain bioposture, irwin, sleep biologics, etc.
        our_markers = ["bioposture", "irwin pearl", "irwinpearl", "sleep biologics", "celliant",
                       "doctor-registration", "joinbioposture", "fda-determined"]

        # Split into message blocks and check who sent what
        has_their_reply = False
        their_messages = []

        # Simple heuristic: look at the conversation and see if there's content
        # that doesn't contain our markers (meaning they wrote it)
        message_blocks = recent.split("\n\n")
        for block in message_blocks:
            block_lower = block.lower().strip()
            if not block_lower:
                continue
            # If a block has none of our markers, it might be their reply
            is_ours = any(marker in block_lower for marker in our_markers)
            if not is_ours and len(block_lower) > 15:
                # Check if it's not just UI elements
                if not block_lower.startswith("button") and not block_lower.startswith("[") and "ref=" not in block_lower:
                    has_their_reply = True
                    their_messages.append(block.strip()[:200])

        if has_their_reply and their_messages:
            reply_preview = their_messages[-1][:150]  # Last message preview
            print(f"  REPLY FOUND from {name}: {reply_preview[:80]}...")
            replied.append({
                **contact,
                "reply_preview": reply_preview,
                "full_context": recent[-500:],
            })
        else:
            no_reply.append(contact)
            print(f"  No reply from {name}")

        time.sleep(1)

    # Write leads report
    print("\n" + "=" * 60)
    print("LEADS REPORT")
    print("=" * 60)

    report = []
    report.append("=" * 60)
    report.append(f"LEADS SCAN REPORT — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append("=" * 60)
    report.append("")
    report.append(f"Total messaged: {len(messaged)}")
    report.append(f"Replied: {len(replied)}")
    report.append(f"No reply: {len(no_reply)}")
    report.append("")

    if replied:
        report.append("=" * 40)
        report.append("PROSPECTS WHO REPLIED")
        report.append("=" * 40)
        for r in replied:
            report.append("")
            report.append(f"Name: {r['name']}")
            report.append(f"Messaged on: {r['date']}")
            report.append(f"Reply preview: {r['reply_preview']}")
            report.append("-" * 40)
            print(f"\n  LEAD: {r['name']}")
            print(f"    Messaged: {r['date']}")
            print(f"    Reply: {r['reply_preview'][:100]}")
    else:
        report.append("No replies found.")
        print("\nNo replies found from any contacts.")

    report.append("")
    report.append("=" * 40)
    report.append("NO REPLY (follow-up candidates)")
    report.append("=" * 40)
    for nr in no_reply:
        report.append(f"  {nr['name']} | messaged: {nr['date']}")

    report_text = "\n".join(report)

    with open(LEADS_FILE, "w") as f:
        f.write(report_text)

    print(f"\nFull report saved to: {LEADS_FILE}")
    print("SCAN COMPLETE")

if __name__ == "__main__":
    main()
