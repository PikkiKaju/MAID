from __future__ import annotations

import os
from pathlib import Path
from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework import viewsets, status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response

from network.models import TrainingJob, TrainingStatus
from network.serializers import TrainingJobSerializer
from network import storage
from network.services.training import launch_training_job
from network.services.export_tasks import run_model_export


class TrainingJobViewSet(viewsets.ReadOnlyModelViewSet):
    # Require authentication for job operations (download artifact, cancel, predict)
    permission_classes = [IsAuthenticated]
    serializer_class = TrainingJobSerializer
    queryset = TrainingJob.objects.all()

    @action(detail=True, methods=["get"], url_path="artifact")
    def download_artifact(self, request, pk=None):
        job = self.get_object()
        artifact_type = request.query_params.get('type', 'final')

        if not job.artifact_path:
            raise Http404('Artifact not available')

        target_path_or_key = None
        download_filename = f"job_{job.id}_model.keras"

        if artifact_type == 'best':
            target_path_or_key = (job.result or {}).get('best_model_artifact')
            download_filename = f"job_{job.id}_best_model.keras"
            if not target_path_or_key:
                target_path_or_key = f"{job.id}_best.keras"
        elif artifact_type == 'log':
            target_path_or_key = (job.result or {}).get('training_log_artifact')
            download_filename = f"job_{job.id}_training_log.csv"
            if not target_path_or_key:
                target_path_or_key = f"{job.id}_log.csv"
        elif artifact_type == 'tflite':
            target_path_or_key = f"{job.id}.tflite"
            download_filename = f"job_{job.id}_model.tflite"
        elif artifact_type == 'final':
            target_path_or_key = job.artifact_path
            download_filename = f"job_{job.id}_model.keras"
        else:
            raise Http404('Unknown artifact type')

        if target_path_or_key:
            # Absolute filesystem path?
            if os.path.isabs(target_path_or_key):
                if os.path.exists(target_path_or_key):
                    fh = open(target_path_or_key, 'rb')
                    return FileResponse(fh, as_attachment=True, filename=download_filename)
            else:
                target_key = target_path_or_key.replace('\\', '/')
                presigned = storage.get_presigned_download(target_key)
                if presigned:
                    return Response({'url': presigned})
                try:
                    stream = storage.open_stream(target_key)
                    return FileResponse(stream, as_attachment=True, filename=download_filename)
                except Exception:
                    pass

        # Fallback for absolute paths relative to job.artifact_path directory
        base_dir = os.path.dirname(job.artifact_path)
        relative_name = os.path.basename(target_path_or_key) if target_path_or_key else download_filename

        if base_dir and os.path.isabs(base_dir):
            fallback_path = os.path.join(base_dir, relative_name)
            if os.path.exists(fallback_path):
                fh = open(fallback_path, 'rb')
                return FileResponse(fh, as_attachment=True, filename=download_filename)

        # Try treating artifact_path as storage key and append relative file
        storage_base = os.path.dirname(job.artifact_path)
        if storage_base:
            target_key = os.path.join(storage_base, relative_name).replace('\\', '/')
            presigned = storage.get_presigned_download(target_key)
            if presigned:
                return Response({'url': presigned})
            try:
                stream = storage.open_stream(target_key)
                return FileResponse(stream, as_attachment=True, filename=download_filename)
            except Exception:
                pass

        raise Http404('Artifact not available')

    @action(detail=True, methods=["post"], url_path="export")
    def export_model(self, request, pk=None):
        """Trigger an export of the trained model to ONNX or TFLite format."""
        job = self.get_object()
        format_type = request.data.get('format')
        
        if format_type not in ['onnx', 'tflite']:
             return Response({"detail": "Invalid format. Use 'onnx' or 'tflite'."}, status=status.HTTP_400_BAD_REQUEST)
             
        if job.status != TrainingStatus.SUCCEEDED:
            return Response({"detail": "Job must be succeeded to export model."}, status=status.HTTP_400_BAD_REQUEST)

        # Trigger Celery task
        run_model_export.delay(job.id, format_type)
        
        return Response({"detail": "Export started"}, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=["post"], url_path="start")
    def start(self, request, pk=None):
        """Start the training job once the dataset has been uploaded to storage.

        This checks that `job.dataset_path` exists in storage (or locally) and enqueues the Celery task.
        """
        job = self.get_object()
        if job.status != TrainingStatus.QUEUED:
            return Response({"detail": "Job is not in a queued state"}, status=status.HTTP_400_BAD_REQUEST)

        # Check dataset presence
        exists = False
        try:
            if job.dataset_path and storage.exists(job.dataset_path):
                exists = True
            else:
                # treat dataset_path as local path fallback
                if job.dataset_path and os.path.exists(job.dataset_path):
                    exists = True
        except Exception:
            exists = False

        if not exists:
            return Response({"detail": "Dataset not found for job"}, status=status.HTTP_400_BAD_REQUEST)

        # Launch background worker
        try:
            launch_training_job(job)
        except Exception as exc:
            return Response({"detail": f"Failed to enqueue job: {exc}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(TrainingJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)

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
        if job.status != TrainingStatus.SUCCEEDED or not job.artifact_path:
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

        # Build input matrix X with validation
        X = None
        if request.FILES.get("file"):
            # Parse CSV with header and validate columns
            import io, csv
            f = request.FILES["file"]
            try:
                raw = f.read()
                try:
                    f.seek(0)
                except Exception:
                    pass
                text = raw.decode("utf-8") if isinstance(raw, (bytes, bytearray)) else str(raw)
            except Exception as exc:
                return Response({"detail": f"Failed to read uploaded file: {exc}"}, status=status.HTTP_400_BAD_REQUEST)

            reader = csv.DictReader(io.StringIO(text))
            header = reader.fieldnames or []
            missing = [c for c in feat_names if c not in (header or [])]
            if missing:
                raise DRFValidationError(f"Uploaded CSV is missing required columns: {missing}")

            rows = []
            row_num = 0
            for row in reader:
                row_num += 1
                try:
                    vals = [float(row.get(col, 0) or 0) for col in feat_names]
                except Exception as exc:
                    return Response({"detail": f"Could not parse numeric values on row {row_num}: {exc}"}, status=status.HTTP_400_BAD_REQUEST)
                rows.append(vals)
            if not rows:
                return Response({"detail": "Uploaded CSV contains no data rows"}, status=status.HTTP_400_BAD_REQUEST)
            X = rows
        else:
            # JSON body
            payload = request.data if isinstance(request.data, dict) else {}
            if "instances" in payload and isinstance(payload["instances"], (list, tuple)):
                instances = payload["instances"]
                # Validate shape
                if not instances:
                    return Response({"detail": "'instances' array is empty"}, status=status.HTTP_400_BAD_REQUEST)
                for i, inst in enumerate(instances, start=1):
                    if not isinstance(inst, (list, tuple)):
                        raise DRFValidationError(f"Each instance must be an array; item {i} is invalid")
                    if len(inst) != len(feat_names):
                        raise DRFValidationError(f"Instance length mismatch at item {i}: expected {len(feat_names)} values")
                X = instances
            elif "records" in payload and isinstance(payload["records"], (list, tuple)):
                rows = []
                if not payload["records"]:
                    raise DRFValidationError("'records' array is empty")
                for i, rec in enumerate(payload["records"], start=1):
                    if not isinstance(rec, dict):
                        raise DRFValidationError(f"Each record must be an object with feature:value pairs; item {i} is invalid")
                    missing = [c for c in feat_names if c not in rec]
                    if missing:
                        raise DRFValidationError(f"Record {i} is missing columns: {missing}")
                    try:
                        vals = [float(rec.get(col, 0) or 0) for col in feat_names]
                    except Exception as exc:
                        raise DRFValidationError(f"Could not parse numeric values in record {i}: {exc}")
                    rows.append(vals)
                X = rows
            else:
                return Response({"detail": "Provide 'instances' as array of arrays or 'records' as array of objects, or upload a CSV file"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            import numpy as np
            from keras.models import load_model
            X_arr = np.array(X, dtype=np.float32)

            # Load model from storage-aware source. If presigned storage is enabled
            # or the artifact is stored remotely, use `network.storage.open_stream`
            # and write to a temporary file for Keras to load. Otherwise load
            # directly from the local filesystem path.
            model = None
            tmp_path = None
            try:
                if getattr(settings, "USE_PRESIGNED_STORAGE_URLS", False):
                    # Attempt to open remote stream and write to temp file
                    import tempfile, shutil
                    stream = storage.open_stream(job.artifact_path)
                    tmpf = tempfile.NamedTemporaryFile(delete=False)
                    try:
                        # copy stream contents to temp file
                        shutil.copyfileobj(stream, tmpf)
                        tmp_path = tmpf.name
                    finally:
                        try:
                            tmpf.close()
                        except Exception:
                            pass
                    model = load_model(tmp_path)
                else:
                    # Local path expected
                    if not os.path.exists(job.artifact_path):
                        return Response({"detail": "Model artifact not available for this job"}, status=status.HTTP_400_BAD_REQUEST)
                    model = load_model(job.artifact_path)

                preds = model.predict(X_arr, verbose=0)
            finally:
                # cleanup temporary file if used
                try:
                    if tmp_path and os.path.exists(tmp_path):
                        os.remove(tmp_path)
                except Exception:
                    pass
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
