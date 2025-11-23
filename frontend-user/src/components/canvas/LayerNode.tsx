import { Handle, Position, NodeProps } from 'reactflow';
import { useModelCanvasStore } from '../../store/modelCanvasStore';
import { X } from 'lucide-react';

export default function LayerNode({ data, id, selected }: NodeProps) {
  const setSelected = useModelCanvasStore(s => s.setSelected);
  const removeNode = useModelCanvasStore(s => s.removeNode);

  return (
    <div
      onClick={(e) => { e.stopPropagation(); setSelected(id); }}
      className={`group relative px-3 py-2 rounded border shadow-sm bg-card text-xs min-w-40 cursor-pointer transition
        ${selected ? 'border-primary ring-1 ring-primary/30' : 'border-border/30 hover:shadow-md'}
        ${data?.hasError ? 'border-destructive ring-1 ring-destructive/30' : ''}
      `}
    >
      {/* Remove button */}
      {selected && (
        <button
          onClick={(e) => { e.stopPropagation(); removeNode(id); }}
          className='absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px] shadow hover:bg-destructive/90'
          aria-label='Remove node'
        >
          <X size={12} />
        </button>
      )}
      <div className='font-semibold text-foreground mb-1 pr-4'>{data.label}</div>
      {data.params && (
        <ul className='space-y-0.5'>
          {Object.entries(data.params).slice(0, 3).map(([k, v]) => (
            <li key={k} className='text-[10px] text-muted-foreground'>{k}: {String(v)}</li>
          ))}
        </ul>
      )}
      <Handle type='target' position={Position.Left} className='w-2 h-2 bg-primary' />
      <Handle type='source' position={Position.Right} className='w-2 h-2 bg-primary' />
    </div>
  );
}
