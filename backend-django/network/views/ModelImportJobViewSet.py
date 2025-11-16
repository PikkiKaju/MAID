from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any, Dict

from django.conf import settings
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.reverse import reverse

from network.models import ImportJobStatus, ModelImportJob
from network.serializers import ModelImportJobSerializer, NetworkGraphSerializer
from network.services.import_jobs import enqueue_import_job
from network import storage


class ModelImportJobViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated]
    serializer_class = ModelImportJobSerializer
    queryset = ModelImportJob.objects.none()

    def get_queryset(self):
        base = ModelImportJob.objects.all().select_related("graph").order_by("-created_at")
        user = getattr(self.request, "user", None)
        if user is None or not user.is_staff:
            base = base.filter(owner=user)
        return base

    def create(self, request, *args, **kwargs):
        uploaded = request.FILES.get("file")
        if not uploaded:
            return Response({"detail": "Missing file upload (field name 'file')"}, status=status.HTTP_400_BAD_REQUEST)

        pending_limit = int(getattr(settings, "IMPORT_JOB_MAX_PENDING_PER_USER", 3))
        if pending_limit > 0:
            active_statuses = [ImportJobStatus.QUEUED, ImportJobStatus.PROCESSING]
            active_count = ModelImportJob.objects.filter(owner=request.user, status__in=active_statuses).count()
            if active_count >= pending_limit:
                return Response(
                    {"detail": f"Too many pending import jobs (limit {pending_limit}). Finish or cancel older jobs first."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        try:
            upload_size = int(getattr(uploaded, "size", 0))
        except Exception:
            upload_size = 0
        max_upload = int(getattr(settings, "MAX_UPLOAD_SIZE", 10 * 1024 * 1024))
        if upload_size > max_upload:
            return Response({"detail": "Uploaded file is too large"}, status=status.HTTP_400_BAD_REQUEST)

        suffix = Path(getattr(uploaded, "name", "model.keras")).suffix.lower() or ".keras"
        allowed = [e.lower() for e in getattr(settings, "IMPORT_JOB_ALLOWED_EXTENSIONS", [".keras", ".h5", ".zip"])]
        if suffix not in allowed:
            return Response({"detail": f"Unsupported file extension '{suffix}'"}, status=status.HTTP_400_BAD_REQUEST)

        storage_limit_mb = int(getattr(settings, "IMPORT_JOB_PENDING_STORAGE_LIMIT_MB", 0))
        if storage_limit_mb > 0:
            limit_bytes = storage_limit_mb * 1024 * 1024
            active_statuses = [ImportJobStatus.QUEUED, ImportJobStatus.PROCESSING]
            pending_bytes = (
                ModelImportJob.objects.filter(owner=request.user, status__in=active_statuses)
                .aggregate(total=Coalesce(Sum("upload_size_bytes"), 0))
                .get("total", 0)
                or 0
            )
            if pending_bytes + upload_size > limit_bytes:
                return Response(
                    {
                        "detail": (
                            "Pending import storage quota exceeded. "
                            f"Limit: {storage_limit_mb} MB, currently queued: {pending_bytes // (1024 * 1024)} MB."
                        )
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        # Persist to configured storage under imports/<uuid> suffix
        key = f"imports/upload-{uuid.uuid4().hex}{suffix}"
        try:
            from io import BytesIO

            buf = BytesIO()
            try:
                uploaded.seek(0)
            except Exception:
                pass
            for chunk in uploaded.chunks():
                buf.write(chunk)
            buf.seek(0)
            saved = storage.save_file(key, buf)
            dest_path = str(saved)
        except Exception as exc:
            return Response({"detail": f"Failed to store upload: {exc}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        options: Dict[str, Any] = {}
        if request.data.get("graph_name"):
            options["graph_name"] = request.data.get("graph_name")
        if request.data.get("auto_create_graph") is not None:
            options["auto_create_graph"] = self._truthy(request.data.get("auto_create_graph"))

        job = ModelImportJob.objects.create(
            owner=request.user,
            source_name=getattr(uploaded, "name", "uploaded.keras"),
            stored_path=str(dest_path),
            upload_size_bytes=upload_size,
            options=options,
        )

        enqueue_import_job(job.id)

        serializer = self.get_serializer(job)
        location = reverse("model-import-job-detail", kwargs={"pk": job.id}, request=request)
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED, headers={"Location": location})

    @action(detail=False, methods=["post"], url_path="presign-upload")
    def presign_upload(self, request):
        """Return a presigned upload URL for a model import artifact.

        Client should upload directly to the provided URL and then POST to the created job's endpoint to enqueue processing.
        """
        uploaded_name = request.data.get("filename") or "uploaded.keras"
        suffix = Path(uploaded_name).suffix.lower() or ".keras"

        # Basic param validation similar to create (size/extension checks are not enforceable here)
        allowed = [e.lower() for e in getattr(settings, "IMPORT_JOB_ALLOWED_EXTENSIONS", [".keras", ".h5", ".zip"]) ]
        if suffix not in allowed:
            return Response({"detail": f"Unsupported file extension '{suffix}'"}, status=status.HTTP_400_BAD_REQUEST)

        # Create job record with intended storage key
        import_key = f"imports/upload-{uuid.uuid4().hex}{suffix}"
        job = ModelImportJob.objects.create(
            owner=request.user,
            source_name=uploaded_name,
            stored_path=import_key,
            upload_size_bytes=0,
            options={},
        )

        url = storage.get_presigned_upload(import_key)
        if not url:
            job.delete()
            return Response({"detail": "Presigned uploads are not available"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"job_id": str(job.id), "upload_url": url}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        job = self.get_object()
        if job.status == ImportJobStatus.CANCELLED:
            serializer = self.get_serializer(job)
            return Response(serializer.data, status=status.HTTP_200_OK)

        if job.status != ImportJobStatus.QUEUED:
            return Response({"detail": "Job is already running or finished and cannot be cancelled."}, status=status.HTTP_400_BAD_REQUEST)

        job.status = ImportJobStatus.CANCELLED
        job.finished_at = timezone.now()
        job.drop_uploaded_file()
        job.stored_path = ""
        job.save(update_fields=["status", "finished_at", "updated_at", "stored_path"])
        serializer = self.get_serializer(job)
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=["post"], url_path="create-graph")
    def create_graph(self, request, pk=None):
        job = self.get_object()
        if job.status != ImportJobStatus.SUCCEEDED or not job.graph_payload:
            return Response({"detail": "Import job has not finished successfully."}, status=status.HTTP_400_BAD_REQUEST)

        if job.graph:
            graph_serializer = NetworkGraphSerializer(job.graph, context=self.get_serializer_context())
            return Response(graph_serializer.data, status=status.HTTP_200_OK)

        serializer = NetworkGraphSerializer(data=job.graph_payload, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        graph = serializer.save()
        job.graph = graph
        job.save(update_fields=["graph", "updated_at"])

        graph_serializer = NetworkGraphSerializer(graph, context=self.get_serializer_context())
        return Response(graph_serializer.data, status=status.HTTP_201_CREATED)

    def _truthy(self, value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if value is None:
            return False
        return str(value).strip().lower() in {"1", "true", "yes", "on"}
