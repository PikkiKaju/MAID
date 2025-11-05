from __future__ import annotations

from django.http import JsonResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

import logging
logger = logging.getLogger(__name__)


from network.layers import (
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