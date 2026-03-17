#!/usr/bin/env python3
"""
Content Poster - Auto-posts valuable content on YOUR LinkedIn profile.

Purpose: When chiropractors check your profile (after warmup actions),
they see credibility-building content about sleep health, infrared therapy,
practice growth, and BioPosture. This makes them more likely to accept
connection requests and respond to DMs.

Posts a mix of:
- Sleep health education (stats, tips, research)
- Infrared therapy / Celliant science
- Doctor success stories / social proof
- Practice growth tips
- Soft BioPosture mentions with registration link

Frequency: 3-4 posts per week (Mon, Wed, Fri + optional weekend)
"""
import subprocess
import time
import re
import os
from datetime import datetime
from shared_lock import BrowserLock

LOG_FILE = os.path.expanduser("~/openclaw/linkedin-agent/content.log")
POSTED_FILE = os.path.expanduser("~/openclaw/linkedin-agent/posted_content.txt")
KNOWLEDGE_FILE = os.path.expanduser("~/openclaw/linkedin-agent/knowledge_base.txt")

MAX_POSTS_PER_DAY = 1


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


def load_knowledge_base():
    with open(KNOWLEDGE_FILE, "r") as f:
        return f.read()


def get_posts_today():
    """Count how many posts we've made today."""
    today = datetime.now().strftime("%Y-%m-%d")
    count = 0
    if os.path.exists(POSTED_FILE):
        with open(POSTED_FILE) as f:
            for line in f:
                if today in line:
                    count += 1
    return count


def get_all_posted_topics():
    """Get previously posted topics to avoid repetition."""
    topics = []
    if os.path.exists(POSTED_FILE):
        with open(POSTED_FILE) as f:
            for line in f:
                parts = line.strip().split("|")
                if len(parts) >= 2:
                    topics.append(parts[1])
    return topics


def record_post(topic, post_text):
    with open(POSTED_FILE, "a") as f:
        f.write(f"{datetime.now()}|{topic}|{post_text[:100]}\n")


# Content templates organized by category
CONTENT_THEMES = [
    {
        "topic": "sleep_health_stats",
        "prompt_hint": "Share a compelling statistic about sleep health in America and how it impacts patient outcomes. "
                       "Include that 50-70 million Americans suffer from sleep disorders. "
                       "Tie it to what healthcare professionals can do for their patients.",
    },
    {
        "topic": "infrared_therapy_science",
        "prompt_hint": "Educate about far-infrared therapy and its clinical benefits for circulation and recovery. "
                       "Mention peer-reviewed research showing improved blood flow and tissue oxygenation. "
                       "Position this as cutting-edge wellness technology.",
    },
    {
        "topic": "chiropractic_sleep_connection",
        "prompt_hint": "Discuss the connection between spinal health and sleep quality. "
                       "How chiropractic care and proper sleep surfaces work together. "
                       "This is directly relevant to chiropractors and their patients.",
    },
    {
        "topic": "doctor_passive_income",
        "prompt_hint": "Talk about how healthcare professionals are adding passive income streams to their practices. "
                       "Without being salesy, mention that recommending quality sleep products is one way. "
                       "Focus on the concept of earning while helping patients.",
    },
    {
        "topic": "patient_recovery_sleep",
        "prompt_hint": "Share insights about how sleep quality directly impacts patient recovery times. "
                       "Reference the fact that proper sleep surfaces can reduce pain and improve healing. "
                       "Healthcare professionals should consider sleep as part of treatment plans.",
    },
    {
        "topic": "fda_medical_device_sleep",
        "prompt_hint": "Discuss how sleep technology has evolved to the point where mattresses can be FDA-classified "
                       "medical devices. Explain what that means for patient care and insurance eligibility (FSA/HSA). "
                       "This is educational content that shows your expertise.",
    },
    {
        "topic": "celliant_technology",
        "prompt_hint": "Educate about Celliant technology — how minerals woven into textiles convert body heat "
                       "into far-infrared energy. Reference the UC Irvine study showing people fell asleep 18.3 minutes faster. "
                       "Present it as innovation in sleep science.",
    },
    {
        "topic": "practice_growth_wellness",
        "prompt_hint": "Share tips for chiropractors and healthcare professionals on growing their practice "
                       "by expanding wellness offerings. Discuss how adding complementary products/services "
                       "creates new revenue while improving patient satisfaction.",
    },
    {
        "topic": "neuropathy_sleep",
        "prompt_hint": "Discuss how improved circulation during sleep can benefit the 20 million Americans "
                       "suffering from neuropathy. Connect infrared technology to tangible patient benefits. "
                       "This is a specific condition that chiropractors frequently treat.",
    },
    {
        "topic": "bioposture_network_soft",
        "prompt_hint": "Write about the growing trend of healthcare professionals recommending specific sleep products. "
                       "Mention that over 3,000 doctors and chiropractors are now part of networks that provide "
                       "FDA-classified sleep solutions. Subtly mention BioPosture Doctor Network and include the "
                       "registration link: https://bioposture.com/doctor-registration/",
    },
    {
        "topic": "sleep_and_chronic_pain",
        "prompt_hint": "Discuss the relationship between chronic pain and poor sleep quality. "
                       "Share that proper sleep surfaces with pressure relief and circulation-boosting technology "
                       "can break the pain-sleep cycle. Relevant to all healthcare professionals.",
    },
    {
        "topic": "holistic_patient_care",
        "prompt_hint": "Talk about the shift toward holistic patient care where doctors consider sleep, nutrition, "
                       "and lifestyle alongside treatment. How forward-thinking practitioners are leading this change. "
                       "Encourage healthcare professionals to think beyond traditional care.",
    },
]


