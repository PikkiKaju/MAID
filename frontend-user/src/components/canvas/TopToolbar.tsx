import { Save, Play, Trash2 } from 'lucide-react';
import { useModelCanvasStore } from '../../store/modelCanvasStore';

interface Props { onSave: () => void; onPreview?: () => void }

export default function TopToolbar({ onSave, onPreview }: Props) {
  const setGraph = useModelCanvasStore(s => s.setGraph);
  const currentNodes = useModelCanvasStore(s => s.nodes);
  const currentEdges = useModelCanvasStore(s => s.edges);

  const clearAll = () => setGraph([], []);

  const runPreview = () => {
    if (onPreview) return onPreview();
    // fallback behavior
    console.log('Graph:', { nodes: currentNodes, edges: currentEdges });
    alert('Preview placeholder: would send graph to backend');
  };

  return (
    <div className='flex items-center gap-2 border-b px-3 py-2 bg-slate-100 text-xs'>
      <button onClick={onSave} className='flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700'>
        <Save size={14}/> Save
      </button>
      <button onClick={runPreview} className='flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700'>
        <Play size={14}/> Preview
      </button>
      <button onClick={clearAll} className='flex items-center gap-1 px-2 py-1 bg-rose-600 text-white rounded hover:bg-rose-700 ml-auto'>
        <Trash2 size={14}/> Clear
      </button>
    </div>
  );
}
