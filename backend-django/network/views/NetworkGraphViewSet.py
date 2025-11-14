from __future__ import annotations

import sys
import os
import logging
logger = logging.getLogger(__name__)
from typing import Any, Dict, List, Tuple
import tempfile

from django.http import HttpResponse
from django.utils.text import slugify
from django.http import JsonResponse
from django.contrib.admin.views.decorators import staff_member_required
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from django.conf import settings

from network.models import NetworkGraph
from network.serializers import NetworkGraphSerializer, TrainingJobSerializer

from network.services import (
    GraphValidationError,
    compile_graph,
    export_graph_to_python_script,
    import_keras_json_to_graph,
    load_graph_from_keras_artifact,
)
from network.models import TrainingJob
from network.services.training import launch_training_job


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

    @action(detail=False, methods=["post"], url_path="import-keras-json", permission_classes=[IsAdminUser])
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


    @action(detail=False, methods=["post"], url_path="import-model", permission_classes=[IsAdminUser])
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

        # Persist dataset to a temp path tied to the job id
        # Parse JSON-like fields if they are strings
        import json as _json
        def _maybe_json(val):
            if isinstance(val, str):
                try:
                    return _json.loads(val)
                except Exception:
                    return val
            return val

        job = TrainingJob.objects.create(
            graph=graph,
            params={
                "x_columns": _maybe_json(request.data.get("x_columns")),
                "y_column": request.data.get("y_column"),
                "optimizer": request.data.get("optimizer", "adam"),
                "loss": request.data.get("loss", "mse"),
                "metrics": _maybe_json(request.data.get("metrics")),
                "epochs": request.data.get("epochs", 10),
                "batch_size": request.data.get("batch_size", 32),
                "validation_split": request.data.get("validation_split", 0.1),
                "test_split": request.data.get("test_split", 0.1),
                "y_one_hot": request.data.get("y_one_hot", False),
                # New optional hyperparameters
                "learning_rate": request.data.get("learning_rate"),
                "shuffle": request.data.get("shuffle", True),
                "validation_batch_size": request.data.get("validation_batch_size"),
                # EarlyStopping
                "early_stopping": request.data.get("early_stopping", False),
                "es_monitor": request.data.get("es_monitor", "val_loss"),
                "es_mode": request.data.get("es_mode", "auto"),
                "es_patience": request.data.get("es_patience", 5),
                "es_min_delta": request.data.get("es_min_delta", 0.0),
                "es_restore_best_weights": request.data.get("es_restore_best_weights", True),
                # ReduceLROnPlateau
                "reduce_lr": request.data.get("reduce_lr", False),
                "rlrop_monitor": request.data.get("rlrop_monitor", "val_loss"),
                "rlrop_factor": request.data.get("rlrop_factor", 0.1),
                "rlrop_patience": request.data.get("rlrop_patience", 3),
                "rlrop_min_lr": request.data.get("rlrop_min_lr", 1e-6),
            },
        )

        # Create a per-job temp CSV file
        import tempfile, os
        suffix = os.path.splitext(getattr(uploaded, "name", "dataset.csv"))[1] or ".csv"
        temp_dir = tempfile.gettempdir()
        dataset_path = os.path.join(temp_dir, f"job-{job.id}{suffix}")
        with open(dataset_path, "wb") as fp:
            for chunk in uploaded.chunks():
                fp.write(chunk)
        job.dataset_path = dataset_path
        job.save(update_fields=["dataset_path", "updated_at"])

        # Launch background worker
        launch_training_job(job)

        headers = {"Location": request.build_absolute_uri(f"/api/network/training-jobs/{job.id}/")}
        return Response(TrainingJobSerializer(job).data, status=status.HTTP_202_ACCEPTED, headers=headers)