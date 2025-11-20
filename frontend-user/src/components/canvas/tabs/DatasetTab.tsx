import { useState, useRef } from 'react';
import { Upload, Table, X, Database, Settings, Play, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { Button } from '../../../ui/button';
import { datasetService, DatasetMyMetadata } from '../../../api/datasetService';
import { useAppSelector } from '../../../store/hooks';
import { useDataset, CsvRow, ProcessedDataset } from '../../../contexts/DatasetContext';
import { analyzeColumn, validatePreprocessingConfig } from '../../../utils/dataPreprocessing';

export default function DatasetTab() {
  const { token, isLoggedIn } = useAppSelector((state) => state.auth);
  const { dataset, setDataset, updatePreprocessingConfig, processDataset, clearDataset: clearDatasetContext } = useDataset();
  const [processing, setProcessing] = useState(false);

  // Local UI state
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [availableDatasets, setAvailableDatasets] = useState<DatasetMyMetadata[]>([]);
  const [showDatasetList, setShowDatasetList] = useState(false);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [showTransformed, setShowTransformed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const parseCSV = (text: string): { headers: string[]; rows: CsvRow[] } => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) {
      return { headers: [], rows: [] };
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const rows: CsvRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: CsvRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return { headers, rows };
  };

  const handleFileUpload = async (file: File) => {
    const text = await file.text();
    const { headers, rows } = parseCSV(text);

    // Analyze all columns
    const columnInfos = headers.map(header => analyzeColumn(rows, header));

    // Create new dataset
    const newDataset: ProcessedDataset = {
      original: rows,
      columns: columnInfos,
      preprocessingConfig: {
        categoricalEncoding: 'label',
        missingValueStrategy: 'fill-mean',
        normalizationMethod: 'standard',
        trainSplit: 0.7,
        validationSplit: 0.15,
        testSplit: 0.15,
        randomSeed: 42,
        targetColumn: null,
        targetEncoding: 'label',
        taskType: 'auto',
      },
      datasetName: file.name.replace('.csv', ''),
      totalRows: rows.length,
      totalColumns: headers.length,
      isProcessed: false,
    };

    setDataset(newDataset);
  };

  const loadDatasetsFromDB = async () => {
    if (!isLoggedIn || !token) {
      alert('Please login to load datasets from the database');
      return;
    }

    try {
      setLoadingDatasets(true);
      const datasets = await datasetService.getDatasets(token);
      setAvailableDatasets(datasets);
      setShowDatasetList(true);
    } catch (err) {
      console.error('Failed to load datasets', err);
      alert('Failed to load datasets from database');
    } finally {
      setLoadingDatasets(false);
    }
  };

  const loadDatasetById = async (id: string, name: string) => {
    if (!token) return;

    try {
      const csvText = await datasetService.getDatasetDetails(id, token);
      const { headers, rows } = parseCSV(csvText);

      const columnInfos = headers.map(header => analyzeColumn(rows, header));

      const newDataset: ProcessedDataset = {
        original: rows,
        columns: columnInfos,
        preprocessingConfig: {
          categoricalEncoding: 'label',
          missingValueStrategy: 'fill-mean',
          normalizationMethod: 'standard',
          trainSplit: 0.7,
          validationSplit: 0.15,
          testSplit: 0.15,
          randomSeed: 42,
          targetColumn: null,
          targetEncoding: 'label',
          taskType: 'auto',
        },
        datasetName: name,
        datasetId: id,
        totalRows: rows.length,
        totalColumns: headers.length,
        isProcessed: false,
      };

      setDataset(newDataset);
      setShowDatasetList(false);
    } catch (err) {
      console.error('Failed to load dataset details', err);
      alert('Failed to load dataset details');
    }
  };

  const clearDataset = () => {
    clearDatasetContext();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatNumber = (val: number): string => {
    // If it's a whole number (like 0 or 1 for one-hot, or label encoding), show as integer
    if (Number.isInteger(val)) {
      return val.toString();
    }
    // If very close to an integer (within floating point precision), show as integer
    if (Math.abs(val - Math.round(val)) < 0.0001) {
      return Math.round(val).toString();
    }
    // For normalized values, show 3 decimals
    return val.toFixed(3);
  };

  const handleColumnRoleChange = (columnName: string, role: 'feature' | 'target' | 'ignore') => {
    if (!dataset) return;


    // Update column roles, ensuring only one target
    const updatedColumns = dataset.columns.map(col => {
      if (col.name === columnName) {
        return { ...col, role };
      }
      if (role === 'target' && col.role === 'target') {
        // Demote any other target to feature
        return { ...col, role: 'feature' as const };
      }
      return col;
    });

    // Compute next targetColumn in preprocessing config
    let nextTarget: string | null = dataset.preprocessingConfig.targetColumn;
    if (role === 'target') {
      nextTarget = columnName;
    } else {
      // If this column was previously the target, clear it
      if (dataset.preprocessingConfig.targetColumn === columnName) {
        nextTarget = null;
      }
    }

    // Commit both columns and preprocessingConfig together to avoid races
    setDataset({
      ...dataset,
      columns: updatedColumns,
      preprocessingConfig: {
        ...dataset.preprocessingConfig,
        targetColumn: nextTarget,
      },
      isProcessed: false,
    });
  };

  const validation = dataset ? validatePreprocessingConfig(dataset.preprocessingConfig, dataset.columns) : null;

  return (
    <div className="h-full flex flex-col p-4 bg-slate-50">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Dataset Manager</h2>
          {dataset && (
            <p className="text-xs text-slate-600">
              {dataset.datasetName} • {dataset.totalRows} rows × {dataset.totalColumns} columns
              {dataset.isProcessed && dataset.cleaned && dataset.cleaned.length !== dataset.totalRows && (
                <span className="text-orange-600 ml-1">
                  → {dataset.cleaned.length} after cleaning
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {dataset && (
            <>
              {dataset.isProcessed ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded text-sm">
                  <CheckCircle2 size={16} />
                  Ready for Training
                </div>
              ) : validation && !validation.valid ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded text-sm">
                  <AlertCircle size={16} />
                  Configuration Issues
                </div>
              ) : null}
              <Button variant="outline" size="sm" onClick={clearDataset}>
                <X size={14} className="mr-1" /> Clear Dataset
              </Button>
            </>
          )}
        </div>
      </div>

      {!dataset ? (
        /* Upload/Load Section */
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg bg-white">
            <div className="text-center p-8">
              <Upload size={48} className="mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">Upload Dataset</h3>
              <p className="text-sm text-slate-500 mb-4">
                Upload a CSV file to prepare for training
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <div className="flex gap-2 justify-center">
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload size={16} className="mr-2" />
                  Choose CSV File
                </Button>
                {isLoggedIn && (
                  <Button
                    variant="outline"
                    onClick={loadDatasetsFromDB}
                    disabled={loadingDatasets}
                  >
                    <Database size={16} className="mr-2" />
                    {loadingDatasets ? 'Loading...' : 'Load from Database'}
                  </Button>
                )}
              </div>
              {!isLoggedIn && (
                <p className="text-xs text-orange-600 mt-2">
                  Login required to access database datasets
                </p>
              )}
            </div>
          </div>

          {/* Dataset List Modal */}
          {showDatasetList && (
            <div className="bg-white border rounded-lg p-4 max-h-[400px] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-700">Available Datasets</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowDatasetList(false)}>
                  <X size={16} />
                </Button>
              </div>
              {availableDatasets.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No datasets found</p>
              ) : (
                <div className="space-y-2">
                  {availableDatasets.map((ds) => (
                    <div
                      key={ds.id}
                      className="border rounded p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                      onClick={() => loadDatasetById(ds.id, ds.name)}
                    >
                      <div>
                        <p className="font-medium text-sm">{ds.name}</p>
                        <p className="text-xs text-slate-500">
                          Created: {new Date(ds.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        Load
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Dataset Preprocessing View */
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Left Panel - Data Preview */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white border rounded-lg">
            <div className="p-3 border-b bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Table size={16} />
                  <div>
                    <h3 className="font-semibold text-slate-700">Data Preview</h3>
                    {dataset.isProcessed && dataset.cleaned && (
                      <p className="text-[10px] text-slate-500">
                        {showTransformed ? 'Showing encoded & normalized feature matrix' : `Showing cleaned data (${dataset.cleaned.length} rows)`}
                      </p>
                    )}
                  </div>
                </div>
                {dataset.isProcessed && dataset.trainData && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTransformed(!showTransformed)}
                    className="text-xs"
                  >
                    <Eye size={14} className="mr-1" />
                    {showTransformed ? 'View Cleaned' : 'View Transformed'}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {showTransformed && dataset.isProcessed && dataset.trainData ? (
                // Show transformed/encoded/normalized data
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 border-r border-b">#</th>
                      {dataset.trainData.featureNames.map((name, idx) => (
                        <th key={idx} className="px-3 py-2 text-left border-r border-b">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-slate-600">{name}</span>
                            <span className="text-[10px] text-slate-500">feature</span>
                          </div>
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left border-r border-b bg-green-50">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-green-700">{dataset.preprocessingConfig.targetColumn}</span>
                          <span className="text-[10px] text-green-600">target</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataset.trainData.X.slice(0, 50).map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-400 border-r font-medium">{rowIdx + 1}</td>
                        {row.map((val, cellIdx) => (
                          <td key={cellIdx} className="px-3 py-2 border-r font-mono text-[11px]">
                            {typeof val === 'number' ? formatNumber(val) : val}
                          </td>
                        ))}
                        <td className="px-3 py-2 border-r font-mono text-[11px] bg-green-50">
                          {typeof dataset.trainData?.y[rowIdx] === 'number'
                            ? formatNumber(dataset.trainData.y[rowIdx])
                            : dataset.trainData?.y[rowIdx]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                // Show cleaned source data
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 border-r border-b">#</th>
                      {dataset.columns.map((col, idx) => (
                        <th key={idx} className="px-3 py-2 text-left border-r border-b">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-slate-600">{col.name}</span>
                            <span className="text-[10px] text-slate-500">
                              {col.type}
                              {col.role === 'target' && ' • TARGET'}
                              {col.role === 'ignore' && ' • IGNORED'}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(dataset.isProcessed && dataset.cleaned ? dataset.cleaned : dataset.original).slice(0, 50).map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-400 border-r font-medium">{rowIdx + 1}</td>
                        {dataset.columns.map((col, cellIdx) => (
                          <td key={cellIdx} className="px-3 py-2 border-r">
                            {row[col.name] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right Panel - Preprocessing Configuration */}
          <div className="w-96 flex flex-col gap-3 overflow-y-auto">
            {/* Column Configuration */}
            <div className="bg-white border rounded-lg">
              <div
                className="p-3 border-b bg-slate-50 cursor-pointer flex items-center justify-between"
                onClick={() => setShowColumnConfig(!showColumnConfig)}
              >
                <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                  <Settings size={16} />
                  Column Configuration
                </h3>
                {showColumnConfig ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
              {showColumnConfig && (
                <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                  {dataset.columns.map((col) => (
                    <div key={col.name} className="flex items-center justify-between text-xs border-b pb-2">
                      <div className="flex-1">
                        <p className="font-medium">{col.name}</p>
                        <p className="text-slate-500 text-[10px]">
                          {col.type} • {col.uniqueCount} unique • {col.missingCount} missing
                        </p>
                      </div>
                      <select
                        value={col.role}
                        onChange={(e) => handleColumnRoleChange(col.name, e.target.value as 'feature' | 'target' | 'ignore')}
                        className="px-2 py-1 border rounded text-xs"
                      >
                        <option value="feature">Feature</option>
                        <option value="target">Target</option>
                        <option value="ignore">Ignore</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preprocessing Settings */}
            <div className="bg-white border rounded-lg p-3 space-y-3">
              <h3 className="font-semibold text-slate-700 text-sm">Preprocessing</h3>

              {/* Categorical Encoding */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Categorical Encoding
                </label>
                <select
                  value={dataset.preprocessingConfig.categoricalEncoding}
                  onChange={(e) => updatePreprocessingConfig({ categoricalEncoding: e.target.value as 'one-hot' | 'label' | 'remove' })}
                  className="w-full px-2 py-1 border rounded text-xs"
                >
                  <option value="label">Label Encoding</option>
                  <option value="one-hot">One-Hot Encoding</option>
                  <option value="remove">Remove Categorical</option>
                </select>
              </div>

              {/* Target Encoding (only for categorical targets) */}
              {(() => {
                const targetName = dataset.preprocessingConfig.targetColumn;
                const targetMeta = targetName ? dataset.columns.find(c => c.name === targetName) : undefined;
                if (!targetMeta || targetMeta.type === 'numeric') return null;
                return (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Target Encoding
                    </label>
                    <select
                      value={dataset.preprocessingConfig.targetEncoding}
                      onChange={(e) => updatePreprocessingConfig({ targetEncoding: e.target.value as 'label' | 'one-hot' })}
                      className="w-full px-2 py-1 border rounded text-xs"
                    >
                      <option value="label">Label (integers 0..K-1)</option>
                      <option value="one-hot">One-Hot (K columns in model)</option>
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Tip: One-hot pairs with CategoricalCrossentropy; Label pairs with SparseCategoricalCrossentropy.
                    </p>
                  </div>
                );
              })()}

              {/* Missing Values */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Missing Value Strategy
                </label>
                <select
                  value={dataset.preprocessingConfig.missingValueStrategy}
                  onChange={(e) => updatePreprocessingConfig({ missingValueStrategy: e.target.value as 'remove-rows' | 'fill-mean' | 'fill-median' | 'fill-mode' | 'fill-zero' })}
                  className="w-full px-2 py-1 border rounded text-xs"
                >
                  <option value="fill-mean">Fill with Mean</option>
                  <option value="fill-median">Fill with Median</option>
                  <option value="fill-mode">Fill with Mode</option>
                  <option value="fill-zero">Fill with Zero</option>
                  <option value="remove-rows">Remove Rows</option>
                </select>
              </div>

              {/* Normalization */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Normalization Method
                </label>
                <select
                  value={dataset.preprocessingConfig.normalizationMethod}
                  onChange={(e) => updatePreprocessingConfig({ normalizationMethod: e.target.value as 'standard' | 'minmax' | 'none' })}
                  className="w-full px-2 py-1 border rounded text-xs"
                >
                  <option value="standard">Standard Scaling (Z-score)</option>
                  <option value="minmax">Min-Max Scaling [0,1]</option>
                  <option value="none">No Normalization</option>
                </select>
              </div>
            </div>

            {/* Data Splitting */}
            <div className="bg-white border rounded-lg p-3 space-y-3">
              <h3 className="font-semibold text-slate-700 text-sm">Data Splitting</h3>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Train</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={dataset.preprocessingConfig.trainSplit}
                    onChange={(e) => updatePreprocessingConfig({ trainSplit: parseFloat(e.target.value) })}
                    className="w-full px-2 py-1 border rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Val</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={dataset.preprocessingConfig.validationSplit}
                    onChange={(e) => updatePreprocessingConfig({ validationSplit: parseFloat(e.target.value) })}
                    className="w-full px-2 py-1 border rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Test</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={dataset.preprocessingConfig.testSplit}
                    onChange={(e) => updatePreprocessingConfig({ testSplit: parseFloat(e.target.value) })}
                    className="w-full px-2 py-1 border rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Random Seed</label>
                <input
                  type="number"
                  value={dataset.preprocessingConfig.randomSeed}
                  onChange={(e) => updatePreprocessingConfig({ randomSeed: parseInt(e.target.value) })}
                  className="w-full px-2 py-1 border rounded text-xs"
                />
              </div>
            </div>

            {/* Validation Errors */}
            {validation && !validation.valid && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-800 mb-1">Configuration Errors:</p>
                    <ul className="text-xs text-red-700 space-y-1">
                      {validation.errors.map((error, idx) => (
                        <li key={idx}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Processing Stats */}
            {dataset.isProcessed && dataset.trainData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-green-800 mb-1">Dataset Processed Successfully</p>
                    <div className="text-xs text-green-700 space-y-0.5">
                      <div>• Train: {dataset.trainData.X.length} samples</div>
                      <div>• Validation: {dataset.validationData?.X.length || 0} samples</div>
                      <div>• Test: {dataset.testData?.X.length || 0} samples</div>
                      <div>• Features: {dataset.trainData.featureNames.length} ({dataset.trainData.featureNames.slice(0, 3).join(', ')}{dataset.trainData.featureNames.length > 3 ? '...' : ''})</div>
                      <div className="pt-1 border-t border-green-200 mt-1">
                        <div>• Encoding: {dataset.preprocessingConfig.categoricalEncoding === 'label' ? 'Label' : dataset.preprocessingConfig.categoricalEncoding === 'one-hot' ? 'One-Hot' : 'None'}</div>
                        {dataset.preprocessingConfig.targetColumn && (dataset.columns.find(c => c.name === dataset.preprocessingConfig.targetColumn)?.type !== 'numeric') && (
                          <div>• Target Encoding: {dataset.preprocessingConfig.targetEncoding === 'one-hot' ? 'One-Hot' : 'Label'}</div>
                        )}
                        <div>• Normalization: {dataset.preprocessingConfig.normalizationMethod === 'standard' ? 'Z-Score' : dataset.preprocessingConfig.normalizationMethod === 'minmax' ? 'Min-Max [0,1]' : 'None'}</div>
                        <div>• Missing Values: {
                          dataset.preprocessingConfig.missingValueStrategy === 'remove-rows' ? 'Rows Removed' :
                            dataset.preprocessingConfig.missingValueStrategy === 'fill-mean' ? 'Filled with Mean' :
                              dataset.preprocessingConfig.missingValueStrategy === 'fill-median' ? 'Filled with Median' :
                                dataset.preprocessingConfig.missingValueStrategy === 'fill-mode' ? 'Filled with Mode' :
                                  'Filled with Zero'
                        }</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Process Button */}
            <Button
              type="button"
              className="w-full transition-all"
              disabled={!validation || !validation.valid || processing}
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (!validation || !validation.valid) {
                  return;
                }

                try {
                  setProcessing(true);
                  await processDataset();
                } catch (err) {
                  console.error('Processing failed', err);
                  const errorMessage = err instanceof Error ? err.message : String(err);
                  alert('Dataset processing failed: ' + errorMessage);
                } finally {
                  setProcessing(false);
                }
              }}
            >
              {processing ? (
                <>
                  <div className="animate-spin mr-2">⟳</div>
                  Processing...
                </>
              ) : (
                <>
                  <Play size={16} className="mr-2" />
                  {dataset.isProcessed ? 'Reprocess Dataset' : 'Process Dataset'}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
