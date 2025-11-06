from __future__ import annotations

"""
Dynamic, manifest-driven Keras loss function access utilities.

This module provides a thin abstraction that reads the generated TensorFlow/Keras
loss manifest and uses it as the single source of truth for:
- Enumerating available loss functions
- Looking up parameter docs and value ranges
- Instantiating a Keras loss by name with normalized parameters

Notes:
- We avoid importing TensorFlow/Keras at module import time. Import happens
  lazily in the functions that need it.
- The manifest is expected at `backend-django/network/tensorflow_data/loss_manifest.json`
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
    """Return likely paths to the loss manifest relative to this file."""
    here = os.path.dirname(__file__)
    # Path under network/tensorflow_data/manifests (go up one level from network/manifests/)
    p1 = os.path.abspath(os.path.join(here, "..", "tensorflow_data", "manifests", "loss_manifest.json"))
    return [p1]


def regenerate_manifest() -> bool:
    """Regenerate and refresh the manifest."""
    try:
        from ..tensorflow_data.generators.generate_losses_manifest import generate_manifest as gen_loss_manifest
    except Exception as exc:
        raise ImportError(
            "Loss manifest generator is required. Ensure network/tensorflow_data/generators/generate_losses_manifest.py is present."
        ) from exc

    try:
        gen_loss_manifest()
        success = refresh_manifest()
        logger.info("Loss manifest regenerated and refreshed, available=%s", manifest_available())
        return success
    except Exception as exc:
        raise RuntimeError("Failed to regenerate loss manifest") from exc


def _load_manifest() -> Optional[Dict[str, Any]]:
    """Load the manifest from disk."""
    for path in _candidate_manifest_paths():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            continue
    raise FileNotFoundError("Loss manifest not found in candidate paths.")


def refresh_manifest() -> bool:
    """Reload the manifest from disk (useful after regenerating it)."""
    global _MANIFEST
    try:
        _MANIFEST = _load_manifest()
    except Exception:
        _MANIFEST = None
        raise RuntimeError("Failed to refresh loss manifest")
    return _MANIFEST is not None


def manifest_available() -> bool:
    """Return True if the manifest is loaded and available."""
    return _MANIFEST is not None


def get_manifest() -> Dict[str, Any]:
    """Return the loaded manifest, or raise if not available."""
    if _MANIFEST is None:
        raise RuntimeError("Loss manifest not found. Generate it first with generate_losses_manifest.py")
    return _MANIFEST


def list_losses() -> List[str]:
    """Return the list of available loss names from the manifest."""
    mf = get_manifest()
    losses = mf.get("losses", [])
    out: List[str] = []
    for loss in losses:
        name = loss.get("name")
        if name:
            out.append(name)
    return out


def get_loss_entry(loss_name: str) -> Dict[str, Any]:
    """Return the manifest entry for a given loss name."""
    mf = get_manifest()
    for loss in mf.get("losses", []):
        if loss.get("name") == loss_name:
            return loss
    raise KeyError(f"Loss '{loss_name}' not found in manifest")


def normalize_params_for_loss(loss_name: str, raw_params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize loss parameters using the manifest.
    
    - Parameters not declared in the manifest are dropped.
    - Parameters with value None or empty string are omitted to let Keras defaults apply.
    - Required parameters must be present or an error is raised.
    """
    entry = get_loss_entry(loss_name)
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
        raise ValueError(f"Missing required parameters for {loss_name}: {', '.join(missing)}")

    return cleaned


# --------------------------------------------------------------------------------------
# Keras integration
# --------------------------------------------------------------------------------------

def _get_keras_loss_ctor(loss_name: str):
    """Get the Keras loss constructor by name."""
    try:
        from tensorflow import keras
    except Exception as exc:
        raise ImportError(
            "TensorFlow/Keras is required. Install it with 'pip install tensorflow'."
        ) from exc

    try:
        return getattr(keras.losses, loss_name)
    except AttributeError as exc:
        raise KeyError(f"Keras loss '{loss_name}' not found in keras.losses") from exc


def create_loss(loss_name: str, params: Optional[Dict[str, Any]] = None):
    """Instantiate a Keras loss by name using manifest-driven normalization."""
    ctor = _get_keras_loss_ctor(loss_name)
    norm = normalize_params_for_loss(loss_name, params or {})
    return ctor(**norm)
