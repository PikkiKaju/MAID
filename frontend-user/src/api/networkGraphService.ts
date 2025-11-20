import axios from 'axios';

const DJANGO_API_URL = String(import.meta.env.VITE_DJANGO_BASE_URL).concat("/api");

const djangoClient = axios.create({
  baseURL: DJANGO_API_URL,
  headers: { 'Content-Type': 'application/json' },
  // Allow cookies for SessionAuthentication if used alongside TokenAuthentication
  withCredentials: true,
});

// Attach token if present (stored under 'token' in sessionStorage/localStorage)
djangoClient.interceptors.request.use((config) => {
  try {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token) {
      // DRF TokenAuthentication expects 'Token <key>'
      config.headers = config.headers || {};
      // Preserve existing Authorization if present
      if (!config.headers['Authorization'] && !config.headers['authorization']) {
        config.headers['Authorization'] = `Token ${token}`;
      }
    }
  } catch (e) {
    // Ignore storage read errors but log at debug level for diagnostics
    console.debug('Failed to read auth token from storage', e);
  }
  return config;
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
   * Compile graph by id on the backend. Backend exposes this as GET
   * `/network/graphs/{id}/compile/` which uses the persisted graph.
   * To compile from arbitrary nodes/edges without saving, use
   * `compileGraphFromPayload`.
   */
  compileGraph: async (id: string) => {
    const resp = await djangoClient.get(`network/graphs/${id}/compile/`);
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
      learning_rate?: number;
      shuffle?: boolean;
      validation_batch_size?: number;
      early_stopping?: boolean;
      es_monitor?: string;
      es_mode?: 'auto' | 'min' | 'max' | string;
      es_patience?: number;
      es_min_delta?: number;
      es_restore_best_weights?: boolean;
      reduce_lr?: boolean;
      rlrop_monitor?: string;
      rlrop_factor?: number;
      rlrop_patience?: number;
      rlrop_min_lr?: number;
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
    if (options.learning_rate != null) form.append('learning_rate', String(options.learning_rate));
    if (options.shuffle != null) form.append('shuffle', String(!!options.shuffle));
    if (options.validation_batch_size != null) form.append('validation_batch_size', String(options.validation_batch_size));
    if (options.early_stopping != null) form.append('early_stopping', String(!!options.early_stopping));
    if (options.es_monitor) form.append('es_monitor', options.es_monitor);
    if (options.es_mode) form.append('es_mode', String(options.es_mode));
    if (options.es_patience != null) form.append('es_patience', String(options.es_patience));
    if (options.es_min_delta != null) form.append('es_min_delta', String(options.es_min_delta));
    if (options.es_restore_best_weights != null) form.append('es_restore_best_weights', String(!!options.es_restore_best_weights));
    if (options.reduce_lr != null) form.append('reduce_lr', String(!!options.reduce_lr));
    if (options.rlrop_monitor) form.append('rlrop_monitor', options.rlrop_monitor);
    if (options.rlrop_factor != null) form.append('rlrop_factor', String(options.rlrop_factor));
    if (options.rlrop_patience != null) form.append('rlrop_patience', String(options.rlrop_patience));
    if (options.rlrop_min_lr != null) form.append('rlrop_min_lr', String(options.rlrop_min_lr));

    // Let the browser/axios set the Content-Type (including boundary)
    const resp = await djangoClient.post(`network/graphs/${graphId}/train/`, form);
    if (resp.status === 202) return resp.data;
    throw new Error('Failed to start training job');
  },

  getTrainingJob: async (jobId: string) => {
    const resp = await djangoClient.get(`network/training-jobs/${jobId}/`);
    if (resp.status === 200) return resp.data;
    throw new Error('Failed to get training job');
  },

  cancelTraining: async (jobId: string) => {
    const resp = await djangoClient.post(`network/training-jobs/${jobId}/cancel/`);
    if (resp.status === 202 || resp.status === 200) return resp.data;
    throw new Error('Failed to cancel training job');
  },

  // Inference endpoints
  predictWithJson: async (
    jobId: string,
    payload:
      | { instances: Array<Array<number>> }
      | { records: Array<Record<string, number>> }
  ): Promise<{ predictions: unknown }> => {
    const resp = await djangoClient.post(`network/training-jobs/${jobId}/predict/`, payload);
    if (resp.status === 200) return resp.data;
    throw new Error('Prediction failed');
  },

  predictWithCsv: async (jobId: string, file: File): Promise<{ predictions: unknown }> => {
    const form = new FormData();
    form.append('file', file);
    // Let the browser/axios set the Content-Type (including boundary)
    const resp = await djangoClient.post(`network/training-jobs/${jobId}/predict/`, form);
    if (resp.status === 200) return resp.data;
    throw new Error('Prediction failed');
  },

  // Download artifact: backend may either return a presigned JSON {url: ...}
  // or stream the file directly. We first attempt to fetch JSON, then
  // fall back to a blob request if the server streams binary data.
  downloadArtifact: async (jobId: string): Promise<Blob | { url: string } | string> => {
    // try JSON response first (presigned URL)
    try {
      const respJson = await djangoClient.get(`network/training-jobs/${jobId}/artifact/`);
      if (respJson.status === 200 && respJson.data) {
        // If backend returned a presigned url object, return it
        if (typeof respJson.data === 'object' && respJson.data.url) {
          return respJson.data;
        }
        // If server returned plain data (unlikely for artifact), return it
        return respJson.data as string;
      }
    } catch (err) {
      // If JSON fetch failed (server returned binary or non-JSON),
      // log for diagnostics and fall through to blob fetch.
      console.debug('artifact JSON fetch failed, falling back to blob fetch', err);
    }

    // Fallback: request binary stream
    const resp = await djangoClient.get(`network/training-jobs/${jobId}/artifact/`, { responseType: 'blob' });
    if (resp.status === 200) return resp.data as Blob;
    throw new Error('Failed to download artifact');
  },

  /**
   * Convenience helper that downloads the artifact into the browser.
   * - If backend returns a presigned URL ({url}), opens that URL in a new tab.
   * - If backend streams a Blob, creates an object URL and triggers a download.
   */
  downloadArtifactToBrowser: async (jobId: string, filename: string = 'model.keras'): Promise<void> => {
    // Inline fetch similar to downloadArtifact to avoid circular typing issues
    // Try JSON/presigned URL first
    try {
      const respJson = await djangoClient.get(`network/training-jobs/${jobId}/artifact/`);
      if (respJson.status === 200 && respJson.data) {
        if (typeof respJson.data === 'object' && 'url' in respJson.data) {
          const url = String((respJson.data as unknown as { url?: string }).url ?? '');
          window.open(url, '_blank');
          return;
        }
        // If server returned a string payload, download it as blob
        if (typeof respJson.data === 'string') {
          const blob = new Blob([respJson.data], { type: 'application/octet-stream' });
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
          return;
        }
      }
    } catch (err) {
      // fall through to blob fetch below
      console.debug('artifact JSON fetch failed, falling back to blob fetch', err);
    }

    // Fallback: fetch binary blob and trigger download
    const resp = await djangoClient.get(`network/training-jobs/${jobId}/artifact/`, { responseType: 'blob' });
    if (resp.status === 200 && resp.data instanceof Blob) {
      const blob: Blob = resp.data;
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      return;
    }

    throw new Error('Failed to download artifact');
  },
};

export default networkGraphService;