def generate_post(theme, knowledge_base, posted_topics):
    """Use AI to generate a LinkedIn post."""
    topic = theme["topic"]
    hint = theme["prompt_hint"]

    # Build list of recent topics to avoid
    recent = ", ".join(posted_topics[-10:]) if posted_topics else "none"

    prompt = f"""Write a LinkedIn post for the profile of Irwin Pearl, CEO of Sleep BioLogics (BioPosture brand).
The audience is healthcare professionals, especially chiropractors.

TOPIC: {topic}
GUIDANCE: {hint}

RULES:
1. Write 150-250 words, professional but conversational tone
2. Start with a hook (surprising stat, question, or bold statement)
3. Use short paragraphs (2-3 sentences max each)
4. Include 1-2 relevant emojis per paragraph (sparingly)
5. End with a call-to-action or thought-provoking question
6. Include 3-5 relevant hashtags at the end
7. If the topic is about BioPosture specifically, include: https://bioposture.com/doctor-registration/
8. DO NOT make it sound like an ad — make it educational and valuable
9. Sound authentic, not corporate
10. Recently posted topics to AVOID repeating: {recent}

KNOWLEDGE BASE (use facts from here):
{knowledge_base[:3000]}

Write ONLY the post content, nothing else."""

    escaped = prompt.replace("'", "").replace('"', '').replace('\n', ' ')[:6000]
    result = run_cmd(f"docker exec openclaw clawdbot agent --message '{escaped}' --session-id content_post 2>/dev/null")

    # Parse - get all non-system lines as the post
    post_lines = []
    for line in result.strip().split('\n'):
        line = line.strip()
        if line and not line.startswith('[') and not line.startswith('(') and not line.startswith('Session'):
            post_lines.append(line)

    post_text = "\n".join(post_lines)

    if len(post_text) < 50:
        return None

    return post_text


def publish_post(post_text):
    """Navigate to LinkedIn and create a new post."""
    log("Navigating to LinkedIn feed...")
    run_cmd('docker exec openclaw clawdbot browser navigate "https://www.linkedin.com/feed/"')
    time.sleep(5)

    snapshot = get_snapshot()

    # Find "Start a post" button
    start_post_match = re.search(r'button "Start a post[^"]*" \[ref=(e\d+)\]', snapshot)
    if not start_post_match:
        # Try alternate patterns
        start_post_match = re.search(r'[Ss]tart a post[^[]*\[ref=(e\d+)\]', snapshot)
    if not start_post_match:
        # Try clicking on the text input area
        start_post_match = re.search(r'textbox[^[]*\[ref=(e\d+)\]', snapshot)

    if not start_post_match:
        log("ERROR: 'Start a post' button not found")
        return False

    run_cmd(f'docker exec openclaw clawdbot browser click {start_post_match.group(1)}')
    time.sleep(4)

    snapshot = get_snapshot()

    # Find the post textbox
    textbox_match = re.search(r'textbox[^[]*\[ref=(e\d+)\]', snapshot)
    if not textbox_match:
        log("ERROR: Post textbox not found")
        return False

    textbox_ref = textbox_match.group(1)

    # Type the post paragraph by paragraph
    paragraphs = post_text.split("\n\n")
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

    # Click Post button
    snapshot = get_snapshot()
    post_btn_match = re.search(r'button "Post"[^[]*\[ref=(e\d+)\]', snapshot)
    if not post_btn_match:
        post_btn_match = re.search(r'button[^[]*[Pp]ost[^[]*\[ref=(e\d+)\]', snapshot)

    if not post_btn_match:
        log("ERROR: Post button not found")
        return False

    run_cmd(f'docker exec openclaw clawdbot browser click {post_btn_match.group(1)}')
    time.sleep(5)

    log("Post published successfully!")
    return True


def should_post_today():
    """Check if today is a posting day (Mon, Wed, Fri, or Sun)."""
    day = datetime.now().weekday()
    # 0=Mon, 2=Wed, 4=Fri, 6=Sun
    return day in (0, 2, 4, 6)


def create_post():
    """Generate and publish one post."""
    if get_posts_today() >= MAX_POSTS_PER_DAY:
        log("Already posted today, skipping")
        return False

    if not should_post_today():
        log(f"Not a posting day (today is {datetime.now().strftime('%A')})")
        return False

    knowledge_base = load_knowledge_base()
    posted_topics = get_all_posted_topics()

    # Pick a theme that hasn't been used recently
    available_themes = [
        t for t in CONTENT_THEMES
        if t["topic"] not in posted_topics[-5:]
    ]

    if not available_themes:
        available_themes = CONTENT_THEMES  # Reset if we've cycled through all

    # Rotate through themes
    theme_index = len(posted_topics) % len(available_themes)
    theme = available_themes[theme_index]

    log(f"Generating post on topic: {theme['topic']}")
    post_text = generate_post(theme, knowledge_base, posted_topics)

    if not post_text:
        log("ERROR: Failed to generate post content")
        return False

    log(f"Post content ({len(post_text)} chars):")
    log(f"  {post_text[:150]}...")

    if publish_post(post_text):
        record_post(theme["topic"], post_text)
        log(f"Post published! Topic: {theme['topic']}")
        return True
    else:
        log("Failed to publish post")
        return False


def main():
    log("=" * 60)
    log("Content Poster Started")
    log("=" * 60)

    while True:
        try:
            with BrowserLock("content_poster"):
                create_post()
        except Exception as e:
            log(f"ERROR: {e}")

        # Check every 6 hours
        log("Next content check in 6 hours...")
        time.sleep(6 * 60 * 60)


if __name__ == "__main__":
    main()
