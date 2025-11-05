from __future__ import annotations

import io
from typing import Any, Dict, Iterable, List, Sequence

from .types import GraphStructure, GraphValidationError

from network.services import validate_graph_payload

from network.layers import (
    list_layers,
    normalize_params_for_layer,
    create_layer,
)


def _topological_sort(
    node_ids: Iterable[str],
    incoming_map: Dict[str, List[str]],
) -> List[str]:
    """
    Perform a topological sort of the nodes based on their incoming edges.
    Raises GraphValidationError if a cycle is detected.
    
    Args:
        node_ids (Iterable[str]): The IDs of the nodes to sort.
        incoming_map (Dict[str, List[str]]): A mapping of nodes to their incoming edges.
    Returns:
        List[str]: The sorted node IDs.
    """

    # Calculate how many incoming edges each node has (indegree)
    indegree = {node_id: len(incoming_map.get(node_id, [])) for node_id in node_ids}
    # Initialize the queue with all nodes of indegree 0
    queue = [node_id for node_id, degree in indegree.items() if degree == 0]
    ordered: List[str] = []

    # Kahn's algorithm for topological sorting
    while queue:
        node_id = queue.pop(0)
        ordered.append(node_id)
        for target, parents in incoming_map.items():
            if node_id in parents:
                indegree[target] -= 1
                if indegree[target] == 0:
                    queue.append(target)

    if len(ordered) != len(indegree):
        raise GraphValidationError(
            {"edges": ["Cycle detected in graph. Ensure the model is a directed acyclic graph."]}
        )

    return ordered


def build_graph_structure(
    nodes: Sequence[Dict[str, Any]],
    edges: Sequence[Dict[str, Any]],
) -> GraphStructure:
    """
    Build the graph structure from the provided nodes and edges.

    Args:
        nodes (Sequence[Dict[str, Any]]): The list of node definitions.
        edges (Sequence[Dict[str, Any]]): The list of edge definitions.
    Returns:
        GraphStructure: The validated graph structure.

    Raises:
        GraphValidationError: If the graph structure is invalid.
    """
    node_lookup = {node["id"]: node for node in nodes}
    if len(node_lookup) != len(nodes):
        raise GraphValidationError({"nodes": ["Duplicate node ids detected"]})

    # Initialize incoming and adjacency maps
    incoming: Dict[str, List[str]] = {node_id: [] for node_id in node_lookup}
    # Initialize the adjacency map
    adjacency: Dict[str, List[str]] = {node_id: [] for node_id in node_lookup}

    # Populate the incoming and adjacency maps
    for edge in edges:
        source = edge.get("source")
        target = edge.get("target")
        if source not in node_lookup:
            raise GraphValidationError({"edges": [f"Edge references unknown source node '{source}'"]})
        if target not in node_lookup:
            raise GraphValidationError({"edges": [f"Edge references unknown target node '{target}'"]})
        incoming[target].append(source)
        adjacency[source].append(target)

    # Perform topological sort to determine processing order
    ordered_ids = _topological_sort(node_lookup.keys(), incoming)
    inputs = [node_id for node_id in ordered_ids if len(incoming[node_id]) == 0]
    outputs = [node_id for node_id in ordered_ids if len(adjacency[node_id]) == 0]

    if not inputs:
        raise GraphValidationError({"nodes": ["Graph requires at least one input node"]})
    if not outputs:
        raise GraphValidationError({"nodes": ["Graph requires at least one output node"]})

    return GraphStructure(
        ordered_nodes=[node_lookup[node_id] for node_id in ordered_ids],
        inputs=inputs,
        outputs=outputs,
        adjacency=adjacency,
    )


