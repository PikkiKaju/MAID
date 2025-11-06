from __future__ import annotations

"""
Dynamic, manifest-driven Keras activation function access utilities.

This module provides a thin abstraction that reads the generated TensorFlow/Keras
activation manifest and uses it as the single source of truth for:
- Enumerating available activation functions
- Looking up parameter docs and value ranges
- Getting activation function references by name

Notes:
- We avoid importing TensorFlow/Keras at module import time. Import happens
  lazily in the functions that need it.
- The manifest is expected at `backend-django/network/tensorflow_data/activation_manifest.json`
"""

import json
import os
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------------------
# Manifest loading and lookup
# --------------------------------------------------------------------------------------

_MANIFEST: Optional[Dict[str, Any]] = None


def _candidate_manifest_paths() -> List[str]:
    """Return likely paths to the activation manifest relative to this file."""
    here = os.path.dirname(__file__)
    # Path under network/tensorflow_data/manifests (go up one level from network/manifests/)
    p1 = os.path.abspath(os.path.join(here, "..", "tensorflow_data", "manifests", "activation_manifest.json"))
    return [p1]


def regenerate_manifest() -> bool:
    """Regenerate and refresh the manifest."""
    try:
        from ..tensorflow_data.generators.generate_activations_manifest import generate_manifest as gen_activation_manifest
    except Exception as exc:
        raise ImportError(
            "Activation manifest generator is required. Ensure network/tensorflow_data/generators/generate_activations_manifest.py is present."
        ) from exc

    try:
        gen_activation_manifest()
        success = refresh_manifest()
        logger.info("Activation manifest regenerated and refreshed, available=%s", manifest_available())
        return success
    except Exception as exc:
        raise RuntimeError("Failed to regenerate activation manifest") from exc


def _load_manifest() -> Optional[Dict[str, Any]]:
    """Load the manifest from disk."""
    for path in _candidate_manifest_paths():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            continue
    raise FileNotFoundError("Activation manifest not found in candidate paths.")


def refresh_manifest() -> bool:
    """Reload the manifest from disk (useful after regenerating it)."""
    global _MANIFEST
    try:
        _MANIFEST = _load_manifest()
    except Exception:
        _MANIFEST = None
        raise RuntimeError("Failed to refresh activation manifest")
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
            raise RuntimeError("Activation manifest not found. Generate it first with generate_activations_manifest.py or call the regenerate API endpoint.")
    return _MANIFEST


def list_activations(include_utility: bool = False) -> List[str]:
    """Return the list of available activation names from the manifest."""
    mf = get_manifest()
    activations = mf.get("activations", [])
    out: List[str] = []
    for activation in activations:
        if not include_utility and activation.get("is_utility", False):
            continue
        name = activation.get("name")
        if name:
            out.append(name)
    return out


def get_activation_entry(activation_name: str) -> Dict[str, Any]:
    """Return the manifest entry for a given activation name."""
    mf = get_manifest()
    for activation in mf.get("activations", []):
        if activation.get("name") == activation_name:
            return activation
    raise KeyError(f"Activation '{activation_name}' not found in manifest")


def normalize_params_for_activation(activation_name: str, raw_params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize activation parameters using the manifest.
    
    - Parameters not declared in the manifest are dropped.
    - Parameters with value None or empty string are omitted to let Keras defaults apply.
    - Required parameters must be present or an error is raised.
    """
    entry = get_activation_entry(activation_name)
    declared_params = [p for p in entry.get("parameters", []) if p.get("name")]
    declared_names = {p["name"] for p in declared_params}
    required_names = {p["name"] for p in declared_params if p.get("required")}

    cleaned: Dict[str, Any] = {}

    # Filter to declared params and omit None/empty values
    for k, v in (raw_params or {}).items():
        if k not in declared_names:
            continue
        # Treat empty string as omission (let default apply)
        if v == "" or v is None:
            continue
        cleaned[k] = v

    # Validate required params
    missing = sorted(n for n in required_names if n not in cleaned)
    if missing:
        raise ValueError(f"Missing required parameters for {activation_name}: {', '.join(missing)}")

    return cleaned


# --------------------------------------------------------------------------------------
# Keras integration
# --------------------------------------------------------------------------------------

def get_keras_activation(activation_name: str):
    """Get the Keras activation function by name."""
    try:
        from tensorflow import keras
    except Exception as exc:
        raise ImportError(
            "TensorFlow/Keras is required. Install it with 'pip install tensorflow'."
        ) from exc

    try:
        return getattr(keras.activations, activation_name)
    except AttributeError as exc:
        raise KeyError(f"Keras activation '{activation_name}' not found in keras.activations") from exc
