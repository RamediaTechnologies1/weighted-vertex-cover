#!/usr/bin/env python3
"""
Post Engager - Finds chiropractor/healthcare professional posts on LinkedIn,
comments with relevant BioPosture-related insights, and tracks engagement.
Strictly targets healthcare professionals only. Comments are always relevant
to BioPosture products (sleep, pain, recovery, wellness).
"""
import subprocess
import time
import re
import os
from datetime import datetime
from shared_lock import BrowserLock, safe_append, safe_read_lines, safe_write

LOG_FILE = os.path.expanduser("~/openclaw/linkedin-agent/engage.log")
COMMENTED_FILE = os.path.expanduser("~/openclaw/linkedin-agent/commented_posts.txt")
ENGAGED_PROFILES_FILE = os.path.expanduser("~/openclaw/linkedin-agent/engaged_profiles.txt")
KNOWLEDGE_FILE = os.path.expanduser("~/openclaw/linkedin-agent/knowledge_base.txt")
MESSAGED_FILE = os.path.expanduser("~/openclaw/linkedin-agent/messaged.txt")

MAX_COMMENTS_PER_DAY = 20
MAX_LIKES_PER_DAY = 40
WAIT_BETWEEN_COMMENTS = 10 * 60  # 10 minutes between comments
WAIT_BETWEEN_LIKES = 15  # 15 seconds between likes
DAYS_BEFORE_DM = 3  # Wait 3 days after commenting before sending DM
LIKED_FILE = os.path.expanduser("~/openclaw/linkedin-agent/liked_posts.txt")

# Search queries to find healthcare professional posts
SEARCH_QUERIES = [
    "chiropractor patient care",
    "chiropractic wellness tips",
    "chiropractic sleep health",
    "physical therapy recovery",
    "sports medicine rehabilitation",
    "spine health chiropractic",
    "chiropractic pain management",
    "healthcare professional sleep",
    "chiropractor practice growth",
    "orthopedic recovery tips",
    "naturopathic wellness",
    "functional medicine sleep",
    "chiropractic adjustment benefits",
    "physical therapist patient outcomes",
]

# Healthcare title keywords to verify the poster is a healthcare professional
HEALTHCARE_TITLES = [
    'dc', 'd.c.', 'chiropractor', 'chiropractic',
    'md', 'm.d.', 'doctor', 'dr.', 'dr ',
    'physician', 'dpt', 'd.p.t.', 'physical therapist',
    'do', 'd.o.', 'osteopath', 'nd', 'n.d.', 'naturopath',
    'dpm', 'podiatrist', 'nurse practitioner', 'np',
    'orthopedic', 'spine', 'sports medicine',
    'rehabilitation', 'wellness', 'pain management',
    'acupuncture', 'massage therapist', 'lmt',
    'pt,', 'dpt,', 'ccsp', 'dacbsp',
    'functional medicine',
]

# Post topics we should engage with (relevant to BioPosture)
RELEVANT_TOPICS = [
    'sleep', 'mattress', 'pain', 'recovery', 'wellness',
    'spinal', 'spine', 'posture', 'circulation', 'inflammation',
    'patient care', 'patient outcomes', 'health tips',
    'chiropractic', 'adjustment', 'rehabilitation',
    'back pain', 'neck pain', 'chronic pain',
    'neuropathy', 'therapy', 'healing', 'rest',
    'energy', 'fatigue', 'infrared', 'blood flow',
    'holistic', 'natural healing', 'preventive care',
    'practice growth', 'passive income', 'side income',
    'medical device', 'fda', 'clinical', 'evidence-based',
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

def get_commented_posts():
    """Load set of post IDs/URLs we've already commented on."""
    if not os.path.exists(COMMENTED_FILE):
        return set()
    with open(COMMENTED_FILE) as f:
        return set(line.split("|")[0].strip() for line in f if line.strip())

def record_commented_post(post_id, author_name, comment_text):
    with open(COMMENTED_FILE, "a") as f:
        f.write(f"{post_id}|{author_name}|{comment_text[:100]}|{datetime.now()}\n")

def get_engaged_profiles():
    """Load profiles we've engaged with via comments."""
    if not os.path.exists(ENGAGED_PROFILES_FILE):
        return {}
    profiles = {}
    with open(ENGAGED_PROFILES_FILE) as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) >= 3:
                profiles[parts[0]] = {
                    "username": parts[1],
                    "first_engaged": parts[2],
                    "comment_count": int(parts[3]) if len(parts) > 3 else 1,
                    "dm_sent": parts[4] == "True" if len(parts) > 4 else False
                }
    return profiles

