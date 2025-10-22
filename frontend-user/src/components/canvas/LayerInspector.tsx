import { Info } from 'lucide-react';
import { useModelCanvasStore, ModelCanvasState } from '../../store/modelCanvasStore';
import { Node } from 'reactflow';

// DEPRECATED: update for layer param descriptions from API
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


// Right side inspector showing editable parameters for the selected node
export default function LayerInspector() {
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