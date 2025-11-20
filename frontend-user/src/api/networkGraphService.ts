import axios from 'axios';

const DJANGO_API_URL = String(import.meta.env.VITE_DJANGO_BASE_URL).concat("/api");
const USE_PRESIGNED_UPLOADS = String(import.meta.env.VITE_USE_PRESIGNED_UPLOADS).toLowerCase() === 'true';
const PRESIGNED_UPLOAD_EXTRA_HEADERS: Record<string, string> = (() => {
  const raw = import.meta.env.VITE_PRESIGN_UPLOAD_HEADERS;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, string>;
      }
    } catch (err) {
      console.warn('Failed to parse VITE_PRESIGN_UPLOAD_HEADERS', err);
    }
  }
  return { 'x-ms-blob-type': 'BlockBlob' };
})();

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
      // Backend expects a standard Bearer JWT issued by ASP.NET
      config.headers = config.headers || {};
      // Preserve existing Authorization if present
      if (!config.headers['Authorization'] && !config.headers['authorization']) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (e) {
    // Ignore storage read errors but log at debug level for diagnostics
    console.debug('Failed to read auth token from storage', e);
  }
  return config;
});

const uploadToPresignedUrl = async (url: string, file: File) => {
  const headers = {
    'Content-Type': file.type || 'application/octet-stream',
    ...PRESIGNED_UPLOAD_EXTRA_HEADERS,
  };
  await axios.put(url, file, { headers });
};

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
    if (resp.status === 200) {
      if (resp.data && Array.isArray(resp.data)) return resp.data;
      if (resp.data?.results && Array.isArray(resp.data.results)) return resp.data.results;
    }
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
    const payload: Record<string, unknown> = {
      x_columns: options.x_columns,
      y_column: options.y_column,
    };

    const assign = (key: string, value: unknown) => {
      if (value !== undefined && value !== null) {
        payload[key] = value;
      }
    };

    assign('optimizer', options.optimizer);
    assign('loss', options.loss);
    if (options.metrics && options.metrics.length > 0) {
      assign('metrics', options.metrics);
    }
    assign('epochs', options.epochs);
    assign('batch_size', options.batch_size);
    assign('validation_split', options.validation_split);
    assign('test_split', options.test_split);
    assign('y_one_hot', options.y_one_hot);
    assign('learning_rate', options.learning_rate);
    assign('shuffle', options.shuffle);
    assign('validation_batch_size', options.validation_batch_size);
    assign('early_stopping', options.early_stopping);
    assign('es_monitor', options.es_monitor);
    assign('es_mode', options.es_mode);
    assign('es_patience', options.es_patience);
    assign('es_min_delta', options.es_min_delta);
    assign('es_restore_best_weights', options.es_restore_best_weights);
    assign('reduce_lr', options.reduce_lr);
    assign('rlrop_monitor', options.rlrop_monitor);
    assign('rlrop_factor', options.rlrop_factor);
    assign('rlrop_patience', options.rlrop_patience);
    assign('rlrop_min_lr', options.rlrop_min_lr);

    if (USE_PRESIGNED_UPLOADS) {
      const presignResp = await djangoClient.post(`network/graphs/${graphId}/presign-upload/`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (presignResp.status !== 201 || !presignResp.data) {
        throw new Error('Failed to request presigned upload');
      }
      const jobId = presignResp.data.job_id || presignResp.data.id;
      const uploadUrl = presignResp.data.upload_url;
      if (!jobId || !uploadUrl) {
        throw new Error('Presigned upload response missing required data');
      }
      await uploadToPresignedUrl(uploadUrl, csvFile);
      const startResp = await djangoClient.post(`network/training-jobs/${jobId}/start/`);
      if (startResp.status === 202) return startResp.data;
      throw new Error('Failed to start training job after uploading dataset');
    }

    const form = new FormData();
    form.append('file', csvFile);
    Object.entries(payload).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        form.append(key, JSON.stringify(value));
      } else {
        form.append(key, String(value));
      }
    });

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
    const resp = await djangoClient.post(`network/training-jobs/${jobId}/predict/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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