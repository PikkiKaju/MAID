from __future__ import annotations

import logging
import os
from typing import Any

from celery import shared_task
from django.db import close_old_connections
from django.utils import timezone

from network.models import ImportJobStatus, ModelImportJob
from network.services.importers import load_graph_from_keras_artifact
from network.services.types import GraphValidationError
from network import storage

logger = logging.getLogger(__name__)


def enqueue_import_job(job_id: Any) -> None:
    """Dispatch a Celery task for the given import job identifier."""
    process_model_import_job.delay(str(job_id))


def _clear_uploaded_artifact(job: ModelImportJob) -> None:
    job.drop_uploaded_file()
    job.stored_path = ""
    try:
        if job.stored_path:
            # prefer storage.delete which handles remote/local
            storage.delete(job.stored_path)
    except Exception:
        try:
            job.drop_uploaded_file()
        except Exception:
            pass
    job.stored_path = ""
    job.upload_size_bytes = 0


@shared_task(bind=True, name="network.process_model_import_job")
def process_model_import_job(self, job_id: str) -> None:
    """Background task that converts uploaded Keras artifacts into graphs."""
    close_old_connections()

    try:
        job = ModelImportJob.objects.get(id=job_id)
    except ModelImportJob.DoesNotExist:  # pragma: no cover - defensive
        logger.warning("Import job %s no longer exists", job_id)
        return

    if job.status == ImportJobStatus.CANCELLED:
        _clear_uploaded_artifact(job)
        job.finished_at = job.finished_at or timezone.now()
        job.save(update_fields=["finished_at", "updated_at", "stored_path"])
        return

    job.status = ImportJobStatus.PROCESSING
    job.started_at = timezone.now()
    job.save(update_fields=["status", "started_at", "updated_at"])

    try:
        if not job.stored_path:
            raise ValueError("Stored upload path is missing for this job")

        # If the stored_path refers to a storage key, stream it to a temp file for the importer
        tmp_path = None
        try:
            if storage.exists(job.stored_path):
                import tempfile, shutil
                tmpf = tempfile.NamedTemporaryFile(delete=False)
                tmp_path = tmpf.name
                tmpf.close()
                with storage.open_stream(job.stored_path) as fh, open(tmp_path, "wb") as out:
                    shutil.copyfileobj(fh, out)
                graph_payload = load_graph_from_keras_artifact(tmp_path)
            else:
                graph_payload = load_graph_from_keras_artifact(job.stored_path)
        finally:
            try:
                if tmp_path and os.path.exists(tmp_path):
                    os.remove(tmp_path)
            except Exception:
                pass
        options = job.options if isinstance(job.options, dict) else {}
        override_name = options.get("graph_name")
        if override_name:
            graph_payload["name"] = override_name

        job.graph_payload = graph_payload

        if options.get("auto_create_graph"):
            from network.serializers import NetworkGraphSerializer  # Local import to avoid circular deps

            serializer = NetworkGraphSerializer(data=graph_payload)
            serializer.is_valid(raise_exception=True)
            graph = serializer.save()
            job.graph = graph

        job.status = ImportJobStatus.SUCCEEDED
        job.error = ""
        job.finished_at = timezone.now()
        _clear_uploaded_artifact(job)
        job.save(
            update_fields=[
                "status",
                "graph_payload",
                "graph",
                "error",
                "finished_at",
                "updated_at",
                "stored_path",
            ]
        )
    except GraphValidationError as exc:
        job.status = ImportJobStatus.FAILED
        detail = getattr(exc, "detail", str(exc))
        job.error = detail if isinstance(detail, str) else str(detail)
        job.finished_at = timezone.now()
        _clear_uploaded_artifact(job)
        job.save(update_fields=["status", "error", "finished_at", "updated_at", "stored_path"])
    except Exception as exc:  # pragma: no cover - defensive
        job.status = ImportJobStatus.FAILED
        job.error = f"Import failed: {exc}"
        job.finished_at = timezone.now()
        _clear_uploaded_artifact(job)
        job.save(update_fields=["status", "error", "finished_at", "updated_at", "stored_path"])
        logger.exception("Import job %s failed", job_id)
        raise
