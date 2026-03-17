# scoring.py
"""Engagement scoring for prospects."""
import re


def compute_engagement_score(profile_snapshot: str, name: str, engagement_history: dict) -> int:
    """Compute engagement score (0-100) from profile signals."""
    score = 0
    text = profile_snapshot.lower()

    # Practice owner / clinic director (+25)
    owner_keywords = ["owner", "director", "founder", "president", "ceo"]
    if any(kw in text for kw in owner_keywords):
        score += 25

    # Active poster (+20)
    if "posted" in text or "published" in text or "shared" in text:
        score += 20

    # 2nd-degree connection (+15)
    if "2nd" in text:
        score += 15

    # Engaged with our content (+20)
    if name in engagement_history:
        score += 20

    # 500+ connections (+10)
    conn_match = re.search(r'([\d,]+)\s*connections', text)
    if conn_match:
        count = int(conn_match.group(1).replace(",", ""))
        if count >= 500:
            score += 10

    # High-value specialty (+10)
    specialties = ["chiropract", "orthopedic", "sports medicine", "physical therap", "spine"]
    if any(s in text for s in specialties):
        score += 10

    return min(score, 100)


def classify_prospect(profile_snapshot: str, name: str, engagement_history: dict) -> str:
    """Classify prospect for fast-track warmup.
    Returns: 'already_connected', 'second_degree', 'engaged', or 'cold'."""
    if re.search(r'button "Message', profile_snapshot) and "Connect" not in profile_snapshot:
        return "already_connected"
    if "2nd" in profile_snapshot:
        return "second_degree"
    if name in engagement_history:
        return "engaged"
    return "cold"
