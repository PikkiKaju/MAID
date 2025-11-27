import { Save, Trash2, Play, Upload, FolderOpen, Eraser, ChevronDown, FileJson, Code2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../ui/tooltip';
import LoadGraphModal from './LoadGraphModal';
import { useModelCanvasStore } from '../../store/modelCanvasStore';
import networkGraphService, { GraphEdge, GraphNode, NetworkGraphPayload } from '../../api/networkGraphService';
import { useEffect, useRef, useState } from 'react';
import { Edge as RFEdge, Node as RFNode } from 'reactflow';
import { useAppSelector } from '../../store/hooks';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../ui/dropdown-menu';
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
  const { t } = useTranslation();
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
      onShowSuccess?.(t('canvas.toolbar.compileSuccess'));
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
      onShowErrors?.(msgs.length ? msgs : [t('canvas.toolbar.compileFailed')], respData);
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
      onShowSuccess?.(t('canvas.toolbar.importKerasSuccess'));
    } catch (err: unknown) {
      console.error('Import Keras failed', err);
      onShowErrors?.([t('canvas.toolbar.importKerasFailed', { message: String(err) })]);
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
      onShowSuccess?.(t('canvas.toolbar.importGraphSuccess'));
    } catch (err: unknown) {
      console.error('Import graph failed', err);
      onShowErrors?.([t('canvas.toolbar.importGraphFailed', { message: String(err) })]);
    } finally {
      setBusy(null);
      if (fileGraphRef.current) fileGraphRef.current.value = '';
    }
  };

  const downloadTextFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const safeFileBase = (name: string) => {
    const base = (name || 'model').toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
    return base || 'model';
  };

  const exportPython = async () => {
    try {
      setBusy('export-python');
      const { nodes, edges } = buildPayloadFromStore();
      // Export from payload without saving
      const code: string = await networkGraphService.exportPythonFromPayload(nodes, edges, 'model');
      const base = safeFileBase(modelName);
      downloadTextFile(code, `${base}.py`, 'text/x-python');
    } catch (err: unknown) {
      console.error('Export python failed', err);
      const msg = 'Export python failed: ' + (err instanceof Error ? err.message : String(err));
      onShowErrors?.([msg]);
    } finally {
      setBusy(null);
    }
  };

  const exportGraphJson = () => {
    try {
      setBusy('export-graph');
      const payload = buildPayloadFromStore();
      const base = safeFileBase(modelName);
      downloadTextFile(JSON.stringify(payload, null, 2), `${base}-graph.json`, 'application/json');
      onShowSuccess?.(t('canvas.toolbar.exportGraphSuccess'));
    } catch (err: unknown) {
      console.error('Export graph failed', err);
      onShowErrors?.([t('canvas.toolbar.exportGraphFailed', { message: String(err) })]);
    } finally {
      setBusy(null);
    }
  };

  const exportKerasJson = async () => {
    try {
      setBusy('export-keras');
      const { nodes, edges } = buildPayloadFromStore();
      const script = await networkGraphService.exportPythonFromPayload(nodes, edges, modelName || 'model');
      const modelJsonLine = script.split('\n').find(line => line.trim().startsWith('MODEL_JSON = '));
      if (!modelJsonLine) {
        throw new Error('MODEL_JSON literal not found in exported script');
      }
      const literal = modelJsonLine.trim().replace('MODEL_JSON =', '').trim();
      const encoded = JSON.parse(literal);
      let pretty: string;
      if (typeof encoded === 'string') {
        try {
          const parsed = JSON.parse(encoded);
          pretty = JSON.stringify(parsed, null, 2);
        } catch {
          pretty = encoded;
        }
      } else {
        pretty = JSON.stringify(encoded, null, 2);
      }
      const base = safeFileBase(modelName);
      downloadTextFile(pretty, `${base}-keras.json`, 'application/json');
      onShowSuccess?.(t('canvas.toolbar.exportKerasSuccess'));
    } catch (err: unknown) {
      console.error('Export Keras JSON failed', err);
      onShowErrors?.([t('canvas.toolbar.exportKerasFailed', { message: String(err) })]);
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
      <div className='flex items-center gap-2 px-3 py-2 bg-card text-xs border-b border-border rounded-t-lg'>
        {/* Model Name Input */}
        <input
          type="text"
          value={modelName}
          onChange={(e) => onModelNameChange(e.target.value)}
          placeholder={t('canvas.toolbar.modelNamePlaceholder')}
          className="px-3 py-1 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground min-w-[200px]"
        />

        {/* Save current canvas (delegates to parent) */}
        {isLoggedIn && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onSave} disabled={toolbarDisabled} className='flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60'>
                <Save size={14} /> {t('canvas.toolbar.save')}
              </button>
            </TooltipTrigger>
            <TooltipContent sideOffset={6} className="bg-popover text-popover-foreground text-sm px-3 py-1.5 rounded-md shadow-lg">{t('canvas.toolbar.saveTooltip')}</TooltipContent>
          </Tooltip>
        )}

        {/* Load saved graph */}
        {isLoggedIn && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => setShowLoadModal(true)} disabled={toolbarDisabled} className='flex items-center gap-1 px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-60'>
                <FolderOpen size={14} /> {t('canvas.toolbar.load')}
              </button>
            </TooltipTrigger>
            <TooltipContent sideOffset={6} className="bg-popover text-popover-foreground text-sm px-3 py-1.5 rounded-md shadow-lg">{t('canvas.toolbar.loadTooltip')}</TooltipContent>
          </Tooltip>
        )}

        {/* Compile on backend */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={compileGraph} disabled={toolbarDisabled} className='flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-60'>
              <Play size={14} /> {t('canvas.toolbar.compile')}
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6} className="bg-popover text-popover-foreground text-sm px-3 py-1.5 rounded-md shadow-lg">{t('canvas.toolbar.compileTooltip')}</TooltipContent>
        </Tooltip>

        {/* Import/Export dropdown */}
        <input ref={fileKerasRef} type='file' accept='.json,application/json' className='hidden' onChange={(e) => {
          const f = e.target.files?.[0]; if (f) importKeras(f);
        }} />
        <input ref={fileGraphRef} type='file' accept='.json,application/json' className='hidden' onChange={(e) => {
          const f = e.target.files?.[0]; if (f) importGraph(f);
        }} />
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={toolbarDisabled}
                  className='flex items-center gap-1 px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-60'
                >
                  {t('canvas.toolbar.importExport')}
                  <ChevronDown size={14} />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent sideOffset={6} className="bg-popover text-popover-foreground text-sm px-3 py-1.5 rounded-md shadow-lg">{t('canvas.toolbar.importExportTooltip')}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('canvas.toolbar.import')}</DropdownMenuLabel>
            <DropdownMenuItem disabled={toolbarDisabled} onSelect={() => fileKerasRef.current?.click()}>
              <Upload size={14} /> {t('canvas.toolbar.importKeras')}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={toolbarDisabled} onSelect={() => fileGraphRef.current?.click()}>
              <Upload size={14} /> {t('canvas.toolbar.importGraph')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('canvas.toolbar.export')}</DropdownMenuLabel>
            <DropdownMenuItem disabled={toolbarDisabled} onSelect={exportGraphJson}>
              <FileJson size={14} /> {t('canvas.toolbar.exportGraph')}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={toolbarDisabled} onSelect={exportKerasJson}>
              <FileJson size={14} /> {t('canvas.toolbar.exportKeras')}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={toolbarDisabled} onSelect={exportPython}>
              <Code2 size={14} /> {t('canvas.toolbar.exportPython')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className='ml-auto flex items-center gap-2'>
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <button
                    type='button'
                    disabled={toolbarDisabled}
                    className='flex items-center gap-1 px-2 py-1 bg-rose-500 text-white rounded hover:bg-rose-600 disabled:opacity-60'
                  >
                    <Eraser size={14} /> {t('canvas.toolbar.clear')}
                  </button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent sideOffset={6} className="bg-popover text-popover-foreground text-sm px-3 py-1.5 rounded-md shadow-lg">{t('canvas.toolbar.clearTooltip')}</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('canvas.toolbar.clearDialogTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('canvas.toolbar.clearDialogDescription')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmClear} className='bg-rose-600 hover:bg-rose-700'>
                  {t('canvas.toolbar.clear')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {showDelete && (
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <button
                      type='button'
                      disabled={toolbarDisabled}
                      className='flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60'
                    >
                      <Trash2 size={14} /> {t('common.delete')}
                    </button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent sideOffset={6} className="bg-popover text-popover-foreground text-sm px-3 py-1.5 rounded-md shadow-lg">{t('canvas.toolbar.deleteTooltip')}</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('canvas.toolbar.deleteDialogTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('canvas.toolbar.deleteDialogDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deletingModel}>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmDelete}
                    disabled={deletingModel}
                    className='bg-red-600 hover:bg-red-700'
                  >
                    {deletingModel ? t('canvas.toolbar.deleting') : t('canvas.toolbar.confirmDelete')}
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
