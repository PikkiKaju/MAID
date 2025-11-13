"""
Script to generate a comprehensive manifest of all TensorFlow/Keras metrics.

This script introspects the tf.keras.metrics module to extract:
- All metric classes with their metadata
- Constructor parameters with types, ranges, and possible values
- Descriptions from docstrings
- Base classes and module information

The output is a JSON file that can be consumed by the frontend for rendering
appropriate UI controls for metric configuration.
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
    sys.stderr.write("Error: TensorFlow is required to generate the optimizer manifest. "
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
class MetricInfo:
    """Information about a metric class."""
    name: str
    qualified_name: str
    module: str
    bases: List[str]
    description: str
    parameters: List[ParamInfo]
    is_base_class: bool = False


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
    
    # From conventional parameter names
    conventional_int_params = {
        'num_classes', 'num_samples', 'num_thresholds', 
        'top_k', 'class_id', 'sample_weight', 'k'
    }
    conventional_float_params = {
        'threshold', 'beta', 'alpha', 'gamma', 'epsilon',
        'label_smoothing', 'delta', 'rho'
    }
    
    if param_name in conventional_int_params:
        return 'int'
    elif param_name in conventional_float_params:
        return 'float'
    
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


def _collect_parameters(cls) -> List[ParamInfo]:
    """
    Collect parameter information for a metric class.
    
    Args:
        cls: The metric class to inspect
        
    Returns:
        List of ParamInfo objects
    """
    params = []
    
    try:
        sig = inspect.signature(cls.__init__)
        docstring = inspect.getdoc(cls)
        
        for param_name, param in sig.parameters.items():
            if param_name in ('self', 'args', 'kwargs'):
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
        print(f"Warning: Could not inspect parameters for {cls.__name__}: {e}")
    
    return params


def _get_class_description(cls) -> str:
    """
    Extract the class description from its docstring.
    
    Args:
        cls: The class to get description for
        
    Returns:
        First line/paragraph of the docstring
    """
    doc = inspect.getdoc(cls)
    if not doc:
        return ""
    
    # Get first paragraph (before first blank line or Args section)
    lines = doc.split('\n')
    description_lines = []
    
    for line in lines:
        line = line.strip()
        if not line or line.lower().startswith(('args:', 'arguments:', 'parameters:', 'attributes:')):
            break
        description_lines.append(line)
    
    return ' '.join(description_lines)


def _is_base_metric_class(cls) -> bool:
    """
    Determine if a class is a base/abstract metric class.
    
    Args:
        cls: The class to check
        
    Returns:
        True if it's a base class
    """
    base_class_names = {
        'Metric', 'Mean', 'Sum', 'Reduce', 'MeanMetricWrapper'
    }
    return cls.__name__ in base_class_names


def collect_metrics() -> List[MetricInfo]:
    """
    Collect information about all metrics in tf.keras.metrics.
    
    Returns:
        List of MetricInfo objects
    """
    metrics = []
    
    # Get all classes from tf.keras.metrics
    metrics_module = tf.keras.metrics
    
    for name, obj in inspect.getmembers(metrics_module, inspect.isclass):
        # Skip private classes
        if name.startswith('_'):
            continue
        
        # Get qualified name
        qualified_name = f"{obj.__module__}.{obj.__name__}"
        
        # Get base classes
        bases = [f"{base.__module__}.{base.__name__}" for base in obj.__bases__]
        
        # Get description
        description = _get_class_description(obj)
        
        # Get parameters
        parameters = _collect_parameters(obj)
        
        # Check if base class
        is_base = _is_base_metric_class(obj)
        
        metrics.append(MetricInfo(
            name=name,
            qualified_name=qualified_name,
            module=obj.__module__,
            bases=bases,
            description=description,
            parameters=parameters,
            is_base_class=is_base
        ))
    
    # Sort by name
    metrics.sort(key=lambda x: x.name)
    
    return metrics


def generate_manifest():
    """Generate the metrics manifest JSON file."""
    print("Collecting metrics information...")
    metrics = collect_metrics()
    
    print(f"\nFound {len(metrics)} metrics")
    print(f"Base classes: {sum(1 for m in metrics if m.is_base_class)}")
    print(f"Concrete metrics: {sum(1 for m in metrics if not m.is_base_class)}")
    
    # Convert to dict for JSON serialization
    metrics_dict = [asdict(metric) for metric in metrics]
    
    # Create output structure
    output = {
        "tensorflow_version": tf.__version__,
        "metrics": metrics_dict
    }
    
    # Write to file in the manifests directory
    script_dir = Path(__file__).parent
    manifests_dir = script_dir.parent / "manifests"
    manifests_dir.mkdir(exist_ok=True)
    output_path = manifests_dir / "metric_manifest.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\n✓ Manifest written to {output_path}")
    
    # Print some statistics
    print("\nSample metrics:")
    for metric in metrics[:10]:
        params_info = f"{len(metric.parameters)} params"
        base_info = " (base)" if metric.is_base_class else ""
        print(f"  - {metric.name}: {params_info}{base_info}")


if __name__ == "__main__":
    generate_manifest()
