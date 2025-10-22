import { useState } from 'react';
import { useModelCanvasStore, ModelCanvasState } from '../../store/modelCanvasStore';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Left side layer palette (drag source + click fallback)
export default function LayerPalette() {
  const addNode = useModelCanvasStore((s: ModelCanvasState) => s.addNode); // Keep button click fallback
  // Structured palette groups for better discoverability
  const groups: Array<{
    id: string;
    label: string;
    items: { type: string; label: string; defaults: Record<string, unknown> }[];
    defaultOpen?: boolean;
  }> = [
    {
      id: 'core',
      label: 'Core',
      defaultOpen: true,
      items: [
        { type: 'inputLayer', label: 'Input', defaults: { shape: '(32,)', dtype: 'float32', name: 'input_1' } },
        { type: 'denseLayer', label: 'Dense', defaults: { units: 128, activation: 'relu', use_bias: true, kernel_initializer: 'glorot_uniform', bias_initializer: 'zeros' } },
        { type: 'actLayer', label: 'Activation', defaults: { activation: 'relu' } },
        { type: 'flattenLayer', label: 'Flatten', defaults: { data_format: 'channels_last' } }
      ]
    },
    {
      id: 'convolution',
      label: 'Convolution',
      items: [
        { type: 'conv2dLayer', label: 'Conv2D', defaults: { filters: 32, kernel: '3x3', strides: '1x1', padding: 'same', activation: 'relu', use_bias: true } },
        { type: 'maxPool2DLayer', label: 'MaxPool2D', defaults: { pool: '2x2', strides: '2x2', padding: 'valid' } },
        { type: 'gap2DLayer', label: 'GlobalAvgPool2D', defaults: {} }
      ]
    },
    {
      id: 'regularization',
      label: 'Regularization',
      items: [
        { type: 'dropoutLayer', label: 'Dropout', defaults: { rate: 0.5, seed: 42 } },
        { type: 'batchNormLayer', label: 'BatchNorm', defaults: { momentum: 0.99, epsilon: 0.001, center: true, scale: true } }
      ]
    },
    {
      id: 'recurrent',
      label: 'Recurrent',
      items: [
        { type: 'lstmLayer', label: 'LSTM', defaults: { units: 64, return_sequences: false, dropout: 0.0, recurrent_dropout: 0.0, bidirectional: false } }
      ]
    },
    {
      id: 'output',
      label: 'Output',
      items: [
        { type: 'outputLayer', label: 'Output', defaults: { units: 10, activation: 'softmax' } }
      ]
    }
  ];
  interface PaletteItem { type: string; label: string; defaults: Record<string, unknown>; }
  const handleDragStart = (e: React.DragEvent, p: PaletteItem) => {
    e.dataTransfer.setData('application/myapp-layer', p.type);
    e.dataTransfer.setData('application/myapp-layer-config', JSON.stringify(p.defaults));
    e.dataTransfer.setData('application/myapp-layer-label', p.label);
    e.dataTransfer.effectAllowed = 'move';
  };
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    () => groups.reduce((acc, g) => { acc[g.id] = !!g.defaultOpen; return acc; }, {} as Record<string, boolean>)
  );
  const toggleGroup = (id: string) => setOpenGroups(o => ({ ...o, [id]: !o[id] }));

  return (
    <div className='flex flex-col gap-3'>
      {groups.map(group => {
        const opened = openGroups[group.id];
        return (
          <div key={group.id} className='border rounded bg-white/60 backdrop-blur-sm shadow-sm'>
            <button
              type='button'
              onClick={() => toggleGroup(group.id)}
              className='w-full flex items-center justify-between px-2 py-1 text-left text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-t'
            >
              <span className='flex items-center gap-2'>
                {opened ? <ChevronDown size={14}/> : <ChevronRight size={14}/>} {group.label}
              </span>
              <span className='text-[10px] font-normal text-slate-400'>{group.items.length}</span>
            </button>
            {opened && (
              <div className='p-2 pt-0 grid gap-1'>
                {group.items.map(p => (
                  <button
                    key={p.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, p)}
                    onClick={() => addNode(p.type, p.defaults)}
                    className='text-left px-2 py-1 rounded border bg-white hover:border-blue-500 hover:bg-blue-50 transition cursor-grab active:cursor-grabbing'
                    title='Drag to canvas or click to add'
                  >
                    <span className='block text-[11px] font-medium text-slate-700'>{p.label}</span>
                    {Object.keys(p.defaults).length > 0 && (
                      <span className='block text-[9px] text-slate-400 truncate'>
                        {Object.keys(p.defaults).slice(0,3).join(', ')}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}