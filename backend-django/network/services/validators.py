from __future__ import annotations

from typing import Any, Dict, Iterable, List, Sequence
from sklearn import logger

from network.services.types import GraphStructure, GraphValidationError

from network.manifests.layers import (
    list_layers,
    normalize_params_for_layer,
)


def _ensure_known_layers(nodes: Sequence[Dict[str, Any]]) -> None:
    """
    Ensure all nodes reference known layer types (manifest-backed).

    Accepts Keras layer class names.
    """
    known = set(list_layers(include_deprecated=False))
    unknown = [node["type"] for node in nodes if node.get("type") not in known]
    for node in nodes:
        ntype = node.get("type")
        if ntype not in known:
            logger.info(f"Unknown layer type in graph validation: {ntype}")
            logger.info(f"Node details: {node}")
    if unknown:
        raise GraphValidationError(
            {"nodes": [f"Unsupported layer types: {sorted(set(unknown))}"]}
        )


def validate_graph_payload(
    nodes: Sequence[Dict[str, Any]],
    edges: Sequence[Dict[str, Any]],
) -> GraphStructure:
    """
    Validate graph payload and return derived structure.
    Args:
        nodes (Sequence[Dict[str, Any]]): The list of node definitions.
        edges (Sequence[Dict[str, Any]]): The list of edge definitions.
    Returns:
        GraphStructure: The validated graph structure.

    Raises:
        GraphValidationError: If the graph structure is invalid.
    """
    # Import here to avoid circular dependencies
    from network.services.builders import build_graph_structure

    if not nodes:
        raise GraphValidationError({"nodes": ["Graph must contain at least one node"]})

    _ensure_known_layers(nodes)

    structure = build_graph_structure(nodes, edges)

    # Validate parameters strictly against manifest (required and enums)
    validation_errors: Dict[str, List[str]] = {}
    for node in structure.ordered_nodes:
        ntype = node.get("type")
        params = node.get("data", {}).get("params") or node.get("params", {})
        try:
            normalize_params_for_layer(ntype, params)
        except Exception as exc:
            validation_errors.setdefault(node["id"], []).append(str(exc))

    if validation_errors:
        raise GraphValidationError({"nodes": validation_errors})

    return structure