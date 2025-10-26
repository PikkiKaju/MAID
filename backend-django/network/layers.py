from __future__ import annotations

"""
Dynamic, manifest-driven Keras layer access utilities.

This module replaces the previous hardcoded layer registration with a thin
abstraction that reads the generated TensorFlow/Keras layer manifest and uses
it as the single source of truth for:
- Enumerating available layers
- Looking up parameter docs and enum choices
- Instantiating a Keras layer by name with normalized parameters
- Optionally applying a created layer to inbound tensors

Notes:
- We avoid importing TensorFlow/Keras at module import time. Import happens
  lazily in the functions that need it, so that Django can start without TF
  if these utilities aren't used.
- The manifest is expected at `backend-django/network/tensorflow-data/layer_manifest.json` (default
  output of the generator). We also probe a couple of fallback locations to be
  resilient during development.
"""

import json
import os
import logging
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------------------
# Manifest loading and lookup
# --------------------------------------------------------------------------------------

_MANIFEST: Optional[Dict[str, Any]] = None


def _candidate_manifest_paths() -> List[str]:
    """Return likely paths to the layer manifest relative to this file."""
    here = os.path.dirname(__file__)
    # Typical path when generator was executed from backend-django folder
    p1 = os.path.abspath(os.path.join(here, "..", "layer_manifest.json"))
    # Fallback: older location under network/tensorflow_data
    p2 = os.path.abspath(os.path.join(here, "tensorflow_data", "layer_manifest.json"))
    return [p1, p2]


def regenerate_manifest() -> bool:
    """Regenerate and refresh the manifest."""
    try:
        from .tensorflow_data.generate_layer_manifest import regenerate_and_save_layer_manifest
    except Exception as exc:  # pragma: no cover - env issue
        raise ImportError(
            "Layer manifest generator is required. Ensure network/generate_layer_manifest.py is present."
        ) from exc

    try:
        success = regenerate_and_save_layer_manifest()
        if success:
            success = refresh_manifest()
            logger.info("Layer manifest regenerated and refreshed, available=%s", manifest_available())
        return success
    except Exception as exc:
        raise RuntimeError("Failed to regenerate layer manifest") from exc


def _load_manifest() -> Optional[Dict[str, Any]]:
    """Load the manifest from disk."""
    for path in _candidate_manifest_paths():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            continue
    raise FileNotFoundError("Layer manifest not found in candidate paths.")


def refresh_manifest() -> bool:
    """Reload the manifest from disk (useful after regenerating it)."""
    global _MANIFEST
    try:
        _MANIFEST = _load_manifest()
    except Exception:
        _MANIFEST = None
        raise RuntimeError("Failed to refresh layer manifest")
    return _MANIFEST is not None
        

def manifest_available() -> bool:
    """Return True if the manifest is loaded and available."""
    return _MANIFEST is not None


def get_manifest() -> Dict[str, Any]:
    """Return the loaded manifest, or raise if not available."""
    if _MANIFEST is None:
        raise RuntimeError("Layer manifest not found. Generate it first with generate_layer_manifest.py")
    return _MANIFEST


def list_layers(include_deprecated: bool = False) -> List[str]:
    """Return the list of available layer names from the manifest."""
    mf = get_manifest()
    layers = mf.get("layers", [])
    out: List[str] = []
    for li in layers:
        if not include_deprecated and li.get("deprecated", False):
            continue
        name = li.get("name")
        if name:
            out.append(name)
    return out


def get_layer_entry(layer_name: str) -> Dict[str, Any]:
    """Return the manifest entry for a given layer name."""
    mf = get_manifest()
    for li in mf.get("layers", []):
        if li.get("name") == layer_name:
            return li
    raise KeyError(f"Layer '{layer_name}' not found in manifest")


def get_param_choices(layer_name: str, param_name: str) -> Optional[Dict[str, Any]]:
    """
    Resolve enum choices for layer.param from manifest.
    Returns a spec dict like {"type": "enum", "enum": [...], "case_insensitive": bool, "nullable": bool}
    or None if not found.

    Preference order:
      1) param_value_specs.overrides["Layer.param"]
      2) param_value_specs.global["param"]
    """
    mf = get_manifest()
    specs = mf.get("param_value_specs") or {}
    overrides = specs.get("overrides") or {}
    glob = specs.get("global") or {}

    key = f"{layer_name}.{param_name}"
    if key in overrides and isinstance(overrides[key], dict):
        return overrides[key]
    if param_name in glob and isinstance(glob[param_name], dict):
        return glob[param_name]
    return None


