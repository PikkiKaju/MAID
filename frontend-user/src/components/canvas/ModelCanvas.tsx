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
import networkGraphService, { GraphNode, GraphEdge } from '../../api/networkGraphService';
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
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes.length ? storeNodes : initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges.length ? storeEdges : initialEdges);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const flowWrapperRef = useRef<HTMLDivElement | null>(null);
  // Memoize these to avoid React Flow warning about re-creating nodeTypes/edgeTypes each render
  const nodeTypes = useMemo(() => ({ layerNode: LayerNode }), []);
  const edgeTypes = useMemo(() => ({ removable: RemovableEdge }), []);

  // Edge creation handler (adds edge with arrow marker)
  const onConnect = useCallback((connection: Edge | Connection) => {
    setEdges((eds) => addEdge({
      ...connection,
      type: 'removable',
      markerEnd: { type: MarkerType.ArrowClosed }
    }, eds));
  }, [setEdges]);

  // Keep ReactFlow internal state in sync when store changes externally (e.g. removeNode)
  useEffect(() => {
    setNodes(storeNodes);
  }, [storeNodes, setNodes]);
  useEffect(() => {
    setEdges(storeEdges);
  }, [storeEdges, setEdges]);

  const handlePersist = () => {
    setGraph(nodes, edges); // persist latest working copy
    // Attempt to persist to backend: if graph already has an id in metadata use update, otherwise create
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

        // Use a simple metadata id if you want to track created graph; for now try to create every time
        const payload = { name: 'Untitled graph', nodes: nodesPayload, edges: edgesPayload };
        const created = await networkGraphService.createGraph(payload);
        // If created, we could store graph id in localStorage or update app state - for now log
        console.log('Graph created:', created);
        alert('Graph saved to backend');
      } catch (err: unknown) {
        console.error('Failed to save graph', err);
        const msg = err instanceof Error ? err.message : String(err);
        alert('Failed to save graph to backend: ' + msg);
      }
    })();
  };

  const handlePreview = async () => {
    // Call compile endpoint on backend with current nodes/edges (use stored graph if available otherwise pass body)
    try {
      const nodesPayload: GraphNode[] = nodes.map(n => {
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
      const edgesPayload: GraphEdge[] = edges.map(e => ({
        id: e.id!,
        source: e.source,
        target: e.target,
        meta: ((e as unknown) as { meta?: Record<string, unknown> }).meta || {},
      }));

      // The compile endpoint is defined as POST /network/graphs/{id}/compile/
      // We don't have a persisted graph id yet; some backends accept compile without id if body provided, but this API requires a graph id.
      // As a pragmatic approach, POST to import-keras-json isn't appropriate. So we'll create a temporary graph then compile it.
      const temp = await networkGraphService.createGraph({ name: 'temp-preview', nodes: nodesPayload, edges: edgesPayload });
      const graphId = String(temp.id);
      const compiled = await networkGraphService.compileGraph(graphId);
      console.log('Compiled result:', compiled);
      alert('Compile success — see console for details');
      // Optionally delete the temporary graph
      try { await networkGraphService.deleteGraph(graphId); } catch { /* ignore */ }
    } catch (err: unknown) {
      console.error('Preview/compile failed', err);
      const msg = err instanceof Error ? err.message : String(err);
      alert('Preview/compile failed: ' + msg);
    }
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
    <div className='h-[calc(90vh-100px)] flex flex-col border rounded bg-white shadow'>
      <TopToolbar onSave={handlePersist} onPreview={handlePreview} />
      <div className='flex flex-1 min-h-0'>
        <div className='w-56 border-r p-2 space-y-2 bg-slate-50 overflow-y-auto text-xs'>
          <h3 className='font-semibold text-slate-600 text-sm'>Layers</h3>
          <LayerPalette />
        </div>
        <div className='flex-1' ref={flowWrapperRef}>
          <ReactFlow
            nodes={nodes}
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