def save_engaged_profile(name, username, comment_count=1, dm_sent=False):
    profiles = get_engaged_profiles()
    if name in profiles:
        profiles[name]["comment_count"] = comment_count
        profiles[name]["dm_sent"] = dm_sent
    else:
        profiles[name] = {
            "username": username,
            "first_engaged": str(datetime.now()),
            "comment_count": comment_count,
            "dm_sent": dm_sent
        }
    with open(ENGAGED_PROFILES_FILE, "w") as f:
        for n, data in profiles.items():
            f.write(f"{n}|{data['username']}|{data['first_engaged']}|{data['comment_count']}|{data['dm_sent']}\n")

def get_snapshot():
    return run_cmd('docker exec openclaw clawdbot browser snapshot --format text 2>/dev/null')

def scroll_page():
    run_cmd("docker exec openclaw clawdbot browser evaluate --fn '() => window.scrollBy(0, 800)'")
    time.sleep(1.5)

def is_healthcare_professional(author_line, nearby_text):
    """Strictly verify the post author is a healthcare professional."""
    combined = (author_line + " " + nearby_text).lower()
    for keyword in HEALTHCARE_TITLES:
        if keyword in combined:
            return True, keyword
    return False, None

def is_relevant_post(post_text):
    """Check if the post topic is relevant to BioPosture's domain."""
    post_lower = post_text.lower()
    matches = [topic for topic in RELEVANT_TOPICS if topic in post_lower]
    return len(matches) >= 1, matches

def get_liked_posts():
    """Load set of post IDs we've already liked."""
    if not os.path.exists(LIKED_FILE):
        return set()
    with open(LIKED_FILE) as f:
        return set(line.split("|")[0].strip() for line in f if line.strip())

def record_liked_post(post_id, author_name):
    with open(LIKED_FILE, "a") as f:
        f.write(f"{post_id}|{author_name}|{datetime.now()}\n")

def get_likes_today():
    """Count likes made today."""
    today = datetime.now().strftime("%Y-%m-%d")
    if not os.path.exists(LIKED_FILE):
        return 0
    count = 0
    with open(LIKED_FILE) as f:
        for line in f:
            if today in line:
                count += 1
    return count

def like_post(like_ref):
    """Click the Like button on a post."""
    run_cmd(f'docker exec openclaw clawdbot browser click {like_ref}')
    time.sleep(2)
    return True

def search_for_posts(query):
    """Search LinkedIn for posts matching a query."""
    encoded_query = query.replace(" ", "%20")
    search_url = f"https://www.linkedin.com/search/results/content/?keywords={encoded_query}&sortBy=%22date_posted%22"
    log(f"Searching: {query}")
    run_cmd(f'docker exec openclaw clawdbot browser navigate "{search_url}"')
    time.sleep(5)

