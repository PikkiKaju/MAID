import axios from 'axios';

const DJANGO_API_BASE = import.meta.env.VITE_DJANGO_API_BASE || import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8000/api/';

const djangoClient = axios.create({
  baseURL: DJANGO_API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Minimal types for payloads returned/accepted by the Django API
export type GraphNode = {
  id: string;
  type: string;
  label?: string;
  params?: Record<string, unknown>;
  position?: { x: number; y: number } | Record<string, unknown>;
  notes?: unknown;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  meta?: Record<string, unknown>;
};

export type NetworkGraphPayload = {
  id?: string;
  name?: string;
  task?: string;
  framework?: string;
  framework_version?: string;
  status?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  nodes?: GraphNode[];
  edges?: GraphEdge[];
};

let layersCache: unknown | null = null;
let layersCachePromise: Promise<unknown> | null = null;

const networkGraphService = {
  listGraphs: async (): Promise<NetworkGraphPayload[]> => {
    const resp = await djangoClient.get('network/graphs/');
    if (resp.status === 200) return resp.data;
    throw new Error('Failed to fetch graphs');
  },

  getGraph: async (id: string): Promise<NetworkGraphPayload> => {
    const resp = await djangoClient.get(`network/graphs/${id}/`);
    if (resp.status === 200) return resp.data;
    throw new Error('Failed to fetch graph');
  },

  createGraph: async (payload: NetworkGraphPayload) => {
    const resp = await djangoClient.post('network/graphs/', payload);
    if (resp.status === 201) return resp.data;
    throw new Error('Failed to create graph');
  },

  updateGraph: async (id: string, payload: NetworkGraphPayload) => {
    const resp = await djangoClient.put(`network/graphs/${id}/`, payload);
    if (resp.status === 200) return resp.data;
    throw new Error('Failed to update graph');
  },

  deleteGraph: async (id: string) => {
    const resp = await djangoClient.delete(`network/graphs/${id}/`);
    if (resp.status === 204) return true;
    throw new Error('Failed to delete graph');
  },

  /**
   * Compile graph on the backend. If nodes/edges are provided they will be used
   * instead of the stored graph (the view reads request.data when present).
   */
  compileGraph: async (id: string, nodes?: GraphNode[], edges?: GraphEdge[]) => {
    const body: Record<string, unknown> = {};
    if (nodes) body.nodes = nodes;
    if (edges) body.edges = edges;
    const resp = await djangoClient.post(`network/graphs/${id}/compile/`, body);
    if (resp.status === 200) return resp.data;
    throw new Error('Failed to compile graph');
  },

  getModelPythonCode: async (id: string) => {
    const resp = await djangoClient.get(`network/graphs/${id}/export-script/`, { responseType: 'text' });
    if (resp.status === 200) return resp.data;
    throw new Error('Failed to get model python code');
  },

  getLayersList: async (forceRefresh = false): Promise<unknown> => {
    if (!forceRefresh && layersCache) return layersCache;
    if (!forceRefresh && layersCachePromise) return layersCachePromise;

    layersCachePromise = (async () => {
      const resp = await djangoClient.get('network/layers/');
      if (resp.status === 200) {
        layersCache = resp.data;
        layersCachePromise = null;
        return layersCache;
      }
      layersCachePromise = null;
      throw new Error('Failed to fetch layers');

    })();

    return layersCachePromise;
  },

  getLayer: async (id: string) => {
    const resp = await djangoClient.get(`network/layers/${id}/`);
    if (resp.status === 200) return resp.data;
    throw new Error('Failed to fetch layer');
  },

  getLayersSpecs: async () => {
    const resp = await djangoClient.get('network/layers/specs/');
    if (resp.status === 200) return resp.data;
    throw new Error('Failed to fetch layers specs');
  },
};

export default networkGraphService;