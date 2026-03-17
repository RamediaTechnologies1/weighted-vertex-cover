# tests/test_migrate.py
import os
import tempfile
from migrate import migrate_messaged, migrate_warmup_pipeline, migrate_all
from models import load_prospects

def test_migrate_messaged():
    with tempfile.TemporaryDirectory() as tmpdir:
        messaged = os.path.join(tmpdir, "messaged.txt")
        with open(messaged, "w") as f:
            f.write("Dr. Smith|2026-03-01 10:00:00\n")
            f.write("Jane DC|2026-03-02 14:30:00\n")
        prospects = {}
        migrate_messaged(messaged, prospects)
        assert len(prospects) == 2
        assert prospects["dr. smith"].dm_sent_at == "2026-03-01 10:00:00"
        assert prospects["jane dc"].status == "dm_sent"

def test_migrate_warmup_pipeline():
    with tempfile.TemporaryDirectory() as tmpdir:
        pipeline = os.path.join(tmpdir, "warmup_pipeline.txt")
        with open(pipeline, "w") as f:
            f.write("Dr. Jones|dr-jones|like_posts|2026-03-10 09:00:00|2026-03-08 09:00:00\n")
        prospects = {}
        migrate_warmup_pipeline(pipeline, prospects)
        assert "dr. jones" in prospects
        assert prospects["dr. jones"].username == "dr-jones"
        assert prospects["dr. jones"].pipeline_stage == "like_posts"
