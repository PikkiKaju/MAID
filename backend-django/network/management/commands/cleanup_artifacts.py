from __future__ import annotations

import os
from datetime import datetime, timedelta
from pathlib import Path

from django.core.management.base import BaseCommand
from django.conf import settings

from network.models import TrainingJob


class Command(BaseCommand):
    help = "Prune artifact files and stale job references older than configured retention days."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=getattr(settings, "ARTIFACT_RETENTION_DAYS", 30),
            help="Retention days for artifacts (default from settings).",
        )

    def handle(self, *args, **options):
        days = int(options.get("days", 30))
        cutoff = datetime.utcnow() - timedelta(days=days)
        artifacts_dir = Path(getattr(settings, "ARTIFACTS_DIR", settings.BASE_DIR / "artifacts"))
        self.stdout.write(f"Pruning artifacts older than {days} days (cutoff: {cutoff.isoformat()})")

        removed = 0
        # Walk artifacts directory and remove files older than cutoff
        for root, dirs, files in os.walk(artifacts_dir):
            for fn in files:
                p = Path(root) / fn
                try:
                    mtime = datetime.utcfromtimestamp(p.stat().st_mtime)
                    if mtime < cutoff:
                        p.unlink()
                        removed += 1
                        self.stdout.write(f"Removed: {p}")
                except Exception as exc:
                    self.stderr.write(f"Failed to remove {p}: {exc}")

        # Clear artifact_path references from TrainingJob rows whose files are missing
        jobs = TrainingJob.objects.exclude(artifact_path="").all()
        cleared = 0
        for j in jobs:
            try:
                if not j.artifact_path or not Path(j.artifact_path).exists():
                    j.artifact_path = ""
                    j.save(update_fields=["artifact_path", "updated_at"])
                    cleared += 1
            except Exception:
                pass

        self.stdout.write(f"Pruned {removed} files, cleared {cleared} job references")
