"""
Manifest utilities for TensorFlow/Keras components.

This package provides manifest-driven access to TensorFlow/Keras components,
reading generated JSON manifests and providing utilities for parameter
validation and Keras integration.

Available modules:
- activations: Activation function manifest utilities
- layers: Neural network layer manifest utilities
- losses: Loss function manifest utilities
- metrics: Evaluation metric manifest utilities
- optimizers: Training optimizer manifest utilities
"""

from . import activations
from . import layers
from . import losses
from . import metrics
from . import optimizers

__all__ = [
    'activations',
    'layers',
    'losses',
    'metrics',
    'optimizers',
]
