import { useCallback, useRef, useState, useEffect } from 'react';
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
import { useModelCanvasStore } from '../../store/modelCanvasStore';
import type { ModelCanvasState } from '../../store/modelCanvasStore';
import { layerNodeTypes } from './nodes';
import TopToolbar from './TopToolbar';
import { nanoid } from 'nanoid/non-secure';

// Initial seed graph (can be removed when implementing full load-from-backend)
const initialNodes: Node[] = [
  {
    id: 'input-1',
    type: 'inputLayer',
    position: { x: 100, y: 150 },
    data: { label: 'Input(32)' }
  },
];

const initialEdges: Edge[] = [];

export default function ModelCanvas() {
  const { nodes: storeNodes, edges: storeEdges, setGraph } = useModelCanvasStore();
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes.length ? storeNodes : initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges.length ? storeEdges : initialEdges);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const flowWrapperRef = useRef<HTMLDivElement | null>(null);

  // Edge creation handler (adds edge with arrow marker)
  const onConnect = useCallback((connection: Edge | Connection) => {
    setEdges((eds) => addEdge({ ...connection, markerEnd: { type: MarkerType.ArrowClosed } }, eds));
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
    // TODO: call backend (Django) endpoint to persist graph / translate to TensorFlow JSON
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

    const type = event.dataTransfer.getData('application/myapp-layer');
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
      type,
      position,
      data: { label, params },
    };
    setNodes(nds => nds.concat(newNode));
    // also push to store so side panels reflect without needing manual save
    setGraph([...nodes, newNode], edges);
  }, [rfInstance, setNodes, setGraph, nodes, edges]);

  return (
    <div className='h-[calc(90vh-100px)] flex flex-col border rounded bg-white shadow'>
      <TopToolbar onSave={handlePersist} />
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
            nodeTypes={layerNodeTypes}
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
        <div className='w-72 border-l p-3 bg-slate-50 overflow-y-auto'>
          <Inspector />
        </div>
      </div>
    </div>
  );
}

// Left side layer palette (drag source + click fallback)
function LayerPalette() {
  const addNode = useModelCanvasStore((s: ModelCanvasState) => s.addNode); // Keep button click fallback
  const palette = [
    { type: 'inputLayer', label: 'Input', defaults: { shape: '(32,)' } },
    { type: 'denseLayer', label: 'Dense', defaults: { units: 128, activation: 'relu' } },
    { type: 'dropoutLayer', label: 'Dropout', defaults: { rate: 0.5 } },
    { type: 'conv2dLayer', label: 'Conv2D', defaults: { filters: 32, kernel: '3x3', activation: 'relu' } },
    { type: 'flattenLayer', label: 'Flatten', defaults: {} },
    { type: 'outputLayer', label: 'Output', defaults: { units: 10, activation: 'softmax' } },
  ];
  interface PaletteItem { type: string; label: string; defaults: Record<string, unknown>; }
  const handleDragStart = (e: React.DragEvent, p: PaletteItem) => {
    e.dataTransfer.setData('application/myapp-layer', p.type);
    e.dataTransfer.setData('application/myapp-layer-config', JSON.stringify(p.defaults));
    e.dataTransfer.setData('application/myapp-layer-label', p.label);
    e.dataTransfer.effectAllowed = 'move';
  };
  return (
    <div className='grid gap-2'>
      {palette.map(p => (
        <div key={p.type} className='group'>
          <button
            draggable
            onDragStart={(e) => handleDragStart(e, p)}
            onClick={() => addNode(p.type, p.defaults)}
            className='w-full text-left px-2 py-1 rounded bg-white border hover:border-blue-500 hover:bg-blue-50 transition cursor-grab active:cursor-grabbing'
            title='Drag to canvas or click to add'
          >
            <span className='font-medium'>{p.label}</span>
            <span className='block text-[10px] text-slate-400'>{Object.keys(p.defaults).slice(0,2).join(', ')}</span>
          </button>
        </div>
      ))}
    </div>
  );
}

// Right side inspector showing editable parameters for the selected node
function Inspector() {
  const selectedNodeId = useModelCanvasStore((s: ModelCanvasState) => s.selectedNodeId);
  const updateNodeData = useModelCanvasStore((s: ModelCanvasState) => s.updateNodeData);
  const nodes = useModelCanvasStore((s: ModelCanvasState) => s.nodes);
  const node = nodes.find((n: Node) => n.id === selectedNodeId);

  if (!node) return <p className='text-sm text-slate-500'>Select a layer to edit its parameters.</p>;

  const entries = Object.entries(node.data.params || {});

  const handleChange = (key: string, value: string) => {
    updateNodeData(node.id, { params: { ...node.data.params, [key]: isNaN(Number(value)) ? value : Number(value) } });
  };

  return (
    <div className='space-y-3'>
      <h3 className='font-semibold text-slate-700 text-sm'>Layer Parameters</h3>
      {entries.length === 0 && <p className='text-xs text-slate-500'>No parameters</p>}
      {entries.map(([k, v]) => (
        <label key={k} className='block text-xs'>
          <span className='font-medium'>{k}</span>
          <input
            className='mt-1 w-full border rounded px-2 py-1 text-xs'
            defaultValue={String(v)}
            onChange={e => handleChange(k, e.target.value)}
            />
        </label>
      ))}
      <pre className='text-[10px] bg-slate-200 p-2 rounded overflow-x-auto'>{JSON.stringify(node.data.params, null, 2)}</pre>
    </div>
  );
}
