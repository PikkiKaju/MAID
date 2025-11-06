"""
Script to generate a comprehensive manifest of all TensorFlow/Keras activation functions.

This script introspects the tf.keras.activations module to extract:
- All activation functions with their metadata
- Function parameters with types, ranges, and possible values
- Descriptions from docstrings
- Module information

The output is a JSON file that can be consumed by the frontend for rendering
appropriate UI controls for activation function configuration.
"""

import json
import inspect
import re
import sys
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Any, Optional, List, Dict


# Reduce TF startup logs if present
import os
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

try:
    import tensorflow as tf  # type: ignore
except Exception as e:
    sys.stderr.write("Error: TensorFlow is required to generate the activation manifest. "
                     "Please install tensorflow (pip install tensorflow) and try again.\n"
                     f"Details: {e}\n")
    sys.exit(1)


@dataclass
class ParamInfo:
    """Information about a parameter."""
    name: str
    kind: str
    default: Any
    annotation: Optional[str]
    doc: Optional[str]
    required: bool
    param_type: Optional[str] = None
    possible_values: Optional[List[str]] = None
    value_range: Optional[Dict[str, float]] = None


@dataclass
class ActivationInfo:
    """Information about an activation function."""
    name: str
    qualified_name: str
    module: str
    description: str
    parameters: List[ParamInfo]
    is_utility: bool = False  # For get, serialize, deserialize


def _extract_value_range_from_doc(doc: str, param_name: str) -> Optional[Dict[str, float]]:
    """
    Extract numeric value range from parameter documentation.
    
    Looks for patterns like:
    - "in range [0, 1]", "in `[0, 1]`"
    - "between 0 and 1"
    - "Float in [0, 1]"
    - "positive", "non-negative"
    - ">=", "<=", ">", "<" operators
    
    Args:
        doc: Parameter documentation string
        param_name: Name of the parameter
        
    Returns:
        Dict with 'min' and/or 'max' keys, or None
    """
    if not doc:
        return None
    
    doc_lower = doc.lower()
    value_range = {}
    
    # Pattern 1: "in range [min, max]" or "in `[min, max]`" (handles backticks)
    range_pattern = r"in\s+(?:the\s+)?range\s+`?[\[\(]([0-9.]+)\s*,\s*([0-9.]+)[\]\)]`?"
    match = re.search(range_pattern, doc_lower)
    if match:
        value_range['min'] = float(match.group(1))
        value_range['max'] = float(match.group(2))
        return value_range
    
    # Pattern 2: "between X and Y"
    between_pattern = r"between\s+([0-9.]+)\s+and\s+([0-9.]+)"
    match = re.search(between_pattern, doc_lower)
    if match:
        value_range['min'] = float(match.group(1))
        value_range['max'] = float(match.group(2))
        return value_range
    
    # Pattern 3: "Float in [X, Y]" or "Float in `[X, Y]`"
    float_range_pattern = r"float\s+in\s+`?[\[\(]([0-9.]+)\s*,\s*([0-9.]+)[\]\)]`?"
    match = re.search(float_range_pattern, doc_lower)
    if match:
        value_range['min'] = float(match.group(1))
        value_range['max'] = float(match.group(2))
        return value_range
    
    # Pattern 4: >= or > operators
    if '>=' in doc:
        gte_pattern = r">=\s*([0-9.]+)"
        match = re.search(gte_pattern, doc)
        if match:
            value_range['min'] = float(match.group(1))
    elif '>' in doc:
        gt_pattern = r">\s*([0-9.]+)"
        match = re.search(gt_pattern, doc)
        if match:
            value_range['min'] = float(match.group(1))
    
    # Pattern 5: <= or < operators
    if '<=' in doc:
        lte_pattern = r"<=\s*([0-9.]+)"
        match = re.search(lte_pattern, doc)
        if match:
            value_range['max'] = float(match.group(1))
    elif '<' in doc:
        lt_pattern = r"<\s*([0-9.]+)"
        match = re.search(lt_pattern, doc)
        if match:
            value_range['max'] = float(match.group(1))
    
    # Pattern 6: Common keywords
    if 'positive' in doc_lower and 'non-negative' not in doc_lower:
        value_range['min'] = 0.0
    elif 'non-negative' in doc_lower or 'non negative' in doc_lower:
        value_range['min'] = 0.0
    
    return value_range if value_range else None