def normalize_params_for_layer(layer_name: str, raw_params: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize using only manifest: enums (case-insensitive) and required checks.

    - No type guessing/conversion. Values are passed through to Keras.
    - Enum values are normalized to canonical casing when case_insensitive is true.
    - Parameters not declared in the manifest are dropped.
    - Parameters with value None or empty string are omitted to let Keras defaults apply.
    - Required parameters must be present (after omission of None/empty) or an error is raised.
    """
    entry = get_layer_entry(layer_name)
    declared_params = [p for p in entry.get("parameters", []) if p.get("name")]
    declared_names = {p["name"] for p in declared_params}
    required_names = {p["name"] for p in declared_params if p.get("required")}

    cleaned: Dict[str, Any] = {}

    # Apply enum normalization and filter to declared params
    for k, v in (raw_params or {}).items():
        if k not in declared_names:
            continue

        # Treat empty string as omission (let default apply)
        if v == "" or v is None:
            continue

        spec = get_param_choices(layer_name, k)
        if spec and isinstance(v, str):
            enum_vals: Iterable[str] = spec.get("enum") or []
            ci = bool(spec.get("case_insensitive"))
            if enum_vals and ci:
                lookup = {str(x).lower(): x for x in enum_vals}
                lv = v.lower()
                if lv in lookup:
                    v = lookup[lv]
        cleaned[k] = v

    # Validate required params
    missing = sorted(n for n in required_names if n not in cleaned)
    if missing:
        raise ValueError(f"Missing required parameters for {layer_name}: {', '.join(missing)}")

    return cleaned


# --------------------------------------------------------------------------------------
# Keras integration
# --------------------------------------------------------------------------------------

def _get_keras_layer_ctor(layer_name: str):
    try:
        # Import lazily
        from tensorflow import keras  # type: ignore
    except Exception as exc:  # pragma: no cover - env issue
        raise ImportError(
            "TensorFlow/Keras is required. Install it with 'pip install tensorflow'."
        ) from exc

    try:
        return getattr(keras.layers, layer_name)
    except AttributeError as exc:
        raise KeyError(f"Keras layer '{layer_name}' not found in keras.layers") from exc


def create_layer(layer_name: str, params: Optional[Dict[str, Any]] = None):
    """Instantiate a Keras layer by name using manifest-driven normalization."""
    ctor = _get_keras_layer_ctor(layer_name)
    norm = normalize_params_for_layer(layer_name, params or {})
    return ctor(**norm)


def apply_layer(layer_name: str, inbound: List[Any], params: Optional[Dict[str, Any]] = None):
    """
    Instantiate a layer and apply it to inbound tensors.
    Heuristic: if a single inbound tensor is provided, call layer(x), else call layer([x1, x2, ...]).
    """
    layer = create_layer(layer_name, params)
    if not inbound:
        # Return layer instance for caller to connect later
        return layer
    if len(inbound) == 1:
        return layer(inbound[0])
    return layer(inbound)


# --------------------------------------------------------------------------------------
# Simple dataclass view for parameter metadata (optional helper)
# --------------------------------------------------------------------------------------

@dataclass(frozen=True)
class ParamMeta:
    name: str
    default: Optional[str]
    annotation: Optional[str]
    doc: Optional[str]
    enum: Optional[List[str]]
    case_insensitive: bool = False
    nullable: bool = False


def get_param_metas(layer_name: str) -> List[ParamMeta]:
    """Return parameter metadata for a layer, including enum choices if known."""
    entry = get_layer_entry(layer_name)
    out: List[ParamMeta] = []
    for p in entry.get("parameters", []):
        name = p.get("name")
        spec = get_param_choices(layer_name, name) if name else None
        out.append(
            ParamMeta(
                name=name or "",
                default=p.get("default"),
                annotation=p.get("annotation"),
                doc=p.get("doc"),
                enum=(spec.get("enum") if spec else None),
                case_insensitive=bool(spec.get("case_insensitive")) if spec else False,
                nullable=bool(spec.get("nullable")) if spec else False,
            )
        )
    return out


# --------------------------------------------------------------------------------------
# Convenience: a lightweight registry facade backed by the manifest
# --------------------------------------------------------------------------------------

class ManifestLayerRegistry:
    """Facade that mimics a registry, backed by the manifest."""

    def available(self) -> List[str]:
        return list_layers(include_deprecated=False)

    def specs(self, layer_name: str) -> List[ParamMeta]:
        return get_param_metas(layer_name)

    def instantiate(self, layer_name: str, params: Optional[Dict[str, Any]] = None):
        return create_layer(layer_name, params)

    def apply(self, layer_name: str, inbound: List[Any], params: Optional[Dict[str, Any]] = None):
        return apply_layer(layer_name, inbound, params)


# Default instance for convenience
REGISTRY = ManifestLayerRegistry()