def build_keras_model(
    structure: GraphStructure,
    nodes: Sequence[Dict[str, Any]],
    edges: Sequence[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Build and return a Keras Model from a validated GraphStructure.

    Args:
        nodes (Sequence[Dict[str, Any]]): The list of node definitions.
        edges (Sequence[Dict[str, Any]]): The list of edge definitions.
    Returns:
        Dict[str, Any]: Compilation result including model summary and parameter count.
    """
    # Map of node ID to its tensor representation
    tensors: Dict[str, Any] = {}
    inbound_map: Dict[str, List[str]] = {
        node["id"]: [edge["source"] for edge in edges if edge.get("target") == node["id"]]
        for node in structure.ordered_nodes
    }

    inputs: List[Any] = []
    outputs: List[Any] = []

    # Build the model using the functional API
    for node in structure.ordered_nodes:
        ntype = node.get("type")
        params = node.get("data", {}).get("params") or node.get("params", {})
        inbound_tensors = [tensors[parent_id] for parent_id in inbound_map[node["id"]]]

        # If the manifest includes a dedicated input layer name (e.g. "Input" or "InputLayer")
        known = set(list_layers(include_deprecated=False))
        input_names_in_manifest = {n for n in ("Input", "InputLayer") if n in known}

        if ntype in input_names_in_manifest:
            # Construct an Input tensor using provided params
            from keras import Input  # lazy import
            kwargs = {k: v for k, v in (params or {}).items() if v not in (None, "")}
            tensor = Input(**kwargs)
        else:
            # Normal layer path
            normalized = normalize_params_for_layer(ntype, params)
            layer = create_layer(ntype, normalized)

            if len(inbound_tensors) == 0:
                # If no inbound tensors, try to synthesize an Input() from any input-like params
                input_like_keys = {"batch_input_shape", "batch_shape", "input_shape", "input_dim", "shape", "dtype", "name"}
                input_kwargs_raw = {k: v for k, v in (normalized or {}).items() if k in input_like_keys and v not in (None, "")}
                if input_kwargs_raw:
                    from keras import Input  # lazy import
                    # map possible keys to Input() kwargs
                    ikw: Dict[str, Any] = {}
                    if "batch_input_shape" in input_kwargs_raw:
                        ikw["batch_shape"] = input_kwargs_raw["batch_input_shape"]
                    elif "batch_shape" in input_kwargs_raw:
                        ikw["batch_shape"] = input_kwargs_raw["batch_shape"]
                    elif "input_shape" in input_kwargs_raw:
                        ikw["shape"] = input_kwargs_raw["input_shape"]
                    elif "input_dim" in input_kwargs_raw:
                        ikw["shape"] = (input_kwargs_raw["input_dim"],)
                    elif "shape" in input_kwargs_raw:
                        ikw["shape"] = input_kwargs_raw["shape"]
                    if "dtype" in input_kwargs_raw:
                        ikw["dtype"] = input_kwargs_raw["dtype"]
                    if "name" in input_kwargs_raw:
                        ikw["name"] = input_kwargs_raw["name"]
                    in_tensor = Input(**ikw)
                    tensor = layer(in_tensor)
                else:
                    # No inbound and no input-like params: leave as Layer instance (will likely error later)
                    tensor = layer
            elif len(inbound_tensors) == 1:
                tensor = layer(inbound_tensors[0])
            else:
                tensor = layer(inbound_tensors)
        tensors[node["id"]] = tensor

        # Track input and output tensors
        if node["id"] in structure.inputs:
            inputs.append(tensor)
        if node["id"] in structure.outputs:
            outputs.append(tensor)

    from keras import Model  # Imported lazily to keep startup cost low

    return Model(inputs=inputs, outputs=outputs)


def compile_graph(
    nodes: Sequence[Dict[str, Any]],
    edges: Sequence[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Attempt to construct a model from the provided graph.
    1. Validate the graph structure.
    2. Build the Keras model using the functional API.
    3. Generate a summary of the model and count parameters.
    4. Return the summary and parameter count.

    Args:
        nodes (Sequence[Dict[str, Any]]): The list of node definitions.
        edges (Sequence[Dict[str, Any]]): The list of edge definitions.
    Returns:
        Dict[str, Any]: Compilation result including model summary and parameter count.
    """

    structure = validate_graph_payload(nodes, edges)
    model = build_keras_model(structure, nodes, edges)

    summary_stream = io.StringIO()
    model.summary(print_fn=lambda line: summary_stream.write(line + "\n"))

    return {
        "summary": summary_stream.getvalue(),
        "parameter_count": int(model.count_params()),
        "input_shape": [getattr(tensor, "shape", None) for tensor in model.inputs],
        "output_shape": [getattr(tensor, "shape", None) for tensor in model.outputs],
    }