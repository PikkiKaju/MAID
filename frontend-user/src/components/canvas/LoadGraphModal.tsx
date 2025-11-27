import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../ui/dialog';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../../utils/formatDate';
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
  const { t, i18n } = useTranslation();
  const [graphs, setGraphs] = useState<GraphWithTimestamps[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchGraphs();
    }
  }, [open]);

  const fetchGraphs = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
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

  const handleDeleteGraph = async (graphId: string) => {
    try {
      setLoading(true);
      setError(null);
      await networkGraphService.deleteGraph(graphId);
      setSuccess('Graph deleted');
      setConfirmDeleteId(null);
      await fetchGraphs();
    } catch (err) {
      console.error('Delete graph failed', err);
      setError(err instanceof Error ? err.message : 'Failed to delete graph');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('canvas.loadModal.na');
    return formatDateTime(dateString, i18n.language);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('canvas.loadModal.title')}</DialogTitle>
          <DialogDescription>
            {t('canvas.loadModal.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          {success && (
            <div className="mb-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded p-2 text-emerald-700 dark:text-emerald-200 text-sm">
              {t('canvas.loadModal.graphDeleted')}
            </div>
          )}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin mr-2" size={24} />
              <span className="text-sm text-muted-foreground">{t('canvas.loadModal.loading')}</span>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded p-4 text-sm text-destructive">
              {t('canvas.loadModal.error', { error })}
            </div>
          )}

          {!loading && !error && graphs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Layers size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm">{t('canvas.loadModal.noGraphs')}</p>
              <p className="text-xs mt-2">{t('canvas.loadModal.noGraphsHint')}</p>
            </div>
          )}

          {!loading && !error && graphs.length > 0 && (
            <div className="space-y-2">
              {graphs.map((graph) => (
                <div
                  key={graph.id}
                  className="border border-border rounded-lg p-4 hover:border-primary hover:bg-primary/5 transition group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => handleLoadGraph(graph)}>
                      <h3 className="font-semibold text-foreground group-hover:text-primary">
                        {graph.name || 'Untitled Graph'}
                      </h3>
                      {graph.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {graph.description}
                        </p>
                      )}
                      <div className="mt-2 text-xs text-muted-foreground flex flex-col gap-1">
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <Calendar size={12} />
                          {formatDate(graph.updated_at || graph.created_at)}
                        </span>
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <Layers size={12} />
                          {t('canvas.loadModal.layers', { count: (graph.nodes || []).length })}
                        </span>
                        {graph.framework && (
                          <span className="bg-muted px-2 py-0.5 rounded whitespace-nowrap w-fit">
                            {graph.framework}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex items-center gap-2 min-h-[32px]">
                      <Button
                        variant="outline"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadGraph(graph);
                        }}
                      >
                        {t('canvas.loadModal.load')}
                      </Button>
                      <div className="h-8 flex items-center">
                        {confirmDeleteId === graph.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{t('canvas.loadModal.deleteConfirm')}</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => { e.stopPropagation(); handleDeleteGraph(graph.id!); }}
                            >
                              {t('common.confirm')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                            >
                              {t('common.cancel')}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(graph.id || null); }}
                          >
                            {t('common.delete')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-4 mt-4 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
