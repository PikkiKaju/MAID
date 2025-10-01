import { Handle, Position, NodeProps } from 'reactflow';
import { useModelCanvasStore } from '../../store/modelCanvasStore';
import { X } from 'lucide-react';

function BaseLayerNode({ data, id, selected }: NodeProps) {
  const setSelected = useModelCanvasStore(s => s.setSelected);
  const removeNode = useModelCanvasStore(s => s.removeNode);

  return (
    <div
      onClick={(e) => { e.stopPropagation(); setSelected(id); }}
      className={`group relative px-3 py-2 rounded border shadow-sm bg-white text-xs min-w-40 cursor-pointer transition
        ${selected ? 'border-blue-600 ring-2 ring-blue-300' : 'hover:shadow-md'}
      `}
    >
      {/* Remove button */}
      {selected && (
        <button
          onClick={(e) => { e.stopPropagation(); removeNode(id); }}
          className='absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shadow hover:bg-rose-700'
          aria-label='Remove node'
        >
          <X size={12} />
        </button>
      )}
      <div className='font-semibold text-slate-700 mb-1 pr-4'>{data.label}</div>
      {data.params && (
        <ul className='space-y-0.5'>
          {Object.entries(data.params).slice(0,3).map(([k,v]) => (
            <li key={k} className='text-[10px] text-slate-500'>{k}: {String(v)}</li>
          ))}
        </ul>
      )}
      <Handle type='target' position={Position.Left} className='w-2 h-2 bg-blue-500' />
      <Handle type='source' position={Position.Right} className='w-2 h-2 bg-blue-500' />
    </div>
  );
}

// Mapping used by React Flow's nodeTypes prop
export const layerNodeTypes = {
  inputLayer: BaseLayerNode,
  denseLayer: BaseLayerNode,
  dropoutLayer: BaseLayerNode,
  conv2dLayer: BaseLayerNode,
  flattenLayer: BaseLayerNode,
  outputLayer: BaseLayerNode,
};
