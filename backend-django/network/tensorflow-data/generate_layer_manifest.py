#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Generates a detailed manifest of all layers present in tensorflow.keras.layers.

The manifest includes, per layer:
- name, qualified name, module, base classes
- short description (from docstring)
- parameters (from __init__ signature + docs when available)
- methods and signatures (call, build, get_config, from_config, compute_output_shape, compute_output_signature)
- doc-derived sections: input_shape, output_shape, returns

Additionally, this script attempts to derive machine-readable enumerations
for certain parameters (e.g., padding, interpolation, output_mode) by parsing
the Keras docstrings. The extracted enums are emitted in the top-level
`param_value_specs` object of the manifest to help UIs render selects and the
backend validate payloads.

Usage:
  python layer_manifest [--out path/to/manifest.json]

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
    sys.stderr.write("Error: TensorFlow is required to generate the layer manifest. "
                     "Please install tensorflow (pip install tensorflow) and try again.\n"
                     f"Details: {e}\n")
    sys.exit(1)


LayerBase = keras.layers.Layer  # base class reference for issubclass checks


# Parameter information extracted from the layer's __init__ method
@dataclass
class ParamInfo:
    name: str
    kind: str
    default: Optional[str]
    annotation: Optional[str]
    doc: Optional[str]
    required: bool


# Method information
@dataclass
class MethodInfo:
    exists: bool
    signature: Optional[str]


# Layer information
@dataclass
class LayerInfo:
    name: str
    qualified_name: str
    module: str
    bases: List[str]
    description: Optional[str]
    category: Optional[str]
    parameters: List[ParamInfo]
    methods: Dict[str, MethodInfo]
    doc_sections: Dict[str, Optional[str]]
    is_abstract: bool
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


