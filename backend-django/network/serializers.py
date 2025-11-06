from typing import Any, Dict, List

from rest_framework import serializers

from .models import Edge, GraphPreset, GraphSnapshot, LayerNode, NetworkGraph, TrainingJob
from .manifests.layers import list_layers, normalize_params_for_layer
from .services import GraphValidationError, validate_graph_payload


class LayerNodeSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        ntype = attrs.get("type")
        if not ntype:
            raise serializers.ValidationError({"type": ["Layer 'type' is required."]})

        allowed = set(list_layers(include_deprecated=False)) | {"Input"}
        if ntype not in allowed:
            raise serializers.ValidationError({
                "type": [
                    f"Unsupported layer type '{ntype}'. Query /api/network/layers to see available types."
                ]
            })

        # Optional early param validation against manifest (services.validate_graph_payload also validates)
        params = attrs.get("params") or {}
        try:
            if ntype != "Input":
                normalize_params_for_layer(ntype, params)
        except Exception as exc:
            raise serializers.ValidationError({"params": [str(exc)]})

        return attrs

    class Meta:
        model = LayerNode
        fields = (
            "id",
            "type",
            "label",
            "params",
            "position",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at")
        extra_kwargs = {
            'id': {'validators': []},  # Disable automatic uniqueness validation
        }


class EdgeSerializer(serializers.ModelSerializer):
    source = serializers.CharField()
    target = serializers.CharField()

    class Meta:
        model = Edge
        fields = (
            "id",
            "source",
            "target",
            "meta",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at")
        extra_kwargs = {
            'id': {'validators': []},  # Disable automatic uniqueness validation
        }


class NetworkGraphSerializer(serializers.ModelSerializer):
    nodes = LayerNodeSerializer(many=True)
    edges = EdgeSerializer(many=True)

    class Meta:
        model = NetworkGraph
        fields = (
            "id",
            "name",
            "task",
            "framework",
            "framework_version",
            "status",
            "description",
            "metadata",
            "nodes",
            "edges",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate(self, data):
        nodes_payload = data.get("nodes", []) or []
        edges_payload = data.get("edges", []) or []

        try:
            validate_graph_payload(nodes_payload, edges_payload)
        except GraphValidationError as exc:
            # Normalize various GraphValidationError shapes into a DRF-friendly dict/list/detail
            detail = None

            # Prefer message_dict (django.core.exceptions.ValidationError style)
            if hasattr(exc, "message_dict") and exc.message_dict:
                detail = {}
                for k, v in exc.message_dict.items():
                    # If value is a ValidationError instance with error_list, extract messages
                    if hasattr(v, "error_list"):
                        detail[k] = [str(e) for e in v.error_list]
                    else:
                        detail[k] = v
            # DRF-style .detail (if present)
            elif hasattr(exc, "detail"):
                detail = exc.detail
            else:
                detail = str(exc)

            raise serializers.ValidationError(detail)

        return data

    def validate_1(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform structural validation of graph payload if provided.

        This checks for cycles, ensures all nodes and edges are valid, and that there is at least
        one input and one output node. Raises ValidationError if any issues are found.

        args:
            attrs (Dict[str, Any]): The incoming attributes to validate.
        returns: 
            (Dict[str, Any]): The validated attributes.
        """
        initial_nodes = self.initial_data.get("nodes")
        initial_edges = self.initial_data.get("edges")

        # Only perform structural validation when caller supplied graph payload
        if initial_nodes is not None or initial_edges is not None:
            nodes_payload = initial_nodes if initial_nodes is not None else []
            edges_payload = initial_edges if initial_edges is not None else []
            try:
                validate_graph_payload(nodes_payload, edges_payload)
            except GraphValidationError as exc:
                raise serializers.ValidationError(exc.message_dict or exc.detail) from exc

        return super().validate(attrs)

    def create(self, validated_data: Dict[str, Any]) -> NetworkGraph:
        """
        Create and return a new `NetworkGraph` instance, given the validated data.

        Args:
            validated_data (Dict[str, Any]): The validated data for the new graph.

        Returns:
            NetworkGraph: The newly created graph instance.
        """
        nodes_data = validated_data.pop("nodes", [])
        edges_data = validated_data.pop("edges", [])

        graph = NetworkGraph.objects.create(**validated_data)
        self._sync_nodes(graph, nodes_data)
        self._sync_edges(graph, edges_data)
        return graph

    def update(self, instance: NetworkGraph, validated_data: Dict[str, Any]) -> NetworkGraph:
        """
        Update and return an existing `NetworkGraph` instance, given the validated data.

        Args:
            instance (NetworkGraph): The existing graph instance to update.
            validated_data (Dict[str, Any]): The validated data for updating the graph.

        Returns:
            NetworkGraph: The updated graph instance.
        """
        nodes_data = validated_data.pop("nodes", None)
        edges_data = validated_data.pop("edges", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if nodes_data is not None:
            self._sync_nodes(instance, nodes_data)
        if edges_data is not None:
            self._sync_edges(instance, edges_data)

        return instance

    def _sync_nodes(self, graph: NetworkGraph, nodes_data: List[Dict[str, Any]]) -> None:
        """
        Sync nodes with the provided data, creating, updating, or deleting as necessary.
        
        Args:
            graph (NetworkGraph): The graph instance to sync nodes for.
            nodes_data (List[Dict[str, Any]]): The list of node data to sync.
        """
        existing_ids = set(graph.nodes.values_list("id", flat=True))
        incoming_ids = {node["id"] for node in nodes_data}

        # Remove nodes that are no longer present
        graph.nodes.filter(id__in=existing_ids - incoming_ids).delete()

        for node in nodes_data:
            node_id = node["id"]
            # Check if this node exists in THIS graph
            existing_node = graph.nodes.filter(id=node_id).first()
            
            if existing_node:
                # Update existing node
                existing_node.type = node.get("type")
                existing_node.label = node.get("label", "")
                existing_node.params = node.get("params") or node.get("data", {}).get("params", {})
                existing_node.position = node.get("position") or node.get("data", {}).get("position", {})
                existing_node.notes = node.get("notes", {})
                existing_node.save()
            else:
                # Create new node for this graph
                LayerNode.objects.create(
                    id=node_id,
                    graph=graph,
                    type=node.get("type"),
                    label=node.get("label", ""),
                    params=node.get("params") or node.get("data", {}).get("params", {}),
                    position=node.get("position") or node.get("data", {}).get("position", {}),
                    notes=node.get("notes", {}),
                )

    def _sync_edges(self, graph: NetworkGraph, edges_data: List[Dict[str, Any]]) -> None:
        """
        Sync edges with the provided data, creating, updating, or deleting as necessary.
        
        Args:
            graph (NetworkGraph): The graph instance to sync edges for.
            edges_data (List[Dict[str, Any]]): The list of edge data to sync.
        """
        existing_ids = set(graph.edges.values_list("id", flat=True))
        incoming_ids = {edge["id"] for edge in edges_data}

        graph.edges.filter(id__in=existing_ids - incoming_ids).delete()

        for edge in edges_data:
            edge_id = edge["id"]
            # Check if this edge exists in THIS graph
            existing_edge = graph.edges.filter(id=edge_id).first()
            
            if existing_edge:
                # Update existing edge
                existing_edge.source_id = edge.get("source")
                existing_edge.target_id = edge.get("target")
                existing_edge.meta = edge.get("meta", {})
                existing_edge.save()
            else:
                # Create new edge for this graph
                Edge.objects.create(
                    id=edge_id,
                    graph=graph,
                    source_id=edge.get("source"),
                    target_id=edge.get("target"),
                    meta=edge.get("meta", {}),
                )


class GraphPresetSerializer(serializers.ModelSerializer):
    class Meta:
        model = GraphPreset
        fields = (
            "id",
            "slug",
            "name",
            "description",
            "graph",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class GraphSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = GraphSnapshot
        fields = (
            "id",
            "graph",
            "label",
            "payload",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class TrainingJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingJob
        fields = (
            "id",
            "graph",
            "status",
            "params",
            "result",
            "dataset_path",
            "artifact_path",
            "progress",
            "error",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "status",
            "result",
            "artifact_path",
            "progress",
            "error",
            "created_at",
            "updated_at",
        )