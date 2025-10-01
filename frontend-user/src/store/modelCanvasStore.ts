import { create } from 'zustand';
import { Edge, Node } from 'reactflow';
import { nanoid } from 'nanoid/non-secure';

// Shape of the model canvas state.
export interface ModelCanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId?: string;
  addNode: (type: string, defaults: Record<string, unknown>) => void;
  setGraph: (nodes: Node[], edges: Edge[]) => void;
  setSelected: (id?: string) => void;
  updateNodeData: (id: string, data: Partial<{ label: string; params: Record<string, unknown> }>) => void;
  removeNode: (id: string) => void;
  removeEdge: (id: string) => void;
}

export const useModelCanvasStore = create<ModelCanvasState>((set) => ({
  nodes: [],
  edges: [],
  // Adds a new node with a random-ish position (basic scatter so they don't overlap exactly)
  addNode: (type, defaults) => set((state) => {
    const position = { x: 250 + Math.random() * 200, y: 100 + Math.random() * 200 };
    const node: Node = {
      id: nanoid(6),
      type,
      position,
      data: { label: type, params: defaults },
    };
    return { nodes: [...state.nodes, node] };
  }),
  // Replaces the full graph (used for persistence / external updates)
  setGraph: (nodes, edges) => set({ nodes, edges }),
  // Marks one node as selected (UI selection)
  setSelected: (id) => set({ selectedNodeId: id }),
  // Shallow merge of node.data – used when editing params in the inspector
  updateNodeData: (id, data) => set((state) => ({
    nodes: state.nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n)
  })),
  // Removes node & any incident edges. Also clears selection if it was the selected node.
  removeNode: (id) => set((state) => ({
    nodes: state.nodes.filter(n => n.id !== id),
    edges: state.edges.filter(e => e.source !== id && e.target !== id),
    selectedNodeId: state.selectedNodeId === id ? undefined : state.selectedNodeId
  })),
  // Removes a single edge by id
  removeEdge: (id) => set((state) => ({
    edges: state.edges.filter(e => e.id !== id)
  }))
}));
