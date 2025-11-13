from __future__ import annotations

from django.http import JsonResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

import logging
logger = logging.getLogger(__name__)


from network.manifests.activations import (
    get_manifest,
    regenerate_manifest,
    refresh_manifest,
    get_activation_entry,
    list_activations,
)


class ActivationManifestViewSet(viewsets.ViewSet):
    """Read-only access to Keras activation function manifest.

    Routes:
      - GET /api/network/activations -> list activation summaries
      - GET /api/network/activations/{name} -> full manifest entry for an activation
      - GET /api/network/activations/specs -> top-level metadata and versions
    """
    permission_classes = [AllowAny]


    @action(detail=False, methods=["get"], url_path="regenerate-manifest", permission_classes=[IsAdminUser])
    def regenerate_activation_manifest(self, request):
        """Regenerate the activation manifest from scratch."""
        try:
            if regenerate_manifest():
                return JsonResponse({"ok": True, "message": "manifest regenerated"})
            else:
                return JsonResponse({"ok": False, "error": "failed to regenerate manifest"}, status=500)
        except Exception as e:
            return JsonResponse({"ok": False, "error": str(e)}, status=500)


    @action(detail=False, methods=["get"], url_path="refresh-manifest", permission_classes=[IsAdminUser])
    def refresh_activation_manifest(self, request):
        """Refresh the activation manifest from disk."""
        try:
            if refresh_manifest():
                return JsonResponse({"ok": True, "message": "manifest refreshed"})
            else:
                return JsonResponse({"ok": False, "error": "failed to refresh manifest"}, status=500)
        except Exception as e:
            return JsonResponse({"ok": False, "error": str(e)}, status=500)


    def list(self, request):
        """List all available activations with metadata."""
        mf = get_manifest()
        items = []
        for activation in mf.get("activations", []):
            items.append(
                {
                    "name": activation.get("name"),
                    "description": activation.get("description"),
                    "parameters": activation.get("parameters", []),
                    "is_utility": activation.get("is_utility", False),
                }
            )
        return Response({
            "tensorflow_version": mf.get("tensorflow_version"),
            "activation_count": len(items),
            "activations": items,
        })


    def retrieve(self, request, pk=None):
        """Get full manifest entry for a specific activation by name (e.g. 'relu')."""
        try:
            entry = get_activation_entry(pk)
        except KeyError:
            return Response({"detail": f"Activation '{pk}' not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(entry)


    @action(detail=False, methods=["get"], url_path="specs")
    def specs(self, request):
        """Get top-level manifest specs like versions."""
        mf = get_manifest()
        return Response({
            "tensorflow_version": mf.get("tensorflow_version"),
        })
