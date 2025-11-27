import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../../../utils/formatDate';
import { Upload, Table, X, Database, Settings, Play, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { Button } from '../../../ui/button';
import { datasetService, DatasetMyMetadata } from '../../../api/datasetService';
import { useAppSelector } from '../../../store/hooks';
import { useDataset, CsvRow, ProcessedDataset } from '../../../contexts/DatasetContext';
import { analyzeColumn, validatePreprocessingConfig } from '../../../utils/dataPreprocessing';

export default function DatasetTab() {
  const { t, i18n } = useTranslation();
  const { token, isLoggedIn } = useAppSelector((state) => state.auth);
  const { dataset, setDataset, updatePreprocessingConfig, processDataset, clearDataset: clearDatasetContext } = useDataset();
  const [processing, setProcessing] = useState(false);

  // Local UI state
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [availableDatasets, setAvailableDatasets] = useState<DatasetMyMetadata[]>([]);
  const [showDatasetList, setShowDatasetList] = useState(false);
  const [showColumnConfig, setShowColumnConfig] = useState(true);
  const [showTransformed, setShowTransformed] = useState(false);
  const [previewCount, setPreviewCount] = useState<number>(50);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!dataset) return;
    const total = dataset.isProcessed ? (dataset.transformed?.X.length ?? dataset.cleaned?.length ?? dataset.totalRows) : dataset.totalRows;
    setPreviewCount((prev) => Math.min(prev, Math.max(1, total)));
  }, [dataset]);

  // Download the transformed dataset (CSV) if available
  const downloadTransformed = () => {
    if (!dataset || !dataset.transformed) {
      alert(t('canvas.dataset.noTransformed'));
      return;
    }
    const header = [...dataset.transformed.featureNames, dataset.preprocessingConfig.targetColumn || 'target'];
    const rows = dataset.transformed.X.map((row, idx) => {
      const cells = row.map((v) => {
        const s = String(v);
        return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g, '""') + '"' : s;
      });
      const targetVal = dataset.transformed?.y[idx];
      const t = targetVal !== undefined && targetVal !== null ? String(targetVal) : '';
      const tCell = t.includes(',') || t.includes('"') ? '"' + t.replace(/"/g, '""') + '"' : t;
      return cells.concat([tCell]).join(',');
    });
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const name = dataset.datasetName ? `${dataset.datasetName}_transformed.csv` : 'transformed.csv';
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

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
      alert(t('canvas.dataset.loginRequiredDb'));
      return;
    }

    try {
      setLoadingDatasets(true);
      const datasets = await datasetService.getDatasets(token);
      setAvailableDatasets(datasets);
      setShowDatasetList(true);
    } catch (err) {
      console.error('Failed to load datasets', err);
      alert(t('canvas.dataset.loadFailed'));
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
      alert(t('canvas.dataset.loadDetailsFailed'));
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
    <div className="h-full flex flex-col p-4 bg-background">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('canvas.dataset.title')}</h2>
          {dataset && (
            <p className="text-xs text-muted-foreground">
              {dataset.datasetName} • {dataset.totalRows} {t('canvas.dataset.headerRows')} × {dataset.totalColumns} {t('canvas.dataset.headerColumns')}
              {dataset.isProcessed && dataset.cleaned && dataset.cleaned.length !== dataset.totalRows && (
                <span className="text-orange-600 dark:text-orange-400 ml-1">
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
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded text-sm border border-green-200 dark:border-green-800">
                  <CheckCircle2 size={16} />
                  {t('canvas.dataset.readyForTraining')}
                </div>
              ) : validation && !validation.valid ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-200 rounded text-sm border border-red-200 dark:border-red-800">
                  <AlertCircle size={16} />
                  {t('canvas.dataset.configurationIssues')}
                </div>
              ) : null}
              <Button variant="outline" size="sm" onClick={clearDataset}>
                <X size={14} className="mr-1" /> {t('canvas.dataset.clear')}
              </Button>
            </>
          )}
        </div>
      </div>

      {!dataset ? (
        /* Upload/Load Section */
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-border rounded-lg bg-card">
            <div className="text-center p-8">
              <Upload size={48} className="mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground mb-2">{t('canvas.dataset.uploadHeading')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('canvas.dataset.uploadDescription')}
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
                  {t('canvas.dataset.chooseCsv')}
                </Button>
                {isLoggedIn && (
                  <Button
                    variant="outline"
                    onClick={loadDatasetsFromDB}
                    disabled={loadingDatasets}
                  >
                    <Database size={16} className="mr-2" />
                    {loadingDatasets ? t('common.loading') : t('canvas.dataset.loadFromDb')}
                  </Button>
                )}
              </div>
              {!isLoggedIn && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                  {t('canvas.dataset.loginRequiredToAccess')}
                </p>
              )}
            </div>
          </div>

          {/* Dataset List Modal */}
          {showDatasetList && (
            <div className="bg-card border border-border rounded-lg p-4 max-h-[400px] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">{t('canvas.dataset.availableDatasets')}</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowDatasetList(false)}>
                  <X size={16} />
                </Button>
              </div>
              {availableDatasets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t('canvas.dataset.noDatasets')}</p>
              ) : (
                <div className="space-y-2">
                  {availableDatasets.map((ds) => (
                    <div
                      key={ds.id}
                      className="border border-border rounded p-3 hover:bg-accent cursor-pointer flex items-center justify-between"
                      onClick={() => loadDatasetById(ds.id, ds.name)}
                    >
                      <div>
                        <p className="font-medium text-sm text-foreground">{ds.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('canvas.loadModal.createdAt', { date: formatDateTime(ds.createdAt, i18n.language) })}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        {t('canvas.dataset.loadButton')}
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
          <div className="flex-1 flex flex-col overflow-hidden bg-card border border-border rounded-lg">
            <div className="p-3 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Table size={16} className="text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold text-foreground">{t('canvas.dataset.dataPreview.title')}</h3>
                    {dataset.isProcessed && dataset.cleaned && (
                      <p className="text-[10px] text-muted-foreground">
                        {showTransformed ?
                          t('canvas.dataset.dataPreview.showingTransformed', { count: Math.min(previewCount, dataset.transformed?.X.length ?? 0), total: dataset.transformed?.X.length ?? 0 }) :
                          t('canvas.dataset.dataPreview.showingCleaned', { count: Math.min(previewCount, dataset.cleaned.length), total: dataset.cleaned.length })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {dataset && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">{t('canvas.dataset.rowsLabel')}</label>
                      <select
                        value={previewCount}
                        onChange={(e) => {
                          const v = e.target.value;
                          const total = dataset.isProcessed ? (dataset.transformed?.X.length ?? dataset.cleaned?.length ?? dataset.totalRows) : dataset.totalRows;
                          if (v === 'all') setPreviewCount(total);
                          else setPreviewCount(parseInt(v, 10));
                        }}
                        className="text-xs px-2 py-1 border border-input rounded bg-background text-foreground"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={dataset.isProcessed ? (dataset.transformed?.X.length ?? dataset.cleaned?.length ?? dataset.totalRows) : dataset.totalRows}>{t('canvas.dataset.all')}</option>
                      </select>
                      {((dataset.transformed?.X.length ?? dataset.cleaned?.length ?? dataset.totalRows) || 0) > 1000 && (
                        <span className="text-[10px] text-muted-foreground ml-2">{t('canvas.dataset.allMayBeSlow')}</span>
                      )}
                    </div>
                  )}
                  {dataset.isProcessed && (dataset.transformed || dataset.trainData) && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowTransformed(!showTransformed)}
                        className="text-xs"
                      >
                        <Eye size={14} className="mr-1" />
                        {showTransformed ? t('canvas.dataset.viewCleaned') : t('canvas.dataset.viewTransformed')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={downloadTransformed}
                        disabled={!dataset.transformed}
                        className="text-xs"
                      >
                        {t('canvas.dataset.downloadTransformed')}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {showTransformed && dataset.isProcessed && dataset.transformed ? (
                // Show transformed/encoded/normalized data
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground border-r border-b border-border">#</th>
                      {dataset.transformed.featureNames.map((name, idx) => (
                        <th key={idx} className="px-3 py-2 text-left border-r border-b border-border">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-foreground">{name}</span>
                            <span className="text-[10px] text-muted-foreground">{t('canvas.dataset.transformed.feature')}</span>
                          </div>
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left border-r border-b border-border bg-green-100 dark:bg-green-900/50">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-green-900 dark:text-green-100">{dataset.preprocessingConfig.targetColumn}</span>
                          <span className="text-[10px] text-green-800 dark:text-green-200">{t('canvas.dataset.transformed.target')}</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataset.transformed.X.slice(0, previewCount).map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-b border-border hover:bg-accent/50">
                        <td className="px-3 py-2 text-muted-foreground border-r border-border font-medium">{rowIdx + 1}</td>
                        {row.map((val, cellIdx) => (
                          <td key={cellIdx} className="px-3 py-2 border-r border-border font-mono text-[11px] text-foreground">
                            {typeof val === 'number' ? formatNumber(val) : val}
                          </td>
                        ))}
                        <td className="px-3 py-2 border-r border-border font-mono text-[11px] bg-green-50 dark:bg-green-900/20 text-foreground">
                          {typeof dataset.transformed?.y[rowIdx] === 'number'
                            ? formatNumber(dataset.transformed.y[rowIdx])
                            : dataset.transformed?.y[rowIdx]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                // Show cleaned source data
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground border-r border-b border-border">#</th>
                      {dataset.columns.map((col, idx) => (
                        <th key={idx} className="px-3 py-2 text-left border-r border-b border-border">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-foreground">{col.name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {t(`canvas.dataset.type.${col.type}`, { defaultValue: col.type })}
                              {col.role === 'target' && ` • ${t('canvas.dataset.columnRole.target')}`}
                              {col.role === 'ignore' && ` • ${t('canvas.dataset.columnRole.ignore')}`}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(dataset.isProcessed && dataset.cleaned ? dataset.cleaned : dataset.original).slice(0, previewCount).map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-b border-border hover:bg-accent/50">
                        <td className="px-3 py-2 text-muted-foreground border-r border-border font-medium">{rowIdx + 1}</td>
                        {dataset.columns.map((col, cellIdx) => (
                          <td key={cellIdx} className="px-3 py-2 border-r border-border text-foreground">
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
            <div className="bg-card border border-border rounded-lg">
              <div
                className="p-3 border-b border-border bg-muted/30 cursor-pointer flex items-center justify-between"
                onClick={() => setShowColumnConfig(!showColumnConfig)}
              >
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <Settings size={16} />
                  {t('canvas.dataset.columnConfiguration')}
                </h3>
                {showColumnConfig ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
              </div>
              {showColumnConfig && (
                <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                  {dataset.columns.map((col) => (
                    <div key={col.name} className="flex items-center justify-between text-xs border-b border-border pb-2">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{col.name}</p>
                        <p className="text-muted-foreground text-[10px]">
                          {t(`canvas.dataset.type.${col.type}`, { defaultValue: col.type })} • {col.uniqueCount} {t('canvas.dataset.stats.unique')} • {col.missingCount} {t('canvas.dataset.stats.missing')}
                        </p>
                      </div>
                      <select
                        value={col.role}
                        onChange={(e) => handleColumnRoleChange(col.name, e.target.value as 'feature' | 'target' | 'ignore')}
                        className="px-2 py-1 border border-input rounded text-xs bg-background text-foreground"
                      >
                        <option value="feature">{t('canvas.dataset.role.feature')}</option>
                        <option value="target">{t('canvas.dataset.role.target')}</option>
                        <option value="ignore">{t('canvas.dataset.role.ignore')}</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preprocessing Settings */}
            <div className="bg-card border border-border rounded-lg p-3 space-y-3">
              <h3 className="font-semibold text-foreground text-sm">{t('canvas.dataset.preprocessing')}</h3>

              {/* Categorical Encoding */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  {t('canvas.dataset.categoricalEncoding.label')}
                </label>
                <select
                  value={dataset.preprocessingConfig.categoricalEncoding}
                  onChange={(e) => updatePreprocessingConfig({ categoricalEncoding: e.target.value as 'one-hot' | 'label' | 'remove' })}
                  className="w-full px-2 py-1 border border-input rounded text-xs bg-background text-foreground"
                >
                  <option value="label">{t('canvas.dataset.categoricalEncoding.option_label')}</option>
                  <option value="one-hot">{t('canvas.dataset.categoricalEncoding.option_onehot')}</option>
                  <option value="remove">{t('canvas.dataset.categoricalEncoding.option_remove')}</option>
                </select>
              </div>

              {/* Target Encoding (only for categorical targets) */}
              {(() => {
                const targetName = dataset.preprocessingConfig.targetColumn;
                const targetMeta = targetName ? dataset.columns.find(c => c.name === targetName) : undefined;
                if (!targetMeta || targetMeta.type === 'numeric') return null;
                return (
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      {t('canvas.dataset.targetEncoding.label')}
                    </label>
                    <select
                      value={dataset.preprocessingConfig.targetEncoding}
                      onChange={(e) => updatePreprocessingConfig({ targetEncoding: e.target.value as 'label' | 'one-hot' })}
                      className="w-full px-2 py-1 border border-input rounded text-xs bg-background text-foreground"
                    >
                      <option value="label">{t('canvas.dataset.targetEncoding.option_label_desc')}</option>
                      <option value="one-hot">{t('canvas.dataset.targetEncoding.option_onehot_desc')}</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {t('canvas.dataset.targetEncoding.tip')}
                    </p>
                  </div>
                );
              })()}

              {/* Missing Values */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  {t('canvas.dataset.missingValueStrategy.label')}
                </label>
                <select
                  value={dataset.preprocessingConfig.missingValueStrategy}
                  onChange={(e) => updatePreprocessingConfig({ missingValueStrategy: e.target.value as 'remove-rows' | 'fill-mean' | 'fill-median' | 'fill-mode' | 'fill-zero' })}
                  className="w-full px-2 py-1 border border-input rounded text-xs bg-background text-foreground"
                >
                  <option value="fill-mean">{t('canvas.dataset.missingValueStrategy.option_fill_mean')}</option>
                  <option value="fill-median">{t('canvas.dataset.missingValueStrategy.option_fill_median')}</option>
                  <option value="fill-mode">{t('canvas.dataset.missingValueStrategy.option_fill_mode')}</option>
                  <option value="fill-zero">{t('canvas.dataset.missingValueStrategy.option_fill_zero')}</option>
                  <option value="remove-rows">{t('canvas.dataset.missingValueStrategy.option_remove_rows')}</option>
                </select>
              </div>

              {/* Normalization */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  {t('canvas.dataset.normalizationMethod.label')}
                </label>
                <select
                  value={dataset.preprocessingConfig.normalizationMethod}
                  onChange={(e) => updatePreprocessingConfig({ normalizationMethod: e.target.value as 'standard' | 'minmax' | 'none' })}
                  className="w-full px-2 py-1 border border-input rounded text-xs bg-background text-foreground"
                >
                  <option value="standard">{t('canvas.dataset.normalizationMethod.option_standard')}</option>
                  <option value="minmax">{t('canvas.dataset.normalizationMethod.option_minmax')}</option>
                  <option value="none">{t('canvas.dataset.normalizationMethod.option_none')}</option>
                </select>
              </div>
            </div>

            {/* Data Splitting */}
            <div className="bg-card border border-border rounded-lg p-3 space-y-3">
              <h3 className="font-semibold text-foreground text-sm">{t('canvas.dataset.dataSplitting')}</h3>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">{t('canvas.dataset.splits.train')}</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={dataset.preprocessingConfig.trainSplit}
                    onChange={(e) => updatePreprocessingConfig({ trainSplit: parseFloat(e.target.value) })}
                    className="w-full px-2 py-1 border border-input rounded text-xs bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">{t('canvas.dataset.splits.val')}</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={dataset.preprocessingConfig.validationSplit}
                    onChange={(e) => updatePreprocessingConfig({ validationSplit: parseFloat(e.target.value) })}
                    className="w-full px-2 py-1 border border-input rounded text-xs bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">{t('canvas.dataset.splits.test')}</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={dataset.preprocessingConfig.testSplit}
                    onChange={(e) => updatePreprocessingConfig({ testSplit: parseFloat(e.target.value) })}
                    className="w-full px-2 py-1 border border-input rounded text-xs bg-background text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">{t('canvas.dataset.randomSeed')}</label>
                <input
                  type="number"
                  value={dataset.preprocessingConfig.randomSeed}
                  onChange={(e) => updatePreprocessingConfig({ randomSeed: parseInt(e.target.value) })}
                  className="w-full px-2 py-1 border border-input rounded text-xs bg-background text-foreground"
                />
              </div>
            </div>

            {/* Validation Errors */}
            {validation && !validation.valid && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-1">{t('canvas.dataset.configurationErrorsTitle')}</p>
                    <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
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
              <div className="bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-green-700 dark:text-green-300 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-1">{t('canvas.dataset.processedSuccess')}</p>
                    <div className="text-xs text-green-800 dark:text-green-200 space-y-0.5">
                      <div>• {t('canvas.dataset.processedStats.train', { count: dataset.trainData.X.length })}</div>
                      <div>• {t('canvas.dataset.processedStats.validation', { count: dataset.validationData?.X.length || 0 })}</div>
                      <div>• {t('canvas.dataset.processedStats.test', { count: dataset.testData?.X.length || 0 })}</div>
                      <div>• {t('canvas.dataset.processedStats.features', { count: dataset.trainData.featureNames.length, preview: dataset.trainData.featureNames.slice(0, 3).join(', ') + (dataset.trainData.featureNames.length > 3 ? '...' : '') })}</div>
                      <div className="pt-1 border-t border-emerald-200 dark:border-emerald-800 mt-1">
                        <div>• {t('canvas.dataset.encoding')}: {dataset.preprocessingConfig.categoricalEncoding === 'label' ? t('canvas.dataset.encodingLabels.label') : dataset.preprocessingConfig.categoricalEncoding === 'one-hot' ? t('canvas.dataset.encodingLabels.onehot') : t('canvas.dataset.encodingLabels.none')}</div>
                        {dataset.preprocessingConfig.targetColumn && (dataset.columns.find(c => c.name === dataset.preprocessingConfig.targetColumn)?.type !== 'numeric') && (
                          <div>• {t('canvas.dataset.targetEncodingLabel')}: {dataset.preprocessingConfig.targetEncoding === 'one-hot' ? t('canvas.dataset.encodingLabels.onehot') : t('canvas.dataset.encodingLabels.label')}</div>
                        )}
                        <div>• {t('canvas.dataset.normalization')}: {dataset.preprocessingConfig.normalizationMethod === 'standard' ? t('canvas.dataset.encodingLabels.zscore') : dataset.preprocessingConfig.normalizationMethod === 'minmax' ? t('canvas.dataset.encodingLabels.minmax') : t('canvas.dataset.encodingLabels.none')}</div>
                        <div>• {t('canvas.dataset.missingValues')}: {
                          dataset.preprocessingConfig.missingValueStrategy === 'remove-rows' ? t('canvas.dataset.missingValueLabels.remove_rows') :
                            dataset.preprocessingConfig.missingValueStrategy === 'fill-mean' ? t('canvas.dataset.missingValueLabels.fill_mean') :
                              dataset.preprocessingConfig.missingValueStrategy === 'fill-median' ? t('canvas.dataset.missingValueLabels.fill_median') :
                                dataset.preprocessingConfig.missingValueStrategy === 'fill-mode' ? t('canvas.dataset.missingValueLabels.fill_mode') :
                                  t('canvas.dataset.missingValueLabels.fill_zero')
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
                  alert(t('canvas.dataset.process.failed') + (errorMessage ? ': ' + errorMessage : ''));
                } finally {
                  setProcessing(false);
                }
              }}
            >
              {processing ? (
                <>
                  <div className="animate-spin mr-2">⟳</div>
                  {t('canvas.dataset.process.processing')}
                </>
              ) : (
                <>
                  <Play size={16} className="mr-2" />
                  {dataset.isProcessed ? t('canvas.dataset.process.reprocess') : t('canvas.dataset.process.process')}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