def find_posts_in_snapshot(snapshot):
    """Parse the snapshot to find individual posts with their authors and content."""
    posts = []
    lines = snapshot.split("\n")

    i = 0
    while i < len(lines):
        line = lines[i]

        # Look for post author patterns (name with title/headline)
        # LinkedIn search results show author name, headline, and post content
        author_match = re.search(r'link "([^"]+)" \[ref=(e\d+)\]', line)

        if author_match and "/in/" in line:
            author_name = author_match.group(1)
            author_ref = author_match.group(2)

            # Extract username from nearby /in/ URL
            username_match = re.search(r'/in/([^/"\]]+)/', line)
            username = username_match.group(1) if username_match else ""

            # Gather the next ~20 lines as post context
            post_lines = []
            comment_ref = None
            like_ref = None
            post_id = None

            for j in range(i + 1, min(i + 30, len(lines))):
                post_lines.append(lines[j])

                # Look for comment button
                if "comment" in lines[j].lower() and "button" in lines[j].lower():
                    comment_match = re.search(r'\[ref=(e\d+)\]', lines[j])
                    if comment_match:
                        comment_ref = comment_match.group(1)

                # Look for Like button
                if not like_ref and re.search(r'button "(?:Like|React Like)', lines[j]):
                    like_match = re.search(r'\[ref=(e\d+)\]', lines[j])
                    if like_match:
                        like_ref = like_match.group(1)

                # Look for post ID or unique identifier
                if "urn:li:activity:" in lines[j]:
                    id_match = re.search(r'urn:li:activity:(\d+)', lines[j])
                    if id_match:
                        post_id = id_match.group(1)

            post_text = "\n".join(post_lines)

            if comment_ref or like_ref:
                # Use a combination of author + first words as post ID if no activity ID
                if not post_id:
                    post_id = f"{username}_{hash(post_text[:100]) % 100000}"

                posts.append({
                    "author_name": author_name,
                    "username": username,
                    "author_ref": author_ref,
                    "post_text": post_text,
                    "post_id": post_id,
                    "comment_ref": comment_ref,
                    "like_ref": like_ref,
                    "author_line": line,
                })

            i += 15  # Skip ahead past this post
        else:
            i += 1

    return posts

def generate_comment(author_name, post_text, knowledge_base):
    """Use AI to generate a relevant, professional comment.

    STRICT RULES:
    - Comment MUST be relevant to BioPosture's domain (sleep, pain, recovery, wellness)
    - Comment must be professional and add value
    - Must NOT be spammy or overtly promotional
    - Must subtly position as someone knowledgeable about sleep health / recovery
    - Should engage genuinely with the post content
    """
    first_name = author_name.split()[0] if author_name else "Doctor"

    prompt = f"""You are a sleep health and wellness professional engaging on LinkedIn.
You work with BioPosture (Sleep BioLogics) which makes FDA-classified infrared-enhanced mattresses for healthcare professionals.

A healthcare professional named {author_name} posted on LinkedIn. You need to write a thoughtful comment.

POST CONTENT:
{post_text[:2000]}

STRICT RULES:
1. Comment MUST be relevant to the post AND connect to sleep health, pain recovery, patient wellness, or practice growth
2. Be genuinely insightful and add value - share a relevant fact or perspective
3. Keep it concise (2-3 sentences max, under 80 words)
4. Be professional and warm, address them by first name ({first_name}) if natural
5. DO NOT directly pitch BioPosture products in the comment
6. DO NOT include links or URLs
7. DO NOT be generic - reference something specific from their post
8. You may subtly mention sleep quality, infrared therapy, or recovery science if relevant to the post topic
9. End with something that invites further conversation (a question or insight)
10. Sound like a real person, not a bot

Write ONLY the comment text, nothing else."""

    escaped = prompt.replace("'", "").replace('"', '').replace('\n', ' ')[:6000]
    result = run_cmd(f"docker exec openclaw clawdbot agent --message '{escaped}' --session-id post_engage 2>/dev/null")

    # Parse the response - get first meaningful line
    comment = None
    for line in result.strip().split('\n'):
        line = line.strip().strip('"').strip("'")
        if line and not line.startswith('[') and not line.startswith('(') and 15 < len(line) < 500:
            comment = line
            break

    return comment

def post_comment(comment_ref, comment_text):
    """Click comment button and post a comment."""
    # Click the comment button to open comment box
    log("  Clicking comment button...")
    run_cmd(f'docker exec openclaw clawdbot browser click {comment_ref}')
    time.sleep(3)

    # Get snapshot to find comment textbox
    snapshot = get_snapshot()

    # Find the comment textbox
    textbox_match = re.search(r'textbox[^[]*\[ref=(e\d+)\]', snapshot)
    if not textbox_match:
        log("  ERROR: Comment textbox not found")
        return False

    textbox_ref = textbox_match.group(1)

    # Type the comment
    run_cmd_args(["docker", "exec", "openclaw", "clawdbot", "browser", "type", textbox_ref, comment_text])
    time.sleep(2)

    # Find and click the post/submit button for the comment
    snapshot = get_snapshot()
    # LinkedIn comment submit button
    submit_match = re.search(r'button "Post"[^[]*\[ref=(e\d+)\]', snapshot)
    if not submit_match:
        submit_match = re.search(r'button "Submit"[^[]*\[ref=(e\d+)\]', snapshot)
    if not submit_match:
        submit_match = re.search(r'button "Comment"[^[]*\[ref=(e\d+)\]', snapshot)
    if not submit_match:
        # Try looking for a send/post button near the textbox
        submit_match = re.search(r'button[^[]*post[^[]*\[ref=(e\d+)\]', snapshot, re.IGNORECASE)

    if not submit_match:
        log("  ERROR: Comment submit button not found")
        return False

    run_cmd(f'docker exec openclaw clawdbot browser click {submit_match.group(1)}')
    time.sleep(3)

    log("  Comment posted successfully!")
    return True

