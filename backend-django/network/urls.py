from rest_framework.routers import DefaultRouter

from .views import GraphPresetViewSet, GraphSnapshotViewSet, NetworkGraphViewSet, LayerManifestViewSet

router = DefaultRouter()
router.register(r"graphs", NetworkGraphViewSet, basename="network-graph")
router.register(r"presets", GraphPresetViewSet, basename="graph-preset")
router.register(r"snapshots", GraphSnapshotViewSet, basename="graph-snapshot")
router.register(r"layers", LayerManifestViewSet, basename="layer-manifest")

urlpatterns = router.urls
