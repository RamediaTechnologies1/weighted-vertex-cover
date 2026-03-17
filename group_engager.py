#!/usr/bin/env python3
"""
Group Engager - Joins and engages in LinkedIn chiropractic/healthcare groups.

Strategy:
- Search for and join relevant chiropractic and healthcare LinkedIn groups
- Monitor group posts for engagement opportunities
- Comment on group posts with valuable, relevant insights
- Build visibility among chiropractors who are active in groups
- Track engaged group members for future warmup pipeline inclusion

Groups give access to non-connections — commenting in groups gets your
name/profile visible to chiropractors you're not connected with.
"""
import subprocess
import time
import re
import os
from datetime import datetime
from shared_lock import BrowserLock, safe_append, safe_read_lines, safe_write

LOG_FILE = os.path.expanduser("~/openclaw/linkedin-agent/group.log")
JOINED_GROUPS_FILE = os.path.expanduser("~/openclaw/linkedin-agent/joined_groups.txt")
GROUP_COMMENTS_FILE = os.path.expanduser("~/openclaw/linkedin-agent/group_comments.txt")
PIPELINE_FILE = os.path.expanduser("~/openclaw/linkedin-agent/warmup_pipeline.txt")
KNOWLEDGE_FILE = os.path.expanduser("~/openclaw/linkedin-agent/knowledge_base.txt")

MAX_COMMENTS_PER_SESSION = 8
WAIT_BETWEEN_COMMENTS = 5 * 60  # 5 minutes between comments

# Groups to search for and join
GROUP_SEARCH_QUERIES = [
    "chiropractor",
    "chiropractic practice",
    "chiropractic business",
    "chiropractors network",
    "physical therapy professionals",
    "healthcare practice growth",
    "integrative medicine",
    "sports medicine professionals",
    "functional medicine practitioners",
    "wellness professionals",
    "healthcare entrepreneurs",
    "sleep health professionals",
    "pain management professionals",
    "naturopathic medicine",
]

# Keywords that confirm a group is relevant
RELEVANT_GROUP_KEYWORDS = [
    'chiropract', 'physical therap', 'healthcare', 'medical',
    'wellness', 'pain', 'spine', 'orthop', 'sport medicine',
    'naturopath', 'integrative', 'functional medicine',
    'doctor', 'physician', 'practitioner', 'clinic',
    'rehabilitation', 'recovery', 'holistic',
]

HEALTHCARE_TITLES = [
    'dc', 'd.c.', 'chiropractor', 'chiropractic',
    'md', 'm.d.', 'doctor', 'dr.', 'physician',
    'dpt', 'd.p.t.', 'physical therapist',
    'do', 'd.o.', 'osteopath', 'nd', 'n.d.',
    'orthopedic', 'sports medicine', 'pain management',
    'wellness', 'clinic', 'practice',
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
    result = subprocess.run(args, capture_output=True, text=True)
    return result.stdout + result.stderr


def get_snapshot():
    return run_cmd('docker exec openclaw clawdbot browser snapshot --format text 2>/dev/null')


def scroll_page():
    run_cmd("docker exec openclaw clawdbot browser evaluate --fn '() => window.scrollBy(0, 800)'")
    time.sleep(1.5)


def get_joined_groups():
    """Load list of groups we've already joined."""
    groups = {}
    if not os.path.exists(JOINED_GROUPS_FILE):
        return groups
    with open(JOINED_GROUPS_FILE) as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) >= 2:
                groups[parts[0]] = {
                    "url": parts[1],
                    "joined_date": parts[2] if len(parts) > 2 else "",
                    "last_engaged": parts[3] if len(parts) > 3 else "",
                }
    return groups


def save_joined_group(group_name, url):
    groups = get_joined_groups()
    now = str(datetime.now())
    if group_name not in groups:
        with open(JOINED_GROUPS_FILE, "a") as f:
            f.write(f"{group_name}|{url}|{now}|{now}\n")


def update_group_engagement(group_name):
    """Update last engaged timestamp for a group."""
    groups = get_joined_groups()
    if group_name in groups:
        groups[group_name]["last_engaged"] = str(datetime.now())
        with open(JOINED_GROUPS_FILE, "w") as f:
            for name, data in groups.items():
                f.write(f"{name}|{data['url']}|{data.get('joined_date', '')}|{data.get('last_engaged', '')}\n")


