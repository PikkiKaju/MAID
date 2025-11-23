import { BarChart, TrendingUp, Award, Settings, CheckCircle, XCircle, Clock, Target } from 'lucide-react';
import { useTrainingConfig } from '../../../contexts/useTrainingConfig';
import MiniLineChart from '../MiniLineChart';

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
  extended_evaluation?: {
    confusion_matrix?: number[][];
    roc_curve?: {
      fpr: number[];
      tpr: number[];
      auc: number;
    };
  };
};

function RocChart({ fpr, tpr, auc }: { fpr: number[], tpr: number[], auc: number }) {
  const width = 300;
  const height = 300;
  const padding = 40;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const points = fpr.map((x, i) => {
    const px = padding + x * innerW;
    const py = height - padding - tpr[i] * innerH;
    return `${px},${py}`;
  }).join(' ');

  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={height} className="border bg-white">
        {/* Grid */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#ddd" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#ddd" />
        {/* Diagonal */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={padding} stroke="#eee" strokeDasharray="4" />
        {/* Curve */}
        <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="2" />
        {/* Labels */}
        <text x={width / 2} y={height - 10} textAnchor="middle" fontSize="12">False Positive Rate</text>
        <text x={10} y={height / 2} textAnchor="middle" transform={`rotate(-90, 10, ${height / 2})`} fontSize="12">True Positive Rate</text>
      </svg>
      <div className="mt-2 text-sm font-medium">AUC = {auc.toFixed(4)}</div>
    </div>
  );
}

export default function MetricsTab() {
  const {
    jobId,
    jobStatus,
    jobResult,
    jobProgress,
    optimizer,
    loss,
    selectedMetrics,
    epochs,
    batchSize,
    learningRate,
    shuffle,
    valBatchSize,
    useEarlyStopping,
    esMonitor,
    esMode,
    esPatience,
    esMinDelta,
    esRestoreBest,
    useReduceLR,
    rlrMonitor,
    rlrFactor,
    rlrPatience,
    rlrMinLR,
  } = useTrainingConfig() as unknown as {
    jobId: string | null;
    jobStatus: string | null;
    jobResult: TrainingResult | null;
    jobProgress: number | null;
    optimizer: string;
    loss: string;
    selectedMetrics: string[];
    epochs: number;
    batchSize: number;
    learningRate: number | '';
    shuffle: boolean;
    valBatchSize: number | '';
    useEarlyStopping: boolean;
    esMonitor: string;
    esMode: string;
    esPatience: number;
    esMinDelta: number;
    esRestoreBest: boolean;
    useReduceLR: boolean;
    rlrMonitor: string;
    rlrFactor: number;
    rlrPatience: number;
    rlrMinLR: number;
  };

  // Check if we have completed training results
  const hasResults = jobId && (jobStatus === 'succeeded' || jobStatus === 'cancelled') && jobResult;

  type HistoryMap = Record<string, number[]>;
  const history = (jobResult?.history || {}) as HistoryMap;
  const evaluation = jobResult?.evaluation || null;

  // Extract final metrics from history
  const finalLoss = history.loss?.[history.loss.length - 1];
  const finalValLoss = history.val_loss?.[history.val_loss.length - 1];
  const trainingEpochs = history.loss?.length || 0;

  // Find accuracy metric in history
  const accuracyKey = Object.keys(history).find(k =>
    k.includes('accuracy') && !k.includes('val_')
  );
  const valAccuracyKey = Object.keys(history).find(k =>
    k.includes('accuracy') && k.includes('val_')
  );
  const finalAccuracy = accuracyKey ? history[accuracyKey]?.[history[accuracyKey].length - 1] : undefined;
  const finalValAccuracy = valAccuracyKey ? history[valAccuracyKey]?.[history[valAccuracyKey].length - 1] : undefined;

  if (!hasResults) {
    return (
      <div className="h-full flex flex-col p-4 bg-slate-50">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Training Metrics</h2>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="bg-white border rounded-lg p-8 text-center">
            <BarChart size={64} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No Training Results Available</h3>
            <p className="text-sm text-slate-500">
              {jobStatus === 'running' || jobStatus === 'queued'
                ? 'Training in progress. Metrics will appear here once complete.'
                : 'Train your model in the Train tab to see detailed metrics and performance charts here.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 bg-slate-50">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Training Metrics Summary</h2>
        {jobStatus === 'succeeded' && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle size={16} />
            <span>Training Completed</span>
          </div>
        )}
        {jobStatus === 'cancelled' && (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <XCircle size={16} />
            <span>Training Cancelled</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto space-y-4">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Final Loss</span>
              <TrendingUp size={16} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {typeof finalLoss === 'number' ? finalLoss.toFixed(4) : '—'}
            </p>
            {typeof finalValLoss === 'number' && (
              <p className="text-xs text-slate-500 mt-1">val: {finalValLoss.toFixed(4)}</p>
            )}
          </div>

          {typeof finalAccuracy === 'number' && (
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">Final Accuracy</span>
                <Award size={16} className="text-green-500" />
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {(finalAccuracy * 100).toFixed(2)}%
              </p>
              {typeof finalValAccuracy === 'number' && (
                <p className="text-xs text-slate-500 mt-1">val: {(finalValAccuracy * 100).toFixed(2)}%</p>
              )}
            </div>
          )}

          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Epochs Trained</span>
              <Target size={16} className="text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{trainingEpochs}</p>
            {trainingEpochs < epochs && jobStatus === 'cancelled' && (
              <p className="text-xs text-amber-600 mt-1">stopped early</p>
            )}
            {trainingEpochs < epochs && jobStatus === 'succeeded' && (
              <p className="text-xs text-green-600 mt-1">early stopping</p>
            )}
          </div>

          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Progress</span>
              <Clock size={16} className="text-slate-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {typeof jobProgress === 'number' ? `${(jobProgress * 100).toFixed(0)}%` : '—'}
            </p>
          </div>
        </div>

        {/* Training History Charts */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Training History</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Loss Chart */}
            {history.loss && history.loss.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 mb-2">Loss over epochs</div>
                <MiniLineChart
                  series={[
                    { label: 'loss', color: '#2563eb', data: history.loss },
                    ...(history.val_loss ? [{ label: 'val_loss', color: '#7c3aed', data: history.val_loss }] : []),
                  ]}
                  height={200}
                  xMin={1}
                  xMax={history.loss.length}
                />
              </div>
            )}

            {/* Accuracy Chart (if available) */}
            {accuracyKey && history[accuracyKey] && history[accuracyKey].length > 0 && (
              <div>
                <div className="text-xs text-slate-500 mb-2">Accuracy over epochs</div>
                <MiniLineChart
                  series={[
                    { label: accuracyKey.replace(/_/g, ' '), color: '#10b981', data: history[accuracyKey] },
                    ...(valAccuracyKey && history[valAccuracyKey]
                      ? [{ label: valAccuracyKey.replace(/_/g, ' '), color: '#f59e0b', data: history[valAccuracyKey] }]
                      : []),
                  ]}
                  height={200}
                  xMin={1}
                  xMax={history[accuracyKey].length}
                />
              </div>
            )}
          </div>
        </div>

        {/* Evaluation Results */}
        {evaluation && Object.keys(evaluation).length > 0 && (
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Test Set Evaluation</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(evaluation).map(([key, value]) => (
                <div key={key} className="bg-slate-50 border rounded p-3">
                  <div className="text-xs text-slate-600 mb-1">{key.replace(/_/g, ' ')}</div>
                  <div className="text-lg font-semibold text-slate-800">
                    {typeof value === 'number' ? value.toFixed(4) : String(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extended Evaluation (Confusion Matrix & ROC) */}
        {jobResult?.extended_evaluation && (
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Extended Evaluation</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Confusion Matrix */}
              {jobResult.extended_evaluation.confusion_matrix && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-600 mb-3">Confusion Matrix</h4>
                  <div className="overflow-auto">
                    <table className="min-w-full border-collapse text-center text-sm">
                      <tbody>
                        {jobResult.extended_evaluation.confusion_matrix.map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, j) => (
                              <td key={j} className="border p-2 bg-slate-50">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ROC Curve */}
              {jobResult.extended_evaluation.roc_curve && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-600 mb-3">ROC Curve</h4>
                  <RocChart
                    fpr={jobResult.extended_evaluation.roc_curve.fpr}
                    tpr={jobResult.extended_evaluation.roc_curve.tpr}
                    auc={jobResult.extended_evaluation.roc_curve.auc}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Training Configuration */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings size={18} className="text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-700">Training Configuration</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compilation Settings */}
            <div>
              <h4 className="text-xs font-semibold text-slate-600 mb-3">Compilation</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Optimizer:</span>
                  <span className="font-mono text-slate-800">{optimizer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Loss:</span>
                  <span className="font-mono text-slate-800">{loss}</span>
                </div>
                {selectedMetrics.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Metrics:</span>
                    <span className="font-mono text-slate-800 text-right">{selectedMetrics.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Training Parameters */}
            <div>
              <h4 className="text-xs font-semibold text-slate-600 mb-3">Parameters</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Epochs:</span>
                  <span className="font-mono text-slate-800">{epochs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Batch Size:</span>
                  <span className="font-mono text-slate-800">{batchSize}</span>
                </div>
                {typeof learningRate === 'number' && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Learning Rate:</span>
                    <span className="font-mono text-slate-800">{learningRate}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">Shuffle:</span>
                  <span className="font-mono text-slate-800">{shuffle ? 'Yes' : 'No'}</span>
                </div>
                {typeof valBatchSize === 'number' && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Val Batch Size:</span>
                    <span className="font-mono text-slate-800">{valBatchSize}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Callbacks */}
            {(useEarlyStopping || useReduceLR) && (
              <div className="lg:col-span-2">
                <h4 className="text-xs font-semibold text-slate-600 mb-3">Callbacks</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {useEarlyStopping && (
                    <div className="bg-slate-50 border rounded p-3">
                      <div className="text-xs font-semibold text-slate-700 mb-2">EarlyStopping</div>
                      <div className="space-y-1 text-xs text-slate-600">
                        <div>Monitor: <span className="font-mono">{esMonitor}</span></div>
                        <div>Mode: <span className="font-mono">{esMode}</span></div>
                        <div>Patience: <span className="font-mono">{esPatience}</span></div>
                        <div>Min Delta: <span className="font-mono">{esMinDelta}</span></div>
                        <div>Restore Best: <span className="font-mono">{esRestoreBest ? 'Yes' : 'No'}</span></div>
                      </div>
                    </div>
                  )}
                  {useReduceLR && (
                    <div className="bg-slate-50 border rounded p-3">
                      <div className="text-xs font-semibold text-slate-700 mb-2">ReduceLROnPlateau</div>
                      <div className="space-y-1 text-xs text-slate-600">
                        <div>Monitor: <span className="font-mono">{rlrMonitor}</span></div>
                        <div>Factor: <span className="font-mono">{rlrFactor}</span></div>
                        <div>Patience: <span className="font-mono">{rlrPatience}</span></div>
                        <div>Min LR: <span className="font-mono">{rlrMinLR}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* All Metrics from History */}
        {Object.keys(history).length > 2 && (
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">All Training Metrics</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(history).map(([key, values]) => {
                const finalValue = values[values.length - 1];
                return (
                  <div key={key} className="bg-slate-50 border rounded p-3">
                    <div className="text-xs text-slate-600 mb-1">{key.replace(/_/g, ' ')}</div>
                    <div className="text-lg font-semibold text-slate-800">
                      {typeof finalValue === 'number' ? finalValue.toFixed(4) : String(finalValue)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {values.length} epoch{values.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
