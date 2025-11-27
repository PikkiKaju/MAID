import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useModelCanvasStore, ModelCanvasState } from '../../store/modelCanvasStore';
import { ChevronDown, ChevronRight } from 'lucide-react';
import networkGraphService from '../../api/networkGraphService';

type LayersListResponse = {
  tensorflow_version: string;
  keras_version: string;
  layer_count: number;
  layers: Layer[];
}

type LayerCategory = {
  id: string;
  name: string;
  layers: Layer[];
  defaultOpen?: boolean;
}

type Layer = {
  name: string;
  description: string;
  categories: string[];
  parameters: LayerParameter[];
  deprecated: boolean;
}

type LayerParameter = {
  name: string;
  kind: string;
  default: unknown;
  annotation: unknown;
  doc: string;
  required: boolean;
  param_type: string;
  deprecated: boolean | null;
  enum: string[] | null;
  case_insensitive: boolean | null;
}

// Left side layer palette (drag source + click fallback)
export default function LayerPalette() {
  const { t } = useTranslation();
  const addNode = useModelCanvasStore((s: ModelCanvasState) => s.addNode); // Keep button click fallback

  const [layerCategories, setLayerCategories] = useState<LayerCategory[]>([]);
  // Build defaults object from parameters
  const buildDefaults = (params?: LayerParameter[]) => {
    const out: Record<string, unknown> = {};
    params?.forEach(p => {
      if (p.default !== undefined) out[p.name] = p.default;
    });
    return out;
  };

  // Get Layers from Django API (load once)
  useEffect(() => {
    let mounted = true;
    networkGraphService.getLayersList()
      .then(data => {

        if (!mounted) return;

        const layersListData = data as LayersListResponse;
        const layersList: Layer[] = layersListData.layers;
        const categoriesMap: Record<string, LayerCategory> = {};

        for (const layer of layersList) {
          const currLayerCategories = layer.categories || [];
          for (const categoryName of currLayerCategories) {
            const id = categoryName.toLowerCase().replace(/\s+/g, '-');
            if (!categoriesMap[id]) {
              categoriesMap[id] = {
                id,
                name: categoryName,
                layers: [],
                defaultOpen: false
              };
            }
            categoriesMap[id].layers.push(layer);
          }
        }
        const categories = Object.values(categoriesMap);
        setLayerCategories(categories);

        // ensure openGroups has entries for new categories
        setOpenGroups(prev => {
          const next = { ...prev };
          for (const c of categories) {
            if (next[c.id] === undefined) next[c.id] = !!c.defaultOpen;
          }
          return next;
        });
      })
      .catch(err => {
        // optional: handle/log
        console.error('Failed to load layers list', err);
      });
    return () => { mounted = false; };
  }, []);

  interface PaletteItem { type: string, label: string; defaults: Record<string, unknown>; }
  const handleDragStart = (e: React.DragEvent, item: PaletteItem) => {
    e.dataTransfer.setData('application/myapp-layer', item.label);
    e.dataTransfer.setData('application/myapp-layer-config', JSON.stringify(item.defaults));
    e.dataTransfer.setData('application/myapp-layer-label', item.label);
    e.dataTransfer.effectAllowed = 'move';
  };
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    () => ({} as Record<string, boolean>)
  );
  const toggleGroup = (id: string) => setOpenGroups(o => ({ ...o, [id]: !o[id] }));

  return (
    <div className='flex flex-col gap-3'>
      {layerCategories.map(category => {
        const opened = openGroups[category.id];
        return (
          <div key={category.id} className='border border-border rounded bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden'>
            <button
              type='button'
              onClick={() => toggleGroup(category.id)}
              className='w-full flex items-center justify-between px-2 py-1 text-left text-[11px] font-semibold text-muted-foreground hover:bg-accent rounded-t'
            >
              <span className='flex items-center gap-2'>
                {opened ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {t(`canvas.palette.category.${category.id}`, category.name)}
              </span>
              <span className='text-[10px] font-normal text-muted-foreground/70'>{category.layers.length}</span>
            </button>
            {opened && (
              <div className='p-2 pt-0 grid gap-1 overflow-y-auto'>
                {category.layers.map(layer => {
                  const p: PaletteItem = { type: layer.name, label: layer.name, defaults: buildDefaults(layer.parameters) };
                  return (
                    <button
                      key={p.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, p)}
                      onClick={() => addNode(p.type, p.defaults)}
                      className='w-full text-left px-2 py-1 rounded border border-border bg-card hover:border-primary hover:bg-primary/5 transition cursor-grab active:cursor-grabbing box-border'
                      title={t('canvas.palette.addLayerTooltip', 'Drag to canvas or click to add')}
                    >
                      <span className='block text-[11px] font-medium text-foreground'>{t(`canvas.palette.layer.${p.label}`, p.label)}</span>
                      {Object.keys(p.defaults).length > 0 && (
                        <span className='block text-[9px] text-muted-foreground whitespace-normal break-words'>
                          {Object.keys(p.defaults).slice(0, 3).map(key => t(`canvas.palette.param.${key}`, key)).join(', ')}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}