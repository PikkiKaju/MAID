import uuid

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
    framework = models.CharField(max_length=60, blank=True, default="tf-keras") # TODO: Revise if needed
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

    def __str__(self) -> str:  # pragma: no cover - human readable helper
        return f"{self.label or self.type} ({self.id})"

# Model used for storing edges which connect two distinct Layer Nodes
class Edge(TimeStampedModel):
    id = models.CharField(primary_key=True, max_length=64)
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
    
