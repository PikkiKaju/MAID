import { useEffect, useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { useModelCanvasStore, ModelCanvasState } from '../../store/modelCanvasStore';
import { Node } from 'reactflow';
import networkGraphService from '../../api/networkGraphService';


// Right side inspector showing editable parameters for the selected node
export default function LayerInspector() {
  const selectedNodeId = useModelCanvasStore((s: ModelCanvasState) => s.selectedNodeId);
  const updateNodeData = useModelCanvasStore((s: ModelCanvasState) => s.updateNodeData);
  const nodes = useModelCanvasStore((s: ModelCanvasState) => s.nodes);
  const highlightedParamName = useModelCanvasStore((s: ModelCanvasState) => s.highlightedParamName);
  const setHighlightedParam = useModelCanvasStore((s: ModelCanvasState) => s.setHighlightedParam);
  const node = nodes.find((n: Node) => n.id === selectedNodeId);

  type NodeData = { label?: string; layer?: string; params?: Record<string, unknown> };
  const nodeData = useMemo(() => (node?.data ?? {}) as NodeData, [node]);
  const layerName: string = nodeData.layer || nodeData.label || (node?.type as string) || '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paramsSpec, setParamsSpec] = useState<LayerParameter[] | null>(null);

  type LayerParameter = {
    name: string;
    kind: string;
    default: unknown;
    annotation: unknown;
    doc: string;
    required: boolean;
    param_type: string;
    deprecated: boolean | null;
    enum: string[] | null;
    case_insensitive: boolean | null;
  };

  // Load layer specs from API cache and get the current layer's parameter definitions
  useEffect(() => {
    let cancelled = false;
    if (!node || !layerName) {
      setParamsSpec(null);
      return () => { cancelled = true; };
    }
    setLoading(true);
    setError(null);
    networkGraphService
      .getLayersList()
      .then((data: unknown) => {
        if (cancelled) return;
        const layers = (data as { layers?: Array<{ name: string; parameters?: LayerParameter[] }> })?.layers || [];
        const found = layers.find((l) => l && l.name === layerName);
        const spec: LayerParameter[] | null = found?.parameters || null;
        setParamsSpec(spec);
        // Prefill defaults the first time a param is missing
        if (spec && spec.length) {
          const current = (nodeData?.params || {}) as Record<string, unknown>;
          const withDefaults = { ...current } as Record<string, unknown>;
          let changed = false;
          for (const p of spec) {
            if (withDefaults[p.name] === undefined && p.default !== undefined) {
              withDefaults[p.name] = p.default as unknown;
              changed = true;
            }
          }
          if (changed) updateNodeData(node.id, { params: withDefaults });
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [layerName, node, nodeData?.params, updateNodeData]);

  const currentParams: Record<string, unknown> = useMemo(() => (nodeData?.params || {}), [nodeData]);

  // When a parameter is requested to be highlighted, scroll it into view and auto-clear highlight after a short delay
  useEffect(() => {
    if (!highlightedParamName) return;
    const el = document.getElementById(`param-field-${highlightedParamName}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const t = setTimeout(() => setHighlightedParam(undefined), 2200);
    return () => clearTimeout(t);
  }, [highlightedParamName, setHighlightedParam]);

  const coerce = (raw: string, t?: string): string | number | boolean => {
    const type = (t || '').toLowerCase();
    // If the input is emptied, preserve it as an empty string (required validation will surface separately)
    if (typeof raw === 'string' && raw.trim() === '') return '';
    if (type.includes('bool')) return raw === 'true' || raw === 'on';
    if (type.includes('int')) return Number.isNaN(Number(raw)) ? raw : Number.parseInt(raw, 10);
    if (type.includes('float') || type.includes('double') || type.includes('number'))
      return Number.isNaN(Number(raw)) ? raw : Number(raw);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (!Number.isNaN(Number(raw)) && raw.trim() !== '') return Number(raw);
    return raw;
  };

  const handleParamChange = (name: string, value: string | boolean, t?: string) => {
    const cast = typeof value === 'string' ? coerce(value, t) : value;
    if (!node) return;
    updateNodeData(node.id, { params: { ...currentParams, [name]: cast } });
  };

  return (
    <div className='space-y-3'>
      <h3 className='font-semibold text-slate-700 text-sm'>{layerName} Parameters</h3>
      {!node && <p className='text-sm text-slate-500'>Select a layer to edit its parameters.</p>}
      {loading && <p className='text-xs text-slate-500'>Loading parameter definitions…</p>}
      {error && <p className='text-xs text-rose-600'>Failed to load: {error}</p>}

      {node && paramsSpec && paramsSpec.length > 0 ? (
        paramsSpec.map((p) => {
          const v = currentParams[p.name] ?? p.default ?? '';
          const typeHint = p.param_type || p.kind || '';
          const isBool = (p.enum === null || p.enum === undefined) && /bool/i.test(typeHint);
          const isEmptyRequired = !!p.required && (v === '' || v === null || v === undefined);
          return (
            <label
              key={p.name}
              id={`param-field-${p.name}`}
              className={`block text-xs mb-2 rounded ${highlightedParamName === p.name ? 'ring-2 ring-amber-400 border-amber-400 bg-amber-50 animate-pulse' : ''}`}
            >
              <span className='font-medium inline-flex items-center gap-1'>
                {p.name}
                {p.required && <span className='text-rose-500'>*</span>}
                {p.doc && <Tooltip content={p.doc} />}
              </span>
              {p.enum && p.enum.length > 0 ? (
                <select
                  className={`mt-1 w-full border rounded px-2 py-1 text-xs bg-white ${isEmptyRequired ? 'border-rose-400 ring-1 ring-rose-200' : ''}`}
                  value={String(v)}
                  onChange={(e) => handleParamChange(p.name, e.target.value, typeHint)}
                >
                  {!p.required && <option value=''>—</option>}
                  {p.enum.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : isBool ? (
                <div className='mt-1 flex items-center gap-2'>
                  <input
                    id={`chk-${p.name}`}
                    type='checkbox'
                    className='h-3 w-3'
                    checked={Boolean(v)}
                    onChange={(e) => handleParamChange(p.name, e.target.checked, typeHint)}
                  />
                  <label htmlFor={`chk-${p.name}`} className='text-[11px] text-slate-600'>Enable</label>
                </div>
              ) : (
                <input
                  className={`mt-1 w-full border rounded px-2 py-1 text-xs ${isEmptyRequired ? 'border-rose-400 ring-1 ring-rose-200 placeholder:text-rose-400' : ''}`}
                  value={String(v)}
                  onChange={e => handleParamChange(p.name, e.target.value, typeHint)}
                  placeholder={isEmptyRequired ? 'Required' : undefined}
                />
              )}
              {isEmptyRequired && (
                <div className='text-[10px] text-rose-600 mt-1'>This field is required.</div>
              )}
            </label>
          );
        })
      ) : (
        <>
          {/* Fallback to whatever params exist on the node if API spec is unavailable */}
          {Object.keys(currentParams).length === 0 && !loading && (
            <p className='text-xs text-slate-500'>No parameters</p>
          )}
          {Object.entries(currentParams).map(([k, v]) => (
            <label key={k} className='block text-xs mb-2'>
              <span className='font-medium inline-flex items-center gap-1'>{k}</span>
              <input
                className='mt-1 w-full border rounded px-2 py-1 text-xs'
                value={String(v)}
                onChange={e => handleParamChange(k, e.target.value)}
              />
            </label>
          ))}
        </>
      )}

      <pre className='text-[10px] bg-slate-200 p-2 rounded overflow-x-auto'>{JSON.stringify(currentParams, null, 2)}</pre>
    </div>
  );
}

// Simple tooltip component (no external dependency) using group hover.
function Tooltip({ content }: { content: string }) {
  return (
    <span className='relative inline-flex'>
      <span className='group inline-flex'>
        <Info size={12} className='text-slate-400 hover:text-slate-600 cursor-help' />
        {/* Tooltip bubble positioned to the right to avoid overlap with canvas; higher z-index to sit above ReactFlow */}
        <span className='pointer-events-none absolute left-full top-1/2 hidden w-50 -translate-y-1/2 translate-x-2 z-50 group-hover:block'>
          <span className='block rounded border border-slate-300 bg-white px-2 py-1 text-[10px] leading-snug shadow-lg text-slate-600'>
            {content}
          </span>
        </span>
      </span>
    </span>
  );
}