def get_commented_in_groups():
    """Get set of post IDs we've already commented on in groups."""
    if not os.path.exists(GROUP_COMMENTS_FILE):
        return set()
    with open(GROUP_COMMENTS_FILE) as f:
        return set(line.split("|")[0].strip() for line in f if line.strip())


def record_group_comment(post_id, group_name, author_name, comment):
    with open(GROUP_COMMENTS_FILE, "a") as f:
        f.write(f"{post_id}|{group_name}|{author_name}|{comment[:100]}|{datetime.now()}\n")


def is_relevant_group(group_name):
    """Check if a group name suggests it's relevant to healthcare."""
    name_lower = group_name.lower()
    return any(kw in name_lower for kw in RELEVANT_GROUP_KEYWORDS)


def search_and_join_groups():
    """Search for relevant groups and request to join them."""
    joined = get_joined_groups()
    new_groups = 0

    for query in GROUP_SEARCH_QUERIES[:5]:  # Limit to 5 searches per session
        encoded = query.replace(" ", "%20")
        search_url = f"https://www.linkedin.com/search/results/groups/?keywords={encoded}"
        log(f"Searching groups: '{query}'")
        run_cmd(f'docker exec openclaw clawdbot browser navigate "{search_url}"')
        time.sleep(5)

        snapshot = get_snapshot()
        lines = snapshot.split("\n")

        for i, line in enumerate(lines):
            # Look for group names with join buttons
            group_match = re.search(r'link "([^"]+)" \[ref=(e\d+)\]', line)
            if group_match and "/groups/" in line:
                group_name = group_match.group(1)
                group_ref = group_match.group(2)

                if group_name in joined:
                    continue

                if not is_relevant_group(group_name):
                    continue

                # Look for Join button nearby
                for j in range(i, min(i + 5, len(lines))):
                    join_match = re.search(r'button "(?:Join|Request to join)[^"]*" \[ref=(e\d+)\]', lines[j])
                    if join_match:
                        log(f"  Requesting to join: {group_name}")
                        run_cmd(f'docker exec openclaw clawdbot browser click {join_match.group(1)}')
                        time.sleep(3)

                        # Extract URL
                        url_match = re.search(r'/groups/(\d+)/', line)
                        url = f"https://www.linkedin.com/groups/{url_match.group(1)}/" if url_match else ""
                        save_joined_group(group_name, url)
                        new_groups += 1
                        break

        time.sleep(WAIT_BETWEEN_COMMENTS)

    log(f"Requested to join {new_groups} new groups")
    return new_groups


