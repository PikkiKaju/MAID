from __future__ import annotations

import io
import json
from dataclasses import dataclass
import uuid
from typing import Any, Dict, Iterable, List, Sequence

from .layers import (
    list_layers,
    get_layer_entry,
    normalize_params_for_layer,
    create_layer,
)


@dataclass
class GraphStructure:
    """Derived structure of a validated graph."""
    ordered_nodes: List[Dict[str, Any]]
    inputs: List[str]
    outputs: List[str]
    adjacency: Dict[str, List[str]]


class GraphValidationError(Exception):
    """Validation error raised when a graph payload is invalid.

    Holds a serializable `detail` object suitable for API responses.
    """

    def __init__(self, detail: Any):
        self.detail = detail
        # Represent as string for Exception base
        super().__init__(str(detail))


def _ensure_known_layers(nodes: Sequence[Dict[str, Any]]) -> None:
    """Ensure all nodes reference known layer types (manifest-backed).

    Accepts Keras layer class names and a special 'Input' node type.
    """
    known = set(list_layers(include_deprecated=False)) | {"Input"}
    unknown = [node["type"] for node in nodes if node.get("type") not in known]
    if unknown:
        raise GraphValidationError(
            {"nodes": [f"Unsupported layer types: {sorted(set(unknown))}"]}
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


def _build_graph_structure(
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

    if not nodes:
        raise GraphValidationError({"nodes": ["Graph must contain at least one node"]})

    _ensure_known_layers(nodes)

    structure = _build_graph_structure(nodes, edges)

    # Validate parameters strictly against manifest (required and enums)
    validation_errors: Dict[str, List[str]] = {}
    for node in structure.ordered_nodes:
        ntype = node.get("type")
        if ntype == "Input":
            # No manifest entry; rely on Keras for errors during build
            continue
        params = node.get("data", {}).get("params") or node.get("params", {})
        try:
            normalize_params_for_layer(ntype, params)
        except Exception as exc:
            validation_errors.setdefault(node["id"], []).append(str(exc))

    if validation_errors:
        raise GraphValidationError({"nodes": validation_errors})

    return structure


def _build_keras_model(
    structure: GraphStructure,
    nodes: Sequence[Dict[str, Any]],
    edges: Sequence[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Attempt to construct a model from the provided graph.
    1. Validate the graph structure.
    2. Create a mapping of node IDs to their tensor representations.
    3. Build the Keras model using the functional API.
    4. Generate a summary of the model and count parameters.
    5. Return the summary and parameter count.

    Args:
        nodes (Sequence[Dict[str, Any]]): The list of node definitions.
        edges (Sequence[Dict[str, Any]]): The list of edge definitions.
    Returns:
        Dict[str, Any]: Compilation result including model summary and parameter count.
    """

    structure = validate_graph_payload(nodes, edges)

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

        if ntype == "Input":
            from keras import Input  # lazy import
            kwargs = {k: v for k, v in (params or {}).items() if v not in (None, "")}
            tensor = Input(**kwargs)
        else:
            normalized = normalize_params_for_layer(ntype, params)
            layer = create_layer(ntype, normalized)
            if len(inbound_tensors) == 0:
                # Most layers expect inputs; defer to Keras error if invalid
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
    model = _build_keras_model(structure, nodes, edges)

    summary_stream = io.StringIO()
    model.summary(print_fn=lambda line: summary_stream.write(line + "\n"))

    return {
        "summary": summary_stream.getvalue(),
        "parameter_count": int(model.count_params()),
        "input_shape": [getattr(tensor, "shape", None) for tensor in model.inputs],
        "output_shape": [getattr(tensor, "shape", None) for tensor in model.outputs],
    }


def export_graph_to_python_script(
    nodes: Sequence[Dict[str, Any]],
    edges: Sequence[Dict[str, Any]],
    *,
    model_name: str = "generated_model",
) -> str:
    """Return a standalone Python script that can rebuild the model in two ways:
    - build_model_json(): via model_from_json using Keras model.to_json()
    - build_model_py(): via explicit Keras functional API code (generic, manifest-driven)
    """

    structure = validate_graph_payload(nodes, edges)
    model = _build_keras_model(structure, nodes, edges)
    model_json_literal = json.dumps(model.to_json())
    safe_model_name = json.dumps(model_name)

    # Helpers to format Python literals and identifiers
    def _py_lit(val: Any) -> str:
        if val is None:
            return "None"
        if isinstance(val, bool):
            return "True" if val else "False"
        if isinstance(val, (int, float)):
            return repr(val)
        if isinstance(val, (list, tuple)):
            items = ", ".join(_py_lit(v) for v in tuple(val))
            return f"({items})" if isinstance(val, tuple) else f"[{items}]"
        # strings and everything else via json for safe quoting
        return json.dumps(val)

    def _ident(s: str) -> str:
        # Make a pythonic identifier from node id
        out = ["n"]
        for ch in s:
            if ch.isalnum() or ch == "_":
                out.append(ch)
            else:
                out.append("_")
        ident = "".join(out)
        # Avoid starting with digit
        if ident and ident[0].isdigit():
            ident = f"n_{ident}"
        return ident

    # Pre-compute inbound map
    inbound_map: Dict[str, List[str]] = {
        node["id"]: [e["source"] for e in edges if e.get("target") == node["id"]]
        for node in structure.ordered_nodes
    }

    # Generate python code that reconstructs the graph
    code_lines: List[str] = []
    code_lines.append("# Build model using explicit Keras functional API code")
    code_lines.append("def build_model_py():")
    code_lines.append("    from keras import Input, Model")
    code_lines.append("    from keras import layers")
    # Map node id to variable name
    var_for: Dict[str, str] = {node["id"]: _ident(node["id"]) for node in structure.ordered_nodes}

    for node in structure.ordered_nodes:
        nid = node["id"]
        v = var_for[nid]
        ntype = node["type"]
        params = node.get("data", {}).get("params") or node.get("params", {})
        # Strict normalization against manifest where applicable
        norm = params if ntype == "Input" else normalize_params_for_layer(ntype, params)
        in_vars = [var_for[p] for p in inbound_map[nid]]

        if ntype == "Input":
            kwargs = {k: v for k, v in (norm or {}).items() if v is not None}
            args_str = ", ".join(f"{k}={_py_lit(v)}" for k, v in kwargs.items())
            code_lines.append(f"    {v} = Input({args_str})")
        else:
            kwargs = {k: v for k, v in (norm or {}).items() if v is not None}
            args_str = ", ".join(f"{k}={_py_lit(v)}" for k, v in kwargs.items())
            if not in_vars:
                code_lines.append(f"    {v} = layers.{ntype}({args_str})  # no inbound provided")
            elif len(in_vars) == 1:
                code_lines.append(f"    {v} = layers.{ntype}({args_str})({in_vars[0]})")
            else:
                code_lines.append(f"    {v} = layers.{ntype}({args_str})([{', '.join(in_vars)}])")

    # Inputs and outputs lists
    input_vars = [var_for[i] for i in structure.inputs]
    output_vars = [var_for[o] for o in structure.outputs]
    code_lines.append(
        f"    model = Model(inputs={[', '.join(input_vars)][0] if len(input_vars)>1 else '[' + ', '.join(input_vars) + ']'}, "
        f"outputs={[', '.join(output_vars)][0] if len(output_vars)>1 else '[' + ', '.join(output_vars) + ']'} )"
    )
    code_lines.append("    return model")

    # Entire script content
    script_lines = [
        "# Auto-generated TensorFlow/Keras model script",
        f"MODEL_NAME = {safe_model_name}",
        "",
        "# --- JSON-based reconstruction ---",
        "from keras.models import model_from_json",
        "",
        f"MODEL_JSON = {model_json_literal}",
        "",
        "def build_model_json():",
        "    return model_from_json(MODEL_JSON)",
        "",
        "# --- Python code reconstruction ---",
        *code_lines,
        "",
        "if __name__ == '__main__':",
        "    # Prefer explicit Python build by default",
        "    model = build_model_py()",
        "    model.summary()",
        "",
    ]

    return "\n".join(script_lines)


def import_keras_json_to_graph(model_json: str) -> Dict[str, Any]:
    """Convert a Keras model.to_json() payload into the graph payload.

    Currently supports Sequential models and common layers used in CNN/MLP examples.
    Returns a dict with keys: name, framework, nodes, edges.
    """
    try:
        from keras.models import model_from_json
    except Exception as exc:  # pragma: no cover
        raise GraphValidationError({"detail": f"Keras not available: {exc}"})

    # Build model to read configs robustly
    model = model_from_json(model_json)
    mconf = model.get_config() if hasattr(model, "get_config") else {}
    model_name = mconf.get("name") or getattr(model, "name", "imported_model")

    # Simple Sequential import path
    is_sequential = model.__class__.__name__.lower() == "sequential"
    if not is_sequential:
        # Limited functional support can be added later
        raise GraphValidationError({
            "model": ["Only Sequential models are supported for import in this version."]
        })

    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    counters: Dict[str, int] = {}
    # Use a short random prefix to avoid primary-key collisions across imports
    global_prefix = f"g{uuid.uuid4().hex[:8]}"

    def next_id(prefix: str) -> str:
        counters[prefix] = counters.get(prefix, 0) + 1
        return f"{global_prefix}-{prefix}-{counters[prefix]}"

    def add_edge(src: str, tgt: str) -> None:
        eid = next_id("e")
        edges.append({"id": eid, "source": src, "target": tgt, "meta": {}})

    last_node_id: str | None = None
    # Keras Sequential exposes .layers in execution order (InputLayer often included)
    layers_list = list(model.layers)
    last_index = len(layers_list) - 1 if layers_list else -1

    # If there is no explicit InputLayer, synthesize one using the model/first-layer config
    has_explicit_input = any(l.__class__.__name__ == "InputLayer" for l in layers_list)
    if not has_explicit_input and layers_list:
        # Try model.input_shape first
        shape_tuple = None
        try:
            m_in_shape = getattr(model, "input_shape", None)
            # could be tuple or list of tuples
            if isinstance(m_in_shape, (list, tuple)) and m_in_shape is not None:
                # If it's a list of shapes, take the first
                shape_tuple = m_in_shape[0] if (isinstance(m_in_shape, list) and m_in_shape and isinstance(m_in_shape[0], (list, tuple))) else m_in_shape
        except Exception:
            shape_tuple = None

        # Fallback to first layer config
        first_layer = layers_list[0]
        first_cfg = first_layer.get_config() if hasattr(first_layer, "get_config") else {}
        if shape_tuple is None:
            if "batch_input_shape" in first_cfg and first_cfg["batch_input_shape"]:
                bs = first_cfg["batch_input_shape"][1:]
                shape_tuple = tuple(x for x in bs)
            elif "batch_shape" in first_cfg and first_cfg["batch_shape"]:
                bs = first_cfg["batch_shape"][1:]
                shape_tuple = tuple(x for x in bs)
            elif "input_shape" in first_cfg and first_cfg["input_shape"]:
                shape_tuple = tuple(first_cfg["input_shape"])
            elif "input_dim" in first_cfg and first_cfg["input_dim"]:
                shape_tuple = (first_cfg["input_dim"],)

        # Normalize: drop batch dim, filter out None
        norm_shape = None
        if isinstance(shape_tuple, (list, tuple)) and shape_tuple:
            try:
                norm_shape = tuple(int(x) for x in list(shape_tuple)[1:] if x is not None)
            except Exception:
                # If casting fails, keep raw values except the first (batch)
                norm_shape = tuple(x for x in list(shape_tuple)[1:] if x is not None)

        # dtype from model inputs if available
        dtype = "float32"
        try:
            if getattr(model, "inputs", None):
                dt = getattr(model.inputs[0], "dtype", None)
                dtype = str(dt) if dt else dtype
        except Exception:
            pass

        # Create synthesized input node only if we could infer a plausible shape
        if norm_shape:
            in_id = next_id("input")
            nodes.append(
                {
                    "id": in_id,
                    "type": "inputLayer",
                    "label": "Input",
                    "params": {"shape": tuple(norm_shape), "dtype": dtype, "name": None},
                    "position": {},
                    "notes": {"synthesized": True},
                }
            )
            last_node_id = in_id

    for idx, layer in enumerate(layers_list):
        lclass = layer.__class__.__name__
        cfg = layer.get_config() if hasattr(layer, "get_config") else {}

        if lclass == "InputLayer":
            shape = None
            # batch_input_shape preferred; drop batch dim
            if "batch_input_shape" in cfg and cfg["batch_input_shape"]:
                bs = cfg["batch_input_shape"][1:]
                shape = tuple(int(x) for x in bs if x is not None)
            elif "batch_shape" in cfg and cfg["batch_shape"]:
                bs = cfg["batch_shape"][1:]
                shape = tuple(int(x) for x in bs if x is not None)
            dtype = cfg.get("dtype") or "float32"
            nid = next_id("input")
            nodes.append(
                {
                    "id": nid,
                    "type": "inputLayer",
                    "label": cfg.get("name") or "Input",
                    "params": {"shape": shape, "dtype": dtype, "name": cfg.get("name")},
                    "position": {},
                    "notes": {},
                }
            )
            last_node_id = nid
            continue

        if lclass == "Conv2D":
            nid = next_id("conv")
            nodes.append(
                {
                    "id": nid,
                    "type": "conv2dLayer",
                    "label": cfg.get("name") or "Conv2D",
                    "params": {
                        "filters": cfg.get("filters"),
                        "kernel": tuple(cfg.get("kernel_size") or (3, 3)),
                        "strides": tuple(cfg.get("strides") or (1, 1)),
                        "padding": cfg.get("padding") or "valid",
                        "activation": cfg.get("activation") or None,
                        "use_bias": cfg.get("use_bias", True),
                        "name": cfg.get("name"),
                    },
                    "position": {},
                    "notes": {},
                }
            )
            if last_node_id:
                add_edge(last_node_id, nid)
            last_node_id = nid
            continue

        if lclass == "MaxPooling2D":
            nid = next_id("pool")
            nodes.append(
                {
                    "id": nid,
                    "type": "maxPool2DLayer",
                    "label": cfg.get("name") or "MaxPool2D",
                    "params": {
                        "pool": tuple(cfg.get("pool_size") or (2, 2)),
                        "strides": tuple(cfg.get("strides") or (2, 2)),
                        "padding": cfg.get("padding") or "valid",
                    },
                    "position": {},
                    "notes": {},
                }
            )
            if last_node_id:
                add_edge(last_node_id, nid)
            last_node_id = nid
            continue

        if lclass == "Flatten":
            nid = next_id("flatten")
            nodes.append(
                {
                    "id": nid,
                    "type": "flattenLayer",
                    "label": cfg.get("name") or "Flatten",
                    "params": {"data_format": cfg.get("data_format")},
                    "position": {},
                    "notes": {},
                }
            )
            if last_node_id:
                add_edge(last_node_id, nid)
            last_node_id = nid
            continue

        if lclass == "GlobalAveragePooling2D":
            nid = next_id("gap")
            nodes.append(
                {
                    "id": nid,
                    "type": "gap2DLayer",
                    "label": cfg.get("name") or "GlobalAveragePooling2D",
                    "params": {},
                    "position": {},
                    "notes": {},
                }
            )
            if last_node_id:
                add_edge(last_node_id, nid)
            last_node_id = nid
            continue

        if lclass == "Dense":
            is_last = idx == last_index
            layer_type = "outputLayer" if is_last else "denseLayer"
            nid = next_id("out" if is_last else "dense")
            nodes.append(
                {
                    "id": nid,
                    "type": layer_type,
                    "label": cfg.get("name") or ("Output" if is_last else "Dense"),
                    "params": {
                        "units": cfg.get("units"),
                        "activation": cfg.get("activation") or ("linear" if is_last else None),
                        "use_bias": cfg.get("use_bias", True),
                        "name": cfg.get("name"),
                    },
                    "position": {},
                    "notes": {},
                }
            )
            if last_node_id:
                add_edge(last_node_id, nid)
            last_node_id = nid
            continue

        # Unknown/unsupported layer: attempt to preserve by skipping but note it
        nid = next_id("node")
        nodes.append(
            {
                "id": nid,
                "type": "flattenLayer",  # safe no-op-ish representation downstream
                "label": f"Unsupported:{lclass}",
                "params": {},
                "position": {},
                "notes": {"unsupported_class": lclass, "original_config": cfg},
            }
        )
        if last_node_id:
            add_edge(last_node_id, nid)
        last_node_id = nid

    graph_payload = {
        "name": model_name or "Imported Model",
        "task": "",
        "framework": "tf-keras",
        "framework_version": "",
        "description": "Imported from Keras model JSON",
        "metadata": {},
        "nodes": nodes,
        "edges": edges,
    }

    # Validate to ensure the constructed graph is acceptable
    validate_graph_payload(nodes, edges)
    return graph_payload