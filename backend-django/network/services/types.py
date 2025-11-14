from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Sequence


@dataclass
class GraphStructure:
    """Derived structure of a validated graph."""
    ordered_nodes: List[Dict[str, Any]]
    inputs: List[str]
    outputs: List[str]
    adjacency: Dict[str, List[str]]


class GraphValidationError(Exception):
    """Validation error raised when a graph payload is invalid.

    Holds a serializable `detail` object suitable for API responses.
    """

    def __init__(self, detail: Any):
        self.detail = detail
        # Represent as string for Exception base
        super().__init__(str(detail))