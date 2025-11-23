from __future__ import annotations

import json
from typing import Any, Dict,  List, Sequence

from network.services.builders import build_keras_model
from network.services import validate_graph_payload

from network.manifests.layers import (
    list_layers,
    normalize_params_for_layer,
)

def export_graph_to_python_script(
    nodes: Sequence[Dict[str, Any]],
    edges: Sequence[Dict[str, Any]],
    *,
    model_name: str = "generated_model",
    strict: bool = True,
) -> str:
    """Return a standalone Python script that can rebuild the model in two ways:
    - build_model_json(): via model_from_json using Keras model.to_json()
    - build_model_py(): via explicit Keras functional API code (generic, manifest-driven)
    """

    structure = validate_graph_payload(nodes, edges, strict=strict)
    model = build_keras_model(structure, nodes, edges, strict=strict)
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
        norm = params if ntype in input_names_in_manifest else normalize_params_for_layer(ntype, params, strict=strict)
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