import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Settings, Square } from 'lucide-react';
import { Button } from '../../../ui/button';
import { useDataset } from '../../../contexts/DatasetContext';
import { useGraph } from '../../../contexts/GraphContext';
import networkGraphService from '../../../api/networkGraphService';
import { useTrainingConfig } from '../../../contexts/useTrainingConfig';
import MiniLineChart from '../../canvas/MiniLineChart';

/**
 * Represents the result structure returned from a training job.
 * Includes live metrics during training, historical data, and final evaluation results.
 */
type TrainingResult = {
  live?: {
    epoch?: number;
    loss?: number;
    val_loss?: number;
    accuracy?: number;
    sparse_categorical_accuracy?: number;
    categorical_accuracy?: number;
    binary_accuracy?: number;
  };
  history?: Record<string, number[]>;
  evaluation?: Record<string, number> | null;
  exports?: string[];
  best_model_artifact?: string;
  training_log_artifact?: string;
};

/**
 * TrainTab - Component for configuring and executing neural network training.
 * 
 * This component provides:
 * - Training configuration (optimizer, loss, metrics, hyperparameters)
 * - Callback management (EarlyStopping, ReduceLROnPlateau)
 * - Real-time training progress monitoring
 * - Live loss visualization during training
 * - Training job control (start/stop)
 */
