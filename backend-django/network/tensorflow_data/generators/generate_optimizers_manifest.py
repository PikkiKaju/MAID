#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Generates a detailed manifest of all optimizers present in tensorflow.keras.optimizers.

The manifest includes, per optimizer:
- name, qualified name, module, base classes
- short description (from docstring)
- parameters (from __init__ signature + docs when available)
- methods and signatures (e.g., get_config, from_config)

Usage:
  python generate_optimizers_manifest.py [--out path/to/manifest.json]

If --out is omitted, the manifest is printed to stdout.
"""

from __future__ import annotations

import json
import inspect
import importlib
import re
import sys
import types
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple, Set


# Reduce TF startup logs if present
import os
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

try:
    import tensorflow as tf  # type: ignore
    from tensorflow import keras  # type: ignore
except Exception as e:
    sys.stderr.write("Error: TensorFlow is required to generate the optimizer manifest. "
                     "Please install tensorflow (pip install tensorflow) and try again.\n"
                     f"Details: {e}\n")
    sys.exit(1)


OptimizerBase = keras.optimizers.Optimizer  # base class reference for issubclass checks


# Parameter information extracted from the optimizer's __init__ method
@dataclass
class ParamInfo:
    name: str
    kind: str
    default: Optional[str]
    annotation: Optional[str]
    doc: Optional[str]
    required: bool
    param_type: Optional[str]
    possible_values: Optional[List[str]]
    value_range: Optional[Dict[str, Any]]


# Method information
@dataclass
class MethodInfo:
    exists: bool
    signature: Optional[str]


# Optimizer information
@dataclass
class OptimizerInfo:
    name: str
    qualified_name: str
    module: str
    bases: List[str]
    description: Optional[str]
    parameters: List[ParamInfo]
    methods: Dict[str, MethodInfo]
    deprecated: bool


def _safe_signature(obj: Any) -> Optional[str]:
    """Return the signature string of the object, or None if it cannot be obtained."""
    try:
        sig = inspect.signature(obj)
        return str(sig)
    except Exception:
        return None


def _type_to_str(t: Any) -> Optional[str]:
    """Convert a type object to a string representation."""
    if t is inspect._empty:
        return None
    try:
        if isinstance(t, type):
            return t.__name__
        return str(t)
    except Exception:
        return None


def _default_to_str(d: Any) -> Optional[str]:
    """Convert a default value to a string representation."""
    if d is inspect._empty:
        return None
    try:
        return repr(d)
    except Exception:
        try:
            return str(d)
        except Exception:
            return None


def _docstring(obj: Any) -> str:
    """Return the docstring of the object, or an empty string if it cannot be obtained."""
    try:
        return inspect.getdoc(obj) or ""
    except Exception:
        try:
            return obj.__doc__ or ""
        except Exception:
            return ""


def _infer_param_type(annotation: Optional[str], default_str: Optional[str], name: str) -> Optional[str]:
    """
    Infer a coarse param type for normalization and UI rendering.
    Returns one of: bool, int, float, string, list, tuple, enum, callable, object, None.
    This is best-effort but prefers annotation and default value forms.
    """
    # Prefer explicit annotations
    if annotation:
        a = annotation.lower()
        if any(tok in a for tok in ["bool", "boolean"]):
            return "bool"
        if any(tok in a for tok in ["int", "integer"]):
            return "int"
        if "float" in a or "double" in a:
            return "float"
        if "str" in a or "string" in a:
            return "string"
        if "list" in a:
            return "list"
        if "tuple" in a:
            return "tuple"
        if "callable" in a or "function" in a:
            return "callable"

    # Next, inspect default literal shape
    if default_str is not None:
        ds = default_str.strip()
        if ds in {"True", "False"}:
            return "bool"
        if ds.isdigit() or (ds.startswith("-") and ds[1:].isdigit()):
            return "int"
        try:
            float(ds)
            return "float"
        except Exception:
            pass
        if ds.startswith("[") and ds.endswith("]"):
            return "list"
        if ds.startswith("(") and ds.endswith(")"):
            return "tuple"
        if ds.startswith("'") or ds.startswith('"'):
            return "string"

    # Names that conventionally represent specific types
    if any(x in name.lower() for x in ["rate", "epsilon", "decay", "rho", "momentum", "beta", "alpha"]):
        return "float"
    if "clipnorm" in name.lower() or "clipvalue" in name.lower():
        return "float"

    # Unknown -> let consumers treat as object
    return None


def _extract_value_range_from_doc(doc: str, param_type: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Extract value range constraints from parameter documentation.
    Returns a dict with 'min', 'max', or other constraints.
    """
    if not doc:
        return None
    
    doc_lower = doc.lower()
    range_info: Dict[str, Any] = {}
    
    # Pattern 1: "in range [min, max]" or "in the range [min, max]" or "in `[min, max]`"
    range_match = re.search(r"in\s+(?:the\s+)?range\s+`?[\[\(]([0-9.]+)\s*,\s*([0-9.]+)[\]\)]`?", doc_lower)
    if range_match:
        try:
            range_info["min"] = float(range_match.group(1))
            range_info["max"] = float(range_match.group(2))
        except ValueError:
            pass
    
    # Pattern 1b: Just "[min, max]" or "`[min, max]`" at start or after "in"
    if not range_info:
        standalone_range = re.search(r"(?:^|\s)in\s+`?[\[\(]([0-9.]+)\s*,\s*([0-9.]+)[\]\)]`?", doc_lower)
        if standalone_range:
            try:
                range_info["min"] = float(standalone_range.group(1))
                range_info["max"] = float(standalone_range.group(2))
            except ValueError:
                pass
    
    # Pattern 1c: Type annotation style "float in [min, max]" or "float in `[min, max]`"
    if not range_info:
        type_range = re.search(r"(?:float|int|number)\s+in\s+`?[\[\(]([0-9.]+)\s*,\s*([0-9.]+)[\]\)]`?", doc_lower)
        if type_range:
            try:
                range_info["min"] = float(type_range.group(1))
                range_info["max"] = float(type_range.group(2))
            except ValueError:
                pass
    
    # Pattern 2: "between min and max"
    between_match = re.search(r"between\s+([0-9.]+)\s+and\s+([0-9.]+)", doc_lower)
    if between_match and not range_info:
        try:
            range_info["min"] = float(between_match.group(1))
            range_info["max"] = float(between_match.group(2))
        except ValueError:
            pass
    
    # Pattern 3: "must be >= min" or "must be > min"
    min_match = re.search(r"(?:must be|should be|>=|>)\s*(>=|>)\s*([0-9.]+)", doc_lower)
    if min_match and not range_info.get("min"):
        try:
            val = float(min_match.group(2))
            if min_match.group(1) == ">":
                range_info["min_exclusive"] = val
            else:
                range_info["min"] = val
        except ValueError:
            pass
    
    # Pattern 4: "must be <= max" or "must be < max"
    max_match = re.search(r"(?:must be|should be|<=|<)\s*(<=|<)\s*([0-9.]+)", doc_lower)
    if max_match and not range_info.get("max"):
        try:
            val = float(max_match.group(2))
            if max_match.group(1) == "<":
                range_info["max_exclusive"] = val
            else:
                range_info["max"] = val
        except ValueError:
            pass
    
    # Pattern 5: "positive" (min > 0)
    if "positive" in doc_lower and param_type in ["int", "float"]:
        if not range_info.get("min") and not range_info.get("min_exclusive"):
            range_info["min_exclusive"] = 0
    
    # Pattern 6: "non-negative" or "nonnegative" (min >= 0)
    if ("non-negative" in doc_lower or "nonnegative" in doc_lower) and param_type in ["int", "float"]:
        if not range_info.get("min"):
            range_info["min"] = 0
    
    return range_info if range_info else None


