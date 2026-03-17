# tests/test_ab_testing.py
import os
import json
import tempfile
from ab_testing import ABTester

def test_assign_variant_returns_dict():
    with tempfile.TemporaryDirectory() as tmpdir:
        os.makedirs(os.path.join(tmpdir, "templates", "opener_prompts"))
        for v in ["variant_a.txt", "variant_b.txt"]:
            with open(os.path.join(tmpdir, "templates", v), "w") as f:
                f.write(f"Template {v}")
        for p in ["prompt_a.txt", "prompt_b.txt"]:
            with open(os.path.join(tmpdir, "templates", "opener_prompts", p), "w") as f:
                f.write(f"Prompt {p}")

        tester = ABTester(templates_dir=os.path.join(tmpdir, "templates"), data_dir=tmpdir)
        result = tester.assign_variant("dr-smith")
        assert "template" in result
        assert "opener_prompt" in result

def test_record_and_evaluate():
    with tempfile.TemporaryDirectory() as tmpdir:
        tester = ABTester(templates_dir=tmpdir, data_dir=tmpdir)
        tester._stats = {"variant_a.txt": {"sent": 0, "replied": 0}}
        tester.record_outcome("variant_a.txt", replied=True)
        tester.record_outcome("variant_a.txt", replied=False)
        stats = tester.get_stats()
        assert stats["variant_a.txt"]["sent"] == 2
        assert stats["variant_a.txt"]["replied"] == 1
