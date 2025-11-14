# Canvas Architecture

Visual model builder for assembling neural network architectures (and other ML pipelines) via drag‑and‑drop layer blocks.

---

## Implemented Features (Current State)

| Area                       | Status | Notes                                                                                       |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| Drag & Drop Layer Creation | ✅     | Palette items draggable onto canvas; click adds too.                                        |
| Grouped Palette            | ✅     | Collapsible categories (Core, Convolution, Regularization, Recurrent, Output).              |
| Rich Layer Parameters      | ✅     | Expanded defaults (e.g. Dense initializers, Conv strides/padding, LSTM dropout, BatchNorm). |
| Parameter Inspector        | ✅     | Auto‑coerces numeric & boolean values; updates store live.                                  |
| Tooltips                   | ✅     | Inline Info icon with contextual parameter help.                                            |
| Selection UI               | ✅     | Node highlight + delete (X) button; edge highlight + delete (X) button.                     |
| Removable Edges            | ✅     | Custom edge type with mid‑point removal control.                                            |
| Store Synchronization      | ✅     | Zustand is single source of truth; React Flow state mirrors store.                          |
| Custom Edge Component      | ✅     | `removable` edge type uses a Bezier path and overlays a delete button when selected.        |
| Layer Categorization Docs  | ✅     | Parameter descriptions stored in `LAYER_PARAM_HELP` map.                                    |
| Type Coercion              | ✅     | Strings -> number / boolean inference in inspector.                                         |
| Basic Persistence Hook     | ⚠️     | `handlePersist` placeholder only (no backend call yet).                                     |

---

## Tech Stack

- **ReactFlow**: Graph rendering, nodes, edges, interaction plumbing.
- **Zustand**: Lightweight global store for nodes, edges, selection (simple for future undo/redo extension).
- **Lucide Icons**: Minimal consistent iconography.
- **(Planned) Zod**: Validation schemas per layer type before serialization / server sync.

---

## Data Model

```
Node = {
  id: string,
  type: string,          // matches ReactFlow nodeTypes key (e.g. denseLayer)
  position: { x: number, y: number },
  data: {
    label: string,
    params: Record<string, string | number | boolean>,
    tfType?: string       // optional explicit TF/Keras mapping override
  }
}

Edge = {
  id: string,
  source: string,
  target: string,
  type?: 'removable',
  ...ReactFlowEdgeProps
}
```

The store maintains arrays `nodes` and `edges`, plus `selectedNodeId` for UI state.

---

## Store Actions (Zustand)

| Action                        | Purpose                                  |
| ----------------------------- | ---------------------------------------- |
| `addNode(type, defaults)`     | Adds a new node with scattered position. |
| `setGraph(nodes, edges)`      | Replace entire graph (load / persist).   |
| `setSelected(id?)`            | Marks selected node.                     |
| `updateNodeData(id, partial)` | Shallowly merges node `data`.            |
| `removeNode(id)`              | Deletes node + incident edges.           |
| `removeEdge(id)`              | Deletes a single edge.                   |

---

## Parameter Help & Tooltips

Central dictionary (`LAYER_PARAM_HELP`) provides human‑readable hints surfaced as tooltips in the Inspector. Future extension: validation constraints + value suggestions.

---

## Backend Contract (Draft)

Endpoint proposal: `POST /api/model/graph`

Request:

```jsonc
{
  "nodes": [
    {
      "id": "n1",
      "type": "inputLayer",
      "params": { "shape": "(32,)", "dtype": "float32" }
    },
    {
      "id": "n2",
      "type": "denseLayer",
      "params": { "units": 128, "activation": "relu" }
    }
  ],
  "edges": [{ "source": "n1", "target": "n2" }]
}
```

Response (example):

```jsonc
{
  "valid": true,
  "kerasCode": "model = keras.Sequential([...])",
  "summary": "Layer (type) Output Shape Param # ..."
}
```

---

## Custom Edge Implementation

`RemovableEdge` wraps `BaseEdge`, adds a selection-based midpoint delete button; uses `interactionWidth` for forgiving hit area.

---

## Current Limitations

- No undo/redo history yet.
- No keyboard shortcuts (Delete, Ctrl+Z/Y) yet.
- No shape / compatibility validation (e.g. mismatch between Conv filters and next layer expectations).
- No auto‑layout (Dagre/ELK) or alignment guides.
- Multi-select not implemented.
- Parameter inputs are all plain text (no dropdowns / numeric steppers / checkboxes yet).

---

## Roadmap (Suggested Next Phases)

### Near Term

1. Add keyboard shortcuts (Delete, Ctrl+Z, Ctrl+Y).
2. Introduce undo/redo stack (persistent ring buffer of patches).
3. Replace generic inputs with typed controls:
   - Boolean -> checkbox
   - Numeric -> number input w/ min/max
   - Activation / Initializer / Padding -> select dropdown
4. Basic validation layer (Zod) + inline error badges on nodes.
5. Export to TensorFlow/Keras JSON + code preview panel.

### Mid Term

6. Auto-layout (Dagre / ELK) toggle.
7. Mini “wizard” to scaffold common patterns (CNN block, Residual block, LSTM stack).
8. Grouped / compound nodes (encapsulation + reuse library).
9. Versioned save & load (with diff view).
10. Graph import (load existing Keras model summary -> pre-populate graph if feasible).

### Long Term

11. Collaborative editing (WebSocket presence + locking semantics).
12. Performance estimation (rough FLOPs / param count badge).
13. GPU resource hinting & automatic mixed precision suggestions.
14. Deployment packaging pipeline triggers.

---

## Styling / UX Guidelines

- Keep cognitive load low: progressive disclosure (groups collapsed by default except Core).
- Use consistent micro-interactions (hover state, focus ring, active press states).
- Minimize color noise; color encodes category or state (selection / danger / info).

---

## Testing Ideas

| Scenario                           | Expectation                                      |
| ---------------------------------- | ------------------------------------------------ |
| Add then remove node               | Node and its edges disappear; selection cleared. |
| Add multiple edges then delete one | Only chosen edge removed.                        |
| Parameter edit (number)            | Value stored as number type.                     |
| Parameter edit (true/false)        | Value coerced to boolean.                        |
| Invalid numeric string             | Stored as string (no crash).                     |

---

## Extensibility Hooks

- Serialization layer: convert store -> canonical graph DTO before POST.
- Validation pipeline: array of rule functions `(graph) => Issue[]` feeding UI badges.
- Undo manager: wrap each store mutation with diff capture.
- Plugin surface (future): register new layer types dynamically.

---

## Quick Dev Notes

- When adding a new layer type: update palette groups, `layerNodeTypes`, defaults, and docs map.
- Keep default params minimal but illustrative; advanced settings can be hidden behind an “Advanced” accordion.

---

> This document will move to formal project docs once backend integration & validation are in place.
