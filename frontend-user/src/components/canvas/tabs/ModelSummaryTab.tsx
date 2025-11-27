import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../../../ui/button';
import { useModelCanvasStore } from '../../../store/modelCanvasStore';
import networkGraphService, { GraphNode, GraphEdge } from '../../../api/networkGraphService';
import { useModelSummary } from '../../../contexts/ModelSummaryContext';

type LayerSummary = {
  name: string;
  type: string;
  outputShape: string;
  params: number;
};

export default function ModelSummaryTab() {
  const { t } = useTranslation();
  const { nodes: storeNodes, edges: storeEdges } = useModelCanvasStore();
  const { summary, setSummary, totalParams, setTotalParams } = useModelSummary();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build payload from store
      const nodesPayload: GraphNode[] = storeNodes.map(n => {
        const data = n.data as { label?: string; layer?: string; params?: Record<string, unknown> };
        return {
          id: n.id,
          type: data?.layer || n.type || '',
          label: data?.label || '',
          params: data?.params || {},
          position: n.position || {},
          notes: {},
        };
      });

      const edgesPayload: GraphEdge[] = storeEdges.map(e => ({
        id: e.id!,
        source: e.source,
        target: e.target,
        meta: {},
      }));

      // Compile graph to get model summary
      const result = await networkGraphService.compileGraphFromPayload(nodesPayload, edgesPayload);

      // Parse Keras text summary into structured data
      if (result.summary && typeof result.summary === 'string') {
        const layers = parseSummaryText(result.summary);
        setSummary(layers);
        setTotalParams((result.parameter_count as number) || layers.reduce((sum, l) => sum + l.params, 0));
      } else {
        throw new Error('No summary data in compilation result');
      }
    } catch (err) {
      console.error('Failed to generate summary', err);
      setError(err instanceof Error ? err.message : 'Failed to generate model summary');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Parse Keras model.summary() text output into structured layer data.
   * Example input:
   * ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━┓
   * ┃ Layer (type)                    ┃ Output Shape           ┃       Param # ┃
   * ┡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━┩
   * │ input_layer (InputLayer)        │ (None, 10)             │             0 │
   * │ dense (Dense)                   │ (None, 64)             │           704 │
   * └─────────────────────────────────┴────────────────────────┴───────────────┘
   */
  function parseSummaryText(text: string): LayerSummary[] {
    const lines = text.split('\n');
    const layers: LayerSummary[] = [];

    for (const line of lines) {
      // Skip header/separator lines (containing ━, ┃, ┏, etc.)
      if (line.includes('━') || line.includes('┏') || line.includes('┗') || line.includes('┡')) continue;

      // Look for layer data lines (start with │ or ┃)
      if (!line.includes('│') && !line.includes('┃')) continue;

      // Skip the header row itself
      if (line.includes('Layer (type)') || line.includes('Output Shape') || line.includes('Param #')) continue;

      // Split by │ or ┃ and trim
      const parts = line.split(/[│┃]/).map(s => s.trim()).filter(Boolean);

      if (parts.length >= 3) {
        const layerCol = parts[0]; // e.g., "input_layer (InputLayer)"
        const outputShape = parts[1]; // e.g., "(None, 10)"
        const paramStr = parts[2]; // e.g., "704" or "704 (1.0 KB)"

        // Extract layer name and type from "name (Type)" format
        const match = layerCol.match(/^(.+?)\s*\((.+?)\)$/);
        if (match) {
          const name = match[1].trim();
          const type = match[2].trim();

          // Parse param count (may include commas or size annotations)
          const paramMatch = paramStr.match(/[\d,]+/);
          const params = paramMatch ? parseInt(paramMatch[0].replace(/,/g, '')) : 0;

          layers.push({
            name,
            type,
            outputShape,
            params,
          });
        }
      }
    }

    return layers;
  }

  return (
    <div className="h-full flex flex-col p-4 bg-background">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{t('canvas.summary.title')}</h2>
        <Button onClick={generateSummary} disabled={loading}>
          <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? t('canvas.summary.generating') : t('canvas.summary.generate')}
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">{t('canvas.summary.errorTitle')}</p>
              <p className="text-sm text-destructive mt-1">{error}</p>
            </div>
          </div>
        )}

        {!summary ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <Layers size={64} className="mx-auto mb-4 text-muted" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">{t('canvas.summary.noSummary')}</h3>
            <p className="text-sm text-muted-foreground mb-6">{t('canvas.summary.clickGenerate')}</p>
            <p className="text-xs text-muted-foreground">{t('canvas.summary.explainer')}</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {/* Summary Header */}
            <div className="bg-muted text-foreground px-4 py-3">
              <h3 className="font-mono text-sm">{t('canvas.summary.title')}</h3>
            </div>

            {/* Layers Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b-2 border-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t('canvas.summary.table.layerType')}</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t('canvas.summary.table.outputShape')}</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">{t('canvas.summary.table.paramCount')}</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {summary.map((layer, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{layer.name}</div>
                        <div className="text-xs text-muted-foreground">({layer.type})</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{layer.outputShape}</td>
                      <td className="px-4 py-3 text-right text-foreground font-medium">
                        {layer.params.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="border-t-2 border-border bg-muted/30 px-4 py-3 space-y-1 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('canvas.summary.totalParams')}</span>
                <span className="font-semibold text-foreground">{totalParams.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('canvas.summary.trainableParams')}</span>
                <span className="font-semibold text-foreground">{totalParams.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('canvas.summary.nonTrainableParams')}</span>
                <span className="font-semibold text-foreground">0</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
