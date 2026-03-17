# notifications.py
"""Email alerts and lead handoff recording."""
import subprocess
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from models import load_prospects, save_prospects


class Notifier:
    def __init__(self, notify_email: str, prospects_path: str):
        self._notify_email = notify_email
        self._prospects_path = prospects_path

    def send_lead_alert(self, prospect_name: str, category: str, conversation_summary: str) -> None:
        """Send email notification and record handoff."""
        subject, body = self._build_email(prospect_name, category, conversation_summary)
        self._send_email(subject, body)

    def record_handoff(self, prospect_username: str, reason: str) -> None:
        """Record handoff in prospect data."""
        prospects = load_prospects(self._prospects_path)
        if prospect_username in prospects:
            prospects[prospect_username].handoff_at = datetime.now().isoformat()
            prospects[prospect_username].handoff_reason = reason
            prospects[prospect_username].status = "handed_off"
            save_prospects(prospects, self._prospects_path)

    def _build_email(self, name: str, category: str, summary: str) -> tuple:
        subject = f"[BioPosture Lead] {name} - {category}"
        body = f"""New LinkedIn Lead Alert!

Prospect: {name}
Category: {category}
Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Conversation Summary:
{summary[:2000]}

---
Action Required: Please follow up with this prospect on LinkedIn.
LinkedIn Messaging: https://www.linkedin.com/messaging/
"""
        return subject, body

    def _send_email(self, subject: str, body: str) -> None:
        """Try system mail, then SMTP localhost fallback."""
        sent = False
        try:
            result = subprocess.run(
                ["mail", "-s", subject, self._notify_email],
                input=body, capture_output=True, text=True, timeout=10
            )
            sent = result.returncode == 0
        except Exception:
            pass
        if not sent:
            try:
                msg = MIMEMultipart()
                msg["From"] = "bioposture-bot@ramedia.dev"
                msg["To"] = self._notify_email
                msg["Subject"] = subject
                msg.attach(MIMEText(body, "plain"))
                with smtplib.SMTP("localhost", 25, timeout=5) as server:
                    server.send_message(msg)
            except Exception:
                pass
