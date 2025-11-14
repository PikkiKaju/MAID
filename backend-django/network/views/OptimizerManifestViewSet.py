from __future__ import annotations

from django.http import JsonResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

import logging
logger = logging.getLogger(__name__)


from network.manifests.optimizers import (
    get_manifest,
    regenerate_manifest,
    refresh_manifest,
    get_optimizer_entry,
    list_optimizers,
)


class OptimizerManifestViewSet(viewsets.ViewSet):
    """Read-only access to Keras optimizer manifest.

    Routes:
      - GET /api/network/optimizers -> list optimizer summaries
      - GET /api/network/optimizers/{name} -> full manifest entry for an optimizer
      - GET /api/network/optimizers/specs -> top-level metadata and versions
    """
    permission_classes = [AllowAny]


    @action(detail=False, methods=["get"], url_path="regenerate-manifest", permission_classes=[IsAdminUser])
    def regenerate_optimizer_manifest(self, request):
        """Regenerate the optimizer manifest from scratch."""
        try:
            if regenerate_manifest():
                return JsonResponse({"ok": True, "message": "manifest regenerated"})
            else:
                return JsonResponse({"ok": False, "error": "failed to regenerate manifest"}, status=500)
        except Exception as e:
            return JsonResponse({"ok": False, "error": str(e)}, status=500)


    @action(detail=False, methods=["get"], url_path="refresh-manifest", permission_classes=[IsAdminUser])
    def refresh_optimizer_manifest(self, request):
        """Refresh the optimizer manifest from disk."""
        try:
            if refresh_manifest():
                return JsonResponse({"ok": True, "message": "manifest refreshed"})
            else:
                return JsonResponse({"ok": False, "error": "failed to refresh manifest"}, status=500)
        except Exception as e:
            return JsonResponse({"ok": False, "error": str(e)}, status=500)


    def list(self, request):
        """List all available optimizers with metadata."""
        mf = get_manifest()
        items = []
        for opt in mf.get("optimizers", []):
            items.append(
                {
                    "name": opt.get("name"),
                    "description": opt.get("description"),
                    "parameters": opt.get("parameters", []),
                }
            )
        return Response({
            "tensorflow_version": mf.get("tensorflow_version"),
            "optimizer_count": len(items),
            "optimizers": items,
        })


    def retrieve(self, request, pk=None):
        """Get full manifest entry for a specific optimizer by name (e.g. 'Adam')."""
        try:
            entry = get_optimizer_entry(pk)
        except KeyError:
            return Response({"detail": f"Optimizer '{pk}' not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(entry)


    @action(detail=False, methods=["get"], url_path="specs")
    def specs(self, request):
        """Get top-level manifest specs like versions."""
        mf = get_manifest()
        return Response({
            "tensorflow_version": mf.get("tensorflow_version"),
        })
