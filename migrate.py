# migrate.py
"""One-time migration from .txt tracking files to data/prospects.json."""
import os
import shutil
from datetime import datetime
from models import Prospect, save_prospects, load_prospects

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def migrate_messaged(filepath: str, prospects: dict) -> None:
    if not os.path.exists(filepath):
        return
    with open(filepath) as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) >= 2:
                name = parts[0].strip()
                key = name.lower()
                if key not in prospects:
                    prospects[key] = Prospect(name=name, username="")
                prospects[key].dm_sent_at = parts[1].strip()
                prospects[key].status = "dm_sent"


def migrate_warmup_pipeline(filepath: str, prospects: dict) -> None:
    if not os.path.exists(filepath):
        return
    with open(filepath) as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) >= 4:
                name = parts[0].strip()
                key = name.lower()
                if key not in prospects:
                    prospects[key] = Prospect(name=name, username=parts[1].strip())
                else:
                    if not prospects[key].username:
                        prospects[key].username = parts[1].strip()
                prospects[key].pipeline_stage = parts[2].strip()
                prospects[key].last_action_at = parts[3].strip()
                if len(parts) > 4:
                    prospects[key].added_at = parts[4].strip()


def migrate_conversations(filepath: str, prospects: dict) -> None:
    if not os.path.exists(filepath):
        return
    with open(filepath) as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) >= 3:
                key = parts[0].strip().lower()
                if key in prospects:
                    prospects[key].reply_count = int(parts[1])
                    prospects[key].reply_status = parts[2]
                    if len(parts) > 3:
                        prospects[key].last_reply_at = parts[3]
                    if len(parts) > 4:
                        prospects[key].followup_at = parts[4]


def migrate_followups(filepath: str, prospects: dict) -> None:
    if not os.path.exists(filepath):
        return
    with open(filepath) as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) >= 4:
                key = parts[0].strip().lower()
                if key in prospects:
                    prospects[key].followup_at = parts[1].strip()
                    if not prospects[key].username:
                        prospects[key].username = parts[2].strip()
                    prospects[key].followup_status = parts[3].strip()


def migrate_handoffs(filepath: str, prospects: dict) -> None:
    if not os.path.exists(filepath):
        return
    with open(filepath) as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) >= 3:
                key = parts[0].strip().lower()
                if key in prospects:
                    prospects[key].handoff_reason = parts[1].strip()
                    prospects[key].handoff_at = parts[2].strip()
                    prospects[key].status = "handed_off"


def migrate_prospects_found(filepath: str, prospects: dict) -> None:
    if not os.path.exists(filepath):
        return
    with open(filepath) as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) >= 4:
                name = parts[0].strip()
                key = name.lower()
                if key not in prospects:
                    prospects[key] = Prospect(name=name, username=parts[1].strip())
                prospects[key].headline = parts[2].strip()[:100]
                prospects[key].source_query = parts[3].strip()
                if len(parts) > 4:
                    prospects[key].added_at = parts[4].strip()
                prospects[key].source = "prospector"


def migrate_skipped(filepath: str, prospects: dict) -> None:
    if not os.path.exists(filepath):
        return
    with open(filepath) as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) >= 2:
                key = parts[0].strip().lower()
                if key not in prospects:
                    prospects[key] = Prospect(name=parts[0].strip(), username="")
                prospects[key].status = "closed"


def migrate_all(source_dir: str = None, output_path: str = None) -> dict:
    """Run full migration. Returns migrated prospects dict."""
    if source_dir is None:
        source_dir = BASE_DIR
    if output_path is None:
        output_path = os.path.join(BASE_DIR, "data", "prospects.json")

    prospects = {}

    migrate_warmup_pipeline(os.path.join(source_dir, "warmup_pipeline.txt"), prospects)
    migrate_prospects_found(os.path.join(source_dir, "prospects_found.txt"), prospects)
    migrate_messaged(os.path.join(source_dir, "messaged.txt"), prospects)
    migrate_skipped(os.path.join(source_dir, "skipped.txt"), prospects)
    migrate_conversations(os.path.join(source_dir, "conversations.txt"), prospects)
    migrate_followups(os.path.join(source_dir, "followups.txt"), prospects)
    migrate_handoffs(os.path.join(source_dir, "handoff.txt"), prospects)

    template_src = os.path.join(source_dir, "message-template.txt")
    template_dst = os.path.join(BASE_DIR, "templates", "variant_a.txt")
    if os.path.exists(template_src):
        os.makedirs(os.path.dirname(template_dst), exist_ok=True)
        shutil.copy2(template_src, template_dst)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    username_keyed = {}
    for key, p in prospects.items():
        ukey = p.username if p.username else key
        username_keyed[ukey] = p
    save_prospects(username_keyed, output_path)

    print(f"Migration complete: {len(username_keyed)} prospects saved to {output_path}")
    return username_keyed


if __name__ == "__main__":
    migrate_all()