def _extract_possible_values_from_doc(doc: str) -> Optional[List[str]]:
    """
    Extract enum-like possible values from parameter documentation.
    Returns a list of possible string values.
    """
    if not doc:
        return None
    
    doc_lower = doc.lower()
    
    # Keywords that suggest enumeration
    enum_keywords = [
        "one of",
        "either",
        "can be",
        "options are",
        "must be one of",
        "valid values",
        "supported values",
    ]
    
    has_enum_keyword = any(keyword in doc_lower for keyword in enum_keywords)
    
    # Extract quoted values
    quoted_values = re.findall(r'["\']([a-zA-Z0-9_\-]+)["\']', doc)
    
    # Extract values in curly braces {a, b, c}
    brace_values: List[str] = []
    for match in re.findall(r'\{([^}]+)\}', doc):
        parts = [p.strip().strip('"').strip("'") for p in match.split(",")]
        brace_values.extend([p for p in parts if p and p.replace("_", "").replace("-", "").isalnum()])
    
    all_values = quoted_values + brace_values
    
    # Deduplicate while preserving order
    seen = set()
    unique_values = []
    for val in all_values:
        val_lower = val.lower()
        if val_lower not in seen and val_lower not in ["none", "null", "true", "false"]:
            seen.add(val_lower)
            unique_values.append(val)
    
    # Only return if we found enum keywords and at least 2 values
    if has_enum_keyword and len(unique_values) >= 2:
        return unique_values
    elif len(unique_values) >= 3:  # Or if we found 3+ values even without keywords
        return unique_values
    
    return None


