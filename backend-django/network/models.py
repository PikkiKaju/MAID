import os
import uuid

from django.conf import settings
from django.db import models


# possible statuses of a Network
#  
class GraphStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    VALID = "valid", "Valid"
    COMPILED = "compiled", "Compiled"


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# Main Model for storing the Networks made in the canvas
class NetworkGraph(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    task = models.CharField(max_length=60, blank=True, default="")
    framework = models.CharField(max_length=60, blank=True, default="tf-keras")
    framework_version = models.CharField(max_length=60, blank=True, default="")
    status = models.CharField(
        max_length=16,
        choices=GraphStatus.choices,
        default=GraphStatus.DRAFT,
    )
    description = models.TextField(blank=True, default="")
    metadata = models.JSONField(blank=True, default=dict)

    class Meta(TimeStampedModel.Meta):
        ordering = ("-updated_at",)

    def __str__(self) -> str:  # pragma: no cover - human readable helper
        return f"{self.name} ({self.status})"

# Model used for storing canvas nodes, which represent Network's layers
class LayerNode(TimeStampedModel):
    id = models.CharField(primary_key=True, max_length=64)
    stable_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    client_id = models.CharField(max_length=64, blank=True, default="")
    graph = models.ForeignKey(
        NetworkGraph,
        on_delete=models.CASCADE,
        related_name="nodes",
    )
    type = models.CharField(max_length=60)
    label = models.CharField(max_length=120, blank=True, default="")
    params = models.JSONField(blank=True, default=dict)
    position = models.JSONField(blank=True, default=dict)
    notes = models.JSONField(blank=True, default=dict)

    class Meta(TimeStampedModel.Meta):
        ordering = ("graph", "id")
        indexes = [
            models.Index(fields=("graph", "client_id"), name="layernode_graph_client_idx"),
        ]

    def __str__(self) -> str:  # pragma: no cover - human readable helper
        return f"{self.label or self.type} ({self.id})"

# Model used for storing edges which connect two distinct Layer Nodes
class Edge(TimeStampedModel):
    id = models.CharField(primary_key=True, max_length=64)
    stable_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    client_id = models.CharField(max_length=64, blank=True, default="")
    graph = models.ForeignKey(
        NetworkGraph,
        on_delete=models.CASCADE,
        related_name="edges",
    )
    source = models.ForeignKey(
        LayerNode,
        on_delete=models.CASCADE,
        related_name="outgoing_edges",
    )
    target = models.ForeignKey(
        LayerNode,
        on_delete=models.CASCADE,
        related_name="incoming_edges",
    )
    meta = models.JSONField(blank=True, default=dict)

    class Meta(TimeStampedModel.Meta):
        ordering = ("graph", "id")
        indexes = [
            models.Index(fields=("graph", "client_id"), name="edge_graph_client_idx"),
        ]

    def __str__(self) -> str:  # pragma: no cover - human readable helper
        return f"{self.source_id} -> {self.target_id}"

# Model for storing examplary Network presets 
class GraphPreset(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(unique=True, max_length=80)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True, default="")
    graph = models.JSONField()

    class Meta(TimeStampedModel.Meta):
        ordering = ("name",)

    def __str__(self) -> str:  # pragma: no cover - human readable helper
        return self.name

# Model for storing a snapshots of a Network used for change history
class GraphSnapshot(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    graph = models.ForeignKey(
        NetworkGraph,
        on_delete=models.CASCADE,
        related_name="snapshots",
    )
    label = models.CharField(max_length=120, blank=True, default="")
    payload = models.JSONField()

    class Meta(TimeStampedModel.Meta):
        ordering = ("-created_at",)

    def __str__(self) -> str:  # pragma: no cover
        return f"Snapshot {self.id} for {self.graph_id}"


# Training job model to execute Keras training asynchronously
class TrainingStatus(models.TextChoices):
    QUEUED = "queued", "Queued"
    RUNNING = "running", "Running"
    SUCCEEDED = "succeeded", "Succeeded"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"


class TrainingJob(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    graph = models.ForeignKey(
        NetworkGraph,
        on_delete=models.CASCADE,
        related_name="training_jobs",
    )

    status = models.CharField(
        max_length=16,
        choices=TrainingStatus.choices,
        default=TrainingStatus.QUEUED,
    )

    # Raw parameters passed by client: optimizer/loss/metrics, fit params, columns, split ratios, etc.
    params = models.JSONField(blank=True, default=dict)

    # Result payload: history (loss/metrics per epoch), evaluation, model summary, etc.
    result = models.JSONField(blank=True, default=dict)

    # Where temporary CSV was stored for this job (inside container)
    dataset_path = models.CharField(max_length=512, blank=True, default="")

    # Saved model artifact path (e.g., /app/artifacts/<job_id>.keras)
    artifact_path = models.CharField(max_length=512, blank=True, default="")

    # Progress [0..1] for simple polling UIs
    progress = models.FloatField(default=0.0)

    # Error message when FAILED
    error = models.TextField(blank=True, default="")

    class Meta(TimeStampedModel.Meta):
        ordering = ("-created_at",)

    def __str__(self) -> str:  # pragma: no cover
        return f"TrainJob {self.id} [{self.status}] for {self.graph_id}"


class ImportJobStatus(models.TextChoices):
    QUEUED = "queued", "Queued"
    PROCESSING = "processing", "Processing"
    SUCCEEDED = "succeeded", "Succeeded"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"


class ModelImportJob(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="model_import_jobs",
    )
    status = models.CharField(
        max_length=16,
        choices=ImportJobStatus.choices,
        default=ImportJobStatus.QUEUED,
    )
    source_name = models.CharField(max_length=255)
    stored_path = models.CharField(max_length=512, blank=True, default="")
    upload_size_bytes = models.BigIntegerField(default=0)
    graph_payload = models.JSONField(blank=True, default=dict)
    options = models.JSONField(blank=True, default=dict)
    graph = models.ForeignKey(
        NetworkGraph,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="import_jobs",
    )
    error = models.TextField(blank=True, default="")
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta(TimeStampedModel.Meta):
        ordering = ("-created_at",)

    def __str__(self) -> str:  # pragma: no cover
        return f"ImportJob {self.id} [{self.status}]"

    def drop_uploaded_file(self) -> None:
        path = self.stored_path
        if not path:
            return
        try:
            # Prefer using storage helper to delete, falling back to local FS
            try:
                from network import storage

                storage.delete(path)
                return
            except Exception:
                pass
            if os.path.exists(path):
                os.remove(path)
        except OSError:
            pass
    