def engage_with_feed():
    """Browse LinkedIn feed and engage with healthcare professional posts.

    For every relevant healthcare post found:
    - LIKE it (builds visibility, low effort)
    - COMMENT on the best ones (deeper engagement)
    """
    knowledge_base = load_knowledge_base()
    commented_posts = get_commented_posts()
    liked_posts = get_liked_posts()
    messaged_names = set()
    if os.path.exists(MESSAGED_FILE):
        with open(MESSAGED_FILE) as f:
            messaged_names = set(line.split("|")[0].strip() for line in f if line.strip())

    comments_today = 0
    likes_today = get_likes_today()
    query_index = 0

    while (comments_today < MAX_COMMENTS_PER_DAY or likes_today < MAX_LIKES_PER_DAY) and query_index < len(SEARCH_QUERIES):
        query = SEARCH_QUERIES[query_index]
        query_index += 1

        # Acquire browser lock for search + scroll + snapshot + like/comment
        with BrowserLock("post_engager"):
            search_for_posts(query)
            time.sleep(3)

            # Scroll a few times to load posts
            for _ in range(3):
                scroll_page()

            snapshot = get_snapshot()
            posts = find_posts_in_snapshot(snapshot)
            log(f"Found {len(posts)} posts for query: {query}")

            for post in posts:
                if comments_today >= MAX_COMMENTS_PER_DAY and likes_today >= MAX_LIKES_PER_DAY:
                    break

                # STRICT CHECK: Verify author is a healthcare professional
                is_hcp, keyword = is_healthcare_professional(post["author_line"], post["post_text"][:500])
                if not is_hcp:
                    continue

                # Check if post topic is relevant
                is_relevant, topics = is_relevant_post(post["post_text"])
                if not is_relevant:
                    continue

                log(f"  RELEVANT POST by {post['author_name']} (topics: {', '.join(topics[:3])})")

                # --- LIKE the post (always, if not already liked) ---
                if post["like_ref"] and post["post_id"] not in liked_posts and likes_today < MAX_LIKES_PER_DAY:
                    like_post(post["like_ref"])
                    record_liked_post(post["post_id"], post["author_name"])
                    liked_posts.add(post["post_id"])
                    likes_today += 1
                    log(f"  LIKED post by {post['author_name']} ({likes_today}/{MAX_LIKES_PER_DAY})")
                    time.sleep(WAIT_BETWEEN_LIKES)

                # --- COMMENT on the post (if we haven't hit limit) ---
                if comments_today < MAX_COMMENTS_PER_DAY and post.get("comment_ref"):
                    if post["post_id"] in commented_posts:
                        continue

                    comment = generate_comment(post["author_name"], post["post_text"], knowledge_base)
                    if not comment:
                        log(f"  ERROR: Failed to generate comment for {post['author_name']}")
                        continue

                    log(f"  Comment: {comment[:100]}...")

                    if post_comment(post["comment_ref"], comment):
                        record_commented_post(post["post_id"], post["author_name"], comment)
                        save_engaged_profile(
                            post["author_name"],
                            post["username"],
                            comment_count=1
                        )
                        comments_today += 1
                        log(f"  Comments today: {comments_today}/{MAX_COMMENTS_PER_DAY}")
                    else:
                        log(f"  Failed to post comment on {post['author_name']}'s post")

        # Browser lock released — wait between comment cycles (other modules can use browser)
        if comments_today < MAX_COMMENTS_PER_DAY and query_index < len(SEARCH_QUERIES):
            log(f"  Waiting {WAIT_BETWEEN_COMMENTS // 60} minutes before next search...")
            time.sleep(WAIT_BETWEEN_COMMENTS)

    return comments_today, likes_today


