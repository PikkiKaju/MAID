from __future__ import annotations

import importlib
import threading
from typing import Any, Dict, List

_MODULE_MAP = {
    "layers": "network.manifests.layers",
    "optimizers": "network.manifests.optimizers",
    "losses": "network.manifests.losses",
    "metrics": "network.manifests.metrics",
    "activations": "network.manifests.activations",
}

# Locks to serialize refresh/regenerate operations per-kind
_locks: Dict[str, threading.RLock] = {k: threading.RLock() for k in _MODULE_MAP}


def _get_module(kind: str):
    if kind not in _MODULE_MAP:
        raise KeyError(f"Unknown manifest kind: {kind}")
    return importlib.import_module(_MODULE_MAP[kind])


def get_manifest(kind: str) -> Dict[str, Any]:
    """Return the manifest for given kind, loading from disk if necessary."""
    mod = _get_module(kind)
    # Delegate to module's get_manifest which handles lazy loading
    with _locks[kind]:
        return mod.get_manifest()


def refresh_manifest(kind: str) -> bool:
    """Reload the manifest from disk for the given kind."""
    mod = _get_module(kind)
    with _locks[kind]:
        return mod.refresh_manifest()


def regenerate_manifest(kind: str) -> bool:
    """Regenerate the manifest (if supported) and refresh the in-memory copy."""
    mod = _get_module(kind)
    if not hasattr(mod, "regenerate_manifest"):
        raise NotImplementedError(f"Regenerate not supported for manifest kind: {kind}")
    with _locks[kind]:
        return mod.regenerate_manifest()


def list_items(kind: str, **kwargs) -> List[Any]:
    """Return a list of named items for the manifest (layers, optimizers, etc.).

    Keyword arguments are forwarded to the underlying list_* function (if present).
    """
    mod = _get_module(kind)
    func_name = f"list_{kind}"
    func = getattr(mod, func_name, None)
    if func is None:
        # Try a generic fallback: return top-level array if present
        mf = get_manifest(kind)
        # heuristics
        for key in ("layers", "optimizers", "losses", "metrics", "activations"):
            if key in mf:
                return [item.get("name") for item in mf.get(key, [])]
        return []
    return func(**kwargs)


def get_entry(kind: str, name: str) -> Dict[str, Any]:
    """Return a manifest entry by name for the given kind.

    Raises KeyError if not found.
    """
    mod = _get_module(kind)
    # Map to functions like get_layer_entry, get_optimizer_entry, etc.
    singular_map = {
        "layers": "layer",
        "optimizers": "optimizer",
        "losses": "loss",
        "metrics": "metric",
        "activations": "activation",
    }
    singular = singular_map.get(kind)
    if not singular:
        raise KeyError(f"Unknown manifest kind: {kind}")
    func = getattr(mod, f"get_{singular}_entry", None)
    if func is None:
        # fallback: scan manifest items
        mf = get_manifest(kind)
        collection_key = {
            "layers": "layers",
            "optimizers": "optimizers",
            "losses": "losses",
            "metrics": "metrics",
            "activations": "activations",
        }.get(kind)
        for item in mf.get(collection_key, []):
            if item.get("name") == name:
                return item
        raise KeyError(f"{singular.capitalize()} '{name}' not found in manifest")
    return func(name)
