from __future__ import annotations

from django.http import JsonResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

import logging
logger = logging.getLogger(__name__)


from network.manifests.metrics import (
    get_manifest,
    regenerate_manifest,
    refresh_manifest,
    get_metric_entry,
    list_metrics,
)


class MetricManifestViewSet(viewsets.ViewSet):
    """Read-only access to Keras metrics manifest.

    Routes:
      - GET /api/network/metrics -> list metric summaries
      - GET /api/network/metrics/{name} -> full manifest entry for a metric
      - GET /api/network/metrics/specs -> top-level metadata and versions
    """
    permission_classes = [AllowAny]


    @action(detail=False, methods=["get"], url_path="regenerate-manifest", permission_classes=[IsAdminUser])
    def regenerate_metric_manifest(self, request):
        """Regenerate the metric manifest from scratch."""
        try:
            if regenerate_manifest():
                return JsonResponse({"ok": True, "message": "manifest regenerated"})
            else:
                return JsonResponse({"ok": False, "error": "failed to regenerate manifest"}, status=500)
        except Exception as e:
            return JsonResponse({"ok": False, "error": str(e)}, status=500)


    @action(detail=False, methods=["get"], url_path="refresh-manifest", permission_classes=[IsAdminUser])
    def refresh_metric_manifest(self, request):
        """Refresh the metric manifest from disk."""
        try:
            if refresh_manifest():
                return JsonResponse({"ok": True, "message": "manifest refreshed"})
            else:
                return JsonResponse({"ok": False, "error": "failed to refresh manifest"}, status=500)
        except Exception as e:
            return JsonResponse({"ok": False, "error": str(e)}, status=500)


    def list(self, request):
        """List all available metrics with metadata."""
        mf = get_manifest()
        items = []
        for metric in mf.get("metrics", []):
            items.append(
                {
                    "name": metric.get("name"),
                    "description": metric.get("description"),
                    "parameters": metric.get("parameters", []),
                    "is_base_class": metric.get("is_base_class", False),
                }
            )
        return Response({
            "tensorflow_version": mf.get("tensorflow_version"),
            "metric_count": len(items),
            "metrics": items,
        })


    def retrieve(self, request, pk=None):
        """Get full manifest entry for a specific metric by name (e.g. 'Accuracy')."""
        try:
            entry = get_metric_entry(pk)
        except KeyError:
            return Response({"detail": f"Metric '{pk}' not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(entry)


    @action(detail=False, methods=["get"], url_path="specs")
    def specs(self, request):
        """Get top-level manifest specs like versions."""
        mf = get_manifest()
        return Response({
            "tensorflow_version": mf.get("tensorflow_version"),
        })
