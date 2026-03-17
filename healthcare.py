"""Consolidated healthcare professional validation."""

HEALTHCARE_KEYWORDS = [
    'dc', 'd.c.', 'chiropractor', 'chiropractic',
    'md', 'm.d.', 'doctor', 'dr.', 'dr ',
    'physician', 'medical',
    'dpt', 'd.p.t.', 'physical therapist', 'physical therapy',
    'do', 'd.o.', 'osteopath',
    'nd', 'n.d.', 'naturopath', 'naturopathic',
    'dpm', 'podiatrist', 'nurse', 'np', 'rn',
    'orthopedic', 'spine', 'sports medicine',
    'rehabilitation', 'rehab', 'pain management',
    'acupuncture', 'massage therapist', 'lmt',
    'wellness', 'clinic', 'practice',
    'healthcare', 'health care',
    'functional medicine', 'integrative medicine',
    'pt,', 'dpt,', 'ms,', 'ccsp', 'dacbsp',
    'nurse practitioner', 'practice owner', 'wellness center',
    'consultant',
]


def is_healthcare_professional(text: str) -> tuple:
    """Check if text contains healthcare professional indicators.
    Returns (is_healthcare: bool, matching_keywords: list[str])."""
    text_lower = text.lower()
    matches = [kw for kw in HEALTHCARE_KEYWORDS if kw in text_lower]
    return len(matches) > 0, matches
