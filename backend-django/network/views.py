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

from .models import GraphPreset, GraphSnapshot, NetworkGraph
from .serializers import (
    GraphPresetSerializer,
    GraphSnapshotSerializer,
    NetworkGraphSerializer,
)
from .services import (
    GraphValidationError,
    compile_graph,
    export_graph_to_python_script,
    import_keras_json_to_graph,
    load_graph_from_keras_artifact,
)
from .layers import (
    get_manifest,
    regenerate_manifest,
    refresh_manifest,
    get_layer_entry,
    list_layers,
)


class LayerManifestViewSet(viewsets.ViewSet):
    """Read-only access to Keras layer manifest.

    Routes:
      - GET /api/network/layers -> list layer summaries
      - GET /api/network/layers/{name} -> full manifest entry for a layer
      - GET /api/network/layers/specs -> top-level param_value_specs and versions
    """
    permission_classes = [AllowAny]


    @action(detail=False, methods=["get"], url_path="regenerate-manifest", permission_classes=[IsAdminUser])
    def regenerate_layer_manifest(self, request):
        """Regenerate the layer manifest from scratch."""
        try:
            if regenerate_manifest():
                return JsonResponse({"ok": True, "message": "manifest regenerated"})
            else:
                return JsonResponse({"ok": False, "error": "failed to regenerate manifest"}, status=500)
        except Exception as e:
            return JsonResponse({"ok": False, "error": str(e)}, status=500)


    @action(detail=False, methods=["get"], url_path="refresh-manifest", permission_classes=[IsAdminUser])
    def refresh_layer_manifest(self, request):
        """Refresh the layer manifest from disk."""
        try:
            if refresh_manifest():
                return JsonResponse({"ok": True, "message": "manifest refreshed"})
            else:
                return JsonResponse({"ok": False, "error": "failed to refresh manifest"}, status=500)
        except Exception as e:
            return JsonResponse({"ok": False, "error": str(e)}, status=500)


    def list(self, request):
        """List all available layers with metadata."""
        mf = get_manifest()
        items = []
        for li in mf.get("layers", []):
            items.append(
                {
                    "name": li.get("name"),
                    "description": li.get("description"),
                    "categories": li.get("categories"),
                    "parameters": li.get("parameters", {}),
                    "deprecated": bool(li.get("deprecated")),
                }
            )
        return Response({
            "tensorflow_version": mf.get("tensorflow_version"),
            "keras_version": mf.get("keras_version"),
            "layer_count": mf.get("layer_count"),
            "layers": items,
        })


    def retrieve(self, request, pk=None):
        """Get full manifest entry for a specific layer by name (e.g. 'Conv2D')."""
        try:
            entry = get_layer_entry(pk)
        except KeyError:
            return Response({"detail": f"Layer '{pk}' not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(entry)


    @action(detail=False, methods=["get"], url_path="specs")
    def specs(self, request):
        """Get top-level manifest specs like param_value_specs and versions."""
        mf = get_manifest()
        return Response({
            "tensorflow_version": mf.get("tensorflow_version"),
            "keras_version": mf.get("keras_version"),
            "param_value_specs": mf.get("param_value_specs") or {},
        })


class NetworkGraphViewSet(viewsets.ModelViewSet):
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

        print("request_data:", request_data)  # Debugging line
        print("graph: ", graph)  # Debugging line

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

    @action(detail=False, methods=["post"], url_path="import-keras-json")
    def import_keras_json(self, request):
        """Accepts a Keras model.to_json() string and creates a corresponding graph.

        Body shape options:
        - { "model_json": "...json string...", "name": "optional graph name" }
        - raw string (request.body) containing the JSON string (fallback)
        """
        model_json: str | None = None
        graph_name: str | None = None

        # Try reading raw body first (safe if stream not consumed).
        try:
            raw = request.body
            if raw:
                model_json = raw.decode("utf-8")
                logger.info("Read raw request body for model_json import")
        except Exception as exc:  # pragma: no cover - defensive: body may already be consumed
            logger.debug("Could not read raw request.body (it may have been consumed): %s", exc)

        # If no raw body content, try parsers / form data (request.data)
        if not model_json and isinstance(request.data, dict) and request.data:
            model_json = request.data.get("model_json")
            graph_name = request.data.get("name")

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


    @action(detail=False, methods=["post"], url_path="import-model")
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


class GraphPresetViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = GraphPresetSerializer
    queryset = GraphPreset.objects.all()


class GraphSnapshotViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = GraphSnapshotSerializer
    queryset = GraphSnapshot.objects.select_related("graph")
