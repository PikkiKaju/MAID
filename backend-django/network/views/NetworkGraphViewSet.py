from __future__ import annotations

import sys
import os
import logging
from pathlib import Path
logger = logging.getLogger(__name__)
from typing import Any, Dict, List, Tuple
import tempfile

from django.http import HttpResponse
from django.utils.text import slugify
from django.http import JsonResponse
from django.contrib.admin.views.decorators import staff_member_required
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
from django.urls import reverse
import csv

from network.models import NetworkGraph
from network.serializers import NetworkGraphSerializer, TrainingJobSerializer, TrainingStartSerializer

from network.services import (
    GraphValidationError,
    compile_graph,
    export_graph_to_python_script,
    import_keras_json_to_graph,
    load_graph_from_keras_artifact,
)
from network.models import TrainingJob
from network.services.training import launch_training_job
from network import storage


class NetworkGraphViewSet(viewsets.ModelViewSet):
    # Require authentication for graph operations (import/export/compile/train)
    permission_classes = [IsAuthenticated]
    serializer_class = NetworkGraphSerializer
    queryset = NetworkGraph.objects.all().prefetch_related("nodes", "edges")

    def get_queryset(self):  # pragma: no cover - queryset hint
        """
        Optimize queryset with related nodes and edges.
        Returns:
            QuerySet: The optimized queryset.
        """
        return super().get_queryset().prefetch_related("nodes", "edges")

    def _resolve_graph_payload(
        self, graph: NetworkGraph, request_data: Dict[str, Any]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Helper to get nodes and edges payload from request or DB."""

        logger.debug("_resolve_graph_payload request_data=%s graph=%s", request_data, getattr(graph, 'id', graph))

        if graph:
            nodes_payload = list(graph.nodes.order_by("created_at").values(
                "id", "type", "label", "params", "position", "notes"
            ))
            edges_payload = list(graph.edges.order_by("created_at").values(
                "id", "source_id", "target_id", "meta"
            ))
        elif request_data:
            nodes_payload = request_data.get("nodes") or []
            edges_payload = request_data.get("edges") or []
        else:
            nodes_payload = []
            edges_payload = []

        for edge in edges_payload:
            edge.setdefault("source", edge.get("source_id"))
            edge.setdefault("target", edge.get("target_id"))

        return nodes_payload, edges_payload

    @action(detail=True, methods=["get"], url_path="compile")
    def compile_network_by_uuid(self, request, pk=None):
        """
        Compile the network graph from database by UUID into an executable model representation and return it.

        Args:
            request (HttpRequest): The HTTP request object.
            pk (str, optional): The primary key of the NetworkGraph to compile. Defaults to None.
        Returns:
            Response: The HTTP response containing the compiled model representation.
        Raises:
            GraphValidationError: If the graph payload is invalid.
            Exception: If an unexpected error occurs during compilation.        
        """
        graph = self.get_object()

        nodes_payload, edges_payload = self._resolve_graph_payload(graph, None)

        try:
            result = compile_graph(nodes_payload, edges_payload)
        except GraphValidationError as exc:
            return Response(getattr(exc, "detail", str(exc)), status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:  # pragma: no cover - defensive catch to surface error
            return Response(
                {"detail": f"Failed to compile graph: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(result, status=status.HTTP_200_OK)
    

    @action(detail=False, methods=["post"], url_path="compile")
    def compile_network_from_payload(self, request):
        """
        Compile the network graph from the request payload into an executable model representation and return it.

        Args:
            request (HttpRequest): The HTTP request object.
        Returns:
            Response: The HTTP response containing the compiled model representation.
        Raises:
            GraphValidationError: If the graph payload is invalid.
            Exception: If an unexpected error occurs during compilation.        
        """
        nodes_payload, edges_payload = self._resolve_graph_payload(None, request.data)

        try:
            result = compile_graph(nodes_payload, edges_payload)
        except GraphValidationError as exc:
            return Response(getattr(exc, "detail", str(exc)), status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:  # pragma: no cover - defensive catch to surface error
            return Response(
                {"detail": f"Failed to compile graph: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(result, status=status.HTTP_200_OK)


    @action(detail=True, methods=["get"], url_path="export-script")
    def export_script(self, request, pk=None):
        graph = self.get_object()
        nodes_payload, edges_payload = self._resolve_graph_payload(graph, request.query_params)

        try:
            script = export_graph_to_python_script(
                nodes_payload,
                edges_payload,
                model_name=graph.name,
            )
        except GraphValidationError as exc:
            return Response(getattr(exc, "detail", str(exc)), status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:  # pragma: no cover - defensive
            return Response(
                {"detail": f"Failed to export graph script: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        filename = f"{slugify(graph.name) or graph.id}.py"
        response = HttpResponse(script, content_type="text/x-python")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=["post"], url_path="export-script")
    def export_script_from_payload(self, request):
        """Export Python script from payload without saving to database."""
        nodes_payload, edges_payload = self._resolve_graph_payload(None, request.data)
        model_name = request.data.get("name", "model")

        try:
            script = export_graph_to_python_script(
                nodes_payload,
                edges_payload,
                model_name=model_name,
            )
        except GraphValidationError as exc:
            return Response(getattr(exc, "detail", str(exc)), status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:  # pragma: no cover - defensive
            return Response(
                {"detail": f"Failed to export graph script: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        filename = f"{slugify(model_name)}.py"
        response = HttpResponse(script, content_type="text/x-python")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=["post"], url_path="import-keras-json", permission_classes=[IsAuthenticated])
    def import_keras_json(self, request):
        """Accepts a Keras model.to_json() string and creates a corresponding graph.

        Body shape options:
        - { "model_json": "...json string...", "name": "optional graph name" }
        - raw string (request.body) containing the JSON string (fallback)
        """
        model_json: str | None = None
        graph_name: str | None = None

        # Prefer parsed data if available and contains 'model_json'
        if isinstance(request.data, dict) and request.data:
            candidate = request.data.get("model_json")
            if isinstance(candidate, str) and candidate.strip():
                model_json = candidate
                graph_name = request.data.get("name")

        # Fallback to raw body only if model_json not provided explicitly
        if not model_json:
            try:
                raw = request.body
                if raw:
                    decoded = raw.decode("utf-8")
                    # If raw is a JSON wrapper like {"model_json": "..."}, try to extract
                    import json as _json
                    try:
                        parsed = _json.loads(decoded)
                        if isinstance(parsed, dict) and isinstance(parsed.get("model_json"), str):
                            model_json = parsed.get("model_json")
                            graph_name = parsed.get("name") or graph_name
                        elif isinstance(parsed, str):
                            # Body was a JSON string literal of the model JSON
                            model_json = parsed
                        else:
                            # If it looks like a Keras model JSON directly, accept decoded
                            if decoded.strip().startswith("{") and '"class_name"' in decoded:
                                model_json = decoded
                    except Exception:
                        # Not JSON – assume plain text model JSON
                        if decoded.strip():
                            model_json = decoded
                if model_json:
                    logger.info("Resolved model_json from raw request body")
            except Exception as exc:  # pragma: no cover - defensive: body may already be consumed
                logger.debug("Could not read raw request.body (it may have been consumed): %s", exc)

        if not model_json:
            return Response(
                {"detail": "Missing 'model_json' in body or raw request"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            graph_payload = import_keras_json_to_graph(model_json)
            if graph_name:
                graph_payload["name"] = graph_name
        except GraphValidationError as exc:
            return Response(getattr(exc, "detail", str(exc)), status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:  # pragma: no cover - defensive
            return Response(
                {"detail": f"Failed to import Keras JSON: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Persist using the existing serializer to benefit from nested save
        serializer = self.get_serializer(data=graph_payload)
        serializer.is_valid(raise_exception=True)
        try:
            instance = serializer.save()
        except Exception as exc:  # pragma: no cover - defensive
            return Response(
                {"detail": f"Failed to save imported graph: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED)


    @action(detail=False, methods=["post"], url_path="import-model", permission_classes=[IsAuthenticated])
    def import_model_artifact(self, request):
        """Upload a Keras model artifact (.keras, .h5, or SavedModel .zip) and convert to a graph.

        Supports multipart/form-data with a single file field named 'file'.
        Optional form/body fields:
          - name: override graph name
          - create: if truthy, persist as NetworkGraph and return the created object
        """
        uploaded = request.FILES.get("file")
        if not uploaded:
            return Response({"detail": "Missing file upload (field name 'file')"}, status=status.HTTP_400_BAD_REQUEST)

        # Basic upload validation: size and allowed extensions
        try:
            upload_size = int(getattr(uploaded, 'size', 0))
        except Exception:
            upload_size = 0
        if upload_size > getattr(settings, 'MAX_UPLOAD_SIZE', 10 * 1024 * 1024):
            return Response({"detail": "Uploaded file is too large"}, status=status.HTTP_400_BAD_REQUEST)

        suffix = os.path.splitext(getattr(uploaded, "name", "uploaded.bin"))[1].lower()
        allowed = [e.lower() for e in getattr(settings, 'ALLOWED_UPLOAD_EXTENSIONS', ['.keras', '.h5', '.zip'])]
        if suffix not in allowed:
            return Response({"detail": f"Unsupported file extension '{suffix}'"}, status=status.HTTP_400_BAD_REQUEST)

        # Persist to a temporary file preserving extension for loader heuristics
        suffix = os.path.splitext(getattr(uploaded, "name", "uploaded.bin"))[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            for chunk in uploaded.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        try:
            graph_payload = load_graph_from_keras_artifact(tmp_path)
        except GraphValidationError as exc:
            os.unlink(tmp_path)
            return Response(getattr(exc, "detail", str(exc)), status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:  # pragma: no cover - defensive
            os.unlink(tmp_path)
            return Response({"detail": f"Failed to import model: {exc}"}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            # Temp file may remain in SavedModel dir case; safe to try unlink
            try:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
            except Exception:
                pass

        # Optional overrides
        override_name = request.data.get("name") if isinstance(request.data, dict) else None
        if override_name:
            graph_payload["name"] = override_name

        create_flag = str(request.data.get("create", "")).lower() in {"1", "true", "yes", "on"}
        if create_flag:
            serializer = self.get_serializer(data=graph_payload)
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED)

        # Return the graph payload without persisting
        return Response(graph_payload, status=status.HTTP_200_OK)


    @action(detail=True, methods=["post"], url_path="train")
    def train(self, request, pk=None):
        """
        Start an asynchronous training job for a graph.

        Accepts multipart/form-data with:
          - file: CSV dataset (required for phase 1)
          - x_columns: JSON array of input feature column names
          - y_column: target column name
          - optimizer: string (e.g., 'adam')
          - loss: string (e.g., 'mse')
          - metrics: JSON array of metric names
          - epochs: int
          - batch_size: int
          - validation_split: float (0..1)
          - test_split: float (0..1)

        Returns 202 Accepted with job payload {id, status, ...} and Location header to poll.
        """
        graph = self.get_object()

        uploaded = request.FILES.get("file")
        if not uploaded:
            return Response({"detail": "Missing CSV file (field name 'file')"}, status=status.HTTP_400_BAD_REQUEST)

        # Enforce limits: size and extension
        try:
            upload_size = int(getattr(uploaded, 'size', 0))
        except Exception:
            upload_size = 0
        if upload_size > getattr(settings, 'MAX_UPLOAD_SIZE', 10 * 1024 * 1024):
            return Response({"detail": "Uploaded file is too large"}, status=status.HTTP_400_BAD_REQUEST)

        suffix = os.path.splitext(getattr(uploaded, "name", "dataset.csv"))[1].lower() or ".csv"
        allowed = [e.lower() for e in getattr(settings, 'ALLOWED_UPLOAD_EXTENSIONS', ['.csv'])]
        if suffix not in allowed:
            return Response({"detail": f"Unsupported file extension '{suffix}'"}, status=status.HTTP_400_BAD_REQUEST)

        # Validate training parameters using a dedicated serializer
        serializer = TrainingStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        params = serializer.validated_data

        # Validate CSV header against declared x_columns before creating a job
        # Read a small portion to get header line(s) safely
        try:
            # Attempt to read header without consuming the whole stream permanently
            # Some UploadedFile implementations support .open()/seek; fall back to reading chunks
            raw = None
            try:
                uploaded.seek(0)
                raw = uploaded.read(65536)
                try:
                    uploaded.seek(0)
                except Exception:
                    pass
            except Exception:
                # Fallback: read chunks and reconstruct small preview
                pieces = []
                total = 0
                for chunk in uploaded.chunks():
                    pieces.append(chunk)
                    total += len(chunk)
                    if total > 65536:
                        break
                raw = b"".join(pieces)
            text = raw.decode("utf-8", errors="replace") if isinstance(raw, (bytes, bytearray)) else str(raw or "")
            # Extract first non-empty line as header and parse CSV header
            first_lines = [ln for ln in text.splitlines() if ln.strip()]
            header_line = first_lines[0] if first_lines else ""
            header = next(csv.reader([header_line])) if header_line else []
        except Exception:
            header = []

        x_cols = list(params.get("x_columns") or [])
        missing = [c for c in x_cols if c not in header]
        if missing:
            raise DRFValidationError(f"Uploaded CSV is missing required columns: {missing}")

        # Persist dataset to a temp path tied to the job id (create job now)
        job = TrainingJob.objects.create(
            graph=graph,
            params=dict(params),
        )

        # Persist dataset to configured storage under a per-job key
        suffix = os.path.splitext(getattr(uploaded, "name", "dataset.csv"))[1] or ".csv"
        key = f"datasets/job-{job.id}{suffix}"
        # Use storage.save_file which supports Django storages or local fallback
        try:
            # uploaded is an InMemoryUploadedFile or TemporaryUploadedFile with .chunks(); wrap into a BytesIO
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
            # store the returned storage key/path
            job.dataset_path = str(saved)
            job.save(update_fields=["dataset_path", "updated_at"])
        except Exception:
            # If storage save fails, attempt local fallback similar to previous behavior
            suffix = os.path.splitext(getattr(uploaded, "name", "dataset.csv"))[1] or ".csv"
            datasets_dir = Path(getattr(settings, "ARTIFACTS_DIR", settings.BASE_DIR / "artifacts")) / "datasets"
            datasets_dir.mkdir(parents=True, exist_ok=True)
            dataset_path = datasets_dir / f"job-{job.id}{suffix}"
            with open(dataset_path, "wb") as fp:
                try:
                    uploaded.seek(0)
                    for chunk in uploaded.chunks():
                        fp.write(chunk)
                except Exception:
                    try:
                        uploaded.seek(0)
                    except Exception:
                        pass
                    for chunk in uploaded.chunks():
                        fp.write(chunk)
            job.dataset_path = str(dataset_path)
            job.save(update_fields=["dataset_path", "updated_at"])

        # Launch background worker
        launch_training_job(job)

        # Build a proper Location header using router reverse name
        try:
            loc = request.build_absolute_uri(reverse("training-job-detail", args=[str(job.id)]))
            headers = {"Location": loc}
        except Exception:
            headers = {"Location": request.build_absolute_uri(f"/api/network/training-jobs/{job.id}/")}
        return Response(TrainingJobSerializer(job).data, status=status.HTTP_202_ACCEPTED, headers=headers)

    @action(detail=True, methods=["post"], url_path="presign-upload")
    def presign_upload(self, request, pk=None):
        """Create a training job and return a presigned upload URL for the client to PUT the CSV dataset.

        The client should then upload the dataset to the returned `url` and call the training-job `start` action to begin.
        """
        graph = self.get_object()

        # Validate params via the same serializer used for training
        serializer = TrainingStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        params = serializer.validated_data

        # Create job record (dataset_path set to the intended storage key)
        job = TrainingJob.objects.create(graph=graph, params=dict(params))
        suffix = ".csv"
        key = f"datasets/job-{job.id}{suffix}"
        job.dataset_path = key
        job.save(update_fields=["dataset_path", "updated_at"])

        # Generate presigned upload URL
        url = storage.get_presigned_upload(key)
        if not url:
            # Clean up job if presign unavailable
            job.delete()
            return Response({"detail": "Presigned uploads not available in this deployment"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"job_id": str(job.id), "upload_url": url}, status=status.HTTP_201_CREATED)