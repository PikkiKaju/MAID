from rest_framework.routers import DefaultRouter

from .views import (
    GraphPresetViewSet,
    GraphSnapshotViewSet,
    NetworkGraphViewSet,
    TrainingJobViewSet,
    LayerManifestViewSet,
    OptimizerManifestViewSet,
    LossManifestViewSet,
    MetricManifestViewSet,
    ActivationManifestViewSet,
    ModelImportJobViewSet,
)

router = DefaultRouter()
router.register(r"graphs", NetworkGraphViewSet, basename="network-graph")
router.register(r"presets", GraphPresetViewSet, basename="graph-preset")
router.register(r"snapshots", GraphSnapshotViewSet, basename="graph-snapshot")
router.register(r"training-jobs", TrainingJobViewSet, basename="training-job")
router.register(r"layers", LayerManifestViewSet, basename="layer-manifest")
router.register(r"optimizers", OptimizerManifestViewSet, basename="optimizer-manifest")
router.register(r"losses", LossManifestViewSet, basename="loss-manifest")
router.register(r"metrics", MetricManifestViewSet, basename="metric-manifest")
router.register(r"activations", ActivationManifestViewSet, basename="activation-manifest")
router.register(r"import-jobs", ModelImportJobViewSet, basename="model-import-job")

urlpatterns = router.urls
