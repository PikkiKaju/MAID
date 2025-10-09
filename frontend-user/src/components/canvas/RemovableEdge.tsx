import { memo, MouseEvent } from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from 'reactflow';
import { useModelCanvasStore } from '../../store/modelCanvasStore';
import { X } from 'lucide-react';

// A custom edge that, when clicked, reveals a centered remove button.
function RemovableEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style, selected } = props;
  const removeEdge = useModelCanvasStore(s => s.removeEdge);

  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  const handleRemove = (e: MouseEvent) => {
    e.stopPropagation(); // prevent background deselect before removal
    removeEdge(id);
  };

  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        style={{ ...style, strokeWidth: selected ? 2.5 : 2, stroke: selected ? '#2563eb' : style?.stroke || '#555' }}
        interactionWidth={24}
      />
      <EdgeLabelRenderer>
        {selected && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 40,
            }}
          >
            <button
              onClick={handleRemove}
              className='w-5 h-5 flex items-center justify-center rounded-full bg-rose-600 text-white shadow hover:bg-rose-700 text-[10px]'
              aria-label='Remove connection'
            >
              <X size={12} />
            </button>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(RemovableEdge);
