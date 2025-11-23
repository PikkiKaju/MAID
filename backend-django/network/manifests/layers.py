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
    # Primary path under network/tensorflow_data/manifests (go up one level from network/manifests/)
    p1 = os.path.abspath(os.path.join(here, "..", "tensorflow_data", "manifests", "layer_manifest.json"))
    # Legacy fallback paths
    p2 = os.path.abspath(os.path.join(here, "..", "..", "layer_manifest.json"))
    p3 = os.path.abspath(os.path.join(here, "..", "tensorflow_data", "layer_manifest.json"))
    return [p1, p2, p3]


def regenerate_manifest() -> bool:
    """Regenerate and refresh the manifest."""
    try:
        from ..tensorflow_data.generators.generate_layer_manifest import regenerate_and_save_layer_manifest
    except Exception as exc:  # pragma: no cover - env issue
        raise ImportError(
            "Layer manifest generator is required. Ensure network/tensorflow_data/generators/generate_layer_manifest.py is present."
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
    global _MANIFEST
    if _MANIFEST is None:
        # Try to load from disk first before failing
        try:
            _MANIFEST = _load_manifest()
        except Exception:
            raise RuntimeError("Layer manifest not found. Generate it first with generate_layer_manifest.py or call the regenerate API endpoint.")
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


def normalize_params_for_layer(layer_name: str, raw_params: Dict[str, Any], strict: bool = True) -> Dict[str, Any]:
    """Normalize using only manifest: enums (case-insensitive) and required checks.

    - No type guessing/conversion. Values are passed through to Keras.
    - Enum values are normalized to canonical casing when case_insensitive is true.
    - Parameters not declared in the manifest are dropped (if strict=True).
    - Parameters with value None or empty string are omitted to let Keras defaults apply.
    - Required parameters must be present (after omission of None/empty) or an error is raised (if strict=True).
    """
    def _coerce_manifest_string(val: str) -> Any:
        """Best-effort cleanup for manifest-derived string defaults.

        - Drop textual nulls ("none", "null", "undefined").
        - Strip surrounding single/double quotes around literal strings (e.g., "'glorot_uniform'" -> "glorot_uniform").
        - Coerce booleans "true"/"false" to Python bool.
        """
        s = val.strip()
        ls = s.lower()
        if ls in ("none", "null", "undefined"):
            return None
        if ls == "true":
            return True
        if ls == "false":
            return False
        if (s.startswith("'") and s.endswith("'")) or (s.startswith('"') and s.endswith('"')):
            return s[1:-1]
        return val

    def _parse_tuple_string(val: str) -> Any:
        """Parse string representations of tuples/lists into Python tuples.
        
        Examples:
          "(2, 2)" -> (2, 2)
          "[3, 3]" -> (3, 3)
          "(1, 1)" -> (1, 1)
        
        Returns the original value if parsing fails.
        """
        s = val.strip()
        # Remove parentheses or brackets
        if (s.startswith('(') and s.endswith(')')) or (s.startswith('[') and s.endswith(']')):
            s = s[1:-1]
        else:
            return val  # Not a tuple/list string
        
        # Split by comma and try to parse each element
        try:
            parts = [x.strip() for x in s.split(',') if x.strip()]
            if not parts:
                return val
            # Try to convert to integers
            parsed = []
            for p in parts:
                if p.lower() == 'none':
                    parsed.append(None)
                else:
                    parsed.append(int(p))
            return tuple(parsed)
        except (ValueError, AttributeError):
            return val  # Parsing failed, return original

    try:
        entry = get_layer_entry(layer_name)
    except KeyError:
        if strict:
            raise
        # If not strict and layer unknown, return params as-is (or best effort)
        return raw_params

    declared_params = [p for p in entry.get("parameters", []) if p.get("name")]
    declared_names = {p["name"] for p in declared_params}
    required_names = {p["name"] for p in declared_params if p.get("required")}
    
    # Build a quick lookup for param metadata
    param_meta = {p["name"]: p for p in declared_params}

    cleaned: Dict[str, Any] = {}

    # Apply enum normalization and filter to declared params
    for k, v in (raw_params or {}).items():
        if strict and k not in declared_names:
            continue

        # Treat empty string, None, or string "None" as omission (let default apply)
        if v == "" or v is None:
            continue
        if isinstance(v, str):
            coerced = _coerce_manifest_string(v)
            if coerced is None:
                continue
            v = coerced
            
            # Try to parse tuple-like strings for common shape/size parameters
            if k in ('kernel_size', 'strides', 'pool_size', 'size', 'dilation_rate', 
                     'shape', 'batch_shape', 'input_shape', 'output_shape', 'target_shape'):
                parsed = _parse_tuple_string(v)
                if parsed != v:  # Parsing succeeded
                    v = parsed
            
            # Type coercion based on param_type from manifest
            if isinstance(v, str):
                pmeta = param_meta.get(k, {})
                ptype = pmeta.get("param_type")
                if ptype == "int":
                    try:
                        v = int(v)
                    except (ValueError, TypeError):
                        pass  # Leave as string, Keras will complain
                elif ptype == "float":
                    try:
                        v = float(v)
                    except (ValueError, TypeError):
                        pass
                elif ptype == "bool":
                    # Already handled by _coerce_manifest_string for "true"/"false"
                    pass
                elif ptype == "tuple_int":
                    try:
                        v = int(v)
                    except (ValueError, TypeError):
                        pass
                elif ptype == "tuple_float":
                    try:
                        v = float(v)
                    except (ValueError, TypeError):
                        pass

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
    if strict:
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


def create_layer(layer_name: str, params: Optional[Dict[str, Any]] = None, strict: bool = True):
    """Instantiate a Keras layer by name using manifest-driven normalization."""
    ctor = _get_keras_layer_ctor(layer_name)
    norm = normalize_params_for_layer(layer_name, params or {}, strict=strict)
    return ctor(**norm)


def apply_layer(layer_name: str, inbound: List[Any], params: Optional[Dict[str, Any]] = None, strict: bool = True):
    """
    Instantiate a layer and apply it to inbound tensors.
    Heuristic: if a single inbound tensor is provided, call layer(x), else call layer([x1, x2, ...]).
    """
    layer = create_layer(layer_name, params, strict=strict)
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
