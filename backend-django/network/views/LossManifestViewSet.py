from __future__ import annotations

from django.http import JsonResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

import logging
logger = logging.getLogger(__name__)


from network.manifests.losses import (
    get_manifest,
    regenerate_manifest,
    refresh_manifest,
    get_loss_entry,
    list_losses,
)


class LossManifestViewSet(viewsets.ViewSet):
    """Read-only access to Keras loss function manifest.

    Routes:
      - GET /api/network/losses -> list loss summaries
      - GET /api/network/losses/{name} -> full manifest entry for a loss
      - GET /api/network/losses/specs -> top-level metadata and versions
    """
    permission_classes = [AllowAny]


    @action(detail=False, methods=["get"], url_path="regenerate-manifest", permission_classes=[IsAdminUser])
    def regenerate_loss_manifest(self, request):
        """Regenerate the loss manifest from scratch."""
        try:
            if regenerate_manifest():
                return JsonResponse({"ok": True, "message": "manifest regenerated"})
            else:
                return JsonResponse({"ok": False, "error": "failed to regenerate manifest"}, status=500)
        except Exception as e:
            return JsonResponse({"ok": False, "error": str(e)}, status=500)


    @action(detail=False, methods=["get"], url_path="refresh-manifest", permission_classes=[IsAdminUser])
    def refresh_loss_manifest(self, request):
        """Refresh the loss manifest from disk."""
        try:
            if refresh_manifest():
                return JsonResponse({"ok": True, "message": "manifest refreshed"})
            else:
                return JsonResponse({"ok": False, "error": "failed to refresh manifest"}, status=500)
        except Exception as e:
            return JsonResponse({"ok": False, "error": str(e)}, status=500)


    def list(self, request):
        """List all available losses with metadata."""
        mf = get_manifest()
        items = []
        for loss in mf.get("losses", []):
            items.append(
                {
                    "name": loss.get("name"),
                    "description": loss.get("description"),
                    "parameters": loss.get("parameters", []),
                    "is_function": loss.get("is_function", False),
                    "alias_of": loss.get("alias_of"),
                }
            )
        return Response({
            "tensorflow_version": mf.get("tensorflow_version"),
            "loss_count": len(items),
            "losses": items,
        })


    def retrieve(self, request, pk=None):
        """Get full manifest entry for a specific loss by name (e.g. 'BinaryCrossentropy')."""
        try:
            entry = get_loss_entry(pk)
        except KeyError:
            return Response({"detail": f"Loss '{pk}' not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(entry)


    @action(detail=False, methods=["get"], url_path="specs")
    def specs(self, request):
        """Get top-level manifest specs like versions."""
        mf = get_manifest()
        return Response({
            "tensorflow_version": mf.get("tensorflow_version"),
        })
