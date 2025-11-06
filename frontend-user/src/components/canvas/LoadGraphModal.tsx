import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import networkGraphService, { NetworkGraphPayload } from '../../api/networkGraphService';
import { Loader2, Calendar, Layers } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoad: (graph: NetworkGraphPayload) => void;
}

// Extended type to include timestamp fields from Django
type GraphWithTimestamps = NetworkGraphPayload & {
  created_at?: string;
  updated_at?: string;
};

export default function LoadGraphModal({ open, onOpenChange, onLoad }: Props) {
  const [graphs, setGraphs] = useState<GraphWithTimestamps[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchGraphs();
    }
  }, [open]);

  const fetchGraphs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await networkGraphService.listGraphs();
      setGraphs(data as GraphWithTimestamps[]);
    } catch (err) {
      console.error('Failed to load graphs', err);
      setError(err instanceof Error ? err.message : 'Failed to load graphs');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadGraph = (graph: GraphWithTimestamps) => {
    onLoad(graph);
    onOpenChange(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Load Saved Graph</DialogTitle>
          <DialogDescription>
            Select a previously saved network graph to load onto the canvas
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin mr-2" size={24} />
              <span className="text-sm text-slate-600">Loading graphs...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && graphs.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Layers size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm">No saved graphs found</p>
              <p className="text-xs mt-2">Create and save a graph to see it here</p>
            </div>
          )}

          {!loading && !error && graphs.length > 0 && (
            <div className="space-y-2">
              {graphs.map((graph) => (
                <div
                  key={graph.id}
                  className="border rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50/50 transition cursor-pointer group"
                  onClick={() => handleLoadGraph(graph)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 group-hover:text-blue-700">
                        {graph.name || 'Untitled Graph'}
                      </h3>
                      {graph.description && (
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                          {graph.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(graph.updated_at || graph.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers size={12} />
                          {(graph.nodes || []).length} layers
                        </span>
                        {graph.framework && (
                          <span className="bg-slate-100 px-2 py-0.5 rounded">
                            {graph.framework}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-4 opacity-0 group-hover:opacity-100 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadGraph(graph);
                      }}
                    >
                      Load
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-4 mt-4 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
