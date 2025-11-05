from __future__ import annotations

import uuid
import os
import tempfile
import zipfile
from typing import Any, Dict, List

try:
    # Prefer Keras 3 API
    from keras import models as _keras_models  # type: ignore
except Exception:  # pragma: no cover - fallback to tf.keras
    _keras_models = None  # type: ignore
try:
    from tensorflow import keras as _tf_keras  # type: ignore
except Exception:  # pragma: no cover
    _tf_keras = None  # type: ignore

from network.services.types import GraphValidationError

from network.layers import (
    list_layers,
    get_layer_entry,
    normalize_params_for_layer,
    create_layer,
)


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


# --------------------------
# Importers for uploaded Keras artifacts (.keras / .h5 / SavedModel zip)
# --------------------------


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