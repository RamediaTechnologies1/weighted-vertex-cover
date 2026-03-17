# task_executor.py
"""Executes browser tasks by dispatching to action functions."""
import os
import re
import time
import tempfile
from datetime import datetime
from models import Task, TaskResult, Prospect
from browser import Browser, AIAgent
from healthcare import is_healthcare_professional
from scoring import compute_engagement_score
from config import WARMUP_STAGES, HUMAN_TEAM, TEMPLATES_DIR, KNOWLEDGE_FILE, BASE_DIR
from reengage import REENGAGE_TEMPLATES


class TaskExecutor:
    def __init__(self, prospects: dict, analytics, notifier, ab_tester, browser=None, ai_agent=None):
        self._browser = browser or Browser()
        self._ai = ai_agent or AIAgent()
        self._prospects = prospects
        self._analytics = analytics
        self._notifier = notifier
        self._ab_tester = ab_tester

    def run(self, task: Task) -> TaskResult:
        """Dispatch task to the appropriate action function."""
        action_map = {
            "check_inbox": self._check_inbox,
            "view_profile": self._view_profile,
            "like_posts": self._like_posts,
            "endorse_skills": self._endorse_skills,
            "comment_post": self._comment_post,
            "connect_request": self._connect_request,
            "wait_accept": self._wait_accept,
            "send_dm": self._send_dm,
            "send_followup": self._send_followup,
            "search_prospects": self._search_prospects,
            "engage_post": self._engage_post,
            "engage_group": self._engage_group,
            "post_content": self._post_content,
            "reengage_content": self._reengage_content,
            "reengage_dm": self._reengage_dm,
        }
        action_fn = action_map.get(task.action_type)
        if not action_fn:
            return TaskResult.SKIPPED
        try:
            return action_fn(task)
        except Exception as e:
            print(f"[EXECUTOR] Error in {task.action_type}: {e}")
            return TaskResult.ERROR

    def _view_profile(self, task: Task) -> TaskResult:
        username = task.prospect_username
        url = f"https://www.linkedin.com/in/{username}/"
        self._browser.navigate(url)
        for _ in range(3):
            self._browser.scroll()
        snapshot = self._browser.snapshot()
        if username in snapshot or task.prospect_name.split()[0] in snapshot:
            return TaskResult.SUCCESS
        return TaskResult.SUCCESS

    def _like_posts(self, task: Task) -> TaskResult:
        username = task.prospect_username
        url = f"https://www.linkedin.com/in/{username}/recent-activity/all/"
        self._browser.navigate(url)
        for _ in range(2):
            self._browser.scroll()
        snapshot = self._browser.snapshot()
        like_refs = self._browser.find_all_elements(r'button "(?:Like|React Like)[^"]*" \[ref=(e\d+)\]', snapshot)
        if not like_refs:
            like_refs = self._browser.find_all_elements(r'button[^[]*[Ll]ike[^[]*\[ref=(e\d+)\]', snapshot)
        for ref in like_refs[:2]:
            self._browser.click(ref, wait=3)
        return TaskResult.SUCCESS

    def _endorse_skills(self, task: Task) -> TaskResult:
        username = task.prospect_username
        url = f"https://www.linkedin.com/in/{username}/"
        self._browser.navigate(url)
        for _ in range(5):
            self._browser.scroll()
        snapshot = self._browser.snapshot()
        endorse_refs = self._browser.find_all_elements(r'button "Endorse ([^"]+)" \[ref=(e\d+)\]', snapshot)
        if not endorse_refs:
            endorse_refs = self._browser.find_all_elements(r'button[^[]*[Ee]ndorse[^[]*\[ref=(e\d+)\]', snapshot)
        for match in endorse_refs[:2]:
            ref = match[-1] if isinstance(match, tuple) else match
            self._browser.click(ref, wait=3)
        return TaskResult.SUCCESS

    def _comment_post(self, task: Task) -> TaskResult:
        username = task.prospect_username
        name = task.prospect_name
        url = f"https://www.linkedin.com/in/{username}/recent-activity/all/"
        self._browser.navigate(url)
        for _ in range(2):
            self._browser.scroll()
        snapshot = self._browser.snapshot()
        comment_ref = self._browser.find_element(r'button "Comment[^"]*" \[ref=(e\d+)\]', snapshot)
        if not comment_ref:
            return TaskResult.SUCCESS
        prompt = f"Write a short, genuine LinkedIn comment (2-3 sentences, under 60 words) on a post by {name}, a healthcare professional. Post context: {snapshot[:2000]}. Rules: Be genuinely insightful. Sound like a real person. DO NOT pitch any products. Write ONLY the comment."
        comment = self._ai.generate(prompt, session_id="warmup_comment")
        if not comment or len(comment) < 15:
            first_name = name.split()[0]
            comment = f"Great perspective, {first_name}! This really resonates with what we're seeing in the wellness space. Keep sharing insights like this!"
        self._browser.click(comment_ref, wait=3)
        snapshot = self._browser.snapshot()
        textbox_ref = self._browser.find_element(r'textbox[^[]*\[ref=(e\d+)\]', snapshot)
        if not textbox_ref:
            return TaskResult.ELEMENT_NOT_FOUND
        self._browser.type_text(textbox_ref, comment)
        snapshot = self._browser.snapshot()
        submit_ref = self._browser.find_element(r'button "(?:Post|Submit|Comment)"[^[]*\[ref=(e\d+)\]', snapshot)
        if submit_ref:
            self._browser.click(submit_ref, wait=3)
            return TaskResult.SUCCESS
        return TaskResult.ELEMENT_NOT_FOUND

    def _connect_request(self, task: Task) -> TaskResult:
        username = task.prospect_username
        name = task.prospect_name
        url = f"https://www.linkedin.com/in/{username}/"
        self._browser.navigate(url)
        snapshot = self._browser.snapshot()
        if "Message" in snapshot and "Connect" not in snapshot:
            return TaskResult.SUCCESS
        connect_ref = self._browser.find_element(r'button "Connect[^"]*" \[ref=(e\d+)\]', snapshot)
        if not connect_ref:
            more_ref = self._browser.find_element(r'button "More[^"]*" \[ref=(e\d+)\]', snapshot)
            if more_ref:
                self._browser.click(more_ref)
                snapshot = self._browser.snapshot()
                connect_ref = self._browser.find_element(r'button "Connect[^"]*" \[ref=(e\d+)\]', snapshot)
        if not connect_ref:
            return TaskResult.ELEMENT_NOT_FOUND
        self._browser.click(connect_ref, wait=3)
        snapshot = self._browser.snapshot()
        note_ref = self._browser.find_element(r'button "Add a note[^"]*" \[ref=(e\d+)\]', snapshot)
        if note_ref:
            self._browser.click(note_ref)
            snapshot = self._browser.snapshot()
            first_name = name.split()[0]
            note = f"Hi {first_name}, I've been following your work in healthcare and would love to connect! I work with Sleep BioLogics, helping healthcare professionals improve patient outcomes through clinically-proven sleep solutions. Looking forward to connecting!"
            note_textbox = self._browser.find_element(r'textbox[^[]*\[ref=(e\d+)\]', snapshot)
            if note_textbox:
                self._browser.type_text(note_textbox, note)
        snapshot = self._browser.snapshot()
        send_ref = self._browser.find_element(r'button "Send[^"]*" \[ref=(e\d+)\]', snapshot)
        if send_ref:
            self._browser.click(send_ref, wait=3)
            return TaskResult.SUCCESS
        return TaskResult.ELEMENT_NOT_FOUND

    def _wait_accept(self, task: Task) -> TaskResult:
        username = task.prospect_username
        url = f"https://www.linkedin.com/in/{username}/"
        self._browser.navigate(url)
        snapshot = self._browser.snapshot()
        if self._browser.find_element(r'button "Message[^"]*" \[ref=(e\d+)\]', snapshot):
            return TaskResult.SUCCESS
        if "pending" in snapshot.lower():
            return TaskResult.SKIPPED
        return TaskResult.SKIPPED

    def _send_dm(self, task: Task) -> TaskResult:
        username = task.prospect_username
        name = task.prospect_name
        first_name = name.split()[0]
        variant_info = task.metadata.get("variant_info", {})
        template_file = variant_info.get("template", "variant_a.txt")
        template_path = os.path.join(TEMPLATES_DIR, template_file)
        if os.path.exists(template_path):
            with open(template_path) as f:
                template = f.read().strip()
        else:
            fallback = os.path.join(BASE_DIR, "message-template.txt")
            with open(fallback) as f:
                template = f.read().strip()
        prompt = f"You are looking at {name}'s LinkedIn profile. They are a healthcare professional. Write ONE short personalized opening sentence (max 20 words). Focus on something specific about THEM. Their first name is {first_name}. Just write the single sentence."
        opener = self._ai.generate(prompt, session_id="personalize")
        if not opener:
            opener = f"Hi {first_name}, I came across your profile and your work in healthcare caught my attention."
        body = template.replace("{{NAME}}", first_name)
        full_message = opener + "\n\n" + body
        msg_url = f"https://www.linkedin.com/messaging/thread/new/?recipient={username}"
        self._browser.navigate(msg_url, wait=4)
        snapshot = self._browser.snapshot()
        textbox_ref = self._browser.find_element(r'textbox "Write a message[^"]*" \[ref=(e\d+)\]', snapshot)
        if not textbox_ref:
            return TaskResult.ELEMENT_NOT_FOUND
        self._browser.click(textbox_ref, wait=0.5)
        lines = full_message.replace("\\n", "\n").split("\n")
        if lines:
            self._browser.type_text(textbox_ref, lines[0])
        for line in lines[1:]:
            self._browser.press("Shift+Enter")
            if line.strip():
                self._browser.insert_text(textbox_ref, line.strip())
        time.sleep(2)
        snapshot = self._browser.snapshot()
        send_ref = self._browser.find_element(r'button "Send" \[ref=(e\d+)\]', snapshot)
        if not send_ref:
            return TaskResult.ELEMENT_NOT_FOUND
        self._browser.click(send_ref)
        return TaskResult.SUCCESS

    def _send_followup(self, task: Task) -> TaskResult:
        username = task.prospect_username
        name = task.prospect_name
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
        msg_url = f"https://www.linkedin.com/messaging/thread/new/?recipient={username}"
        self._browser.navigate(msg_url, wait=4)
        snapshot = self._browser.snapshot()
        textbox_ref = self._browser.find_element(r'textbox "Write a message[^"]*" \[ref=(e\d+)\]', snapshot)
        if not textbox_ref:
            return TaskResult.ELEMENT_NOT_FOUND
        self._browser.type_text(textbox_ref, followup_msg)
        time.sleep(2)
        snapshot = self._browser.snapshot()
        send_ref = self._browser.find_element(r'button "Send" \[ref=(e\d+)\]', snapshot)
        if send_ref:
            self._browser.click(send_ref)
            return TaskResult.SUCCESS
        return TaskResult.ELEMENT_NOT_FOUND

    def _check_inbox(self, task: Task) -> TaskResult:
        self._browser.navigate("https://www.linkedin.com/messaging/")
        snapshot = self._browser.snapshot()
        task.metadata["inbox_snapshot"] = snapshot
        return TaskResult.SUCCESS

    def _search_prospects(self, task: Task) -> TaskResult:
        query = task.metadata.get("query", "chiropractor")
        encoded = query.replace(" ", "%20")
        url = f"https://www.linkedin.com/search/results/people/?keywords={encoded}"
        self._browser.navigate(url)
        for _ in range(3):
            self._browser.scroll()
        snapshot = self._browser.snapshot()
        task.metadata["search_snapshot"] = snapshot
        return TaskResult.SUCCESS

    def _engage_post(self, task: Task) -> TaskResult:
        query = task.metadata.get("query", "chiropractic health")
        encoded = query.replace(" ", "%20")
        url = f"https://www.linkedin.com/search/results/content/?keywords={encoded}"
        self._browser.navigate(url)
        for _ in range(2):
            self._browser.scroll()
        snapshot = self._browser.snapshot()
        like_refs = self._browser.find_all_elements(r'button "(?:Like|React Like)[^"]*" \[ref=(e\d+)\]', snapshot)
        for ref in like_refs[:3]:
            self._browser.click(ref, wait=3)
        return TaskResult.SUCCESS

    def _engage_group(self, task: Task) -> TaskResult:
        group_url = task.metadata.get("group_url", "")
        if not group_url:
            return TaskResult.SKIPPED
        self._browser.navigate(group_url)
        for _ in range(2):
            self._browser.scroll()
        snapshot = self._browser.snapshot()
        comment_ref = self._browser.find_element(r'button "Comment[^"]*" \[ref=(e\d+)\]', snapshot)
        if comment_ref:
            prompt = "Write a short, professional LinkedIn comment (2 sentences) on a healthcare group post. Be insightful about patient care or wellness. DO NOT pitch products. Write ONLY the comment."
            comment = self._ai.generate(prompt, session_id="group_comment")
            if comment and len(comment) > 15:
                self._browser.click(comment_ref, wait=3)
                snapshot = self._browser.snapshot()
                textbox_ref = self._browser.find_element(r'textbox[^[]*\[ref=(e\d+)\]', snapshot)
                if textbox_ref:
                    self._browser.type_text(textbox_ref, comment)
                    snapshot = self._browser.snapshot()
                    submit_ref = self._browser.find_element(r'button "(?:Post|Submit|Comment)"[^[]*\[ref=(e\d+)\]', snapshot)
                    if submit_ref:
                        self._browser.click(submit_ref, wait=3)
        return TaskResult.SUCCESS

    def _post_content(self, task: Task) -> TaskResult:
        theme = task.metadata.get("theme", "Sleep health tips for healthcare professionals")
        knowledge = ""
        if os.path.exists(KNOWLEDGE_FILE):
            with open(KNOWLEDGE_FILE) as f:
                knowledge = f.read()[:2000]
        prompt = f"Write a LinkedIn post (150-250 words) about: {theme}. Context about BioPosture: {knowledge[:1000]}. Rules: Professional tone. Include a call to engage (ask a question). Use line breaks. Do NOT use hashtags excessively (max 3). Write ONLY the post text."
        post_text = self._ai.generate(prompt, session_id="content_post")
        if not post_text or len(post_text) < 50:
            return TaskResult.FAILED
        self._browser.navigate("https://www.linkedin.com/feed/")
        snapshot = self._browser.snapshot()
        start_post_ref = self._browser.find_element(r'button "Start a post[^"]*" \[ref=(e\d+)\]', snapshot)
        if not start_post_ref:
            return TaskResult.ELEMENT_NOT_FOUND
        self._browser.click(start_post_ref, wait=3)
        snapshot = self._browser.snapshot()
        textbox_ref = self._browser.find_element(r'textbox[^[]*\[ref=(e\d+)\]', snapshot)
        if not textbox_ref:
            return TaskResult.ELEMENT_NOT_FOUND
        self._browser.type_text(textbox_ref, post_text)
        time.sleep(2)
        snapshot = self._browser.snapshot()
        post_ref = self._browser.find_element(r'button "Post"[^[]*\[ref=(e\d+)\]', snapshot)
        if post_ref:
            self._browser.click(post_ref, wait=3)
            return TaskResult.SUCCESS
        return TaskResult.ELEMENT_NOT_FOUND

    def _reengage_content(self, task: Task) -> TaskResult:
        """Re-engagement stage 1: engage with their content (no DM)."""
        return self._like_posts(task)

    def _reengage_dm(self, task: Task) -> TaskResult:
        """Re-engagement stages 2-4: send a re-engagement message."""
        username = task.prospect_username
        name = task.prospect_name
        first_name = name.split()[0]
        template_key = task.metadata.get("template_key", "soft_followup")
        template = REENGAGE_TEMPLATES.get(template_key, REENGAGE_TEMPLATES["soft_followup"])
        message = template.format(first_name=first_name, specialty="healthcare")
        msg_url = f"https://www.linkedin.com/messaging/thread/new/?recipient={username}"
        self._browser.navigate(msg_url, wait=4)
        snapshot = self._browser.snapshot()
        textbox_ref = self._browser.find_element(r'textbox "Write a message[^"]*" \[ref=(e\d+)\]', snapshot)
        if not textbox_ref:
            return TaskResult.ELEMENT_NOT_FOUND
        self._browser.type_text(textbox_ref, message)
        time.sleep(2)
        snapshot = self._browser.snapshot()
        send_ref = self._browser.find_element(r'button "Send" \[ref=(e\d+)\]', snapshot)
        if send_ref:
            self._browser.click(send_ref)
            return TaskResult.SUCCESS
        return TaskResult.ELEMENT_NOT_FOUND