# ---------- Docstring parsing ----------
_HEADING_RE = re.compile(r"^\s*(Args|Arguments|Parameters|Returns?)\s*:?\s*$", re.IGNORECASE)


def _extract_doc_sections(doc: str) -> Dict[str, Optional[str]]:
    """Extract sections from a docstring."""
    if not doc:
        return {"summary": None, "parameters_doc": None, "returns": None}

    lines = doc.splitlines()
    # Normalize whitespace
    lines = [line.rstrip() for line in lines]

    # Summary = first paragraph (until first blank line)
    summary_lines: List[str] = []
    i = 0
    while i < len(lines) and lines[i].strip() == "":
        i += 1
    while i < len(lines) and lines[i].strip() != "":
        summary_lines.append(lines[i].strip())
        i += 1
    summary = " ".join(summary_lines) if summary_lines else None

    # Scan sections
    sections: Dict[str, List[str]] = {}
    current_head: Optional[str] = None
    current_buf: List[str] = []

    def flush():
        """Flush the current section buffer to the sections dict."""
        nonlocal current_head, current_buf
        if current_head is not None:
            key = current_head.lower()
            sections[key] = current_buf[:]
        current_head = None
        current_buf = []

    for line in lines:
        m = _HEADING_RE.match(line)
        if m:
            flush()
            current_head = m.group(1)
            continue
        if current_head is not None:
            current_buf.append(line)
    flush()

    def _clean(block: List[str]) -> Optional[str]:
        """Clean a block of text by stripping blank lines."""
        if not block:
            return None
        # Strip leading/trailing blank lines
        while block and block[0].strip() == "":
            block.pop(0)
        while block and block[-1].strip() == "":
            block.pop()
        if not block:
            return None
        return "\n".join(block).strip()

    parameters_doc = _clean(sections.get("args") or sections.get("arguments") or sections.get("parameters") or [])
    returns = _clean(sections.get("returns") or sections.get("return") or [])

    return {
        "summary": summary,
        "parameters_doc": parameters_doc,
        "returns": returns,
    }

# ---------- Parameter doc parsing ----------
_PARAM_LINE_RE = re.compile(r"^\s{0,4}(\w[\w\d_]*)\s*(\([^)]+\))?\s*:\s*(.+)$")


def _map_param_docs(parameters_doc: Optional[str]) -> Dict[str, str]:
    """
    Parse a simple Google-style parameter doc block into a {param: description} map.
    This is best-effort and may not capture all formatting styles.
    """
    if not parameters_doc:
        return {}

    lines = parameters_doc.splitlines()
    param_docs: Dict[str, List[str]] = {}
    current_name: Optional[str] = None

    for line in lines:
        m = _PARAM_LINE_RE.match(line)
        if m:
            current_name = m.group(1)
            desc = m.group(3).strip()
            param_docs[current_name] = [desc] if desc else []
        else:
            # continuation of the previous param description if indented
            if current_name is not None and (line.startswith(" ") or line.startswith("\t") or line.strip() == ""):
                if line.strip() != "":
                    param_docs[current_name].append(line.strip())
            else:
                current_name = None

    return {k: " ".join(v).strip() for k, v in param_docs.items()}


def _collect_parameters(init_obj: Any, parameters_doc_map: Dict[str, str]) -> List[ParamInfo]:
    """Collect parameter info from the __init__ method and doc map."""
    sig_str = _safe_signature(init_obj)
    params: List[ParamInfo] = []
    if sig_str is None:
        return params

    try:
        sig = inspect.signature(init_obj)
    except Exception:
        return params

    for p in sig.parameters.values():
        if p.name == "self":
            continue
        default_str = _default_to_str(p.default)
        annotation_str = _type_to_str(p.annotation)
        required = True if p.default is inspect._empty else False
        param_doc = parameters_doc_map.get(p.name)
        
        if p.name == "kwargs":
            # Special case: **kwargs, mark as not required and no default
            required = False
            default_str = None
        
        # Infer parameter type
        param_type = _infer_param_type(annotation_str, default_str, p.name)
        
        # Extract possible values (for enums)
        possible_values = _extract_possible_values_from_doc(param_doc) if param_doc else None
        
        # Extract value range (for numeric types)
        value_range = _extract_value_range_from_doc(param_doc, param_type) if param_doc else None
        
        params.append(
            ParamInfo(
                name=p.name,
                kind=str(p.kind),
                default=default_str,
                annotation=annotation_str,
                doc=param_doc,
                required=required,
                param_type=param_type,
                possible_values=possible_values,
                value_range=value_range,
            )
        )
    return params


