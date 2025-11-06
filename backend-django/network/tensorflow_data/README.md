# TensorFlow Data Directory

This directory contains TensorFlow/Keras component manifests and their generator scripts.

## Directory Structure

```
tensorflow_data/
├── __init__.py              # Package initialization
├── generators/              # Manifest generator scripts
│   ├── __init__.py
│   ├── generate_layer_manifest.py
│   ├── generate_optimizers_manifest.py
│   ├── generate_losses_manifest.py
│   ├── generate_metrics_manifest.py
│   └── generate_activations_manifest.py
└── manifests/               # Generated JSON manifest files
    ├── __init__.py
    ├── layer_manifest.json
    ├── optimizer_manifest.json
    ├── loss_manifest.json
    ├── metric_manifest.json
    └── activation_manifest.json
```

## What are Manifests?

Manifests are JSON files that contain comprehensive metadata about TensorFlow/Keras components:

- **Parameters**: Names, types, defaults, descriptions
- **Type Information**: Inferred types (int, float, str, bool)
- **Value Ranges**: Min/max constraints for numeric parameters
- **Enum Values**: Valid choices for categorical parameters
- **Documentation**: Descriptions extracted from docstrings

## Generator Scripts

Each generator script introspects TensorFlow/Keras to extract component metadata:

### Layer Manifest Generator

```bash
python network/tensorflow_data/generators/generate_layer_manifest.py
```

Generates metadata for all neural network layers (Dense, Conv2D, LSTM, etc.)

### Optimizer Manifest Generator

```bash
python network/tensorflow_data/generators/generate_optimizers_manifest.py
```

Generates metadata for training optimizers (Adam, SGD, RMSprop, etc.)

### Loss Manifest Generator

```bash
python network/tensorflow_data/generators/generate_losses_manifest.py
```

Generates metadata for loss functions (CategoricalCrossentropy, MSE, etc.)

### Metric Manifest Generator

```bash
python network/tensorflow_data/generators/generate_metrics_manifest.py
```

Generates metadata for evaluation metrics (Accuracy, Precision, AUC, etc.)

### Activation Manifest Generator

```bash
python network/tensorflow_data/generators/generate_activations_manifest.py
```

Generates metadata for activation functions (relu, sigmoid, tanh, etc.)

## Regenerating Manifests

To regenerate all manifests after TensorFlow/Keras updates:

```bash
cd backend-django

# Regenerate individual manifests
python network/tensorflow_data/generators/generate_layer_manifest.py
python network/tensorflow_data/generators/generate_optimizers_manifest.py
python network/tensorflow_data/generators/generate_losses_manifest.py
python network/tensorflow_data/generators/generate_metrics_manifest.py
python network/tensorflow_data/generators/generate_activations_manifest.py
```

Or use the API endpoints (requires admin authentication):

```bash
POST /api/network/layers/regenerate-manifest/
POST /api/network/optimizers/regenerate-manifest/
POST /api/network/losses/regenerate-manifest/
POST /api/network/metrics/regenerate-manifest/
POST /api/network/activations/regenerate-manifest/
```

## How Manifests are Used

The manifests power the REST API endpoints that provide component metadata to the frontend:

1. **Frontend queries API** for available components (e.g., GET `/api/network/layers/`)
2. **API reads manifest** from `manifests/` directory
3. **Frontend receives metadata** about parameters, types, and constraints
4. **Canvas GUI renders** appropriate input controls based on parameter types
5. **User configures components** with validated inputs
6. **Frontend sends configuration** back to build neural network

## Example Manifest Entry

```json
{
  "name": "Dense",
  "description": "Densely-connected NN layer",
  "module": "keras.layers",
  "parameters": [
    {
      "name": "units",
      "type": "int",
      "required": true,
      "description": "Dimensionality of the output space",
      "value_range": {"min": 1}
    },
    {
      "name": "activation",
      "type": "str",
      "required": false,
      "default": null,
      "description": "Activation function to use",
      "possible_values": ["relu", "sigmoid", "tanh", "softmax", ...]
    }
  ]
}
```

## Dependencies

- **TensorFlow >= 2.20.0**: Required for manifest generation
- **Keras >= 3.11.3**: Integrated with TensorFlow

## Notes

- Manifests are generated once and cached for performance
- Manifests should be regenerated when upgrading TensorFlow/Keras
- All generator scripts include parameter type inference and value range extraction
- The API can refresh manifests without restarting the server
