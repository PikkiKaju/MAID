import { useState } from 'react';
import { Layers, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../../../ui/button';
import { useModelCanvasStore } from '../../../store/modelCanvasStore';
import networkGraphService, { GraphNode, GraphEdge } from '../../../api/networkGraphService';

type LayerSummary = {
  name: string;
  type: string;
  outputShape: string;
  params: number;
};

export default function ModelSummaryTab() {
  const { nodes: storeNodes, edges: storeEdges } = useModelCanvasStore();
  const [summary, setSummary] = useState<LayerSummary[] | null>(null);
  const [totalParams, setTotalParams] = useState(0);
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
      
      // Extract summary from compilation result
      if (result.summary) {
        // Parse the summary (adjust based on actual backend response structure)
        const layers: LayerSummary[] = result.layers?.map((layer: Record<string, unknown>) => ({
          name: (layer.name as string) || (layer.type as string),
          type: layer.type as string,
          outputShape: (layer.output_shape as string) || 'N/A',
          params: (layer.params as number) || 0,
        })) || [];

        setSummary(layers);
        setTotalParams((result.total_params as number) || layers.reduce((sum, l) => sum + l.params, 0));
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

  return (
    <div className="h-full flex flex-col p-4 bg-slate-50">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Model Summary</h2>
        <Button onClick={generateSummary} disabled={loading}>
          <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Generating...' : 'Generate Summary'}
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error generating summary</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {!summary ? (
          <div className="bg-white border rounded-lg p-8 text-center">
            <Layers size={64} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No Model Summary Available</h3>
            <p className="text-sm text-slate-500 mb-6">
              Click "Generate Summary" to compile your model and view its structure
            </p>
            <p className="text-xs text-slate-400">
              This will show layer names, output shapes, and parameter counts
            </p>
          </div>
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden">
            {/* Summary Header */}
            <div className="bg-slate-800 text-white px-4 py-3">
              <h3 className="font-mono text-sm">Model: "network_model"</h3>
            </div>

            {/* Layers Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b-2 border-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Layer (type)</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Output Shape</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Param #</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {summary.map((layer, idx) => (
                    <tr key={idx} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{layer.name}</div>
                        <div className="text-xs text-slate-500">({layer.type})</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{layer.outputShape}</td>
                      <td className="px-4 py-3 text-right text-slate-800 font-medium">
                        {layer.params.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="border-t-2 border-slate-300 bg-slate-50 px-4 py-3 space-y-1 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Total params:</span>
                <span className="font-semibold text-slate-800">{totalParams.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Trainable params:</span>
                <span className="font-semibold text-slate-800">{totalParams.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Non-trainable params:</span>
                <span className="font-semibold text-slate-800">0</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
