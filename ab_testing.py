# ab_testing.py
"""A/B testing for message templates and opener prompts."""
import os
import json
import random
from datetime import datetime


class ABTester:
    def __init__(self, templates_dir: str, data_dir: str):
        self._templates_dir = templates_dir
        self._stats_file = os.path.join(data_dir, "templates_stats.json")
        self._stats = self._load_stats()

    def assign_variant(self, prospect_username: str) -> dict:
        """Randomly assign template and opener prompt variants."""
        templates = [f for f in os.listdir(self._templates_dir)
                     if f.startswith("variant_") and f.endswith(".txt")]
        prompts_dir = os.path.join(self._templates_dir, "opener_prompts")
        prompts = []
        if os.path.isdir(prompts_dir):
            prompts = [f for f in os.listdir(prompts_dir) if f.endswith(".txt")]

        template = random.choice(templates) if templates else "variant_a.txt"
        prompt = random.choice(prompts) if prompts else "prompt_a.txt"

        if template not in self._stats:
            self._stats[template] = {"sent": 0, "replied": 0}

        return {"template": template, "opener_prompt": prompt}

    def record_outcome(self, template_name: str, replied: bool) -> None:
        """Record whether a prospect replied for a given template variant."""
        if template_name not in self._stats:
            self._stats[template_name] = {"sent": 0, "replied": 0}
        self._stats[template_name]["sent"] += 1
        if replied:
            self._stats[template_name]["replied"] += 1
        self._save_stats()

    def get_stats(self) -> dict:
        return dict(self._stats)

    def evaluate_variants(self) -> dict:
        """Return reply rates per variant."""
        results = {}
        for variant, data in self._stats.items():
            sent = data["sent"]
            replied = data["replied"]
            rate = replied / sent if sent > 0 else 0
            results[variant] = {"sent": sent, "replied": replied, "reply_rate": round(rate, 3)}
        return results

    def _load_stats(self) -> dict:
        if os.path.exists(self._stats_file):
            with open(self._stats_file) as f:
                return json.load(f)
        return {}

    def _save_stats(self) -> None:
        os.makedirs(os.path.dirname(self._stats_file), exist_ok=True)
        with open(self._stats_file, "w") as f:
            json.dump(self._stats, f, indent=2)
