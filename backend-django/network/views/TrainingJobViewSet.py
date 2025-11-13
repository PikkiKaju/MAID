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

    @action(detail=True, methods=["post"], url_path="predict")
    def predict(self, request, pk=None):
        """Run inference using a trained model artifact for the given job.

        Accepts either JSON with one of:
          - {"instances": [[...], [...]]}
          - {"records": [{feature: value, ...}, ...]}
        Or multipart/form-data with a CSV file under field name 'file'.

        Returns: {"predictions": [[...], ...] or [value, ...]}
        """
        job = self.get_object()
        if job.status != TrainingStatus.SUCCEEDED or not job.artifact_path or not os.path.exists(job.artifact_path):
            return Response({"detail": "Model artifact not available for this job"}, status=status.HTTP_400_BAD_REQUEST)

        # Determine feature order
        try:
            import json as _json
            x_columns = job.params.get("x_columns")
            if isinstance(x_columns, str):
                try:
                    x_columns = _json.loads(x_columns)
                except Exception:
                    pass
            if not isinstance(x_columns, (list, tuple)) or not x_columns:
                return Response({"detail": "Training job is missing x_columns metadata"}, status=status.HTTP_400_BAD_REQUEST)
            feat_names = [str(c) for c in x_columns]
        except Exception:
            return Response({"detail": "Failed to resolve feature names for this model"}, status=status.HTTP_400_BAD_REQUEST)

        # Build input matrix X
        X = None
        if request.FILES.get("file"):
            # Parse CSV with header
            import io, csv
            f = request.FILES["file"]
            data = f.read().decode("utf-8")
            reader = csv.DictReader(io.StringIO(data))
            rows = []
            for row in reader:
                rows.append([float(row.get(col, 0) or 0) for col in feat_names])
            X = rows
        else:
            # JSON body
            payload = request.data if isinstance(request.data, dict) else {}
            if "instances" in payload and isinstance(payload["instances"], (list, tuple)):
                X = payload["instances"]
            elif "records" in payload and isinstance(payload["records"], (list, tuple)):
                rows = []
                for rec in payload["records"]:
                    if not isinstance(rec, dict):
                        return Response({"detail": "Each record must be an object with feature:value pairs"}, status=status.HTTP_400_BAD_REQUEST)
                    rows.append([float(rec.get(col, 0) or 0) for col in feat_names])
                X = rows
            else:
                return Response({"detail": "Provide 'instances' as array of arrays or 'records' as array of objects, or upload a CSV file"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            import numpy as np
            from keras.models import load_model
            X_arr = np.array(X, dtype=np.float32)
            model = load_model(job.artifact_path)
            preds = model.predict(X_arr, verbose=0)
            # Normalize to plain Python types
            if hasattr(preds, "tolist"):
                out = preds.tolist()
            else:
                try:
                    out = [float(preds)]
                except Exception:
                    out = [preds]
            return Response({"predictions": out}, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response({"detail": f"Prediction failed: {exc}"}, status=status.HTTP_400_BAD_REQUEST)
