import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  MarkerType,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { nanoid } from 'nanoid/non-secure';

import { useModelCanvasStore } from '../../store/modelCanvasStore';
import LayerNode from './LayerNode';
import TopToolbar from './TopToolbar';
import LayerPalette from './LayerPalette';
import LayerInspector from './LayerInspector';
import networkGraphService, { GraphNode, GraphEdge, NetworkGraphPayload } from '../../api/networkGraphService';
import axios from 'axios';
import { useGraph } from '../../contexts/GraphContext';
import RemovableEdge from './RemovableEdge';

// Initial seed graph (can be removed when implementing full load-from-backend)
const initialNodes: Node[] = [
  {
    id: 'input-1',
    type: 'layerNode',
    position: { x: 100, y: 150 },
    data: { label: 'Input', layer: 'Input', params: {} }
  },
];

const initialEdges: Edge[] = [];


export default function ModelCanvas() {
  const { nodes: storeNodes, edges: storeEdges, setGraph } = useModelCanvasStore();
  const { setGraphId } = useGraph();
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes.length ? storeNodes : initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges.length ? storeEdges : initialEdges);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [persistedGraphId, setPersistedGraphId] = useState<string | null>(null);
  const [modelName, setModelName] = useState('Untitled graph');
  const [saveErrors, setSaveErrors] = useState<string[] | null>(null);
  const [errorItems, setErrorItems] = useState<Array<{ text: string; nodeId?: string; param?: string }> | null>(null);
  const [errorNodeIds, setErrorNodeIds] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // No raw/details to keep UI concise; we only show summarized messages.
  const flowWrapperRef = useRef<HTMLDivElement | null>(null);
  // Memoize these to avoid React Flow warning about re-creating nodeTypes/edgeTypes each render
  const nodeTypes = useMemo(() => ({ layerNode: LayerNode }), []);
  const edgeTypes = useMemo(() => ({ removable: RemovableEdge }), []);
  const setSelected = useModelCanvasStore(s => s.setSelected);
  const setHighlightedParam = useModelCanvasStore(s => s.setHighlightedParam);

  // Edge creation handler (adds edge with arrow marker)
  const onConnect = useCallback((connection: Edge | Connection) => {
    setEdges((eds) => {
      const newEdges = addEdge({
        ...connection,
        type: 'removable',
        markerEnd: { type: MarkerType.ArrowClosed }
      }, eds);
      // Update store immediately so compile/export can see the latest edges
      setGraph(nodes, newEdges);
      return newEdges;
    });
  }, [setEdges, nodes, setGraph]);

  // Keep ReactFlow internal state in sync when store changes externally (e.g. removeNode)
  useEffect(() => {
    setNodes(storeNodes);
  }, [storeNodes, setNodes]);
  useEffect(() => {
    setEdges(storeEdges);
  }, [storeEdges, setEdges]);

  // (removed old string-only formatter in favor of structured items)

  // Build structured error items with pointers to node and parameter when possible
  const buildErrorItems = (raw: unknown): Array<{ text: string; nodeId?: string; param?: string }> => {
    // Map node id to friendly label(layer)
    const idToMeta = new Map<string, { label: string; layer: string }>();
    nodes.forEach(n => {
      const data = (n.data as unknown) as { label?: string; layer?: string } | undefined;
      idToMeta.set(n.id, { label: (data?.label || '').trim(), layer: (data?.layer || '').trim() });
    });

    const items: Array<{ text: string; nodeId?: string; param?: string }> = [];
    const walk = (v: unknown, path: string[] = []) => {
      if (v === undefined || v === null) return;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        // Detect node id and param from path like ["nodes", "<id>", "params", "units"]
        let nodeId: string | undefined;
        let param: string | undefined;
        for (let i = 0; i < path.length; i++) {
          if (path[i] === 'nodes' && i + 1 < path.length) {
            nodeId = path[i + 1];
          }
          if (path[i] === 'params' && i + 1 < path.length) {
            param = path[i + 1];
          }
        }
        // Build pretty path replacing nodes.<id> with node "Label (Layer)"
        let prettyPath = '';
        if (path.length) {
          const parts = [...path];
          const idx = parts.findIndex(p => p === 'nodes' && parts.length >= 2);
          if (idx !== -1 && parts[idx + 1]) {
            const nid = parts[idx + 1];
            const meta = idToMeta.get(nid);
            let friendly = nid;
            if (meta) {
              if (meta.label && meta.layer && meta.label !== meta.layer) friendly = `${meta.label} (${meta.layer})`;
              else friendly = meta.label || meta.layer || nid;
            }
            parts.splice(idx, 2, `node "${friendly}"`);
          }
          prettyPath = parts.join('.') + ': ';
        }
        const text = prettyPath + String(v);
        items.push({ text: text.length > 300 ? text.slice(0, 300) + '…' : text, nodeId, param });
        return;
      }
      if (Array.isArray(v)) { v.forEach(child => walk(child, path)); return; }
      if (typeof v === 'object') {
        for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
          walk(val, [...path, k]);
        }
      }
    };
    walk(raw);
    // Cap for safety
    return items.slice(0, 60);
  };

  // Extract node ids referenced in error payload under keys like nodes.<id>
  const extractErrorNodeIds = (raw: unknown): Set<string> => {
    const ids = new Set<string>();
    const walk = (v: unknown, path: string[] = []) => {
      if (v === undefined || v === null) return;
      if (Array.isArray(v)) { v.forEach(child => walk(child, path)); return; }
      if (typeof v === 'object') {
        for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
          if (path[path.length - 1] === 'nodes') {
            ids.add(k);
          }
          walk(val, [...path, k]);
        }
      }
    };
    walk(raw);
    // Filter ids to only those present in current canvas
    const validIds = new Set(nodes.map(n => n.id));
    return new Set([...ids].filter(id => validIds.has(id)));
  };

  const loadGraphFromPayload = useCallback((graph: NetworkGraphPayload) => {
    // Helper to convert backend position format to ReactFlow
    const toXY = (val: unknown): { x: number; y: number } => {
      if (val && typeof val === 'object') {
        const rec = val as Record<string, unknown>;
        const xv = rec['x']; const yv = rec['y'];
        if (typeof xv === 'number' && typeof yv === 'number') return { x: xv, y: yv };
      }
      return { x: 100, y: 100 };
    };

    // Helper to get raw node ID from various formats
    const extractNodeId = (nodeRef: string): string => {
      // If format is "LayerName (id)", extract id within parentheses
      const match = nodeRef.match(/\(([^)]+)\)$/);
      const raw = match ? match[1] : nodeRef;
      // Strip graph-scoped prefix if present ("<graphId>:<id>")
      const prefix = graph.id ? String(graph.id) + ':' : '';
      if (prefix && raw.startsWith(prefix)) return raw.slice(prefix.length);
      return raw;
    };

    // Convert nodes
    const loadedNodes: Node[] = (graph.nodes || []).map(n => ({
      id: String(n.id),
      type: 'layerNode',
      position: toXY(n.position),
      data: { label: n.label || n.type, layer: n.type, params: n.params || {} },
    }));

    // Convert edges - extract actual node IDs from formatted strings
    const loadedEdges: Edge[] = (graph.edges || []).map(e => ({
      id: String(e.id),
      source: extractNodeId(String(e.source)),
      target: extractNodeId(String(e.target)),
      type: 'removable',
      markerEnd: { type: MarkerType.ArrowClosed }
    }));

    // Update canvas and store
    setNodes(loadedNodes);
    setEdges(loadedEdges);
    setGraph(loadedNodes, loadedEdges);
    
    // Store the graph ID and name for future updates
    if (graph.id) {
      setPersistedGraphId(graph.id);
      setGraphId(graph.id);
    }
    if (graph.name) {
      setModelName(graph.name);
    }
  }, [setNodes, setEdges, setGraph, setGraphId]);

  const handlePersist = () => {
    setGraph(nodes, edges); // persist latest working copy
    setSaveErrors(null);
    setErrorItems(null);
    setErrorNodeIds(new Set());
    // Attempt to persist to backend: use update if we have a graph ID, otherwise create new
    (async () => {
      try {
        // Build payload matching Django serializer: nodes as {id,type,label,params,position,notes}, edges as {id,source,target,meta}
        const nodesPayload: GraphNode[] = nodes.map(n => {
          const data = (n.data as unknown) as { label?: string; layer?: string; params?: Record<string, unknown>; position?: unknown; notes?: unknown } | undefined;
          return {
            id: n.id,
            // send actual layer type expected by backend
            type: data?.layer || (n.type as string) || '',
            label: data?.label || '',
            params: data?.params || {},
            position: n.position || data?.position || {},
            notes: data?.notes || {},
          } as GraphNode;
        });
        const edgesPayload: GraphEdge[] = edges.map(e => ({
          id: e.id!,
          source: e.source,
          target: e.target,
          meta: ((e as unknown) as { meta?: Record<string, unknown> }).meta || {},
        }));

        const payload = { name: modelName, nodes: nodesPayload, edges: edgesPayload };
        
  if (persistedGraphId) {
          // Update existing graph
          const updated = await networkGraphService.updateGraph(persistedGraphId, payload);
          console.log('Graph updated:', updated);
          setGraphId(persistedGraphId);
          setSuccessMessage('Graph updated successfully');
        } else {
          // Create new graph
          const created = await networkGraphService.createGraph(payload);
          console.log('Graph created:', created);
          setPersistedGraphId(created.id); // Store the ID for future updates
          setGraphId(created.id);
          setSuccessMessage('Graph saved to backend');
        }
      } catch (err: unknown) {
        console.error('Failed to save graph', err);
        if (axios.isAxiosError(err) && err.response) {
          const data = err.response.data as unknown;
          // Detect and suppress raw HTML error bodies
          const isHtml = typeof data === 'string' && /<\s*html[\s>]/i.test(data);
          if (!isHtml) {
            const items = buildErrorItems(data);
            setErrorItems(items.length ? items : null);
            setSaveErrors(items.length ? items.map(it => it.text) : [String(data) || 'Request failed']);
            setErrorNodeIds(extractErrorNodeIds(data));
          } else {
            setErrorItems(null);
            setSaveErrors(['Server returned an HTML error page (hidden).']);
            setErrorNodeIds(new Set());
          }
          
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          setErrorItems(null);
          setSaveErrors([msg || 'Failed to save graph']);
          setErrorNodeIds(new Set());
          
        }
      }
    })();
  };

  // Needed so drop is allowed in most browsers
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handles layer button drop -> creates new node at pointer position
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!rfInstance) return;

  const type = event.dataTransfer.getData('application/myapp-layer'); // API layer name
  if (!type) return;
    const rawParams = event.dataTransfer.getData('application/myapp-layer-config');
    const label = event.dataTransfer.getData('application/myapp-layer-label') || type;
    let params: Record<string, unknown> = {};
    try { params = rawParams ? JSON.parse(rawParams) : {}; } catch { /* ignore */ }

    // ReactFlow v11: use screenToFlowPosition if available, else fallback to project()
    let position;
  const maybeInst = rfInstance as unknown as { screenToFlowPosition?: (pos: {x:number;y:number}) => {x:number;y:number} };
    if (maybeInst && typeof maybeInst.screenToFlowPosition === 'function') {
      position = maybeInst.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    } else {
      const bounds = flowWrapperRef.current?.getBoundingClientRect();
      const x = event.clientX - (bounds?.left || 0);
      const y = event.clientY - (bounds?.top || 0);
      position = rfInstance.project({ x, y });
    }

    const newNode: Node = {
      id: nanoid(6),
      type: 'layerNode',
      position,
      data: { label, layer: type, params },
    };
    setNodes(nds => nds.concat(newNode));
    // also push to store so side panels reflect without needing manual save
    setGraph([...nodes, newNode], edges);
  }, [rfInstance, setNodes, setGraph, nodes, edges]);

  return (
    <div className='h-full flex flex-col border-t bg-white'>
      {successMessage && (
        <div className='mx-3 mt-3 mb-2 border border-emerald-200 bg-emerald-50 text-emerald-800 rounded p-2 text-sm'>
          <div className='flex items-start justify-between'>
            <div className='font-semibold mb-1'>{successMessage}</div>
            <button onClick={() => setSuccessMessage(null)} className='text-emerald-800 hover:underline text-xs'>Dismiss</button>
          </div>
        </div>
      )}
      {(errorItems || saveErrors) && (
        <div className='mx-3 mt-3 mb-3 border border-red-200 bg-red-50 text-red-700 rounded p-2 text-sm'>
          <div className='flex items-start justify-between'>
            <div className='font-semibold mb-1'>There were issues with your graph</div>
            <button onClick={() => { setSaveErrors(null); setErrorItems(null); setErrorNodeIds(new Set()); }} className='text-red-700 hover:underline text-xs'>Dismiss</button>
          </div>
          <ul className='list-disc ml-5 space-y-1 max-h-40 overflow-auto pr-2'>
            {(errorItems || []).map((item, i) => (
              <li
                key={`item-${i}`}
                className={`break-all ${item.nodeId ? 'cursor-pointer hover:underline' : ''}`}
                onClick={() => {
                  if (!item.nodeId) return;
                  // Center and select the node; highlight parameter if present
                  const target = nodes.find(n => n.id === item.nodeId);
                  if (target && rfInstance) {
                    const { x, y } = target.position;
                    const maybeInst = rfInstance as unknown as { setCenter?: (x: number, y: number, opt?: { zoom?: number; duration?: number }) => void };
                    if (maybeInst && typeof maybeInst.setCenter === 'function') {
                      maybeInst.setCenter(x, y, { zoom: 1.25, duration: 400 });
                    }
                  }
                  setSelected(item.nodeId);
                  if (item.param) setHighlightedParam(item.param);
                }}
                title={item.nodeId ? 'Click to focus this node' : undefined}
              >
                {item.text}
              </li>
            ))}
            {!errorItems && saveErrors && saveErrors.map((e, i) => (
              <li key={`msg-${i}`} className='break-all'>{e}</li>
            ))}
          </ul>
        </div>
      )}
      <TopToolbar 
        onSave={handlePersist} 
        onLoadGraph={loadGraphFromPayload}
        modelName={modelName}
        onModelNameChange={setModelName}
        onShowErrors={(messages, raw) => {
          if (messages && messages.length) setSuccessMessage(null);
          if (raw !== undefined) {
            const items = buildErrorItems(raw);
            setErrorItems(items.length ? items : null);
            setSaveErrors(items.length ? items.map(it => it.text) : null);
            setErrorNodeIds(extractErrorNodeIds(raw));
          } else {
            setErrorItems(null);
            setSaveErrors(messages && messages.length ? messages : null);
            setErrorNodeIds(new Set());
          }
        }}
        onShowSuccess={(msg) => { setSuccessMessage(msg); setSaveErrors(null); setErrorItems(null); setErrorNodeIds(new Set()); }}
      />
      <div className='flex flex-1 min-h-0'>
        <div className='w-56 border-r p-2 space-y-2 bg-slate-50 overflow-y-auto text-xs'>
          <h3 className='font-semibold text-slate-600 text-sm'>Layers</h3>
          <LayerPalette />
        </div>
        <div className='flex-1' ref={flowWrapperRef}>
          <ReactFlow
            nodes={useMemo(() => nodes.map(n => {
              const data = (n.data as unknown) as Record<string, unknown> | undefined;
              const hasError = errorNodeIds.has(n.id);
              if (hasError) return { ...n, data: { ...(data || {}), hasError: true } };
              if (data && Object.prototype.hasOwnProperty.call(data, 'hasError')) {
                return { ...n, data: { ...data, hasError: false } };
              }
              return n;
            }), [nodes, errorNodeIds])}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            snapToGrid
            snapGrid={[12, 12]}
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <MiniMap pannable zoomable />
            <Controls />
          </ReactFlow>
        </div>
        <div className='w-70 border-l p-3 bg-slate-50 overflow-y-auto'>
          <LayerInspector />
        </div>
      </div>
    </div>
  );
}



