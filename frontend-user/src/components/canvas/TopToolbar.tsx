import { Save, Trash2, Play, FileDown, Upload, FolderOpen, Eraser } from 'lucide-react';
import LoadGraphModal from './LoadGraphModal';
import { useModelCanvasStore } from '../../store/modelCanvasStore';
import networkGraphService, { GraphEdge, GraphNode, NetworkGraphPayload } from '../../api/networkGraphService';
import { useEffect, useRef, useState } from 'react';
import { Edge as RFEdge, Node as RFNode } from 'reactflow';
import { useAppSelector } from '../../store/hooks';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../ui/alert-dialog';

interface Props {
  onSave: () => void;
  onLoadGraph: (graph: NetworkGraphPayload) => void;
  modelName: string;
  onModelNameChange: (name: string) => void;
  onShowErrors?: (messages: string[], raw?: unknown) => void;
  onShowSuccess?: (message: string) => void;
  canDeleteModel?: boolean;
  onDeleteModel?: () => void | Promise<void>;
  deletingModel?: boolean;
}

export default function TopToolbar({ onSave, onLoadGraph, modelName, onModelNameChange, onShowErrors, onShowSuccess, canDeleteModel, onDeleteModel, deletingModel }: Props) {
  const setGraph = useModelCanvasStore(s => s.setGraph);
  const currentNodes = useModelCanvasStore(s => s.nodes);
  const currentEdges = useModelCanvasStore(s => s.edges);

  const fileKerasRef = useRef<HTMLInputElement | null>(null);
  const fileGraphRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<null | string>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const isLoggedIn = useAppSelector(state => state.auth.isLoggedIn);
  const showDelete = Boolean(isLoggedIn && canDeleteModel && onDeleteModel);
  const toolbarDisabled = !!busy || !!deletingModel;

  useEffect(() => {
    if (!isLoggedIn) {
      setShowLoadModal(false);
    }
  }, [isLoggedIn]);

  const clearAll = () => setGraph([], []);

  const handleConfirmDelete = async () => {
    if (!onDeleteModel) return;
    try {
      await onDeleteModel();
    } catch (err) {
      console.error('Delete model failed', err);
    }
  };

  const handleConfirmClear = () => {
    clearAll();
  };

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
      // clear any previous errors on success and notify
      onShowErrors?.([], undefined);
      onShowSuccess?.('Compile successful');
    } catch (err: unknown) {
      console.error('Compile failed', err);
      // Try to surface validation errors from backend
      const collectMessages = (data: unknown): string[] => {
        const messages: string[] = [];
        const walk = (v: unknown, path: string[] = []) => {
          if (v === undefined || v === null) return;
          if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            const prefix = path.length ? path.join('.') + ': ' : '';
            const s = String(v);
            messages.push(prefix + (s.length > 200 ? s.slice(0, 200) + '…' : s));
            return;
          }
          if (Array.isArray(v)) {
            v.forEach((child) => walk(child, path));
            return;
          }
          if (typeof v === 'object') {
            for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
              walk(val, [...path, k]);
            }
            return;
          }
        };
        walk(data);
        return messages.slice(0, 20);
      };
      const maybeAxios = err as { response?: { data?: unknown }; message?: string };
      const respData = maybeAxios?.response?.data ?? (maybeAxios?.message ?? String(err));
      const msgs = collectMessages(respData);
      onShowErrors?.(msgs.length ? msgs : ['Compile failed'], respData);
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
      onShowSuccess?.('Keras model imported onto canvas');
    } catch (err: unknown) {
      console.error('Import Keras failed', err);
      const msg = 'Import Keras failed: ' + (err instanceof Error ? err.message : String(err));
      onShowErrors?.([msg]);
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
      onShowSuccess?.('Graph model imported onto canvas');
    } catch (err: unknown) {
      console.error('Import graph failed', err);
      const msg = 'Import graph failed: ' + (err instanceof Error ? err.message : String(err));
      onShowErrors?.([msg]);
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
      const msg = 'Export python failed: ' + (err instanceof Error ? err.message : String(err));
      onShowErrors?.([msg]);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <LoadGraphModal
        open={showLoadModal}
        onOpenChange={setShowLoadModal}
        onLoad={onLoadGraph}
      />
      <div className='flex items-center gap-2 px-3 py-2 bg-white text-xs border-b border-slate-200 rounded-t-lg'>
        {/* Model Name Input */}
        <input
          type="text"
          value={modelName}
          onChange={(e) => onModelNameChange(e.target.value)}
          placeholder="Model name..."
          className="px-3 py-1 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-input-background min-w-[200px]"
        />

        {/* Save current canvas (delegates to parent) */}
        {isLoggedIn && (
          <button onClick={onSave} disabled={toolbarDisabled} className='flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60'>
            <Save size={14} /> Save
          </button>
        )}

        {/* Load saved graph */}
        {isLoggedIn && (
          <button onClick={() => setShowLoadModal(true)} disabled={toolbarDisabled} className='flex items-center gap-1 px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-60'>
            <FolderOpen size={14} /> Load
          </button>
        )}

        {/* Compile on backend */}
        <button onClick={compileGraph} disabled={toolbarDisabled} className='flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-60'>
          <Play size={14} /> Compile
        </button>

        {/* Import Keras model (JSON) */}
        <input ref={fileKerasRef} type='file' accept='.json,application/json' className='hidden' onChange={(e) => {
          const f = e.target.files?.[0]; if (f) importKeras(f);
        }} />
        <button onClick={() => fileKerasRef.current?.click()} disabled={toolbarDisabled} className='flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60'>
          <Upload size={14} /> Import Keras
        </button>

        {/* Import Graph model (JSON shaped like /network/graphs/) */}
        <input ref={fileGraphRef} type='file' accept='.json,application/json' className='hidden' onChange={(e) => {
          const f = e.target.files?.[0]; if (f) importGraph(f);
        }} />
        <button onClick={() => fileGraphRef.current?.click()} disabled={toolbarDisabled} className='flex items-center gap-1 px-2 py-1 bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-60'>
          <Upload size={14} /> Import Graph
        </button>

        {/* Export Python */}
        <button onClick={exportPython} disabled={toolbarDisabled} className='flex items-center gap-1 px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-60'>
          <FileDown size={14} /> Export Python
        </button>

        <div className='ml-auto flex items-center gap-2'>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type='button'
                disabled={toolbarDisabled}
                className='flex items-center gap-1 px-2 py-1 bg-rose-500 text-white rounded hover:bg-rose-600 disabled:opacity-60'
              >
                <Eraser size={14} /> Clear
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear the canvas?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes all layers and connections from the workspace. You can still undo it by reloading a saved model.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmClear} className='bg-rose-600 hover:bg-rose-700'>
                  Clear canvas
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {showDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type='button'
                  disabled={toolbarDisabled}
                  className='flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60'
                >
                  <Trash2 size={14} /> Delete
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this saved model?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The backend copy will be removed permanently. Your current canvas will remain open but will no longer be linked to the saved graph.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deletingModel}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmDelete}
                    disabled={deletingModel}
                    className='bg-red-600 hover:bg-red-700'
                  >
                    {deletingModel ? 'Deleting…' : 'Yes, delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </>
  );
}