export default function TrainTab() {
  const { dataset } = useDataset();
  const { graphId } = useGraph();

  // ============================================================
  // DYNAMIC CATALOGS - Available options from the backend
  // ============================================================
  const [optimizers, setOptimizers] = useState<string[]>([]);
  const [losses, setLosses] = useState<string[]>([]);
  const [metricsCatalog, setMetricsCatalog] = useState<string[]>([]);

  // ============================================================
  // TRAINING CONFIGURATION - Persisted across tab switches
  // ============================================================
  const {
    optimizer, setOptimizer,
    clipnorm, setClipnorm,
    loss, setLoss,
    selectedMetrics, setSelectedMetrics,
    epochs, setEpochs,
    batchSize, setBatchSize,
    learningRate, setLearningRate,
    shuffle, setShuffle,
    valBatchSize, setValBatchSize,
    useEarlyStopping, setUseEarlyStopping,
    esMonitor, setEsMonitor,
    esMode, setEsMode,
    esPatience, setEsPatience,
    esMinDelta, setEsMinDelta,
    esRestoreBest, setEsRestoreBest,
    useReduceLR, setUseReduceLR,
    rlrMonitor, setRlrMonitor,
    rlrFactor, setRlrFactor,
    rlrPatience, setRlrPatience,
    rlrMinLR, setRlrMinLR,
    saveBestModel, setSaveBestModel,
    saveTrainingLogs, setSaveTrainingLogs,
  } = useTrainingConfig();

  // ============================================================
  // TRAINING JOB STATE - Status and control
  // ============================================================
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const {
    jobId, setJobId,
    jobStatus, setJobStatus,
    jobProgress, setJobProgress,
    jobError, setJobError,
    jobResult, setJobResult,
  } = useTrainingConfig() as unknown as {
    jobId: string | null; setJobId: (v: string | null) => void;
    jobStatus: string | null; setJobStatus: (v: string | null) => void;
    jobProgress: number | null; setJobProgress: (v: number | null) => void;
    jobError: string | null; setJobError: (v: string | null) => void;
    jobResult: TrainingResult | null; setJobResult: (v: TrainingResult | null) => void;
  };

  // Polling and live metrics tracking
  const pollerRef = useRef<number | null>(null); // Stores interval ID for job status polling
  const lastEpochRef = useRef<number>(0); // Tracks the last epoch received to avoid duplicate chart points
  const [liveLoss, setLiveLoss] = useState<number[]>([]); // Training loss values for live charting
  const [liveValLoss, setLiveValLoss] = useState<number[]>([]); // Validation loss values for live charting

  // Chart colors for loss and validation loss
  const chartLossColor = '#1661ecff'; // Blue for training loss
  const chartValLossColor = '#2c6d0eff'; // Purple for validation loss

  // ============================================================
  // EFFECTS - Data fetching and state synchronization
  // ============================================================

  /**
   * Reset live metric series when a new training job starts.
   * This ensures charts start fresh for each training run.
   */
  useEffect(() => {
    lastEpochRef.current = 0;
    setLiveLoss([]);
    setLiveValLoss([]);
  }, [jobId]);

  /**
   * Fetch available optimizers, losses, and metrics from the backend on mount.
   * Also validates and adjusts current selections if they're not in the fetched catalogs.
   */
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

        // De-duplicate losses: hide function aliases that map to class-based losses
        // This prevents showing both 'mse' and 'MeanSquaredError' in the dropdown
        const dedupLosses = (los.losses || []).filter((l) => !l.alias_of).map((l) => l.name);
        setLosses(dedupLosses);
        setMetricsCatalog((met.metrics || []).map(m => m.name));

        // Validate current selections against fetched catalogs
        // Only adjust if the current value is invalid
        if (opt.optimizers?.length) {
          const optimizerNames = new Set(opt.optimizers.map(o => o.name));
          if (!optimizerNames.has(optimizer)) {
            if (optimizerNames.has('adam')) setOptimizer('adam');
            else setOptimizer(opt.optimizers[0].name);
          }
        }
        if (dedupLosses.length) {
          if (!dedupLosses.includes(loss)) {
            // Fall back to first available loss if current selection is invalid
            setLoss(dedupLosses[0]);
          }
        }
        // Note: Metrics are filtered by a separate effect based on loss/target compatibility
      } catch {
        console.error('Failed to load training catalogs');
      }
    })();
    return () => { cancelled = true; };
  }, [optimizer, loss, setOptimizer, setLoss, setLosses, setMetricsCatalog]);

  // Effect to handle "Final vs Best" logic
  useEffect(() => {
    if (useEarlyStopping && esRestoreBest) {
      // If restoring best weights, the final model IS the best model.
      // Disable saveBestModel to avoid redundancy
      if (saveBestModel) {
        setSaveBestModel(false);
      }
    }
  }, [useEarlyStopping, esRestoreBest, saveBestModel, setSaveBestModel]);

  // ============================================================
  // COMPUTED VALUES - Derived from dataset and configuration
  // ============================================================

  /**
   * Calculate validation and test split ratios from the processed dataset.
   * These are derived from actual data splits configured in the Dataset tab.
   */
  const computedSplits = useMemo(() => {
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

  /**
   * Infer the target variable type from dataset metadata.
   * Uses column type and unique value count to determine if it's:
   * - 'regression': numeric target
   * - 'binary': categorical with 2 classes
   * - 'multiclass': categorical with >2 classes
   */
  const targetKind = useMemo(() => {
    const targetName = dataset?.preprocessingConfig.targetColumn;
    if (!targetName) return 'unknown' as const;
    const meta = dataset?.columns.find(c => c.name === targetName);
    if (!meta) return 'unknown' as const;
    if (meta.type === 'numeric') return 'regression' as const;

    // For categorical targets, distinguish binary from multiclass
    if (meta.uniqueCount === 2) return 'binary' as const;
    return 'multiclass' as const;
  }, [dataset]);

  /**
   * Recommend an appropriate loss function based on:
   * - Target type (regression, binary, multiclass)
   * - Target encoding (one-hot vs. integer labels)
   */
  const recommendedLoss = useMemo(() => {
    const enc = dataset?.preprocessingConfig.targetEncoding;
    if (!dataset?.preprocessingConfig.targetColumn) return null;
    if (targetKind === 'regression') return 'MeanSquaredError';
    if (targetKind === 'binary') {
      return enc === 'one-hot' ? 'CategoricalCrossentropy' : 'BinaryCrossentropy';
    }

    // For multiclass: use CategoricalCrossentropy for one-hot, SparseCategoricalCrossentropy for integers
    return enc === 'one-hot' ? 'CategoricalCrossentropy' : 'SparseCategoricalCrossentropy';
  }, [dataset, targetKind]);

  /**
   * Filter available metrics based on the selected loss function and target type.
   * Different problem types (regression, binary, multiclass) have different relevant metrics.
   */
  const availableMetrics = useMemo(() => {
    // Define metrics appropriate for each problem type
    // These align with Keras metric class names
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

    // Determine the problem type from the selected loss function
    const ll = (loss || '').toLowerCase();
    const key = ll.replace(/_/g, ''); // Remove underscores for flexible matching
    const isSparseCat = key.includes('sparsecategoricalcrossentropy');
    const isCat = key.includes('categoricalcrossentropy');
    const isBinary = key.includes('binarycrossentropy');
    const isClassificationLoss = isSparseCat || isCat || isBinary;

    // Select appropriate metric list based on loss function or target type
    let desired: string[];
    if (isClassificationLoss) {
      desired = isBinary ? binaryList : categoricalList;
    } else {
      // For regression or unknown losses, fall back to target type
      desired = targetKind === 'binary' ? binaryList : targetKind === 'multiclass' ? categoricalList : regressionList;
    }

    // Match desired metrics against the catalog (case-insensitive)
    const catalogLower = new Map(metricsCatalog.map((n) => [n.toLowerCase(), n] as const));
    const result: string[] = [];
    desired.forEach((name) => {
      const found = catalogLower.get(name.toLowerCase());
      if (found) result.push(found);
    });

    // Fallback: if no matches found, provide common safe metrics to avoid empty UI
    if (result.length === 0) {
      const fallbacks = ['MeanSquaredError', 'MeanAbsoluteError', 'BinaryAccuracy', 'CategoricalAccuracy', 'SparseCategoricalAccuracy'];
      for (const fb of fallbacks) {
        const f = catalogLower.get(fb.toLowerCase());
        if (f && !result.includes(f)) result.push(f);
      }
      // Last resort: show entire catalog if no fallbacks matched
      if (result.length === 0) return metricsCatalog;
    }
    return result;
  }, [metricsCatalog, loss, targetKind]);

  /**
   * Prune selected metrics when they become unavailable due to loss or catalog changes.
   * This prevents invalid metric selections from being sent to the backend.
   */
  const catalogsReady = optimizers.length > 0 && losses.length > 0 && metricsCatalog.length > 0;
  useEffect(() => {
    if (!catalogsReady) return;
    if (!selectedMetrics?.length) return;
    const set = new Set(availableMetrics.map((m) => m.toLowerCase()));
    const next = selectedMetrics.filter((m) => set.has(m.toLowerCase()) || m.toLowerCase() === 'accuracy');
    if (next.length !== selectedMetrics.length) setSelectedMetrics(next);
  }, [catalogsReady, availableMetrics, selectedMetrics, setSelectedMetrics]);

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  /**
   * Convert arrays of data into CSV format for upload.
   * Handles proper escaping of values containing commas or quotes.
   */
  function arraysToCsv(headers: string[], rows: (number[])[]): string {
    const esc = (v: number | string) => {
      const s = String(v);
      return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const headerLine = headers.map(h => esc(h)).join(',');
    const body = rows.map(r => r.map(v => esc(v)).join(',')).join('\n');
    return headerLine + '\n' + body + '\n';
  }

  /**
   * Start a new training job with the current configuration.
   * 
   * Steps:
   * 1. Validate graph and dataset are ready
   * 2. Combine train/val/test splits into a single CSV
   * 3. Submit training job to backend
   * 4. Start polling for job status updates
   */
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

    // Combine all data splits (train/val/test) into a single CSV for upload
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
      // Normalize generic 'accuracy' metric to match the selected loss function's label format
      // This ensures we use the correct accuracy type (binary, categorical, or sparse_categorical)
      const metricsToSend = selectedMetrics.map((m) => {
        const ml = m.toLowerCase();
        const ll = (loss || '').toLowerCase();
        const key = ll.replace(/_/g, '');
        if (ml === 'accuracy' || ml === 'acc') {
          if (key.includes('sparsecategoricalcrossentropy')) return 'sparse_categorical_accuracy';
          if (key.includes('categoricalcrossentropy')) return 'categorical_accuracy';
          if (key.includes('binarycrossentropy')) return 'binary_accuracy';
          // For regression, 'accuracy' is meaningless, so filter it out
          return '';
        }
        return m;
      }).filter(Boolean) as string[]; // Remove empty strings from the list

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
        y_one_hot: dataset.preprocessingConfig.targetEncoding === 'one-hot',
        learning_rate: typeof learningRate === 'number' ? learningRate : undefined,
        shuffle,
        validation_batch_size: typeof valBatchSize === 'number' ? valBatchSize : undefined,
        early_stopping: useEarlyStopping,
        es_monitor: esMonitor,
        es_mode: esMode,
        es_patience: esPatience,
        es_min_delta: esMinDelta,
        es_restore_best_weights: esRestoreBest,
        reduce_lr: useReduceLR,
        rlrop_monitor: rlrMonitor,
        rlrop_factor: rlrFactor,
        rlrop_patience: rlrPatience,
        rlrop_min_lr: rlrMinLR,
        save_best_model: saveBestModel,
        save_training_logs: saveTrainingLogs,
      });
      setJobId(job.id);
      setJobStatus(job.status || 'queued');
      setJobProgress(job.progress ?? 0);

      // Start polling for job status updates
      // Store interval ID in ref to prevent duplicate pollers if component remounts
      if (pollerRef.current) window.clearInterval(pollerRef.current);
      const interval = window.setInterval(async () => {
        try {
          const j = await networkGraphService.getTrainingJob(job.id);
          setJobStatus(j.status);
          if (typeof j.progress === 'number') setJobProgress(j.progress);

          // Update result snapshot for live metrics display
          if (j.result) setJobResult(j.result as TrainingResult);

          // Accumulate loss values for live chart updates during training
          if (j.status === 'running' && j.result?.live) {
            const epoch = Number(j.result.live.epoch || 0);
            if (epoch > lastEpochRef.current) {
              lastEpochRef.current = epoch;
              const l = typeof j.result.live.loss === 'number' ? j.result.live.loss : null;
              const vl = typeof j.result.live.val_loss === 'number' ? j.result.live.val_loss : null;
              if (l != null) setLiveLoss(prev => [...prev, l]);
              if (vl != null) setLiveValLoss(prev => [...prev, vl]);
            }
          }

          // Stop polling when job reaches a terminal state
          if (j.status === 'succeeded' || j.status === 'failed' || j.status === 'cancelled') {
            clearInterval(interval);
            if (j.status === 'succeeded') {
              setJobResult(j.result);
            } else if (j.status === 'failed') {
              setJobError(j.error || 'Training failed');
            } else {
              // Cancelled or other final states - clear error
              setJobError(null);
            }
            pollerRef.current = null;
          }
        } catch {
          clearInterval(interval);
          setJobError('Failed to poll job status');
          pollerRef.current = null;
        }
      }, 200);
      pollerRef.current = interval;
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      setJobError(msg || 'Failed to start training job');
    } finally {
      setIsStarting(false);
    }
  }

  /**
   * Resume polling for job status when component mounts or jobId changes.
   * This ensures we continue tracking progress even if the user switches tabs.
   */
  useEffect(() => {
    const isFinal = jobStatus === 'succeeded' || jobStatus === 'failed' || jobStatus === 'cancelled';
    const shouldPoll = (jobId && !isFinal) || (jobId && isExporting);

    if (!shouldPoll) return; // No job or job already finished and not exporting
    if (pollerRef.current) return; // Already polling, don't create duplicate

    const interval = window.setInterval(async () => {
      try {
        if (!jobId) return;
        const j = await networkGraphService.getTrainingJob(jobId);
        setJobStatus(j.status);
        if (typeof j.progress === 'number') setJobProgress(j.progress);
        if (j.result) setJobResult(j.result as TrainingResult);

        // Check if export finished
        if (isExporting && j.result?.exports?.includes('tflite')) {
          setIsExporting(false);
        }

        if (j.status === 'running' && j.result?.live) {
          const epoch = Number(j.result.live.epoch || 0);
          if (epoch > lastEpochRef.current) {
            lastEpochRef.current = epoch;
            const l = typeof j.result.live.loss === 'number' ? j.result.live.loss : null;
            const vl = typeof j.result.live.val_loss === 'number' ? j.result.live.val_loss : null;
            if (l != null) setLiveLoss(prev => [...prev, l]);
            if (vl != null) setLiveValLoss(prev => [...prev, vl]);
          }
        }
        const final = j.status === 'succeeded' || j.status === 'failed' || j.status === 'cancelled';
        // Only stop polling if final AND not exporting
        if (final && !isExporting) {
          clearInterval(interval);
          if (j.status === 'succeeded') {
            setJobResult(j.result);
          } else if (j.status === 'failed') {
            setJobError(j.error || 'Training failed');
          } else {
            setJobError(null); // cancelled or other final states
          }
          pollerRef.current = null;
        }
      } catch {
        clearInterval(interval);
        setJobError('Failed to poll job status');
        pollerRef.current = null;
      }
    }, 500);
    pollerRef.current = interval;
    return () => {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    };
  }, [jobId, jobStatus, isExporting, setJobError, setJobProgress, setJobResult, setJobStatus]);

  /**
   * Cancel the currently running training job.
   * Does not optimistically update status - waits for backend to confirm cancellation.
   */
  async function handleCancelTraining() {
    if (!jobId) return;
    try {
      setIsStopping(true);
      await networkGraphService.cancelTraining(jobId);
      // Keep polling until backend confirms cancellation and provides any partial results
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      setJobError(msg || 'Failed to cancel training job');
    } finally {
      setIsStopping(false);
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  // Check if training can start (graph compiled and dataset ready)
  const canStartTraining = graphId && dataset?.isProcessed && dataset.trainData;

  return (
    <div className="h-full flex flex-col p-4 bg-slate-50">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Training Configuration</h2>
        {jobId && (jobStatus === 'running' || jobStatus === 'queued') ? (
          <Button onClick={handleCancelTraining} disabled={isStopping} variant="destructive">
            <Square size={16} className="mr-2" />
            {isStopping ? 'Stopping…' : 'Stop Training'}
          </Button>
        ) : (
          <Button onClick={handleStartTraining} disabled={isStarting || !canStartTraining}>
            <Play size={16} className="mr-2" />
            {isStarting ? 'Starting…' : 'Start Training'}
          </Button>
        )}
      </div>

      {/* Hint when training is blocked */}
      {!canStartTraining && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <div className="font-medium mb-1">Cannot start training:</div>
          <ul className="list-disc list-inside space-y-1 text-xs">
            {!graphId && <li>Model graph is not compiled. Go to the Canvas tab and compile your model.</li>}
            {graphId && (!dataset?.isProcessed || !dataset.trainData) && (
              <li>Dataset is not prepared. Go to the Dataset tab and load/preprocess your data.</li>
            )}
          </ul>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left column: all inputs */}
          <div className="h-full overflow-auto">
            <div className="bg-white border rounded-lg p-6 space-y-6 h-full flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto">
                {/* Compilation Settings */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Settings size={18} className="text-slate-600" />
                    <h3 className="font-semibold text-slate-700">Compilation Settings</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Optimizer<span className="text-red-600 ml-1">*</span>
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
                      <p className="mt-1 text-xs text-slate-500">
                        Controls how weights update during training. Adam is a solid default; SGD can work well with momentum for large datasets.</p>
                    </div>


                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Gradient Clipping (clipnorm)
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={clipnorm === undefined ? '' : clipnorm}
                        onChange={(e) => {
                          const v = e.target.value;
                          setClipnorm(v === '' ? '' : Number(v));
                        }}
                        placeholder="e.g. 1.0"
                        className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Clips gradients by norm to prevent exploding gradients. Leave empty to disable.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Loss Function<span className="text-red-600 ml-1">*</span>
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
                      <p className="mt-1 text-xs text-slate-500">Must match your problem and label format: regression (MSE/MAE), binary (BinaryCrossentropy), multiclass (Categorical or SparseCategorical Crossentropy), etc.</p>
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
                      {/* Recommendation based on target encoding */}
                      {recommendedLoss && recommendedLoss !== loss && (
                        <div className="mt-1 text-xs text-slate-600">
                          Recommended for your target ({dataset?.preprocessingConfig.targetEncoding}): <span className="font-medium">{recommendedLoss}</span>
                          {losses.includes(recommendedLoss) && (
                            <button
                              type="button"
                              className="ml-2 underline text-blue-600 hover:text-blue-700 hover:cursor-pointer"
                              onClick={() => setLoss(recommendedLoss)}
                            >
                              Apply
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Training Parameters */}
                <div className="mt-6">
                  <h3 className="font-semibold text-slate-700 mb-4">Training Parameters</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Epochs<span className="text-red-600 ml-1">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={epochs}
                        onChange={(e) => setEpochs(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-slate-500">One epoch = one full pass over the training data. More epochs can improve fit but risk overfitting. Use EarlyStopping to stop automatically.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Batch Size<span className="text-red-600 ml-1">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="512"
                        value={batchSize}
                        onChange={(e) => setBatchSize(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-slate-500">Samples per gradient step. Larger batches are faster but may generalize worse; smaller batches add noise that can help generalization.</p>
                    </div>
                    {/* No manual Validation Split; it's derived from Dataset tab */}
                    <div className="col-span-2 text-xs text-slate-500">
                      Using dataset splits: val={computedSplits.validation}, test={computedSplits.test}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Learning rate (optional)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={learningRate === '' ? '' : learningRate}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLearningRate(v === '' ? '' : Number(v));
                        }}
                        placeholder="e.g. 0.001"
                        className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-slate-500">Step size for weight updates. Too high can diverge; too low can be slow. Typical values: 1e-3 to 1e-4 for Adam.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Validation batch size (optional)</label>
                      <input
                        type="number"
                        min="1"
                        value={valBatchSize === '' ? '' : valBatchSize}
                        onChange={(e) => {
                          const v = e.target.value;
                          setValBatchSize(v === '' ? '' : Math.max(1, Number(v)));
                        }}
                        placeholder="leave empty to match batch size"
                        className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-slate-500">If empty, uses the training batch size. Only affects validation throughput, not training dynamics.</p>
                    </div>
                    <div className="col-span-2 flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />
                        Shuffle training data each epoch
                      </label>
                      <span className="text-xs text-slate-500">Recommended. Prevents learning spurious order; disable only for sequence-sensitive data already batched in order.</span>
                    </div>

                    <div className="col-span-2 border-t pt-4 mt-2">
                      <h4 className="text-sm font-medium text-slate-700 mb-3">Checkpoints & Logs</h4>
                      <div className="flex flex-col gap-3">
                        <label className={`flex items-center gap-2 text-sm ${useEarlyStopping && esRestoreBest ? 'opacity-50' : ''}`}>
                          <input
                            type="checkbox"
                            checked={saveBestModel}
                            onChange={(e) => setSaveBestModel(e.target.checked)}
                            disabled={useEarlyStopping && esRestoreBest}
                          />
                          Save Best Model
                        </label>
                        {useEarlyStopping && esRestoreBest && (
                          <p className="text-xs text-amber-600 ml-6 -mt-2">
                            Disabled because "Restore best weights" is active. The final model will already be the best model.
                          </p>
                        )}
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={saveTrainingLogs} onChange={(e) => setSaveTrainingLogs(e.target.checked)} />
                          Save Training Logs (CSV)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Callbacks */}
                <div className="mt-6">
                  <h3 className="font-semibold text-slate-700 mb-3">Callbacks</h3>
                  <div className="space-y-4">
                    <div className="border rounded p-3">
                      <label className="flex items-center gap-2 text-sm mb-2">
                        <input type="checkbox" checked={useEarlyStopping} onChange={(e) => setUseEarlyStopping(e.target.checked)} />
                        EarlyStopping
                      </label>
                      <p className="-mt-1 mb-2 text-xs text-slate-500">Stop training when a monitored metric stops improving. Helps avoid overfitting and saves time.</p>
                      {useEarlyStopping && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">Monitor</label>
                            <select value={esMonitor} onChange={(e) => setEsMonitor(e.target.value)} className="w-full px-2 py-2 border rounded text-sm">
                              <option value="val_loss">val_loss</option>
                              <option value="loss">loss</option>
                              <option value="accuracy">accuracy</option>
                              <option value="sparse_categorical_accuracy">sparse_categorical_accuracy</option>
                              <option value="categorical_accuracy">categorical_accuracy</option>
                              <option value="binary_accuracy">binary_accuracy</option>
                            </select>
                            <p className="mt-1 text-xs text-slate-500">Which metric to watch. For classification, prefer a relevant accuracy; for regression, use val_loss/loss.</p>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">Mode</label>
                            <select value={esMode} onChange={(e) => setEsMode(e.target.value as 'auto' | 'min' | 'max')} className="w-full px-2 py-2 border rounded text-sm">
                              <option value="auto">auto</option>
                              <option value="min">min</option>
                              <option value="max">max</option>
                            </select>
                            <p className="mt-1 text-xs text-slate-500">Choose "min" for losses (lower is better) and "max" for accuracies (higher is better). "auto" infers it.</p>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">Patience</label>
                            <input type="number" min="0" value={esPatience} onChange={(e) => setEsPatience(Math.max(0, Number(e.target.value) || 0))} className="w-full px-2 py-2 border rounded text-sm" />
                            <p className="mt-1 text-xs text-slate-500">How many epochs with no improvement before stopping.</p>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">Min delta</label>
                            <input type="number" step="any" value={esMinDelta} onChange={(e) => setEsMinDelta(Number(e.target.value) || 0)} className="w-full px-2 py-2 border rounded text-sm" />
                            <p className="mt-1 text-xs text-slate-500">Minimum change to qualify as an improvement (helps ignore tiny fluctuations).</p>
                          </div>
                          <div className="col-span-2 flex items-center gap-2">
                            <input type="checkbox" checked={esRestoreBest} onChange={(e) => setEsRestoreBest(e.target.checked)} />
                            <span className="text-sm">Restore best weights</span>
                            <span className="text-xs text-slate-500">After stopping, roll back to the best-performing epoch.</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border rounded p-3">
                      <label className="flex items-center gap-2 text-sm mb-2">
                        <input type="checkbox" checked={useReduceLR} onChange={(e) => setUseReduceLR(e.target.checked)} />
                        ReduceLROnPlateau
                      </label>
                      <p className="-mt-1 mb-2 text-xs text-slate-500">Reduce the learning rate when a metric has stopped improving to fine-tune training.</p>
                      {useReduceLR && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">Monitor</label>
                            <select value={rlrMonitor} onChange={(e) => setRlrMonitor(e.target.value)} className="w-full px-2 py-2 border rounded text-sm">
                              <option value="val_loss">val_loss</option>
                              <option value="loss">loss</option>
                              <option value="accuracy">accuracy</option>
                              <option value="sparse_categorical_accuracy">sparse_categorical_accuracy</option>
                              <option value="categorical_accuracy">categorical_accuracy</option>
                              <option value="binary_accuracy">binary_accuracy</option>
                            </select>
                            <p className="mt-1 text-xs text-slate-500">Metric used to decide when to reduce the learning rate.</p>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">Factor</label>
                            <input type="number" step="any" min="0" max="1" value={rlrFactor} onChange={(e) => setRlrFactor(Number(e.target.value) || 0.1)} className="w-full px-2 py-2 border rounded text-sm" />
                            <p className="mt-1 text-xs text-slate-500">Multiplicative drop. Example: 0.1 will change 1e-3 to 1e-4.</p>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">Patience</label>
                            <input type="number" min="0" value={rlrPatience} onChange={(e) => setRlrPatience(Math.max(0, Number(e.target.value) || 0))} className="w-full px-2 py-2 border rounded text-sm" />
                            <p className="mt-1 text-xs text-slate-500">How many epochs with no improvement before reducing the learning rate.</p>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">Min LR</label>
                            <input type="number" step="any" min="0" value={rlrMinLR} onChange={(e) => setRlrMinLR(Math.max(0, Number(e.target.value) || 0))} className="w-full px-2 py-2 border rounded text-sm" />
                            <p className="mt-1 text-xs text-slate-500">Lower bound to stop decreasing LR. Typical: 1e-6 to 1e-7.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metrics Selection */}
                <div className="mt-6">
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

              </div>
            </div>
          </div>

          {/* Right column: training job status */}
          <div className="h-full overflow-auto">
            <div className="bg-white border rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-slate-700">Training Job</h3>
              {!jobId ? (
                <div className="text-sm text-slate-600">
                  No job yet. Configure parameters on the left and click "Start Training" to begin.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-slate-700">ID: <span className="font-mono">{jobId}</span></div>
                  <div className="text-sm">Status: {jobStatus || '—'}{typeof jobProgress === 'number' ? ` · ${(jobProgress * 100).toFixed(0)}%` : ''}</div>
                  {jobError && <div className="text-sm text-red-600">{jobError}</div>}
                  {jobStatus === 'running' && jobResult?.live && (
                    <div className="text-sm text-slate-700 mt-2">
                      <div className="font-medium">Live</div>
                      <div className="text-xs text-slate-600">
                        {(() => {
                          const live = jobResult.live || {};
                          const parts: string[] = [];
                          if (typeof live.epoch === 'number') parts.push(`epoch ${live.epoch}`);
                          if (typeof live.loss === 'number') parts.push(`loss ${live.loss.toFixed(4)}`);
                          if (typeof live.val_loss === 'number') parts.push(`val_loss ${live.val_loss.toFixed(4)}`);
                          if (typeof live.accuracy === 'number') parts.push(`accuracy ${live.accuracy.toFixed(4)}`);
                          if (typeof live.sparse_categorical_accuracy === 'number') parts.push(`sparse_categorical_accuracy ${live.sparse_categorical_accuracy.toFixed(4)}`);
                          if (typeof live.categorical_accuracy === 'number') parts.push(`categorical_accuracy ${live.categorical_accuracy.toFixed(4)}`);
                          if (typeof live.binary_accuracy === 'number') parts.push(`binary_accuracy ${live.binary_accuracy.toFixed(4)}`);
                          return parts.join(' · ');
                        })()}
                      </div>
                    </div>
                  )}
                  {/* Download artifact button when job succeeded */}
                  {jobStatus === 'succeeded' && (
                    <div className="mt-3 flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={async () => {
                            try {
                              if (!jobId) return;
                              await networkGraphService.downloadArtifactToBrowser(jobId, 'final');
                            } catch (e) {
                              console.error('Failed to download artifact', e);
                              setJobError(e instanceof Error ? e.message : String(e));
                            }
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Download Final Model
                        </Button>

                        {/* Show Best Model button ONLY if artifact exists in result */}
                        {jobResult?.best_model_artifact && (
                          <Button
                            onClick={async () => {
                              try {
                                if (!jobId) return;
                                await networkGraphService.downloadArtifactToBrowser(jobId, 'best');
                              } catch (e) {
                                console.error('Failed to download artifact', e);
                                setJobError(e instanceof Error ? e.message : String(e));
                              }
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Download Best Model
                          </Button>
                        )}

                        {jobResult?.training_log_artifact && (
                          <Button
                            onClick={async () => {
                              try {
                                if (!jobId) return;
                                await networkGraphService.downloadArtifactToBrowser(jobId, 'log');
                              } catch (e) {
                                console.error('Failed to download artifact', e);
                                setJobError(e instanceof Error ? e.message : String(e));
                              }
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Download Logs (CSV)
                          </Button>
                        )}
                      </div>

                      {/* Export Section */}
                      <div className="border-t pt-2 mt-1">
                        <div className="text-xs font-medium text-slate-500 mb-2">Export Formats</div>
                        <div className="flex flex-wrap gap-2">
                          {/* ONNX export removed; only TFLite supported */}

                          {/* TFLite */}
                          {jobResult?.exports?.includes('tflite') ? (
                            <Button
                              onClick={() => jobId && networkGraphService.downloadArtifactToBrowser(jobId, 'tflite')}
                              variant="secondary"
                              size="sm"
                              className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            >
                              Download TFLite
                            </Button>
                          ) : (
                            <Button
                              onClick={async () => {
                                if (!jobId) return;
                                try {
                                  setExportingFormat('tflite');
                                  setIsExporting(true);
                                  await networkGraphService.exportModel(jobId, 'tflite');
                                } catch (e) {
                                  console.error(e);
                                  setJobError('Export failed');
                                  setIsExporting(false);
                                } finally {
                                  setExportingFormat(null);
                                }
                              }}
                              disabled={exportingFormat === 'tflite'}
                              variant="outline"
                              size="sm"
                            >
                              {exportingFormat === 'tflite' ? 'Exporting...' : 'Export to TFLite'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Loss chart above final metrics */}
                  {(() => {
                    type HistoryMap = Record<string, number[]>;
                    const hist = (jobResult?.history || null) as HistoryMap | null;
                    const histLoss = hist?.loss;
                    const histValLoss = hist?.val_loss;
                    const hasHistory = Array.isArray(histLoss) && histLoss.length > 0;
                    const hasLive = liveLoss.length > 0 || liveValLoss.length > 0;
                    if (!hasHistory && !hasLive) return null;
                    const series = hasHistory
                      ? [
                        { label: 'loss', color: chartLossColor, data: histLoss || [] },
                        ...(Array.isArray(histValLoss) && histValLoss.length ? [{ label: 'val_loss', color: chartValLossColor, data: histValLoss }] : []),
                      ]
                      : [
                        { label: 'loss', color: chartLossColor, data: liveLoss },
                        ...(liveValLoss.length ? [{ label: 'val_loss', color: chartValLossColor, data: liveValLoss }] : []),
                      ];
                    return (
                      <div className="mt-3">
                        <div className="text-xs font-medium text-slate-500 mb-1">Loss over epochs</div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 mb-2">
                          {series.map((s) => (
                            <div key={s.label} className="flex items-center gap-1">
                              <span
                                className="inline-block h-2.5 w-6 rounded-sm"
                                style={{ backgroundColor: s.color }}
                              />
                              <span className="capitalize">
                                {s.label === 'val_loss' ? 'Validation loss' : 'Training loss'}
                              </span>
                            </div>
                          ))}
                        </div>
                        <MiniLineChart
                          series={series}
                          height={180}
                          xMin={1}
                          xMax={hasHistory ? (histLoss?.length || undefined) : (lastEpochRef.current || undefined)}
                        />
                      </div>
                    );
                  })()}
                  {!!jobResult && (
                    <div className="text-sm text-slate-700 mt-2">
                      <div>Final metrics:</div>
                      <pre className="bg-slate-50 p-2 rounded border overflow-auto max-h-80 text-xs">{JSON.stringify(jobResult, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