def browse_and_like_feed():
    """Scroll through LinkedIn home feed and like relevant healthcare posts.

    This makes the account look naturally active and increases visibility
    with healthcare professionals in the network.
    """
    liked_posts = get_liked_posts()
    likes_today = get_likes_today()
    likes_this_session = 0

    if likes_today >= MAX_LIKES_PER_DAY:
        log("Already hit daily like limit, skipping feed browse")
        return 0

    log("Browsing home feed for posts to like...")

    with BrowserLock("post_engager_feed"):
        run_cmd('docker exec openclaw clawdbot browser navigate "https://www.linkedin.com/feed/"')
        time.sleep(5)

        # Scroll through feed multiple times to load posts
        for scroll_round in range(5):
            if likes_today + likes_this_session >= MAX_LIKES_PER_DAY:
                break

            for _ in range(3):
                scroll_page()

            snapshot = get_snapshot()

            # Find all Like buttons in the feed
            lines = snapshot.split("\n")
            for i, line in enumerate(lines):
                if likes_today + likes_this_session >= MAX_LIKES_PER_DAY:
                    break

                # Find Like buttons (not already liked)
                like_match = re.search(r'button "(?:Like|React Like)[^"]*" \[ref=(e\d+)\]', line)
                if not like_match:
                    continue

                like_ref = like_match.group(1)

                # Check surrounding lines for healthcare relevance
                start = max(0, i - 20)
                end = min(len(lines), i + 5)
                context = "\n".join(lines[start:end]).lower()

                # Must be from a healthcare professional or about a relevant topic
                is_hcp = any(kw in context for kw in HEALTHCARE_TITLES)
                is_relevant = any(topic in context for topic in RELEVANT_TOPICS)

                if not (is_hcp or is_relevant):
                    continue

                # Extract a post ID to avoid re-liking
                post_id = None
                for j in range(start, end):
                    id_match = re.search(r'urn:li:activity:(\d+)', lines[j])
                    if id_match:
                        post_id = id_match.group(1)
                        break
                if not post_id:
                    post_id = f"feed_{hash(context[:100]) % 100000}"

                if post_id in liked_posts:
                    continue

                # Like it
                like_post(like_ref)
                record_liked_post(post_id, "feed_post")
                liked_posts.add(post_id)
                likes_this_session += 1
                log(f"  LIKED feed post ({likes_today + likes_this_session}/{MAX_LIKES_PER_DAY})")
                time.sleep(WAIT_BETWEEN_LIKES)

    log(f"Feed browsing done: liked {likes_this_session} posts")
    return likes_this_session


def check_engagement_followups():
    """Check if any engaged profiles are ready for a DM follow-up."""
    engaged = get_engaged_profiles()
    messaged_names = set()
    if os.path.exists(MESSAGED_FILE):
        with open(MESSAGED_FILE) as f:
            messaged_names = set(line.split("|")[0].strip() for line in f if line.strip())

    followups = []
    for name, data in engaged.items():
        if data["dm_sent"]:
            continue
        if name in messaged_names:
            continue

        # Check if enough days have passed since first engagement
        try:
            first_engaged = datetime.strptime(data["first_engaged"].split(".")[0], "%Y-%m-%d %H:%M:%S")
            days_since = (datetime.now() - first_engaged).days
            if days_since >= DAYS_BEFORE_DM:
                followups.append({"name": name, "username": data["username"], "days": days_since})
        except (ValueError, KeyError):
            continue

    return followups