def _infer_param_type(annotation: Optional[str], default_str: Optional[str], name: str) -> Optional[str]:
    """
    Infer a coarse param type for normalization and UI rendering.
    Returns one of: bool,int,float,string,tuple_int,enum,callable,object,None.
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
        if "tuple" in a:
            return "tuple_int"
        if "callable" in a or "function" in a:
            return "callable"
        if "str" in a or "string" in a:
            return "string"

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
        if (ds.startswith("(") and ds.endswith(")")) or (ds.startswith("[") and ds.endswith("]")):
            return "tuple_int"
        if ds.startswith("'") or ds.startswith('"'):
            return "string"

    # Names that conventionally represent tuples
    if name in {"kernel_size", "pool_size", "strides", "dilation_rate", "size", "kernel", "pool"}:
        return "tuple_int"

    # Unknown -> let consumers treat as object
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


# ---------- Docstring parsing ----------
_HEADING_RE = re.compile(r"^\s*(Args|Arguments|Parameters|Input shape|Output shape|Returns?)\s*:?\s*$", re.IGNORECASE)


def _extract_doc_sections(doc: str) -> Dict[str, Optional[str]]:
    """Extract sections from a docstring."""
    if not doc:
        return {"summary": None, "parameters_doc": None, "input_shape": None, "output_shape": None, "returns": None}

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
    input_shape = _clean(sections.get("input shape", []))
    output_shape = _clean(sections.get("output shape", []))
    returns = _clean(sections.get("returns") or sections.get("return") or [])

    return {
        "summary": summary,
        "parameters_doc": parameters_doc,
        "input_shape": input_shape,
        "output_shape": output_shape,
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


# ---------- Enum extraction from docs ----------
_ENUM_KEYWORDS = (
    "one of",
    "either",
    "options include",
    "supports",
    "must be one of",
    "mode by which",
)


def _extract_enum_tokens_from_text(text: str) -> Tuple[List[str], bool, bool]:
    """
    Best-effort parse of a docstring snippet to extract literal string choices.
    Returns (tokens, case_insensitive, nullable).
    """
    if not text:
        return ([], False, False)

    # Heuristic: only consider lines that look like they list choices
    lower = text.lower()
    looks_enum = any(k in lower for k in _ENUM_KEYWORDS)

    # Always try to capture quoted tokens and set-like braces
    # Tokens in single/double quotes
    quoted = re.findall(r"[\"']([A-Za-z0-9_\.\-]+)[\"']", text)
    # Tokens within braces {a, b, c}
    in_braces: List[str] = []
    for m in re.findall(r"\{([^}]+)\}", text):
        parts = [p.strip() for p in m.split(",")]
        cleaned = []
        for p in parts:
            q = re.findall(r"[\"']?\s*([A-Za-z0-9_\.\-]+)\s*[\"']?", p)
            if q:
                cleaned.append(q[0])
        in_braces.extend(cleaned)

    tokens = quoted + in_braces

    # Deduplicate preserving order (case-insensitive)
    seen: Set[str] = set()
    deduped: List[str] = []
    for t in tokens:
        key = t.lower()
        if key not in seen:
            seen.add(key)
            deduped.append(t)

    case_insensitive = "case-insensitive" in lower or "case insensitive" in lower
    nullable = "none" in lower or "null" in lower

    # If we didn't detect a keyword and found less than 2 tokens, likely noise
    if not looks_enum and len(deduped) < 2:
        return ([], case_insensitive, nullable)
    # If we have 2+ choices, treat it as enum
    # If nullable, drop None/null literal tokens from enum list
    if nullable:
        deduped = [t for t in deduped if t.lower() not in ("none", "null")]
    return (deduped, case_insensitive, nullable)


def _derive_param_enums_for_layer(layer_name: str, params: List[ParamInfo]) -> Dict[str, Dict[str, Any]]:
    """
    From parameter docs, derive a mapping of param enums for a given layer.
    Returns mapping of "Layer.param" -> spec dict.
    """
    out: Dict[str, Dict[str, Any]] = {}
    for p in params:
        if not p.doc:
            continue
        tokens, ci, nullable = _extract_enum_tokens_from_text(p.doc)
        if len(tokens) >= 2:
            out[f"{layer_name}.{p.name}"] = {
                "type": "enum",
                "enum": tokens,
                "case_insensitive": bool(ci),
                **({"nullable": True} if nullable else {}),
            }
    return out


def _extract_param_enums_from_source(layer_name: str, cls: type) -> Dict[str, Dict[str, Any]]:
    """
    Inspect the source code of the layer class to extract enum-like validations.
    Looks for patterns around common parameter names such as:
    - if <param> not in {"a", "b"}
    - if <param> not in ("a", "b")
    - argument_validation.*(<param>, ["a", "b"]) or {"a","b"}
    This is best-effort and will not catch all cases, but improves coverage without
    relying solely on docstrings.
    """
    try:
        src = inspect.getsource(cls)
    except Exception:
        return {}

    out: Dict[str, Dict[str, Any]] = {}
    common_params = [
        "padding",
        "data_format",
        "interpolation",
        "output_mode",
        "merge_mode",
        "score_mode",
        "fill_mode",
    ]

    # Build a regex to capture lists/sets/tuples of quoted strings
    CHOICES_RE = r"[\[{(]([^\]}\)]+)[\]}\)]"  # content inside (), [], {}
    TOKEN_RE = re.compile(r"[\"']\s*([A-Za-z0-9_\.\-]+)\s*[\"']")

    for param in common_params:
        # search small windows of code that include the param name and some set literal
        for m in re.finditer(param, src):
            # Take a window around the match
            start = max(0, m.start() - 200)
            end = min(len(src), m.end() + 200)
            window = src[start:end]

            # Find a nearby literal list/set/tuple
            for cm in re.finditer(CHOICES_RE, window):
                content = cm.group(1)
                tokens = TOKEN_RE.findall(content)
                # Require at least 2 tokens to consider an enum
                if len(tokens) >= 2:
                    key = f"{layer_name}.{param}"
                    # prefer longer lists (more complete) if multiple found
                    prev = out.get(key)
                    if not prev or len(tokens) > len(prev.get("enum", [])):
                        out[key] = {
                            "type": "enum",
                            "enum": list(dict.fromkeys(tokens)),  # dedupe keep order
                            "case_insensitive": True,
                        }
    return out


def _categorize_layer(module: str, name: str, doc_sections: Dict[str, Optional[str]], deprecated: bool) -> List[str]:
    """
    Data-driven categorizer: each rule is (category, predicate) where predicate
    is a small lambda that checks module/name/doc/deprecated. Rules are evaluated
    in order so the first matching categories become primary.
    """
    m = (module or "").lower()
    n = (name or "").lower()
    doc = (doc_sections.get("summary") or "").lower() if doc_sections else ""
    cats: List[str] = []

    RULES = [
        ("Preprocessing / Image",      lambda: "image_preprocessing" in m or ("preprocessing" in m and "image" in m) or "image" in m),
        ("Preprocessing / Text",       lambda: "text" in m or "text_vectorization" in n or "stringlookup" in n or "textvectorization" in n),
        ("Preprocessing / Audio",      lambda: "audio" in m or "mel_spectrogram" in m or "stft" in m or "spectrogram" in n),
        ("Convolutional",              lambda: "convolution" in m or "conv" in n),
        ("Pooling",                    lambda: "pool" in m or "pool" in n),
        ("Normalization",              lambda: "normalization" in m or any(x in n for x in ("batchnormalization","layernormalization","groupnormalization","unitnormalization"))),
        ("Activation",                 lambda: "activations" in m or n.endswith("relu") or n.endswith("softmax") or n in {"activation","softmax","relu","leakyrelu","prelu"}),
        ("Regularization",             lambda: "dropout" in m or "dropout" in n or "regularization" in m),
        ("RNN / Sequence",             lambda: "rnn" in m or any(x in n for x in ("lstm","gru","rnn","cell","simple_rnn","bidirectional","timedistributed"))),
        ("Attention",                  lambda: "attention" in m or "attention" in n or "multihead" in n),
        ("Merging / Elementwise",      lambda: "merging" in m or n in {"add","subtract","multiply","maximum","minimum","concatenate","dot"}),
        ("Reshaping",                  lambda: "reshaping" in m or n in {"flatten","reshape","permute","repeatvector","zeropadding","cropping"}),
        ("Embedding / Lookup",         lambda: "embedding" in m or "lookup" in n or "vectorization" in n),
        ("Spectral / Audio",           lambda: "stft" in m or "spectrogram" in n or "mel" in n),
        ("Wrapper / Utils",            lambda: any(x in m for x in ("wrapper","export","utils","torch","jax_layer")) or n.endswith("wrapper")),
        ("Deprecated",                 lambda: deprecated),
    ]

    for category, pred in RULES:
        try:
            if pred():
                cats.append(category)
        except Exception:
            # be robust to unexpected rule errors
            continue

    if not cats:
        cats.append("Misc")

    # Deduplicate preserving order
    seen = set()
    out: List[str] = []
    for c in cats:
        if c not in seen:
            seen.add(c)
            out.append(c)
    return out


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
        params.append(
            ParamInfo(
                name=p.name,
                kind=str(p.kind),
                default=default_str,
                annotation=annotation_str,
                doc=parameters_doc_map.get(p.name),
                required=(p.default is inspect._empty),
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


def _iter_layers_from_module(mod: types.ModuleType) -> List[type]:
    """Iterate over all Layer subclasses in the given module."""
    seen: set[str] = set()
    out: List[type] = []
    for attr_name in dir(mod):
        try:
            attr = getattr(mod, attr_name)
        except Exception:
            continue
        if inspect.isclass(attr):
            try:
                if issubclass(attr, LayerBase):
                    qn = f"{attr.__module__}.{attr.__name__}"
                    if qn not in seen:
                        seen.add(qn)
                        out.append(attr)
            except TypeError:
                # Builtin/extension types can raise
                continue
    return out


def build_layer_manifest() -> Dict[str, Any]:
    """Build the complete layer manifest for tensorflow.keras.layers"""
    layers_mod = keras.layers
    classes = _iter_layers_from_module(layers_mod)

    layer_infos: List[LayerInfo] = []

    overrides: Dict[str, Dict[str, Any]] = {}

    # Curated fallbacks for common parameters or cases where docs are sparse
    HARD_CODED_GLOBAL: Dict[str, Any] = {
        "data_format": {"type": "enum", "enum": ["channels_last", "channels_first"], "case_insensitive": True},
        "interpolation": {"type": "enum", "enum": ["nearest", "bilinear"], "case_insensitive": True},
        "fill_mode": {"type": "enum", "enum": ["constant", "nearest", "reflect", "wrap"], "case_insensitive": True},
        "activation": {"type": ["callable", "string"], "enum_hint": [
            "linear", "relu", "sigmoid", "tanh", "softmax", "softplus", "softsign", "selu", "elu", "gelu", "swish", "exponential"
        ]},
        "dtype": {"type": "dtype", "enum_hint": ["float32", "float64", "float16", "bfloat16", "int32", "int64", "uint8", "bool"]},
    }

    HARD_CODED_OVERRIDES: Dict[str, Dict[str, Any]] = {
        # Convolutions
        "Conv1D.padding": {"type": "enum", "enum": ["valid", "same", "causal"], "case_insensitive": True},
        "Conv2D.padding": {"type": "enum", "enum": ["valid", "same"], "case_insensitive": True},
        "Conv3D.padding": {"type": "enum", "enum": ["valid", "same"], "case_insensitive": True},
        "Conv1DTranspose.padding": {"type": "enum", "enum": ["valid", "same"], "case_insensitive": True},
        "Conv2DTranspose.padding": {"type": "enum", "enum": ["valid", "same"], "case_insensitive": True},
        "Conv3DTranspose.padding": {"type": "enum", "enum": ["valid", "same"], "case_insensitive": True},
        "SeparableConv2D.padding": {"type": "enum", "enum": ["valid", "same"], "case_insensitive": True},
        "DepthwiseConv2D.padding": {"type": "enum", "enum": ["valid", "same"], "case_insensitive": True},
        # Pooling
        "AveragePooling1D.padding": {"type": "enum", "enum": ["valid", "same"], "case_insensitive": True},
        "AveragePooling2D.padding": {"type": "enum", "enum": ["valid", "same"], "case_insensitive": True},
        "AveragePooling3D.padding": {"type": "enum", "enum": ["valid", "same"], "case_insensitive": True},
        "MaxPooling1D.padding": {"type": "enum", "enum": ["valid", "same"], "case_insensitive": True},
        "MaxPooling2D.padding": {"type": "enum", "enum": ["valid", "same"], "case_insensitive": True},
        "MaxPooling3D.padding": {"type": "enum", "enum": ["valid", "same"], "case_insensitive": True},
        # Attention
        "Attention.score_mode": {"type": "enum", "enum": ["dot", "concat"], "case_insensitive": True},
        "Bidirectional.merge_mode": {"type": "enum", "enum": ["sum", "mul", "concat", "ave"], "nullable": True, "case_insensitive": True},
        "CategoryEncoding.output_mode": {"type": "enum", "enum": ["one_hot", "multi_hot", "count"], "case_insensitive": True},
        # Resizing/UpSampling interpolation
        "UpSampling2D.interpolation": {"type": "enum", "enum": ["nearest", "bilinear", "bicubic", "lanczos3", "lanczos5"], "case_insensitive": True},
        "Resizing.interpolation": {"type": "enum", "enum": ["bilinear", "nearest", "bicubic", "lanczos3", "lanczos5"], "case_insensitive": True},
        "Resizing.fill_mode": {"type": "enum", "enum": ["constant"], "case_insensitive": True},
    }

    # Iterate over all layer classes and extract their information
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
            "call": _method_info(cls, "call"),
            "build": _method_info(cls, "build"),
            "get_config": _method_info(cls, "get_config"),
            "from_config": _method_info(cls, "from_config"),
            "compute_output_shape": _method_info(cls, "compute_output_shape"),
            "compute_output_signature": _method_info(cls, "compute_output_signature"),
        }
        
        is_depr = _is_deprecated(cls_doc)
        categories_for_cls = _categorize_layer(cls.__module__, cls.__name__, doc_sections, is_depr)
        primary_category = categories_for_cls[0] if categories_for_cls else None

        # Collect layer info
        info = LayerInfo(
            name=cls.__name__,
            qualified_name=f"{cls.__module__}.{cls.__name__}",
            module=cls.__module__,
            bases=bases,
            description=doc_sections.get("summary"),
            category=primary_category,
            parameters=parameters,
            methods=methods,
            doc_sections={
                "input_shape": doc_sections.get("input_shape"),
                "output_shape": doc_sections.get("output_shape"),
                "returns": doc_sections.get("returns"),
            },
            is_abstract=inspect.isabstract(cls),
            deprecated=is_depr,
        )
        layer_infos.append(info)

        # Derive per-layer enum specs from parameter docs
        layer_overrides = _derive_param_enums_for_layer(info.name, info.parameters)
        overrides.update(layer_overrides)

        # Derive per-layer enum specs from source code
        src_overrides = _extract_param_enums_from_source(info.name, cls)
        # Merge, giving precedence to source-derived (likely more precise)
        overrides.update(src_overrides)

    # Derive global specs by recognizing common parameters across many layers
    # These are curated but still based on frequent patterns in docs.
    global_specs: Dict[str, Any] = {}
    # If we saw many padding enums identical across layers, expose a global hint for UI
    padding_values_sets = [
        spec.get("enum")
        for key, spec in overrides.items()
        if key.endswith(".padding") and isinstance(spec.get("enum"), list)
    ]
    if padding_values_sets:
        # Pick most common set
        from collections import Counter
        most_common = Counter(tuple(v) for v in padding_values_sets).most_common(1)
        if most_common:
            vals = list(most_common[0][0])
            global_specs["padding"] = {"type": "enum", "enum": vals, "case_insensitive": True}

    # Merge curated globals (take curated as authoritative if present)
    for k, v in HARD_CODED_GLOBAL.items():
        global_specs.setdefault(k, v)

    manifest: Dict[str, Any] = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "tensorflow_version": getattr(tf, "__version__", None),
        "keras_version": getattr(keras, "__version__", None),
        "module": f"{layers_mod.__package__}.{layers_mod.__name__.split('.')[-1]}",
        "layer_count": len(layer_infos),
        "param_value_specs": {
            "notes": (
                "Enums are best-effort extracted from Keras docstrings. "
                "Values may be case-insensitive as indicated. Nullable is set when docs mention None/null."
            ),
            "global": global_specs,
            # Curated overrides layered on top of autodetected ones
            "overrides": {**overrides, **HARD_CODED_OVERRIDES},
        },
        "layers": [],
        "notes": (
            "Descriptions and shape details are derived from runtime docstrings and signatures. "
            "Input/output shapes may depend on layer configuration and actual inputs. "
            "This manifest avoids instantiating layers to ensure safe, side-effect-free inspection."
        ),
    }

    # Build layers array with enriched param metadata including param_type and inline enums
    param_specs = manifest["param_value_specs"]
    enum_overrides = param_specs.get("overrides", {}) if param_specs else {}
    enum_globals = param_specs.get("global", {}) if param_specs else {}

    def _enum_for(layer: str, param: str) -> Optional[Dict[str, Any]]:
        key = f"{layer}.{param}"
        if key in enum_overrides and isinstance(enum_overrides[key], dict):
            return enum_overrides[key]
        if param in enum_globals and isinstance(enum_globals[param], dict):
            return enum_globals[param]
        return None

    layers_out: List[Dict[str, Any]] = []
    for li in layer_infos:
        params_out: List[Dict[str, Any]] = []
        for p in li.parameters:
            # Derive param_type
            param_type = _infer_param_type(p.annotation, p.default, p.name)
            p_dict = asdict(p)
            p_dict["param_type"] = param_type
            # Attach inline enum spec if available
            enum_spec = _enum_for(li.name, p.name)
            if enum_spec:
                p_dict["enum"] = enum_spec.get("enum")
                if enum_spec.get("case_insensitive") is not None:
                    p_dict["case_insensitive"] = bool(enum_spec.get("case_insensitive"))
                if enum_spec.get("nullable") is not None:
                    p_dict["nullable"] = bool(enum_spec.get("nullable"))
            params_out.append(p_dict)

        categories = _categorize_layer(li.module, li.name, li.doc_sections, li.deprecated)

        layers_out.append({
            "name": li.name,
            "qualified_name": li.qualified_name,
            "module": li.module,
            "bases": li.bases,
            "description": li.description,
            "categories": categories,
            "parameters": params_out,
            "methods": {k: asdict(v) for k, v in li.methods.items()},
            "doc_sections": li.doc_sections,
            "is_abstract": li.is_abstract,
            "deprecated": li.deprecated,
        })

    manifest["layers"] = layers_out
    
    # build a top-level UI-friendly categories index (category -> list of layer names)
    ui_categories: Dict[str, List[str]] = {}
    for l in layers_out:
        for c in l.get("categories", []):
            ui_categories.setdefault(c, []).append(l["name"])
    # sort layers within categories for predictable UI
    for c in ui_categories:
        ui_categories[c].sort(key=lambda x: x.lower())
    manifest["ui_categories"] = ui_categories
    
    return manifest


def main(argv: List[str]) -> int:
    out_path: Optional[str] = ""
    # Simple arg parsing
    if "--path" in argv:
        try:
            out_index = argv.index("--path")
            out_path = argv[out_index + 1]
        except Exception:
            sys.stderr.write("Error: --path requires a file path argument.\n")
            return 2
    else:
        out_path = os.path.join(os.path.dirname(__file__), "layer_manifest.json")


    manifest = build_layer_manifest()
    data = json.dumps(manifest, indent=2, ensure_ascii=False)

    if out_path:
        try:
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(data)
        except Exception as e:
            sys.stderr.write(f"Error writing manifest to {out_path}: {e}\n")
            return 1
    else:
        print(data)

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))