# TensorFlow Manifest API Endpoints

This document describes the REST API endpoints for accessing TensorFlow/Keras component manifests.

## Base URL

All endpoints are under `/api/network/`

---

## 1. Layers API (`/api/network/layers`)

### List all layers

**GET** `/api/network/layers/`

Returns a list of all available Keras layers with metadata.

**Response:**

```json
{
  "tensorflow_version": "2.20.0",
  "keras_version": "3.11.3",
  "layer_count": 150,
  "layers": [
    {
      "name": "Conv2D",
      "description": "2D convolution layer",
      "categories": ["Convolution"],
      "parameters": [...],
      "deprecated": false
    }
  ]
}
```

### Get specific layer

**GET** `/api/network/layers/{name}/`

Example: `/api/network/layers/Conv2D/`

Returns full manifest entry for a specific layer.

### Get layer specs

**GET** `/api/network/layers/specs/`

Returns parameter value specifications and version info.

### Admin: Regenerate manifest

**GET** `/api/network/layers/regenerate-manifest/` (Admin only)

Regenerates the layer manifest from scratch.

### Admin: Refresh manifest

**GET** `/api/network/layers/refresh-manifest/` (Admin only)

Reloads the layer manifest from disk.

---

## 2. Optimizers API (`/api/network/optimizers`)

### List all optimizers

**GET** `/api/network/optimizers/`

Returns a list of all available Keras optimizers.

**Response:**

```json
{
  "tensorflow_version": "2.20.0",
  "optimizer_count": 11,
  "optimizers": [
    {
      "name": "Adam",
      "description": "Optimizer that implements the Adam algorithm",
      "parameters": [...]
    }
  ]
}
```

### Get specific optimizer

**GET** `/api/network/optimizers/{name}/`

Example: `/api/network/optimizers/Adam/`

### Get optimizer specs

**GET** `/api/network/optimizers/specs/`

### Admin: Regenerate manifest

**GET** `/api/network/optimizers/regenerate-manifest/` (Admin only)

### Admin: Refresh manifest

**GET** `/api/network/optimizers/refresh-manifest/` (Admin only)

---

## 3. Losses API (`/api/network/losses`)

### List all losses

**GET** `/api/network/losses/`

Returns a list of all available Keras loss functions.

**Response:**

```json
{
  "tensorflow_version": "2.20.0",
  "loss_count": 25,
  "losses": [
    {
      "name": "BinaryCrossentropy",
      "description": "Computes cross-entropy loss between labels and predictions",
      "parameters": [...],
      "is_function": false
    }
  ]
}
```

### Get specific loss

**GET** `/api/network/losses/{name}/`

Example: `/api/network/losses/BinaryCrossentropy/`

### Get loss specs

**GET** `/api/network/losses/specs/`

### Admin: Regenerate manifest

**GET** `/api/network/losses/regenerate-manifest/` (Admin only)

### Admin: Refresh manifest

**GET** `/api/network/losses/refresh-manifest/` (Admin only)

---

## 4. Metrics API (`/api/network/metrics`)

### List all metrics

**GET** `/api/network/metrics/`

Returns a list of all available Keras metrics.

**Response:**

```json
{
  "tensorflow_version": "2.20.0",
  "metric_count": 46,
  "metrics": [
    {
      "name": "Accuracy",
      "description": "Calculates how often predictions equal labels",
      "parameters": [...],
      "is_base_class": false
    }
  ]
}
```

### Get specific metric

**GET** `/api/network/metrics/{name}/`

Example: `/api/network/metrics/Accuracy/`

### Get metric specs

**GET** `/api/network/metrics/specs/`

### Admin: Regenerate manifest

**GET** `/api/network/metrics/regenerate-manifest/` (Admin only)

### Admin: Refresh manifest

**GET** `/api/network/metrics/refresh-manifest/` (Admin only)

---

## 5. Activations API (`/api/network/activations`)

### List all activations

**GET** `/api/network/activations/`

Returns a list of all available Keras activation functions.

**Response:**

```json
{
  "tensorflow_version": "2.20.0",
  "activation_count": 35,
  "activations": [
    {
      "name": "relu",
      "description": "Rectified Linear Unit activation function",
      "parameters": [...],
      "is_utility": false
    }
  ]
}
```

### Get specific activation

**GET** `/api/network/activations/{name}/`

Example: `/api/network/activations/relu/`

### Get activation specs

**GET** `/api/network/activations/specs/`

### Admin: Regenerate manifest

**GET** `/api/network/activations/regenerate-manifest/` (Admin only)

### Admin: Refresh manifest

**GET** `/api/network/activations/refresh-manifest/` (Admin only)

---

## Parameter Metadata

All component manifests include rich parameter metadata:

```json
{
  "name": "learning_rate",
  "kind": "POSITIONAL_OR_KEYWORD",
  "default": "0.001",
  "annotation": "float",
  "doc": "The learning rate.",
  "required": false,
  "param_type": "float",
  "possible_values": null,
  "value_range": {
    "min": 0.0
  }
}
```

### Metadata Fields:

- **param_type**: Inferred type (`int`, `float`, `bool`, `string`, etc.)
- **possible_values**: Array of valid enum values (if applicable)
- **value_range**: Object with `min` and/or `max` constraints
- **required**: Whether the parameter is mandatory
- **default**: Default value if not provided
- **doc**: Documentation string

---

## Permissions

- **List/Retrieve endpoints**: Public access (AllowAny)
- **Regenerate/Refresh endpoints**: Admin only (IsAdminUser)

---

## Component Counts (TensorFlow 2.20.0)

- **Layers**: ~150 layer classes
- **Optimizers**: 11 optimizer classes
- **Losses**: 25+ loss functions/classes
- **Metrics**: 46 metric classes
- **Activations**: 35 activation functions
