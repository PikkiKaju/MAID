import { useEffect, useMemo, useState } from 'react';
import { Play, Settings } from 'lucide-react';
import { Button } from '../../../ui/button';
import { useDataset } from '../../../contexts/DatasetContext';
import { useGraph } from '../../../contexts/GraphContext';
import networkGraphService from '../../../api/networkGraphService';

export default function TrainTab() {
  const { dataset } = useDataset();
  const { graphId } = useGraph();

  // Dynamic catalogs
  const [optimizers, setOptimizers] = useState<string[]>([]);
  const [losses, setLosses] = useState<string[]>([]);
  const [metricsCatalog, setMetricsCatalog] = useState<string[]>([]);

  // Selected values
  const [optimizer, setOptimizer] = useState<string>('adam');
  const [loss, setLoss] = useState<string>('MeanSquaredError');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['mae']);

  // Train options
  const [epochs, setEpochs] = useState<number>(10);
  const [batchSize, setBatchSize] = useState<number>(32);

  // Job state
  const [isStarting, setIsStarting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<number | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [jobResult, setJobResult] = useState<unknown>(null);

  // Fetch catalogs on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [opt, los, met] = await Promise.all([
          networkGraphService.getOptimizersList(),
          networkGraphService.getLossesList(),
          networkGraphService.getMetricsList(),
        ]);
        if (cancelled) return;
        setOptimizers((opt.optimizers || []).map(o => o.name));
        // De-duplicate: hide function aliases that map to class-based losses
        const dedupLosses = (los.losses || []).filter((l) => !l.alias_of).map((l) => l.name);
        setLosses(dedupLosses);
        setMetricsCatalog((met.metrics || []).map(m => m.name));
        // Set sensible defaults if current selections not present
        if (!opt.optimizers?.some(o => o.name === 'adam') && opt.optimizers?.length) {
          setOptimizer(opt.optimizers[0].name);
        }
        // Prefer MeanSquaredError if present; else first available
        if (!dedupLosses.includes('MeanSquaredError') && dedupLosses.length) {
          setLoss(dedupLosses[0]);
        } else if (dedupLosses.includes('MeanSquaredError')) {
          setLoss('MeanSquaredError');
        }
        if (!met.metrics?.some(m => m.name.toLowerCase() === 'mae') && met.metrics?.length) {
          setSelectedMetrics([met.metrics[0].name]);
        }
      } catch {
        console.error('Failed to load training catalogs');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const computedSplits = useMemo(() => {
    // Derive validation/test splits from processed dataset sizes
    if (!dataset?.trainData) return { validation: 0, test: 0 };
    const nTrain = dataset.trainData.X.length;
    const nVal = dataset.validationData?.X.length || 0;
    const nTest = dataset.testData?.X.length || 0;
    const total = nTrain + nVal + nTest;
    if (total === 0) return { validation: 0, test: 0 };
    return {
      validation: +(nVal / total).toFixed(4),
      test: +(nTest / total).toFixed(4),
    };
  }, [dataset]);

  // Infer target kind from dataset metadata (reliable: uses ColumnInfo.type & uniqueCount)
  const targetKind = useMemo(() => {
    const targetName = dataset?.preprocessingConfig.targetColumn;
    if (!targetName) return 'unknown' as const;
    const meta = dataset?.columns.find(c => c.name === targetName);
    if (!meta) return 'unknown' as const;
    if (meta.type === 'numeric') return 'regression' as const;
    // categorical
    if (meta.uniqueCount === 2) return 'binary' as const;
    return 'multiclass' as const;
  }, [dataset]);

  // Compute available metrics based on selected loss and target kind
  const availableMetrics = useMemo(() => {
    // Likely Keras metric class names from manifest
    const regressionList = [
      'MeanSquaredError',
      'RootMeanSquaredError',
      'MeanAbsoluteError',
      'MeanAbsolutePercentageError',
      'MeanSquaredLogarithmicError',
      'LogCoshError',
      'CosineSimilarity',
      'R2Score',
      'Huber',
    ];
    const binaryList = [
      'BinaryAccuracy',
      'AUC',
      'Precision',
      'Recall',
      'TruePositives',
      'TrueNegatives',
      'FalsePositives',
      'FalseNegatives',
    ];
    const categoricalList = [
      'CategoricalAccuracy',
      'SparseCategoricalAccuracy',
      'TopKCategoricalAccuracy',
      'AUC',
      'Precision',
      'Recall',
    ];

  const ll = (loss || '').toLowerCase();
  const key = ll.replace(/_/g, '');
  const isSparseCat = key.includes('sparsecategoricalcrossentropy');
  const isCat = key.includes('categoricalcrossentropy');
  const isBinary = key.includes('binarycrossentropy');
    const isClassificationLoss = isSparseCat || isCat || isBinary;

    let desired: string[];
    if (isClassificationLoss) {
      desired = isBinary ? binaryList : categoricalList;
    } else {
      // Fall back to target kind if loss is regression or unknown
      desired = targetKind === 'binary' ? binaryList : targetKind === 'multiclass' ? categoricalList : regressionList;
    }

  // Intersect with catalog; if names differ in case, match case-insensitively
    const catalogLower = new Map(metricsCatalog.map((n) => [n.toLowerCase(), n] as const));
    const result: string[] = [];
    desired.forEach((name) => {
      const found = catalogLower.get(name.toLowerCase());
      if (found) result.push(found);
    });

    // If nothing matched, show catalog as-is (avoid empty UI), but prioritize common safe metrics
    if (result.length === 0) {
      const fallbacks = ['MeanSquaredError', 'MeanAbsoluteError', 'BinaryAccuracy', 'CategoricalAccuracy', 'SparseCategoricalAccuracy'];
      for (const fb of fallbacks) {
        const f = catalogLower.get(fb.toLowerCase());
        if (f && !result.includes(f)) result.push(f);
      }
      if (result.length === 0) return metricsCatalog; // last resort
    }
    return result;
  }, [metricsCatalog, loss, targetKind]);

  // When loss changes, prune selected metrics that are no longer available
  useEffect(() => {
    if (!selectedMetrics?.length) return;
    const set = new Set(availableMetrics.map((m) => m.toLowerCase()));
    const next = selectedMetrics.filter((m) => set.has(m.toLowerCase()) || m.toLowerCase() === 'accuracy');
    if (next.length !== selectedMetrics.length) setSelectedMetrics(next);
  }, [availableMetrics, selectedMetrics]);

  function arraysToCsv(headers: string[], rows: (number[])[]): string {
    const esc = (v: number | string) => {
      const s = String(v);
      return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const headerLine = headers.map(h => esc(h)).join(',');
    const body = rows.map(r => r.map(v => esc(v)).join(',')).join('\n');
    return headerLine + '\n' + body + '\n';
  }

  async function handleStartTraining() {
    setJobError(null);
    setJobResult(null);
    if (!graphId) {
      alert('Please save the model graph first (Canvas > Save).');
      return;
    }
    if (!dataset?.isProcessed || !dataset.trainData) {
      alert('Please prepare the dataset in the Dataset tab before training.');
      return;
    }
    const xColumns = dataset.trainData.featureNames;
    const yColumn = dataset.preprocessingConfig.targetColumn;
    if (!yColumn) {
      alert('Target column is not set in Dataset preprocessing.');
      return;
    }

    // Build combined CSV from train/val/test splits
    const rows: number[][] = [];
    const pushSplit = (X?: number[][], y?: number[]) => {
      if (!X || !y) return;
      for (let i = 0; i < X.length; i++) {
        rows.push([...X[i], y[i]]);
      }
    };
    pushSplit(dataset.trainData.X, dataset.trainData.y);
    pushSplit(dataset.validationData?.X, dataset.validationData?.y);
    pushSplit(dataset.testData?.X, dataset.testData?.y);

    const headers = [...xColumns, yColumn];
    const csvStr = arraysToCsv(headers, rows);
    const csvFile = new File([csvStr], 'dataset.csv', { type: 'text/csv' });

    setIsStarting(true);
    try {
      // Normalize metrics to match selected loss/label format
      const metricsToSend = selectedMetrics.map((m) => {
        const ml = m.toLowerCase();
        const ll = (loss || '').toLowerCase();
        const key = ll.replace(/_/g, '');
        if (ml === 'accuracy' || ml === 'acc') {
          if (key.includes('sparsecategoricalcrossentropy')) return 'sparse_categorical_accuracy';
          if (key.includes('categoricalcrossentropy')) return 'categorical_accuracy';
          if (key.includes('binarycrossentropy')) return 'binary_accuracy';
          // For regression, drop plain accuracy
          return '';
        }
        return m;
      }).filter(Boolean) as string[];

      const job = await networkGraphService.startTraining(graphId, csvFile, {
        x_columns: xColumns,
        y_column: yColumn,
        optimizer,
        loss,
        metrics: metricsToSend,
        epochs,
        batch_size: batchSize,
        validation_split: computedSplits.validation,
        test_split: computedSplits.test,
      });
      setJobId(job.id);
      setJobStatus(job.status || 'queued');
      setJobProgress(job.progress ?? 0);

      // Poll for job updates
      const interval = setInterval(async () => {
        try {
          const j = await networkGraphService.getTrainingJob(job.id);
          setJobStatus(j.status);
          if (typeof j.progress === 'number') setJobProgress(j.progress);
          if (j.status === 'succeeded' || j.status === 'failed' || j.status === 'cancelled') {
            clearInterval(interval);
            if (j.status === 'succeeded') setJobResult(j.result);
            if (j.status !== 'succeeded') setJobError(j.error || 'Training failed');
          }
        } catch {
          clearInterval(interval);
          setJobError('Failed to poll job status');
        }
      }, 1500);
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      setJobError(msg || 'Failed to start training job');
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="h-full flex flex-col p-4 bg-slate-50">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Training Configuration</h2>
        <Button onClick={handleStartTraining} disabled={isStarting || !graphId}>
          <Play size={16} className="mr-2" />
          {isStarting ? 'Starting…' : 'Start Training'}
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="bg-white border rounded-lg p-6 space-y-6">
          {/* Compilation Settings */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Settings size={18} className="text-slate-600" />
              <h3 className="font-semibold text-slate-700">Compilation Settings</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Optimizer
                </label>
                <select
                  value={optimizer}
                  onChange={(e) => setOptimizer(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {optimizers.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Loss Function
                </label>
                <select
                  value={loss}
                  onChange={(e) => setLoss(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {losses.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                {/* Hint if selected loss seems mismatched with inferred target kind */}
                <div className="mt-1 text-xs">
                  {(() => {
                    const ll = (loss || '').toLowerCase();
                    const looksClass = targetKind === 'binary' || targetKind === 'multiclass';
                    const looksReg = targetKind === 'regression';
                    const key = ll.replace(/_/g, '');
                    const isClassLoss = key.includes('categoricalcrossentropy') || key.includes('sparsecategoricalcrossentropy') || key.includes('binarycrossentropy');
                    const isRegLoss = !isClassLoss; // heuristic
                    if (looksClass && isRegLoss) {
                      return <span className="text-amber-600">Heads up: target looks like classification but a regression loss is selected. Consider sparse_categorical_crossentropy (integer labels) or categorical_crossentropy (one-hot), or binary_crossentropy for 2 classes.</span>;
                    }
                    if (looksReg && !isRegLoss) {
                      return <span className="text-amber-600">Heads up: target looks continuous but a classification loss is selected. Consider mse/mae for regression.</span>;
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Training Parameters */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-4">Training Parameters</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Epochs
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={epochs}
                  onChange={(e) => setEpochs(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Batch Size
                </label>
                <input
                  type="number"
                  min="1"
                  max="512"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* No manual Validation Split; it's derived from Dataset tab */}
              <div className="col-span-2 text-xs text-slate-500">
                Using dataset splits: val={computedSplits.validation}, test={computedSplits.test}
              </div>
            </div>
          </div>

          {/* Metrics Selection */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-4">Metrics</h3>
            <div className="text-xs text-slate-500 mb-2">
              Showing metrics suitable for {(() => {
                const ll = (loss || '').toLowerCase();
                if (ll.includes('sparse_categorical_crossentropy') || ll.includes('categorical_crossentropy') || ll.includes('binary_crossentropy')) return 'classification';
                return 'regression';
              })()} (based on selected loss).
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto pr-1">
              {availableMetrics.map((name) => {
                const checked = selectedMetrics.includes(name);
                return (
                  <label key={name} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedMetrics((prev) => Array.from(new Set([...prev, name])));
                        else setSelectedMetrics((prev) => prev.filter((m) => m !== name));
                      }}
                    />
                    <span>{name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Job status */}
          {jobId && (
            <div className="mt-4 border-t pt-4">
              <h4 className="font-semibold text-slate-700 mb-2">Training Job</h4>
              <div className="text-sm text-slate-700">ID: <span className="font-mono">{jobId}</span></div>
              <div className="text-sm">Status: {jobStatus || '—'}{typeof jobProgress === 'number' ? ` · ${(jobProgress * 100).toFixed(0)}%` : ''}</div>
              {jobError && <div className="text-sm text-red-600">{jobError}</div>}
              {!!jobResult && (
                <div className="text-sm text-slate-700 mt-2">
                  <div>Final metrics:</div>
                  <pre className="bg-slate-50 p-2 rounded border overflow-auto max-h-60 text-xs">{JSON.stringify(jobResult, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
    </div>
  );
}
