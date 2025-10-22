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
import { Info } from 'lucide-react';
import { nanoid } from 'nanoid/non-secure';

import { useModelCanvasStore } from '../../store/modelCanvasStore';
import type { ModelCanvasState } from '../../store/modelCanvasStore';
import { layerNodeTypes } from './nodes';
import TopToolbar from './TopToolbar';
import LayerPalette from './LayerPalette';
import networkGraphService, { GraphNode, GraphEdge } from '../../api/networkGraphService';
import RemovableEdge from './RemovableEdge';

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

// Descriptions for layer parameters.
const LAYER_PARAM_HELP: Record<string, Record<string, string>> = {
  inputLayer: {
    shape: 'Shape of the input tensor excluding batch dimension. E.g. (32,) or (28,28,1).',
    dtype: 'Data type of the input (float32, int32, etc.).',
    name: 'Optional symbolic layer name.'
  },
  denseLayer: {
    units: 'Number of neurons / output dimensions of the dense layer.',
    activation: 'Activation function (relu, sigmoid, softmax, linear, etc.).',
    use_bias: 'Whether to include a bias term.',
    kernel_initializer: 'Initializer for the kernel weights matrix.',
    bias_initializer: 'Initializer for the bias vector.'
  },
  dropoutLayer: {
    rate: 'Fraction (0-1) of input units to drop during training.',
    seed: 'Random seed for reproducibility.'
  },
  conv2dLayer: {
    filters: 'Number of convolution kernels (output feature maps).',
    kernel: 'Kernel size (e.g. 3x3).',
    strides: 'Stride size (e.g. 1x1 or 2x2).',
    padding: 'Padding mode (valid or same).',
    activation: 'Activation function applied after convolution + bias.',
    use_bias: 'Include a bias vector if true.'
  },
  flattenLayer: {
    data_format: 'Channels first or channels last (if relevant to backend).'
  },
  outputLayer: {
    units: 'Dimensionality of the model output (classes or regression targets).',
    activation: 'Final activation (softmax for multi-class, sigmoid for binary, linear for regression).'
  },
  actLayer: {
    activation: 'Applies an activation without needing parameters besides the function name.'
  },
  maxPool2DLayer: {
    pool: 'Spatial window size for downsampling (e.g. 2x2).',
    strides: 'Stride for the pooling operation.',
    padding: 'Padding mode (valid or same).'
  },
  gap2DLayer: {},
  batchNormLayer: {
    momentum: 'Momentum for the moving average (typical ~0.99).',
    epsilon: 'Small float added to variance to avoid dividing by zero.',
    center: 'If true, add offset (beta).',
    scale: 'If true, multiply by scale (gamma).'
  },
  lstmLayer: {
    units: 'Dimensionality of the output space.',
    return_sequences: 'If true, returns the full sequence; otherwise only the last output.',
    dropout: 'Fraction (0-1) of the units to drop for input connections.',
    recurrent_dropout: 'Fraction (0-1) to drop for recurrent state.',
    bidirectional: 'If true, indicates a bidirectional wrapper (conceptual).'
  }
};

export default function ModelCanvas() {
  const { nodes: storeNodes, edges: storeEdges, setGraph } = useModelCanvasStore();
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes.length ? storeNodes : initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges.length ? storeEdges : initialEdges);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const flowWrapperRef = useRef<HTMLDivElement | null>(null);

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
            edgeTypes={{ removable: RemovableEdge }}
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



// Right side inspector showing editable parameters for the selected node
function Inspector() {
  const selectedNodeId = useModelCanvasStore((s: ModelCanvasState) => s.selectedNodeId);
  const updateNodeData = useModelCanvasStore((s: ModelCanvasState) => s.updateNodeData);
  const nodes = useModelCanvasStore((s: ModelCanvasState) => s.nodes);
  const node = nodes.find((n: Node) => n.id === selectedNodeId);

  if (!node) return <p className='text-sm text-slate-500'>Select a layer to edit its parameters.</p>;

  const entries = Object.entries(node.data.params || {});
  const paramDocs = LAYER_PARAM_HELP[node.type as string] || {};

  const handleChange = (key: string, value: string) => {
    // Attempt typed coercion: number -> boolean -> string
  let cast: string | number | boolean = value;
    if (value === 'true') cast = true;
    else if (value === 'false') cast = false;
    else if (!isNaN(Number(value)) && value.trim() !== '') cast = Number(value);
    updateNodeData(node.id, { params: { ...node.data.params, [key]: cast } });
  };

  return (
    <div className='space-y-3'>
      <h3 className='font-semibold text-slate-700 text-sm'>Layer Parameters</h3>
      {entries.length === 0 && <p className='text-xs text-slate-500'>No parameters</p>}
      {entries.map(([k, v]) => {
        const desc = paramDocs[k];
        return (
          <label key={k} className='block text-xs mb-2'>
            <span className='font-medium inline-flex items-center gap-1'>
              {k}
              {desc && (
                <Tooltip content={desc} />
              )}
            </span>
            <input
              className='mt-1 w-full border rounded px-2 py-1 text-xs'
              defaultValue={String(v)}
              onChange={e => handleChange(k, e.target.value)}
            />
          </label>
        );
      })}
      <pre className='text-[10px] bg-slate-200 p-2 rounded overflow-x-auto'>{JSON.stringify(node.data.params, null, 2)}</pre>
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
