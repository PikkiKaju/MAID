from __future__ import annotations

from django.http import JsonResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

import logging
logger = logging.getLogger(__name__)


from network.manifests import manager as manifest_manager


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
            if manifest_manager.regenerate_manifest("activations"):
                return JsonResponse({"ok": True, "message": "manifest regenerated"})
            else:
                return JsonResponse({"ok": False, "error": "failed to regenerate manifest"}, status=500)
        except Exception as e:
            return JsonResponse({"ok": False, "error": str(e)}, status=500)


    @action(detail=False, methods=["get"], url_path="refresh-manifest", permission_classes=[IsAdminUser])
    def refresh_activation_manifest(self, request):
        """Refresh the activation manifest from disk."""
        try:
            if manifest_manager.refresh_manifest("activations"):
                return JsonResponse({"ok": True, "message": "manifest refreshed"})
            else:
                return JsonResponse({"ok": False, "error": "failed to refresh manifest"}, status=500)
        except Exception as e:
            return JsonResponse({"ok": False, "error": str(e)}, status=500)


    def list(self, request):
        """List all available activations with metadata."""
        mf = manifest_manager.get_manifest("activations")
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
            entry = manifest_manager.get_entry("activations", pk)
        except KeyError:
            return Response({"detail": f"Activation '{pk}' not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(entry)


    @action(detail=False, methods=["get"], url_path="specs")
    def specs(self, request):
        """Get top-level manifest specs like versions."""
        mf = manifest_manager.get_manifest("activations")
        return Response({
            "tensorflow_version": mf.get("tensorflow_version"),
        })
