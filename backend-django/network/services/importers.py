from __future__ import annotations

import uuid
import os
import tempfile
import zipfile
from pathlib import Path
from django.conf import settings
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
from network.services.validators import validate_graph_payload

from network.manifests.layers import (
    list_layers,
    get_layer_entry,
    normalize_params_for_layer,
    create_layer,
)


def import_keras_json_to_graph(model_json: str) -> Dict[str, Any]:
    """Convert a Keras model.to_json() payload into our graph payload.

    Robust to Keras 3 vs tf.keras differences by preferring parsing the JSON dict
    directly (class_name/config format). Falls back to keras.models.model_from_json
    only when needed.
    """
    parsed: Dict[str, Any] | None = None
    # 1) Try to parse as plain JSON (Keras 3 style serialization)
    try:
        import json as _json
        maybe = _json.loads(model_json)
        if isinstance(maybe, dict) and maybe.get("class_name"):
            parsed = maybe
    except Exception:
        parsed = None

    layers_list: List[Dict[str, Any]] = []
    model_name: str = "imported_model"
    is_sequential = False

    if parsed is not None:
        cls = str(parsed.get("class_name", "")).lower()
        is_sequential = (cls == "sequential")
        model_name = parsed.get("config", {}).get("name") or model_name
        if cls in {"sequential", "functional", "model"}:
            layers_list = list(parsed.get("config", {}).get("layers", []) or [])
        else:
            raise GraphValidationError({
                "model": ["Only Sequential or Functional Keras models can be imported."]
            })
    else:
        # 2) Fallback: use model_from_json (older tf.keras formats)
        try:
            from keras.models import model_from_json
        except Exception as exc:  # pragma: no cover
            raise GraphValidationError({"detail": f"Keras not available: {exc}"})

        model = model_from_json(model_json)
        mconf = model.get_config() if hasattr(model, "get_config") else {}
        model_name = mconf.get("name") or getattr(model, "name", "imported_model")
        cls = model.__class__.__name__.lower()
        is_sequential = (cls == "sequential")
        if cls not in {"sequential", "functional", "model"}:
            raise GraphValidationError({
                "model": ["Only Sequential or Functional Keras models can be imported."]
            })
        layers_list = list(mconf.get("layers", []) or [])

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
    # layers_list is a list of dicts: {class_name, config, ...}
    last_index = len(layers_list) - 1 if layers_list else -1

    def _infer_input_from_first_layer() -> Dict[str, Any] | None:
        """Infer an Input node params dict from the first layer config when no InputLayer exists."""
        if not layers_list:
            return None
        first_layer = layers_list[0]
        first_cfg = first_layer.get("config") or {}

        def _coerce_dtype(val: Any) -> str:
            if isinstance(val, str):
                return val
            if isinstance(val, dict):
                cfg = val.get("config") or {}
                if isinstance(cfg, dict) and cfg.get("name"):
                    return str(cfg.get("name"))
            return "float32"

        def _shape_from_cfg(cfg: Dict[str, Any]) -> List[Any] | None:
            for key in ("batch_input_shape", "batch_shape", "input_shape"):
                if isinstance(cfg.get(key), (list, tuple)):
                    return list(cfg[key])
            if cfg.get("input_dim") is not None:
                return [cfg.get("input_dim")]
            return None

        raw_shape = _shape_from_cfg(first_cfg)
        norm_shape: List[Any] | None = None
        if raw_shape:
            if len(raw_shape) > 1 and raw_shape[0] is None:
                norm_shape = [dim for dim in raw_shape[1:] if dim is not None]
            else:
                norm_shape = [dim for dim in raw_shape if dim is not None]

        if norm_shape:
            in_id = next_id("input")
            return {
                "id": in_id,
                "type": "InputLayer",
                "label": "Input",
                "params": {"shape": tuple(norm_shape), "dtype": _coerce_dtype(first_cfg.get("dtype")), "name": None},
                "position": {},
                "notes": {"synthesized": True},
            }
        return None

    # If there is no explicit InputLayer, synthesize one using inferred shape
    has_explicit_input = any(str((l or {}).get("class_name", "")) == "InputLayer" for l in layers_list)
    synthesized_input_id: str | None = None
    if not has_explicit_input:
        maybe_input = _infer_input_from_first_layer()
        if maybe_input:
            nodes.append(maybe_input)
            last_node_id = maybe_input["id"]
            synthesized_input_id = maybe_input["id"]

    known = set(list_layers(include_deprecated=False))
    layer_name_to_node_id: Dict[str, str] = {}
    layer_metadata: List[Dict[str, Any]] = []

    def _canonical_layer_name(entry: Dict[str, Any], cfg: Dict[str, Any]) -> str:
        if entry.get("name"):
            return str(entry["name"])
        if cfg.get("name"):
            return str(cfg["name"])
        return str(uuid.uuid4())

    def _extract_inbound(layer_entry: Dict[str, Any]) -> List[str]:
        inbound = layer_entry.get("inbound_nodes") or []
        names: List[str] = []

        def _add(name: Any) -> None:
            if name and str(name) not in names:
                names.append(str(name))

        if isinstance(inbound, list):
            for node in inbound:
                if isinstance(node, dict):
                    args = node.get("args") or []
                    for arg in args:
                        if isinstance(arg, dict):
                            hist = arg.get("config", {}).get("keras_history") or arg.get("keras_history")
                            if isinstance(hist, (list, tuple)) and hist:
                                _add(hist[0])
                        elif isinstance(arg, (list, tuple)) and arg and isinstance(arg[0], str):
                            _add(arg[0])
                elif isinstance(node, (list, tuple)):
                    for item in node:
                        if isinstance(item, (list, tuple)) and item and isinstance(item[0], str):
                            _add(item[0])
                        elif isinstance(item, dict):
                            hist = item.get("config", {}).get("keras_history") or item.get("keras_history")
                            if isinstance(hist, (list, tuple)) and hist:
                                _add(hist[0])
        return names

    for idx, layer in enumerate(layers_list):
        lclass = str((layer or {}).get("class_name", ""))
        cfg = (layer or {}).get("config") or {}

        # Explicit InputLayer becomes a dedicated Input node
        layer_name = _canonical_layer_name(layer, cfg)

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
                    "type": "InputLayer",
                    "label": cfg.get("name") or "Input",
                    "params": {"shape": shape, "dtype": dtype, "name": cfg.get("name")},
                    "position": {},
                    "notes": {},
                }
            )
            layer_name_to_node_id[layer_name] = nid
            layer_metadata.append({"id": nid, "name": layer_name, "type": "InputLayer", "inbound": []})
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
        layer_name_to_node_id[layer_name] = nid
        inbound_sources = _extract_inbound(layer)
        layer_metadata.append({
            "id": nid,
            "name": layer_name,
            "type": lclass,
            "inbound": inbound_sources,
        })
        last_node_id = nid

    prev_node_id: str | None = synthesized_input_id
    for meta in layer_metadata:
        inbound_sources = meta.get("inbound") or []
        added = False
        for src_name in inbound_sources:
            src_id = layer_name_to_node_id.get(src_name)
            if src_id:
                add_edge(src_id, meta["id"])
                added = True
        if not added and is_sequential and prev_node_id and meta.get("type") != "InputLayer":
            add_edge(prev_node_id, meta["id"])
        prev_node_id = meta["id"]

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
    # Protect against zip-slip and zip-bomb attacks:
    # - ensure resolved paths are within dest_dir
    # - limit number of files and total uncompressed bytes
    max_files = int(getattr(settings, "MAX_ZIP_EXTRACTED_FILES", 1000))
    max_bytes = int(getattr(settings, "MAX_ZIP_EXTRACTED_BYTES", 200 * 1024 * 1024))

    dest_path = Path(dest_dir).resolve()
    total_files = 0
    total_uncompressed = 0

    with zipfile.ZipFile(zip_path, "r") as zf:
        for member in zf.infolist():
            total_files += 1
            # Count uncompressed size (approx)
            total_uncompressed += member.file_size or 0
            if total_files > max_files:
                raise GraphValidationError({"detail": "Zip contains too many files"})
            if total_uncompressed > max_bytes:
                raise GraphValidationError({"detail": "Zip uncompressed size exceeds allowed limit"})

            member_name = member.filename
            if os.path.isabs(member_name):
                raise GraphValidationError({"detail": "Unsafe zip contents"})
            target_path = (dest_path / member_name).resolve()
            if not str(target_path).startswith(str(dest_path)):
                raise GraphValidationError({"detail": "Unsafe zip contents"})

        # If all checks passed, extract safely
        zf.extractall(path=str(dest_path))

    return str(dest_path)


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