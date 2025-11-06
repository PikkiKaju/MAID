import { Save, Trash2, Play, FileDown, Upload } from 'lucide-react';
import { useModelCanvasStore } from '../../store/modelCanvasStore';
import networkGraphService, { GraphEdge, GraphNode, NetworkGraphPayload } from '../../api/networkGraphService';
import { useRef, useState } from 'react';
import { Edge as RFEdge, Node as RFNode } from 'reactflow';

interface Props { onSave: () => void }

export default function TopToolbar({ onSave }: Props) {
  const setGraph = useModelCanvasStore(s => s.setGraph);
  const currentNodes = useModelCanvasStore(s => s.nodes);
  const currentEdges = useModelCanvasStore(s => s.edges);

  const fileKerasRef = useRef<HTMLInputElement | null>(null);
  const fileGraphRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<null | string>(null);

  const clearAll = () => setGraph([], []);

  const buildPayloadFromStore = (): { nodes: GraphNode[]; edges: GraphEdge[] } => {
    const nodesPayload: GraphNode[] = currentNodes.map(n => {
      const data = (n.data as unknown) as { label?: string; layer?: string; params?: Record<string, unknown>; position?: unknown; notes?: unknown } | undefined;
      return {
        id: n.id,
        type: data?.layer || (n.type as string) || '',
        label: data?.label || '',
        params: data?.params || {},
        position: n.position || data?.position || {},
        notes: data?.notes || {},
      } as GraphNode;
    });
    const edgesPayload: GraphEdge[] = currentEdges.map(e => ({
      id: e.id!,
      source: e.source,
      target: e.target,
      meta: ((e as unknown) as { meta?: Record<string, unknown> }).meta || {},
    }));
    return { nodes: nodesPayload, edges: edgesPayload };
  };

  const compileGraph = async () => {
    try {
      setBusy('compile');
      const { nodes, edges } = buildPayloadFromStore();
      // Compile from payload without saving
      const compiled = await networkGraphService.compileGraphFromPayload(nodes, edges);
      console.log('Compiled result:', compiled);
      alert('Compile successful. See console for full result.');
    } catch (err: unknown) {
      console.error('Compile failed', err);
      alert('Compile failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(null);
    }
  };

  const importKeras = async (file: File) => {
    try {
      setBusy('import-keras');
      const text = await file.text();
      const created: NetworkGraphPayload = await networkGraphService.importKerasJson(text, file.name.replace(/\.[^.]+$/, ''));
      const toXY = (val: unknown): { x: number; y: number } => {
        if (val && typeof val === 'object') {
          const rec = val as Record<string, unknown>;
          const xv = rec['x']; const yv = rec['y'];
          if (typeof xv === 'number' && typeof yv === 'number') return { x: xv, y: yv };
        }
        return { x: 100, y: 100 };
      };
      const nodes: RFNode[] = (created.nodes || []).map(n => ({
        id: String(n.id),
        type: 'layerNode',
        position: toXY(n.position),
        data: { label: n.label || n.type, layer: n.type, params: n.params || {} },
      }));
      const edges: RFEdge[] = (created.edges || []).map(e => ({
        id: String(e.id), source: String(e.source), target: String(e.target)
      }));
      setGraph(nodes, edges);
      alert('Keras model imported onto canvas');
    } catch (err: unknown) {
      console.error('Import Keras failed', err);
      alert('Import Keras failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(null);
      if (fileKerasRef.current) fileKerasRef.current.value = '';
    }
  };

  const importGraph = async (file: File) => {
    try {
      setBusy('import-graph');
      const text = await file.text();
      const json = JSON.parse(text) as NetworkGraphPayload;
      // Load directly to canvas without persisting to DB
      const toXY = (val: unknown): { x: number; y: number } => {
        if (val && typeof val === 'object') {
          const rec = val as Record<string, unknown>;
          const xv = rec['x']; const yv = rec['y'];
          if (typeof xv === 'number' && typeof yv === 'number') return { x: xv, y: yv };
        }
        return { x: 100, y: 100 };
      };
      const nodes: RFNode[] = (json.nodes || []).map(n => ({
        id: String(n.id),
        type: 'layerNode',
        position: toXY(n.position),
        data: { label: n.label || n.type, layer: n.type, params: n.params || {} },
      }));
      const edges: RFEdge[] = (json.edges || []).map(e => ({
        id: String(e.id), source: String(e.source), target: String(e.target)
      }));
      setGraph(nodes, edges);
      alert('Graph model imported onto canvas');
    } catch (err: unknown) {
      console.error('Import graph failed', err);
      alert('Import graph failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(null);
      if (fileGraphRef.current) fileGraphRef.current.value = '';
    }
  };

  const exportPython = async () => {
    try {
      setBusy('export-python');
      const { nodes, edges } = buildPayloadFromStore();
      // Export from payload without saving
      const code: string = await networkGraphService.exportPythonFromPayload(nodes, edges, 'model');
      // trigger browser download
      const blob = new Blob([code], { type: 'text/x-python' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'model.py';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('Export python failed', err);
      alert('Export python failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className='flex items-center gap-2 border-b px-3 py-2 bg-slate-100 text-xs'>
      {/* Save current canvas (delegates to parent) */}
      <button onClick={onSave} disabled={!!busy} className='flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60'>
        <Save size={14}/> Save
      </button>

      {/* Compile on backend */}
      <button onClick={compileGraph} disabled={!!busy} className='flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-60'>
        <Play size={14}/> Compile
      </button>

      {/* Import Keras model (JSON) */}
      <input ref={fileKerasRef} type='file' accept='.json,application/json' className='hidden' onChange={(e) => {
        const f = e.target.files?.[0]; if (f) importKeras(f);
      }}/>
      <button onClick={() => fileKerasRef.current?.click()} disabled={!!busy} className='flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60'>
        <Upload size={14}/> Import Keras
      </button>

      {/* Import Graph model (JSON shaped like /network/graphs/) */}
      <input ref={fileGraphRef} type='file' accept='.json,application/json' className='hidden' onChange={(e) => {
        const f = e.target.files?.[0]; if (f) importGraph(f);
      }}/>
      <button onClick={() => fileGraphRef.current?.click()} disabled={!!busy} className='flex items-center gap-1 px-2 py-1 bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-60'>
        <Upload size={14}/> Import Graph
      </button>

      {/* Export Python */}
      <button onClick={exportPython} disabled={!!busy} className='flex items-center gap-1 px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-60'>
        <FileDown size={14}/> Export Python
      </button>

      {/* Clear canvas */}
      <button onClick={clearAll} disabled={!!busy} className='flex items-center gap-1 px-2 py-1 bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-60 ml-auto'>
        <Trash2 size={14}/> Clear
      </button>
    </div>
  );
}