def _extract_possible_values_from_doc(doc: str) -> Optional[List[str]]:
    """
    Extract possible enum values from parameter documentation.
    
    Looks for patterns like:
    - "One of: 'value1', 'value2'"
    - "Either 'value1' or 'value2'"
    - Lists with quoted values
    
    Args:
        doc: Parameter documentation string
        
    Returns:
        List of possible string values, or None
    """
    if not doc:
        return None
    
    # Pattern: One of {'val1', 'val2', ...} or ("val1", "val2")
    one_of_pattern = r"one of[:\s]+[{\(\[]([^\}\)\]]+)[\}\)\]]"
    match = re.search(one_of_pattern, doc.lower())
    if match:
        values_str = match.group(1)
        # Extract quoted values
        quoted_values = re.findall(r"['\"]([^'\"]+)['\"]", values_str)
        if quoted_values:
            return quoted_values
    
    # Pattern: "'value1'" or "'value2'" or "'value3'"
    or_pattern = r"['\"](\w+)['\"](?:\s+or\s+['\"](\w+)['\"])+|(?:['\"](\w+)['\"],?\s*)+"
    quoted_values = re.findall(r"['\"](\w+)['\"]", doc)
    if len(quoted_values) >= 2 and ('or' in doc.lower() or ',' in doc):
        # Check if these seem to be enum values (short strings, appear in a list-like context)
        if all(len(v) < 30 for v in quoted_values):
            return quoted_values
    
    return None


def _infer_param_type(
    param_name: str,
    annotation: Optional[str],
    default: Any,
    doc: Optional[str]
) -> Optional[str]:
    """
    Infer the parameter type from various sources.
    
    Priority:
    1. Type annotation
    2. Default value type
    3. Documentation hints
    4. Conventional parameter names
    
    Args:
        param_name: Name of the parameter
        annotation: Type annotation if available
        default: Default value
        doc: Parameter documentation
        
    Returns:
        Inferred type as string, or None
    """
    # From annotation
    if annotation:
        if 'int' in annotation.lower():
            return 'int'
        elif 'float' in annotation.lower():
            return 'float'
        elif 'bool' in annotation.lower():
            return 'bool'
        elif 'str' in annotation.lower():
            return 'string'
    
    # From default value
    if default is not None and default != inspect.Parameter.empty:
        if isinstance(default, bool):
            return 'bool'
        elif isinstance(default, int):
            return 'int'
        elif isinstance(default, float):
            return 'float'
        elif isinstance(default, str):
            return 'string'
    
    # From documentation
    if doc:
        doc_lower = doc.lower()
        if doc_lower.startswith('int') or 'integer' in doc_lower:
            return 'int'
        elif doc_lower.startswith('float') or 'floating' in doc_lower:
            return 'float'
        elif doc_lower.startswith('bool') or 'boolean' in doc_lower:
            return 'bool'
        elif doc_lower.startswith('str') or 'string' in doc_lower:
            return 'string'
    
    # From conventional parameter names for activation functions
    conventional_float_params = {
        'alpha', 'beta', 'gamma', 'epsilon', 'threshold',
        'negative_slope', 'max_value', 'min_value'
    }
    conventional_int_params = {
        'axis', 'dim'
    }
    
    if param_name in conventional_float_params:
        return 'float'
    elif param_name in conventional_int_params:
        return 'int'
    
    return None


def _extract_doc_for_param(docstring: str, param_name: str) -> Optional[str]:
    """
    Extract documentation for a specific parameter from a docstring.
    
    Args:
        docstring: The full docstring
        param_name: Name of the parameter to find
        
    Returns:
        Documentation string for the parameter, or None
    """
    if not docstring:
        return None
    
    # Look for parameter documentation in various formats
    patterns = [
        # "param_name: description"
        rf"{param_name}:\s*(.+?)(?=\n\s*\w+:|$)",
        # "param_name (type): description"
        rf"{param_name}\s*\([^)]+\):\s*(.+?)(?=\n\s*\w+:|$)",
        # ":param param_name: description"
        rf":param\s+{param_name}:\s*(.+?)(?=\n\s*:|$)",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, docstring, re.DOTALL | re.IGNORECASE)
        if match:
            doc = match.group(1).strip()
            # Clean up the documentation
            doc = re.sub(r'\s+', ' ', doc)
            return doc
    
    return None


