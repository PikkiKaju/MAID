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

  /**
   * Compile graph from payload without saving to database.
   * Uses POST /api/network/graphs/compile endpoint.
   */
  compileGraphFromPayload: async (nodes: GraphNode[], edges: GraphEdge[]) => {
    const resp = await djangoClient.post(`network/graphs/compile/`, { nodes, edges });
    if (resp.status === 200) return resp.data;
    throw new Error('Failed to compile graph from payload');
  },

  getModelPythonCode: async (id: string) => {
    const resp = await djangoClient.get(`network/graphs/${id}/export-script/`, { responseType: 'text' });
    if (resp.status === 200) return resp.data;
    throw new Error('Failed to get model python code');
  },

  /**
   * Export Python code from payload without saving to database.
   * Uses POST /api/network/graphs/export-script endpoint.
   */
  exportPythonFromPayload: async (nodes: GraphNode[], edges: GraphEdge[], name: string = 'model'): Promise<string> => {
    const resp = await djangoClient.post(`network/graphs/export-script/`, { nodes, edges, name }, { responseType: 'text' });
    if (resp.status === 200) return resp.data;
    throw new Error('Failed to export Python code from payload');
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

  // Optimizers/Losses/Metrics catalogs
  getOptimizersList: async (): Promise<{ tensorflow_version?: string; optimizer_count?: number; optimizers: { name: string; description?: string }[] }> => {
    const resp = await djangoClient.get('network/optimizers/');
    if (resp.status === 200) return resp.data;
    throw new Error('Failed to fetch optimizers');
  },

  getLossesList: async (): Promise<{ tensorflow_version?: string; loss_count?: number; losses: { name: string; description?: string; is_function?: boolean; alias_of?: string | null }[] }> => {
    const resp = await djangoClient.get('network/losses/');
    if (resp.status === 200) return resp.data;
    throw new Error('Failed to fetch losses');
  },

  getMetricsList: async (): Promise<{ tensorflow_version?: string; metric_count?: number; metrics: { name: string; description?: string }[] }> => {
    const resp = await djangoClient.get('network/metrics/');
    if (resp.status === 200) return resp.data;
    throw new Error('Failed to fetch metrics');
  },

  /**
   * Import a Keras model JSON string and persist as a graph.
   * Backend route: POST /network/graphs/import-keras-json
   */
  importKerasJson: async (modelJson: string, name?: string): Promise<NetworkGraphPayload> => {
    const body: Record<string, unknown> = { model_json: modelJson };
    if (name) body.name = name;
    const resp = await djangoClient.post('network/graphs/import-keras-json/', body, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (resp.status === 201) return resp.data;
    throw new Error('Failed to import Keras JSON');
  },

  // Training endpoints
  startTraining: async (
    graphId: string,
    csvFile: File,
    options: {
      x_columns: string[];
      y_column: string;
      optimizer?: string;
      loss?: string;
      metrics?: string[];
      epochs?: number;
      batch_size?: number;
      validation_split?: number;
      test_split?: number;
      y_one_hot?: boolean;
    }
  ) => {
    const form = new FormData();
    form.append('file', csvFile);
    form.append('x_columns', JSON.stringify(options.x_columns));
    form.append('y_column', options.y_column);
    if (options.optimizer) form.append('optimizer', options.optimizer);
    if (options.loss) form.append('loss', options.loss);
    if (options.metrics) form.append('metrics', JSON.stringify(options.metrics));
    if (options.epochs != null) form.append('epochs', String(options.epochs));
    if (options.batch_size != null) form.append('batch_size', String(options.batch_size));
    if (options.validation_split != null) form.append('validation_split', String(options.validation_split));
    if (options.test_split != null) form.append('test_split', String(options.test_split));
  if (options.y_one_hot != null) form.append('y_one_hot', String(!!options.y_one_hot));

    const resp = await djangoClient.post(`network/graphs/${graphId}/train/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (resp.status === 202) return resp.data;
    throw new Error('Failed to start training job');
  },

  getTrainingJob: async (jobId: string) => {
    const resp = await djangoClient.get(`network/training-jobs/${jobId}/`);
    if (resp.status === 200) return resp.data;
    throw new Error('Failed to get training job');
  },

  downloadArtifact: async (jobId: string): Promise<Blob> => {
    const resp = await djangoClient.get(`network/training-jobs/${jobId}/artifact/`, { responseType: 'blob' });
    if (resp.status === 200) return resp.data as Blob;
    throw new Error('Failed to download artifact');
  },
};

export default networkGraphService;