def engage_in_group(group_name, group_url):
    """Visit a group and engage with posts."""
    knowledge_base = ""
    if os.path.exists(KNOWLEDGE_FILE):
        with open(KNOWLEDGE_FILE) as f:
            knowledge_base = f.read()

    commented_posts = get_commented_in_groups()
    comments_made = 0

    log(f"Engaging in group: {group_name}")
    run_cmd(f'docker exec openclaw clawdbot browser navigate "{group_url}"')
    time.sleep(5)

    # Scroll to load posts
    for _ in range(3):
        scroll_page()

    snapshot = get_snapshot()
    lines = snapshot.split("\n")

    # Find posts with comment buttons
    posts = []
    for i, line in enumerate(lines):
        comment_match = re.search(r'button "Comment[^"]*" \[ref=(e\d+)\]', line)
        if comment_match:
            # Gather context around the comment button
            start = max(0, i - 20)
            post_context = "\n".join(lines[start:i])

            # Find author name
            author_name = "Unknown"
            for j in range(start, i):
                author_match = re.search(r'link "([^"]+)" \[ref=', lines[j])
                if author_match and "/in/" in lines[j]:
                    author_name = author_match.group(1)
                    break

            # Get username
            username = ""
            for j in range(start, i):
                username_match = re.search(r'/in/([^/"\]]+)/', lines[j])
                if username_match:
                    username = username_match.group(1)
                    break

            post_id = f"grp_{group_name[:20]}_{hash(post_context[:100]) % 100000}"

            if post_id not in commented_posts:
                posts.append({
                    "author_name": author_name,
                    "username": username,
                    "post_context": post_context,
                    "comment_ref": comment_match.group(1),
                    "post_id": post_id,
                })

    log(f"  Found {len(posts)} uncommented posts in {group_name}")

    for post in posts[:3]:  # Max 3 comments per group per session
        author = post["author_name"]

        # Verify author is healthcare professional
        is_hcp = any(kw in author.lower() or kw in post["post_context"].lower()[:300]
                     for kw in HEALTHCARE_TITLES)

        if not is_hcp:
            continue

        # Generate comment
        first_name = author.split()[0] if author != "Unknown" else ""
        prompt = f"""Write a short LinkedIn group comment (2-3 sentences, under 60 words) on a post in the group "{group_name}".

Post by: {author}
Post context:
{post['post_context'][:1500]}

Rules:
1. Be genuinely insightful about the topic
2. Connect to sleep health, patient wellness, recovery, or practice growth if natural
3. Sound like an experienced professional in the healthcare/wellness space
4. DO NOT pitch products or include links
5. Be warm, professional, address by first name if known ({first_name})
6. Add value to the conversation

Write ONLY the comment."""

        escaped = prompt.replace("'", "").replace('"', '').replace('\n', ' ')[:4000]
        result = run_cmd(f"docker exec openclaw clawdbot agent --message '{escaped}' --session-id group_comment 2>/dev/null")

        comment = None
        for line in result.strip().split('\n'):
            line = line.strip().strip('"').strip("'")
            if line and not line.startswith('[') and not line.startswith('(') and 15 < len(line) < 400:
                comment = line
                break

        if not comment:
            continue

        log(f"  Commenting on {author}'s post: {comment[:80]}...")

        # Click comment button
        run_cmd(f'docker exec openclaw clawdbot browser click {post["comment_ref"]}')
        time.sleep(3)

        # Find and type in textbox
        snap = get_snapshot()
        textbox_match = re.search(r'textbox[^[]*\[ref=(e\d+)\]', snap)
        if not textbox_match:
            continue

        run_cmd_args(["docker", "exec", "openclaw", "clawdbot", "browser", "type", textbox_match.group(1), comment])
        time.sleep(2)

        # Submit
        snap = get_snapshot()
        submit_match = re.search(r'button "(?:Post|Submit|Comment)"[^[]*\[ref=(e\d+)\]', snap)
        if not submit_match:
            submit_match = re.search(r'button[^[]*[Pp]ost[^[]*\[ref=(e\d+)\]', snap)

        if submit_match:
            run_cmd(f'docker exec openclaw clawdbot browser click {submit_match.group(1)}')
            time.sleep(3)
            record_group_comment(post["post_id"], group_name, author, comment)
            comments_made += 1
            log(f"  Comment posted! ({comments_made} in this group)")

            # Add author to warmup pipeline if not already there
            if post["username"]:
                pipeline_names = set()
                if os.path.exists(PIPELINE_FILE):
                    with open(PIPELINE_FILE) as f:
                        pipeline_names = set(l.split("|")[0].strip().lower() for l in f if l.strip())

                if author.lower() not in pipeline_names:
                    with open(PIPELINE_FILE, "a") as f:
                        now = str(datetime.now())
                        # Start at like_posts stage since we already commented
                        f.write(f"{author}|{post['username']}|like_posts|{now}|{now}\n")
                    log(f"  Added {author} to warmup pipeline from group")

            time.sleep(WAIT_BETWEEN_COMMENTS)

    update_group_engagement(group_name)
    return comments_made


def engage_session():
    """Run one engagement session across all joined groups."""
    # First, try to join new groups if we have few
    joined = get_joined_groups()
    if len(joined) < 10:
        log("Searching for new groups to join...")
        with BrowserLock("group_engager"):
            search_and_join_groups()
        joined = get_joined_groups()  # Refresh

    if not joined:
        log("No groups joined yet, skipping engagement")
        return 0

    total_comments = 0

    # Engage with groups, prioritizing least recently engaged
    groups_sorted = sorted(
        joined.items(),
        key=lambda x: x[1].get("last_engaged", "2000-01-01")
    )

    for group_name, data in groups_sorted:
        if total_comments >= MAX_COMMENTS_PER_SESSION:
            break

        if not data.get("url"):
            continue

        try:
            with BrowserLock("group_engager"):
                comments = engage_in_group(group_name, data["url"])
            total_comments += comments
        except Exception as e:
            log(f"  ERROR in group {group_name}: {e}")

        time.sleep(30)  # Pause between groups (lock released)

    return total_comments


def main():
    log("=" * 60)
    log("Group Engager Started")
    log("=" * 60)

    while True:
        try:
            comments = engage_session()
            log(f"Session complete: {comments} group comments posted")
        except Exception as e:
            log(f"ERROR: {e}")

        # Run every 3 hours
        log("Next group engagement in 3 hours...")
        time.sleep(3 * 60 * 60)


if __name__ == "__main__":
    main()