def _collect_parameters(func) -> List[ParamInfo]:
    """
    Collect parameter information for an activation function.
    
    Args:
        func: The activation function to inspect
        
    Returns:
        List of ParamInfo objects
    """
    params = []
    
    try:
        sig = inspect.signature(func)
        docstring = inspect.getdoc(func)
        
        for param_name, param in sig.parameters.items():
            if param_name in ('args', 'kwargs'):
                continue
            
            # Get parameter documentation
            param_doc = _extract_doc_for_param(docstring, param_name)
            
            # Get annotation as string
            annotation_str = None
            if param.annotation != inspect.Parameter.empty:
                annotation_str = str(param.annotation)
            
            # Get default value
            default_val = param.default
            if default_val == inspect.Parameter.empty:
                default_val = None
            
            # Determine if required
            is_required = param.default == inspect.Parameter.empty
            
            # Infer parameter type
            param_type = _infer_param_type(param_name, annotation_str, default_val, param_doc)
            
            # Extract value range
            value_range = _extract_value_range_from_doc(param_doc, param_name) if param_doc else None
            
            # Extract possible values
            possible_values = _extract_possible_values_from_doc(param_doc) if param_doc else None
            
            params.append(ParamInfo(
                name=param_name,
                kind=str(param.kind),
                default=str(default_val) if default_val is not None else None,
                annotation=annotation_str,
                doc=param_doc,
                required=is_required,
                param_type=param_type,
                possible_values=possible_values,
                value_range=value_range
            ))
    
    except Exception as e:
        print(f"Warning: Could not inspect parameters for {func.__name__}: {e}")
    
    return params


def _get_function_description(func) -> str:
    """
    Extract the function description from its docstring.
    
    Args:
        func: The function to get description for
        
    Returns:
        First line/paragraph of the docstring
    """
    doc = inspect.getdoc(func)
    if not doc:
        return ""
    
    # Get first paragraph (before first blank line or Args section)
    lines = doc.split('\n')
    description_lines = []
    
    for line in lines:
        line = line.strip()
        if not line or line.lower().startswith(('args:', 'arguments:', 'parameters:', 'returns:', 'example:')):
            break
        description_lines.append(line)
    
    return ' '.join(description_lines)


def _is_utility_function(name: str) -> bool:
    """
    Determine if a function is a utility function (not an actual activation).
    
    Args:
        name: The function name
        
    Returns:
        True if it's a utility function
    """
    utility_functions = {
        'get', 'serialize', 'deserialize'
    }
    return name in utility_functions


def collect_activations() -> List[ActivationInfo]:
    """
    Collect information about all activation functions in tf.keras.activations.
    
    Returns:
        List of ActivationInfo objects
    """
    activations = []
    
    # Get all functions from tf.keras.activations
    activations_module = tf.keras.activations
    
    for name, obj in inspect.getmembers(activations_module, inspect.isfunction):
        # Skip private functions
        if name.startswith('_'):
            continue
        
        # Get qualified name
        qualified_name = f"{obj.__module__}.{obj.__name__}"
        
        # Get description
        description = _get_function_description(obj)
        
        # Get parameters
        parameters = _collect_parameters(obj)
        
        # Check if utility function
        is_utility = _is_utility_function(name)
        
        activations.append(ActivationInfo(
            name=name,
            qualified_name=qualified_name,
            module=obj.__module__,
            description=description,
            parameters=parameters,
            is_utility=is_utility
        ))
    
    # Sort by name
    activations.sort(key=lambda x: x.name)
    
    return activations


def generate_manifest():
    """Generate the activations manifest JSON file."""
    print("Collecting activation functions information...")
    activations = collect_activations()
    
    print(f"\nFound {len(activations)} activation functions")
    print(f"Utility functions: {sum(1 for a in activations if a.is_utility)}")
    print(f"Actual activations: {sum(1 for a in activations if not a.is_utility)}")
    
    # Convert to dict for JSON serialization
    activations_dict = [asdict(activation) for activation in activations]
    
    # Create output structure
    output = {
        "tensorflow_version": tf.__version__,
        "activations": activations_dict
    }
    
    # Write to file in the same directory as this script
    script_dir = Path(__file__).parent
    output_path = script_dir / "activation_manifest.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\n✓ Manifest written to {output_path}")
    
    # Print some statistics
    print("\nSample activation functions:")
    for activation in activations[:15]:
        params_info = f"{len(activation.parameters)} params"
        utility_info = " (utility)" if activation.is_utility else ""
        print(f"  - {activation.name}: {params_info}{utility_info}")


if __name__ == "__main__":
    generate_manifest()
