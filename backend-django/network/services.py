from __future__ import annotations

import io
import json
from dataclasses import dataclass
import uuid
import os
import tempfile
import zipfile
from typing import Any, Dict, Iterable, List, Sequence

from sklearn import logger

try:
    # Prefer Keras 3 API
    from keras import models as _keras_models  # type: ignore
except Exception:  # pragma: no cover - fallback to tf.keras
    _keras_models = None  # type: ignore
try:
    from tensorflow import keras as _tf_keras  # type: ignore
except Exception:  # pragma: no cover
    _tf_keras = None  # type: ignore

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
        known = set(list_layers(include_deprecated=False))
        input_names_in_manifest = {n for n in ("Input", "InputLayer") if n in known}
        norm = params if ntype in input_names_in_manifest else normalize_params_for_layer(ntype, params)
        in_vars = [var_for[p] for p in inbound_map[nid]]

        if ntype in input_names_in_manifest:
            kwargs = {k: v for k, v in (norm or {}).items() if v is not None}
            args_str = ", ".join(f"{k}={_py_lit(v)}" for k, v in kwargs.items())
            code_lines.append(f"    {v} = Input({args_str})")
        else:
            kwargs = {k: v for k, v in (norm or {}).items() if v is not None}
            args_str = ", ".join(f"{k}={_py_lit(v)}" for k, v in kwargs.items())
            if not in_vars:
                # If no inbound provided, try to synthesize an Input from input-like params
                input_like_keys = {"batch_input_shape", "batch_shape", "input_shape", "input_dim", "shape", "dtype", "name"}
                has_input_like = any(k in kwargs for k in input_like_keys)
                if has_input_like:
                    # create an Input and apply the layer to it
                    input_ident = f"{v}_in"
                    ikw = {k: kwargs[k] for k in ("shape", "input_shape", "batch_shape", "batch_input_shape", "dtype", "name") if k in kwargs}
                    # prefer shape/batch_shape mapping in the generated code
                    if "batch_input_shape" in ikw:
                        code_lines.append(f"    {input_ident} = Input(batch_shape={_py_lit(ikw['batch_input_shape'])}, dtype={_py_lit(ikw.get('dtype'))})")
                        code_lines.append(f"    {v} = layers.{ntype}({args_str})({input_ident})")
                    elif "input_shape" in ikw or "shape" in ikw or "input_dim" in ikw:
                        # choose shape-like key
                        shape_val = ikw.get("input_shape") or ikw.get("shape") or ikw.get("input_dim")
                        code_lines.append(f"    {input_ident} = Input(shape={_py_lit(shape_val)}, dtype={_py_lit(ikw.get('dtype'))})")
                        code_lines.append(f"    {v} = layers.{ntype}({args_str})({input_ident})")
                    else:
                        code_lines.append(f"    {v} = layers.{ntype}({args_str})  # no inbound provided")
                else:
                    code_lines.append(f"    {v} = layers.{ntype}({args_str})  # no inbound provided")

            elif len(in_vars) == 1:
                code_lines.append(f"    {v} = layers.{ntype}({args_str})({in_vars[0]})")
            else:
                code_lines.append(f"    {v} = layers.{ntype}({args_str})([{', '.join(in_vars)}])")

    # Inputs and outputs lists
    input_vars = [var_for[i] for i in structure.inputs]
    output_vars = [var_for[o] for o in structure.outputs]
    inputs_repr = ", ".join(input_vars)
    outputs_repr = ", ".join(output_vars)
    code_lines.append(f"    model = Model(inputs=[{inputs_repr}], outputs=[{outputs_repr}])")
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

    Currently supports Sequential models. Builds nodes/edges generically using
    Keras layer configs and the manifest (no hardcoded per-layer branches).
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

    # Simple Sequential import path only for now
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
    # Keras Sequential exposes .layers in execution order (InputLayer may be included)
    layers_list = list(model.layers)
    last_index = len(layers_list) - 1 if layers_list else -1

    def _infer_input_from_model_or_first_layer() -> Dict[str, Any] | None:
        """Infer an Input node params dict from the model or first layer config.
        Returns a node dict or None if not enough info.
        """
        if not layers_list:
            return None
        # Try model.input_shape first (can be tuple or list of tuples)
        shape_tuple = None
        try:
            m_in_shape = getattr(model, "input_shape", None)
            if isinstance(m_in_shape, (list, tuple)) and m_in_shape is not None:
                shape_tuple = m_in_shape[0] if (isinstance(m_in_shape, list) and m_in_shape and isinstance(m_in_shape[0], (list, tuple))) else m_in_shape
        except Exception:
            shape_tuple = None

        # Fallback to first layer config
        first_layer = layers_list[0]
        first_cfg = first_layer.get_config() if hasattr(first_layer, "get_config") else {}
        if shape_tuple is None:
            if first_cfg.get("batch_input_shape"):
                bs = first_cfg["batch_input_shape"][1:]
                shape_tuple = tuple(x for x in bs)
            elif first_cfg.get("batch_shape"):
                bs = first_cfg["batch_shape"][1:]
                shape_tuple = tuple(x for x in bs)
            elif first_cfg.get("input_shape"):
                shape_tuple = tuple(first_cfg["input_shape"])
            elif first_cfg.get("input_dim"):
                shape_tuple = (first_cfg["input_dim"],)

        # Normalize: drop batch dim if present in full batch shape, filter None
        norm_shape = None
        if isinstance(shape_tuple, (list, tuple)) and shape_tuple:
            try:
                # If batch already removed above, don't drop again; detect by len match
                # Here we conservatively drop first dim assuming it's batch
                norm_shape = tuple(int(x) for x in list(shape_tuple)[1:] if x is not None)
                if not norm_shape:
                    # If nothing left, try keep as-is but remove Nones
                    norm_shape = tuple(int(x) for x in list(shape_tuple) if x is not None)
            except Exception:
                norm_shape = tuple(x for x in list(shape_tuple)[1:] if x is not None)

        # dtype from model inputs if available
        dtype = "float32"
        try:
            if getattr(model, "inputs", None):
                dt = getattr(model.inputs[0], "dtype", None)
                dtype = str(dt) if dt else dtype
        except Exception:
            pass

        if norm_shape:
            in_id = next_id("input")
            return {
                "id": in_id,
                "type": "Input",
                "label": "Input",
                "params": {"shape": tuple(norm_shape), "dtype": dtype, "name": None},
                "position": {},
                "notes": {"synthesized": True},
            }
        return None

    # If there is no explicit InputLayer, synthesize one using inferred shape
    has_explicit_input = any(l.__class__.__name__ == "InputLayer" for l in layers_list)
    if not has_explicit_input:
        maybe_input = _infer_input_from_model_or_first_layer()
        if maybe_input:
            nodes.append(maybe_input)
            last_node_id = maybe_input["id"]

    known = set(list_layers(include_deprecated=False))

    for idx, layer in enumerate(layers_list):
        lclass = layer.__class__.__name__
        cfg = layer.get_config() if hasattr(layer, "get_config") else {}

        # Explicit InputLayer becomes a dedicated Input node
        if lclass == "InputLayer":
            # Prefer batch_input_shape / batch_shape in config
            shape = None
            if cfg.get("batch_input_shape"):
                bs = cfg["batch_input_shape"][1:]
                try:
                    shape = tuple(int(x) for x in bs if x is not None)
                except Exception:
                    shape = tuple(x for x in bs if x is not None)
            elif cfg.get("batch_shape"):
                bs = cfg["batch_shape"][1:]
                try:
                    shape = tuple(int(x) for x in bs if x is not None)
                except Exception:
                    shape = tuple(x for x in bs if x is not None)
            elif cfg.get("input_shape"):
                try:
                    shape = tuple(int(x) for x in cfg.get("input_shape") if x is not None)
                except Exception:
                    shape = tuple(x for x in cfg.get("input_shape") if x is not None)
            dtype = cfg.get("dtype") or "float32"
            nid = next_id("input")
            nodes.append(
                {
                    "id": nid,
                    "type": "Input",
                    "label": cfg.get("name") or "Input",
                    "params": {"shape": shape, "dtype": dtype, "name": cfg.get("name")},
                    "position": {},
                    "notes": {},
                }
            )
            last_node_id = nid
            continue

        # Non-input layers: map config to manifest-declared kwargs
        nid_prefix = "node"
        if lclass.lower().startswith("conv"):
            nid_prefix = "conv"
        elif "pool" in lclass.lower():
            nid_prefix = "pool"
        elif lclass.lower().startswith("dense"):
            nid_prefix = "dense" if idx != last_index else "out"
        elif lclass.lower().startswith("flatten"):
            nid_prefix = "flatten"

        nid = next_id(nid_prefix)

        if lclass in known:
            entry = get_layer_entry(lclass)
            declared_params = {p.get("name") for p in entry.get("parameters", [])}
            raw_params = {k: v for k, v in (cfg or {}).items() if k in declared_params and k != "name"}
            try:
                norm_params = normalize_params_for_layer(lclass, raw_params)
            except Exception:
                # Fall back to raw params if normalization fails; validate later
                norm_params = {k: v for k, v in raw_params.items() if v is not None}
        else:
            # Unknown class to our manifest; keep empty params, let validation flag it
            norm_params = {}

        nodes.append(
            {
                "id": nid,
                "type": lclass,
                "label": cfg.get("name") or lclass,
                "params": norm_params,
                "position": {},
                "notes": {},
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


# --------------------------------------------------------------------------------------
# Importers for uploaded Keras artifacts (.keras / .h5 / SavedModel zip)
# --------------------------------------------------------------------------------------

def _is_savedmodel_dir(path: str) -> bool:
    return os.path.isdir(path) and os.path.exists(os.path.join(path, "saved_model.pb"))


def _safe_extract_zip(zip_path: str, dest_dir: str) -> str:
    with zipfile.ZipFile(zip_path, "r") as zf:
        for member in zf.namelist():
            # Guard against zip slip
            member_path = os.path.normpath(os.path.join(dest_dir, member))
            if not member_path.startswith(os.path.abspath(dest_dir)):
                raise GraphValidationError({"detail": "Unsafe zip contents"})
        zf.extractall(dest_dir)
    return dest_dir


def _keras_load_model(path: str):
    loader = None
    if _keras_models is not None:
        loader = _keras_models.load_model
    elif _tf_keras is not None:
        loader = _tf_keras.models.load_model  # type: ignore[attr-defined]
    else:
        raise GraphValidationError({"detail": "Keras/TensorFlow is not available on the server"})
    # Don't try to compile on load; we only need the graph
    return loader(path, compile=False)


def load_graph_from_keras_artifact(path: str) -> Dict[str, Any]:
    """
    Load a Keras model from an artifact and convert it to our graph payload.

    Supported inputs:
      - .keras (Keras 3 native format)
      - .h5 / .hdf5 (HDF5 format)
      - SavedModel directory (contains saved_model.pb)
      - .zip containing a SavedModel directory or a single .keras/.h5
    """
    tmp_dir_ctx: tempfile.TemporaryDirectory[str] | None = None
    try:
        artifact_path = path
        lower = path.lower()
        if lower.endswith(".zip"):
            tmp_dir_ctx = tempfile.TemporaryDirectory()
            extract_dir = _safe_extract_zip(path, tmp_dir_ctx.name)
            # Try to find a recognizable artifact inside
            candidates: List[str] = []
            for root, dirs, files in os.walk(extract_dir):
                # SavedModel dir
                if "saved_model.pb" in files:
                    candidates.append(root)
                for f in files:
                    if f.lower().endswith((".keras", ".h5", ".hdf5")):
                        candidates.append(os.path.join(root, f))
            if not candidates:
                raise GraphValidationError({
                    "detail": "Zip does not contain a supported Keras artifact (.keras/.h5 or SavedModel)",
                })
            # Prefer SavedModel directory first
            artifact_path = sorted(candidates, key=lambda p: (not _is_savedmodel_dir(p), len(p)))[0]

        # Load model
        if _is_savedmodel_dir(artifact_path) or artifact_path.lower().endswith((".keras", ".h5", ".hdf5")):
            model = _keras_load_model(artifact_path)
        else:
            raise GraphValidationError({
                "detail": "Unsupported artifact. Provide .keras, .h5, SavedModel dir, or a zip of those.",
            })

        # Convert to graph via JSON
        model_json = model.to_json()
        graph_payload = import_keras_json_to_graph(model_json)
        # Include original model name in metadata
        graph_payload.setdefault("metadata", {})["keras_model_name"] = getattr(model, "name", "model")
        return graph_payload
    finally:
        if tmp_dir_ctx is not None:
            tmp_dir_ctx.cleanup()