def send_followup_dm(name, username, knowledge_base):
    """Send a follow-up DM to someone we've engaged with via comments."""
    first_name = name.split()[0]

    # Generate personalized DM based on prior engagement
    prompt = f"""You are writing a LinkedIn direct message to {name}, a healthcare professional.
You previously engaged with their posts by commenting. Now you want to introduce BioPosture's Doctor Network opportunity.

Write a short, warm DM (under 120 words) that:
1. References that you've enjoyed their posts/content
2. Briefly introduces BioPosture and the doctor network opportunity
3. Mentions the income potential (15,000 to 35,000 dollars/year passive income). Do NOT use the dollar sign symbol, spell out "dollars" instead.
4. Directs them to https://bioposture.com/doctor-registration/
5. Offers to connect them with irwinpearl@bioposture.com for more info
6. Is professional, not pushy

Address them as {first_name}.
Write ONLY the message, nothing else."""

    escaped = prompt.replace("'", "").replace('"', '').replace('\n', ' ')[:4000]
    result = run_cmd(f"docker exec openclaw clawdbot agent --message '{escaped}' --session-id followup_dm 2>/dev/null")

    dm_text = None
    for line in result.strip().split('\n'):
        line = line.strip().strip('"').strip("'")
        if line and not line.startswith('[') and not line.startswith('(') and len(line) > 20:
            dm_text = line
            break

    if not dm_text:
        dm_text = (
            f"Hi {first_name}, I've been enjoying your posts on LinkedIn! "
            f"I wanted to share something that might interest you — BioPosture works exclusively "
            f"with healthcare professionals like you. Our doctors earn 15,000 to 35,000 dollars in passive income "
            f"recommending our FDA-classified infrared mattresses to patients. "
            f"Learn more at https://bioposture.com/doctor-registration/ "
            f"or email irwinpearl@bioposture.com for details!"
        )

    # Navigate to messaging
    messaging_url = f"https://www.linkedin.com/messaging/thread/new/?recipient={username}"
    log(f"Sending follow-up DM to {name}...")
    run_cmd(f'docker exec openclaw clawdbot browser navigate "{messaging_url}"')
    time.sleep(4)

    snapshot = get_snapshot()
    textbox_match = re.search(r'textbox "Write a message[^"]*" \[ref=(e\d+)\]', snapshot)
    if not textbox_match:
        log(f"ERROR: No textbox found for DM to {name}")
        return False

    textbox_ref = textbox_match.group(1)

    # Convert any literal \n sequences to actual newlines
    dm_text = dm_text.replace("\\n", "\n")

    # Type the DM paragraph by paragraph for proper line breaks
    paragraphs = dm_text.split("\n\n")
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
        log(f"ERROR: No send button found for DM to {name}")
        return False

    run_cmd(f'docker exec openclaw clawdbot browser click {send_match.group(1)}')
    time.sleep(2)

    # Record the DM
    save_engaged_profile(name, username, dm_sent=True)

    # Also add to messaged list so reply_handler can track responses
    with open(MESSAGED_FILE, "a") as f:
        f.write(f"{name}|{datetime.now()}\n")

    log(f"SUCCESS: Follow-up DM sent to {name}")
    return True

def main():
    log("=" * 60)
    log("Post Engager Started")
    log("=" * 60)

    knowledge_base = load_knowledge_base()

    while True:
        try:
            # Phase 1: Browse feed and like relevant posts
            log("--- Phase 1: Browsing feed for likes ---")
            feed_likes = browse_and_like_feed()
            log(f"Liked {feed_likes} posts from feed")

            # Phase 2: Search and engage with posts (like + comment)
            log("--- Phase 2: Searching and engaging with posts ---")
            comments, search_likes = engage_with_feed()
            log(f"Posted {comments} comments, liked {search_likes} posts from search")

            # Phase 3: Check for follow-up DM opportunities
            log("--- Phase 3: Checking follow-up DMs ---")
            followups = check_engagement_followups()
            log(f"Found {len(followups)} profiles ready for follow-up DM")

            for fu in followups:
                log(f"Follow-up DM candidate: {fu['name']} ({fu['days']} days since engagement)")
                with BrowserLock("post_engager_dm"):
                    send_followup_dm(fu["name"], fu["username"], knowledge_base)
                time.sleep(5 * 60)  # 5 min between DMs (lock released)

        except Exception as e:
            log(f"ERROR: {e}")

        # Wait before next cycle
        log("Post engagement cycle complete. Waiting 2 hours before next cycle...")
        time.sleep(2 * 60 * 60)

if __name__ == "__main__":
    main()