def _method_info(cls: type, name: str) -> MethodInfo:
    """Get method info for a given method name on the class."""
    exists = hasattr(cls, name)
    if not exists:
        return MethodInfo(False, None)
    try:
        member = getattr(cls, name)
        # Unwrap classmethod/staticmethod
        if isinstance(member, (staticmethod, classmethod)):
            member = member.__func__
        return MethodInfo(True, _safe_signature(member))
    except Exception:
        return MethodInfo(True, None)


def _is_deprecated(doc: str) -> bool:
    """Determine if the docstring indicates deprecation."""
    if not doc:
        return False
    return "deprecated" in doc.lower() or "Deprecated" in doc


def _iter_optimizers_from_module(mod: types.ModuleType) -> List[type]:
    """Iterate over all Optimizer subclasses in the given module."""
    seen: set[str] = set()
    out: List[type] = []
    for attr_name in dir(mod):
        try:
            attr = getattr(mod, attr_name)
        except Exception:
            continue
        if inspect.isclass(attr):
            try:
                if issubclass(attr, OptimizerBase) and attr is not OptimizerBase:
                    qn = f"{attr.__module__}.{attr.__name__}"
                    if qn not in seen:
                        seen.add(qn)
                        out.append(attr)
            except (TypeError, AttributeError):
                # Builtin/extension types can raise
                continue
    return out


def build_optimizer_manifest() -> Dict[str, Any]:
    """Build the complete optimizer manifest for tensorflow.keras.optimizers"""
    optimizers_mod = keras.optimizers
    classes = _iter_optimizers_from_module(optimizers_mod)

    optimizer_infos: List[OptimizerInfo] = []

    # Iterate over all optimizer classes and extract their information
    for cls in sorted(classes, key=lambda c: c.__name__.lower()):
        cls_doc = _docstring(cls)
        doc_sections = _extract_doc_sections(cls_doc)
        params_doc_map = _map_param_docs(doc_sections.get("parameters_doc"))

        init_obj = getattr(cls, "__init__", None)

        # Collect parameters
        parameters = _collect_parameters(init_obj, params_doc_map) if init_obj is not None else []

        # Collect base classes
        bases = []
        try:
            # Get fully qualified base class names, excluding 'object'
            bases = [f"{b.__module__}.{b.__name__}" for b in cls.__mro__[1:-1]]
        except Exception:
            bases = []

        # Collect method infos
        methods = {
            "get_config": _method_info(cls, "get_config"),
            "from_config": _method_info(cls, "from_config"),
            "apply_gradients": _method_info(cls, "apply_gradients"),
        }
        
        is_depr = _is_deprecated(cls_doc)

        # Collect optimizer info
        info = OptimizerInfo(
            name=cls.__name__,
            qualified_name=f"{cls.__module__}.{cls.__name__}",
            module=cls.__module__,
            bases=bases,
            description=doc_sections.get("summary"),
            parameters=parameters,
            methods=methods,
            deprecated=is_depr,
        )
        optimizer_infos.append(info)

    manifest: Dict[str, Any] = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "tensorflow_version": getattr(tf, "__version__", None),
        "keras_version": getattr(keras, "__version__", None),
        "module": f"{optimizers_mod.__package__}.{optimizers_mod.__name__.split('.')[-1]}",
        "optimizer_count": len(optimizer_infos),
        "optimizers": [asdict(info) for info in optimizer_infos],
        "notes": (
            "Descriptions are derived from runtime docstrings and signatures. "
            "This manifest avoids instantiating optimizers to ensure safe, side-effect-free inspection."
        ),
    }
    
    return manifest


def main(argv: List[str]) -> int:
    out_path: Optional[str] = ""
    # Simple arg parsing
    if "--out" in argv:
        try:
            out_index = argv.index("--out")
            out_path = argv[out_index + 1]
        except Exception:
            sys.stderr.write("Error: --out requires a file path argument.\n")
            return 2
    else:
        # Write to manifests directory
        script_dir = os.path.dirname(__file__)
        manifests_dir = os.path.join(os.path.dirname(script_dir), "manifests")
        os.makedirs(manifests_dir, exist_ok=True)
        out_path = os.path.join(manifests_dir, "optimizer_manifest.json")


    manifest = build_optimizer_manifest()
    data = json.dumps(manifest, indent=2, ensure_ascii=False)

    if out_path:
        try:
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(data)
                print(f"Successfully generated optimizer manifest at: {out_path}")
        except Exception as e:
            sys.stderr.write(f"Error writing manifest to {out_path}: {e}\n")
            return 1
    else:
        print(data)

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
