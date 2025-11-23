import { useEffect, useMemo, useRef, useState } from 'react';
import { Cpu, Play, Info, Download, FileText, FileSpreadsheet, ClipboardCopy } from 'lucide-react';
import { useTrainingConfig } from '../../../contexts/useTrainingConfig';
import networkGraphService from '../../../api/networkGraphService';
import { useDataset } from '../../../contexts/DatasetContext';
import { useInference } from '../../../contexts/InferenceContext';
import { columnToNumeric, handleMissingNumeric, minMaxScale, standardScale } from '../../../utils/dataPreprocessing';

export default function InferenceTab() {
    const { jobId, jobStatus } = useTrainingConfig();
    const { dataset } = useDataset();

    const {
        mode,
        setMode,
        jsonText,
        setJsonText,
        csvFile,
        setCsvFile,
        applyNormalization,
        setApplyNormalization,
        preds,
        setPreds,
        busy,
        setBusy,
        error,
        setError,
        copied,
        setCopied,
        lastRunAt,
        setLastRunAt,
        lastResetKey,
        setLastResetKey,
    } = useInference();
    const [xColumns, setXColumns] = useState<string[] | null>(null);
    const csvInputRef = useRef<HTMLInputElement | null>(null);

    const canPredict = !!jobId && jobStatus === 'succeeded';

    const jobSignature = `${jobId ?? ''}|${jobStatus ?? ''}|${mode}`;
    useEffect(() => {
        if (jobSignature !== lastResetKey) {
            setPreds(null);
            setError(null);
            setLastResetKey(jobSignature);
        }
    }, [jobSignature, lastResetKey, setPreds, setError, setLastResetKey]);

    // Fetch job details once to get x_columns shape; fall back to dataset feature names
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!jobId) { setXColumns(null); return; }
            try {
                const j = await networkGraphService.getTrainingJob(jobId);
                const cols = j?.params?.x_columns as string[] | undefined;
                if (!cancelled) setXColumns(cols && cols.length ? cols : (dataset?.trainData?.featureNames ?? null));
            } catch {
                if (!cancelled) setXColumns(dataset?.trainData?.featureNames ?? null);
            }
        })();
        return () => { cancelled = true; };
    }, [jobId, dataset]);

    // Determine if dataset used normalization; default applyNormalization accordingly
    useEffect(() => {
        const method = dataset?.preprocessingConfig.normalizationMethod || 'none';
        setApplyNormalization(method !== 'none');
    }, [dataset?.preprocessingConfig.normalizationMethod, setApplyNormalization]);

    // Build quick per-feature scalers from current dataset for numeric features
    const scalers = useMemo(() => {
        const cols = xColumns || [];
        const method = dataset?.preprocessingConfig.normalizationMethod || 'none';
        if (!dataset || method === 'none' || !dataset.original?.length) return null as null | { type: 'standard' | 'minmax'; mean?: number[]; std?: number[]; min?: number[]; max?: number[] };

        const featureMeta = new Map(dataset.columns.map(c => [c.name, c] as const));
        const means: number[] = []; const stds: number[] = []; const mins: number[] = []; const maxs: number[] = [];
        for (const name of cols) {
            const meta = featureMeta.get(name);
            if (meta && meta.type === 'numeric') {
                // Build numeric series with same missing strategy used in processing
                const series = columnToNumeric(dataset.original, name) as (number | null)[];
                const strat = dataset.preprocessingConfig.missingValueStrategy;
                const strategy: 'mean' | 'median' | 'zero' | 'remove' = strat === 'fill-mean' ? 'mean' : strat === 'fill-median' ? 'median' : strat === 'fill-zero' ? 'zero' : 'mean';
                const numeric = handleMissingNumeric(series, strategy);
                if (method === 'standard') {
                    const { mean, std } = standardScale(numeric);
                    means.push(mean); stds.push(std || 1);
                    mins.push(0); maxs.push(0);
                } else {
                    const { min, max } = minMaxScale(numeric);
                    mins.push(min); maxs.push(max);
                    means.push(0); stds.push(1);
                }
            } else {
                // Non-numeric or derived (e.g., one-hot) — no scaling
                means.push(0); stds.push(1); mins.push(0); maxs.push(1);
            }
        }
        return method === 'standard'
            ? { type: 'standard' as const, mean: means, std: stds }
            : { type: 'minmax' as const, min: mins, max: maxs };
    }, [dataset, xColumns]);

    function transformRowIfNeeded(row: number[]): number[] {
        if (!applyNormalization || !scalers || !xColumns) return row;
        const out: number[] = new Array(row.length);
        if (scalers.type === 'standard') {
            for (let i = 0; i < row.length; i++) out[i] = (row[i] - (scalers.mean![i] ?? 0)) / (scalers.std![i] || 1);
        } else {
            for (let i = 0; i < row.length; i++) {
                const min = scalers.min![i] ?? 0; const max = scalers.max![i] ?? 1; const range = (max - min) || 1;
                out[i] = (row[i] - min) / range;
            }
        }
        return out;
    }

    async function handlePredict() {
        if (!jobId) return;
        setBusy(true);
        setError(null);
        setPreds(null);
        try {
            if (mode === 'csv') {
                if (!csvFile) { setError('Select a CSV file first'); setBusy(false); return; }
                const res = await networkGraphService.predictWithCsv(jobId, csvFile);
                setPreds(res.predictions);
            } else {
                // Try to parse as {instances: [...] } or raw array of arrays
                let payload: { instances: number[][] } | { records: Record<string, number>[] };
                const parsed = JSON.parse(jsonText);
                if (Array.isArray(parsed)) payload = { instances: parsed as number[][] };
                else payload = parsed as { instances: number[][] } | { records: Record<string, number>[] };
                if (applyNormalization && 'instances' in payload && Array.isArray(payload.instances)) {
                    payload = { instances: (payload.instances).map(r => transformRowIfNeeded(r)) };
                }
                const res = await networkGraphService.predictWithJson(jobId, payload);
                setPreds(res.predictions);
            }
            setLastRunAt(new Date().toISOString());
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Prediction failed';
            setError(msg);
        } finally {
            setBusy(false);
        }
    }

    const featureList = useMemo(() => {
        if (xColumns && xColumns.length) return xColumns;
        if (dataset?.trainData?.featureNames?.length) return dataset.trainData.featureNames;
        if (dataset?.columns?.length) return dataset.columns.map(c => c.name);
        return [] as string[];
    }, [xColumns, dataset]);

    const normalizationMethod = dataset?.preprocessingConfig?.normalizationMethod || 'none';
    const hasNormalization = normalizationMethod !== 'none';

    const predictionSummary = useMemo(() => {
        if (!preds) return null as null | { total: number; vectorLength: number | null };
        const raw = Array.isArray(preds)
            ? preds
            : (preds as { predictions?: unknown }).predictions;
        if (!raw || !Array.isArray(raw)) return null;
        const total = raw.length;
        const first = raw[0];
        const vectorLength = Array.isArray(first) ? (first as unknown[]).length : null;
        return { total, vectorLength };
    }, [preds]);

    const targetLabels = useMemo(() => {
        try {
            const targetName = dataset?.preprocessingConfig?.targetColumn;
            if (!targetName) return null;
            // Prefer cleaned rows (aligned to transformed), fall back to original
            const rows = dataset?.cleaned && dataset.cleaned.length ? dataset.cleaned : dataset?.original;
            if (!rows) return null;
            const vals = rows.map(r => {
                const v = (r as Record<string, unknown>)[targetName];
                return v === undefined || v === null ? null : String(v);
            }).filter((v): v is string => v !== null);
            const uniques = Array.from(new Set(vals)).sort();
            return uniques.length ? uniques : null;
        } catch {
            return null;
        }
    }, [dataset]);

    const statusBadgeClass = (() => {
        const base = 'px-2 py-0.5 text-xs font-medium rounded-full capitalize';
        switch (jobStatus) {
            case 'succeeded':
                return base + ' bg-emerald-100 text-emerald-700';
            case 'running':
            case 'queued':
                return base + ' bg-amber-100 text-amber-700';
            case 'failed':
                return base + ' bg-red-100 text-red-700';
            default:
                return base + ' bg-slate-100 text-slate-600';
        }
    })();

    const featureChips = featureList.slice(0, 15);
    const extraFeatureCount = featureList.length - featureChips.length;

    const generateJsonTemplate = (cols?: string[]) => {
        const c = (cols && cols.length) ? cols : (featureList.length ? featureList : ['feature_1', 'feature_2', 'feature_3']);
        const example = { instances: [c.map((_: string, idx: number) => Number(((idx + 1) * 0.1).toFixed(2)))], };
        return JSON.stringify(example, null, 2);
    };

    const handleTemplateDownload = (type: 'json' | 'csv') => {
        const cols = featureList.length ? featureList : ['feature_1', 'feature_2', 'feature_3'];
        if (type === 'json') {
            const exampleText = generateJsonTemplate(cols);
            triggerDownload(exampleText, `${dataset?.datasetName || 'inference'}-template.json`, 'application/json');
        } else {
            const header = cols.join(',');
            const sample = cols.map((_: string, idx: number) => (idx + 1) * 0.1);
            const csv = [header, sample.join(',')].join('\n');
            triggerDownload(csv, `${dataset?.datasetName || 'inference'}-template.csv`, 'text/csv');
        }
    };

    // Auto-insert a sensible JSON template into the textarea when feature list becomes available,
    // but only if the user hasn't modified the placeholder yet.
    useEffect(() => {
        const placeholder = '[\n  [0, 0, 0]\n]';
        if (mode === 'json' && (jsonText.trim() === placeholder.trim() || jsonText.trim() === '')) {
            const tpl = generateJsonTemplate();
            setJsonText(tpl);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [featureList, mode]);

    const triggerDownload = (content: string, filename: string, mime: string) => {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const handleCopyPreds = async () => {
        if (!preds || typeof navigator === 'undefined' || !navigator.clipboard) return;
        try {
            await navigator.clipboard.writeText(JSON.stringify(preds, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (err) {
            console.error('Clipboard copy failed', err);
        }
    };

    const handleDownloadPreds = () => {
        if (!preds) return;
        triggerDownload(JSON.stringify(preds, null, 2), 'predictions.json', 'application/json');
    };

    const formattedLastRun = lastRunAt ? new Date(lastRunAt).toLocaleString() : null;

    const modeButtonClass = (value: 'json' | 'csv') => (
        'flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ' +
        (mode === value
            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
            : 'bg-card text-muted-foreground border-border hover:border-input hover:text-foreground')
    );

    return (
        <div className="h-full flex flex-col gap-4 p-4 bg-background">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Inference workspace</div>
                    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2"><Cpu size={18} /> Run predictions</h2>
                </div>
                <div className="text-sm text-muted-foreground">
                    {canPredict ? 'Ready to predict with your last successful training run.' : 'Train a model (status: succeeded) to unlock predictions.'}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Model status</div>
                    <div className="flex items-center gap-2">
                        <span className={statusBadgeClass}>{jobStatus || 'not started'}</span>
                        {jobId && <span className="text-xs text-muted-foreground">Job #{jobId}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">Only jobs with status <span className="font-semibold">succeeded</span> can serve predictions.</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dataset</div>
                    <div className="text-sm font-medium text-foreground">{dataset?.datasetName || 'Active dataset'}</div>
                    {dataset?.totalRows && dataset?.totalColumns && (
                        <div className="text-xs text-muted-foreground">{dataset.totalRows} rows • {dataset.totalColumns} features • target: {dataset?.preprocessingConfig?.targetColumn || 'N/A'}</div>
                    )}
                </div>
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Normalization</div>
                    <div className="text-sm font-medium text-foreground">{normalizationMethod === 'none' ? 'Not applied' : normalizationMethod}</div>
                    <div className="text-xs text-muted-foreground">{normalizationMethod === 'none' ? 'You can send raw values.' : 'Match the same scaling the dataset used or enable auto-normalization below.'}</div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {!canPredict ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="bg-card border border-border rounded-xl p-10 text-center max-w-md">
                            <Cpu size={64} className="mx-auto mb-4 text-muted" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">No trained model available</h3>
                            <p className="text-sm text-muted-foreground">Finish a training run (status: succeeded) to enable inference tools.</p>
                        </div>
                    </div>
                ) : (
                    <div className="h-full grid gap-4 lg:grid-cols-2">
                        <div className="bg-card border border-border rounded-lg flex flex-col overflow-hidden">
                            <div className="border-b border-border px-4 py-3">
                                <div className="text-xs uppercase tracking-wide text-muted-foreground">Step 1</div>
                                <div className="flex items-center gap-2 text-base font-semibold text-foreground">Prepare input payload</div>
                            </div>
                            <div className="flex-1 overflow-auto px-4 py-4 space-y-4">
                                {featureList.length > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                        <div className="mb-1 font-medium">Expected feature order ({featureList.length}):</div>
                                        <div className="flex flex-wrap gap-1">
                                            {featureChips.map((c: string) => (
                                                <span key={c} className="px-2 py-0.5 rounded-full border border-border bg-muted/50 text-foreground">{c}</span>
                                            ))}
                                            {extraFeatureCount > 0 && (
                                                <span className="px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">+{extraFeatureCount} more</span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <div className="text-xs font-medium text-muted-foreground uppercase">Input format</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" className={modeButtonClass('json')} onClick={() => setMode('json')}>
                                            <FileText size={14} /> JSON (manual)
                                        </button>
                                        <button type="button" className={modeButtonClass('csv')} onClick={() => setMode('csv')}>
                                            <FileSpreadsheet size={14} /> CSV (batch)
                                        </button>
                                    </div>
                                </div>

                                {mode === 'json' ? (
                                    <div className="space-y-2">
                                        <div className="text-xs text-muted-foreground">
                                            Paste an array of arrays or an object that contains <code>{'{"instances": [...]}'}</code>.
                                        </div>
                                        {hasNormalization && (
                                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <input type="checkbox" checked={applyNormalization} onChange={(e) => setApplyNormalization(e.target.checked)} />
                                                Apply dataset normalization ({normalizationMethod})
                                            </label>
                                        )}
                                        <textarea
                                            value={jsonText}
                                            onChange={(e) => setJsonText(e.target.value)}
                                            className="w-full min-h-[220px] font-mono text-xs border border-input rounded-md p-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            <button
                                                type="button"
                                                onClick={() => handleTemplateDownload('json')}
                                                className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-muted-foreground hover:bg-accent"
                                            >
                                                <Download size={12} /> JSON template
                                            </button>
                                            <div className="inline-flex items-center gap-1 text-muted-foreground"><Info size={12} /> Keep order aligned with training features.</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
                                            {csvFile ? (
                                                <div className="space-y-2">
                                                    <div className="font-medium text-foreground">{csvFile.name}</div>
                                                    <div className="text-xs text-muted-foreground">{(csvFile.size / 1024).toFixed(1)} KB</div>
                                                    <div className="flex gap-2 text-xs">
                                                        <button type="button" onClick={() => csvInputRef.current?.click()} className="rounded border border-border px-2 py-1 hover:bg-accent">Replace file</button>
                                                        <button type="button" onClick={() => setCsvFile(null)} className="rounded border border-border px-2 py-1 hover:bg-accent">Remove</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div>Select a CSV with headers that match the training feature names.</div>
                                                    <button type="button" onClick={() => csvInputRef.current?.click()} className="rounded bg-card px-3 py-1 text-sm font-medium text-primary shadow-sm border border-border hover:bg-accent">Choose file</button>
                                                </div>
                                            )}
                                            <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleTemplateDownload('csv')}
                                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                        >
                                            <Download size={12} /> Download CSV template
                                        </button>
                                    </div>
                                )}

                                <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground flex gap-2">
                                    <Info size={14} className="text-muted-foreground" />
                                    <div>
                                        Keep target columns out of the payload. For categorical models you will receive probability vectors per class.
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={handlePredict}
                                        disabled={!canPredict || busy}
                                        className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-60"
                                    >
                                        <Play size={16} /> {busy ? 'Predicting…' : 'Run inference'}
                                    </button>
                                    {error && <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-3 py-2 text-sm text-red-700 dark:text-red-200">{error}</div>}
                                </div>
                            </div>
                        </div>

                        <div className="bg-card border border-border rounded-lg flex flex-col overflow-hidden">
                            <div className="border-b border-border px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Step 2</div>
                                    <div className="text-base font-semibold text-foreground">Review predictions</div>
                                    {formattedLastRun && <div className="text-xs text-muted-foreground">Last run: {formattedLastRun}</div>}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCopyPreds}
                                        disabled={!preds}
                                        className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-muted-foreground disabled:opacity-50 hover:bg-accent"
                                    >
                                        <ClipboardCopy size={12} /> {copied ? 'Copied' : 'Copy JSON'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDownloadPreds}
                                        disabled={!preds}
                                        className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-muted-foreground disabled:opacity-50 hover:bg-accent"
                                    >
                                        <Download size={12} /> Download
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto p-4 space-y-3">
                                {!preds ? (
                                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                                        Run a prediction to see results here.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {predictionSummary && (
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                <span className="rounded-full bg-emerald-50 dark:bg-emerald-950 px-3 py-1 text-emerald-700 dark:text-emerald-200">
                                                    {predictionSummary.total} records
                                                </span>
                                                {typeof predictionSummary.vectorLength === 'number' && (
                                                    <span className="rounded-full bg-blue-50 dark:bg-blue-950 px-3 py-1 text-blue-700 dark:text-blue-200">
                                                        {predictionSummary.vectorLength} outputs / record
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <pre className="bg-muted/30 border border-border rounded p-3 text-xs max-h-[340px] overflow-auto text-foreground">{JSON.stringify(preds, null, 2)}</pre>
                                        {(() => {
                                            const p = preds as unknown;
                                            let arr: unknown = null;
                                            if (Array.isArray(p)) arr = p;
                                            else if (p && typeof p === 'object' && Array.isArray((p as { predictions?: unknown }).predictions)) arr = (p as { predictions: unknown }).predictions;
                                            if (!arr || !Array.isArray(arr) || !Array.isArray(arr[0])) return null;
                                            const classes = (arr as number[][]).map((row: number[]) => row.indexOf(Math.max(...row)));
                                            const labels = targetLabels ?? null;
                                            return (
                                                <div className="text-xs text-foreground space-y-2">
                                                    <div className="font-medium">Argmax class indices:</div>
                                                    <pre className="bg-muted/30 border border-border rounded p-2">{JSON.stringify(classes)}</pre>
                                                    {labels ? (
                                                        <div className="text-xs">
                                                            <div className="font-medium mb-1">Mapped labels:</div>
                                                            <div className="flex flex-col gap-1">
                                                                {classes.map((idx: number, i: number) => (
                                                                    <div key={i} className="flex items-center gap-2">
                                                                        <div className="w-6 text-muted-foreground">#{idx}</div>
                                                                        <div className="font-medium">{labels[idx] ?? 'Unknown'}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="mt-2 text-muted-foreground">Full mapping (index → label):</div>
                                                            <pre className="bg-muted/30 border border-border rounded p-2 text-xs">{JSON.stringify(labels.map((l: string, i: number) => ({ index: i, label: l })), null, 2)}</pre>
                                                        </div>
                                                    ) : (
                                                        <div className="text-muted-foreground">Map these indices back to your categorical labels to interpret predictions.</div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
