from __future__ import annotations

import os
from django.http import FileResponse, Http404
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response

from network.models import TrainingJob, TrainingStatus
from network.serializers import TrainingJobSerializer


class TrainingJobViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = TrainingJobSerializer
    queryset = TrainingJob.objects.all()

    @action(detail=True, methods=["get"], url_path="artifact")
    def download_artifact(self, request, pk=None):
        job = self.get_object()
        if not job.artifact_path or not os.path.exists(job.artifact_path):
            raise Http404("Artifact not available")
        # Stream the .keras file
        response = FileResponse(open(job.artifact_path, "rb"), content_type="application/octet-stream")
        response["Content-Disposition"] = f'attachment; filename="{job.id}.keras"'
        return response

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        """Request cancellation of a running or queued training job.

        Sets the job status to CANCELLED. The training worker will detect this
        and stop as soon as possible, preserving any collected history.
        """
        job = self.get_object()
        if job.status in {TrainingStatus.SUCCEEDED, TrainingStatus.FAILED, TrainingStatus.CANCELLED}:
            # Already finished; return current state
            return Response(TrainingJobSerializer(job).data, status=status.HTTP_200_OK)

        job.status = TrainingStatus.CANCELLED
        job.save(update_fields=["status", "updated_at"])
        return Response(TrainingJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)
