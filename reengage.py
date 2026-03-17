# reengage.py
"""Re-engagement campaign logic and message templates."""
from datetime import datetime, timedelta
from typing import Optional
from models import Prospect
from config import REENGAGE_STAGES

REENGAGE_TEMPLATES = {
    "soft_followup": "Hey {first_name}, hope you're having a great week! Just wanted to make sure my earlier message didn't get buried. No rush at all — happy to chat whenever works for you.",
    "value_add_dm": "Hi {first_name}, I came across some fascinating research on how infrared technology is helping healthcare practices improve patient outcomes — thought of you given your work in {specialty}. Happy to share more if you're curious.",
    "final_close": "Hi {first_name}, I don't want to be a bother! Just wanted to say the door's always open if BioPosture's doctor network ever interests you. Wishing you and your practice all the best.",
}


def get_reengage_action(prospect: Prospect) -> Optional[dict]:
    """Determine the next re-engagement action for a prospect, or None if not due."""
    if prospect.status != "dm_sent" or not prospect.dm_sent_at:
        return None

    try:
        dm_sent = datetime.fromisoformat(prospect.dm_sent_at)
    except ValueError:
        return None

    days_since_dm = (datetime.now() - dm_sent).days
    current_stage = prospect.reengage_stage

    if current_stage >= len(REENGAGE_STAGES):
        return None

    stage_config = REENGAGE_STAGES[current_stage]
    if days_since_dm >= stage_config["days_after_dm"]:
        return {
            "action": stage_config["action"],
            "priority": stage_config["priority"],
            "stage_index": current_stage,
        }

    return None
