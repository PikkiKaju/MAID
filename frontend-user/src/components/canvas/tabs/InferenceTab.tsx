import { useEffect, useMemo, useState } from 'react';
import { Cpu, Play } from 'lucide-react';
import { useTrainingConfig } from '../../../contexts/useTrainingConfig';
import networkGraphService from '../../../api/networkGraphService';
import { useDataset } from '../../../contexts/DatasetContext';
import { columnToNumeric, handleMissingNumeric, minMaxScale, standardScale } from '../../../utils/dataPreprocessing';

export default function InferenceTab() {
    const { jobId, jobStatus } = useTrainingConfig();
    const { dataset } = useDataset();

    const [mode, setMode] = useState<'json' | 'csv'>('json');
    const [jsonText, setJsonText] = useState('[\n  [0, 0, 0]\n]');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preds, setPreds] = useState<unknown | null>(null);
    const [xColumns, setXColumns] = useState<string[] | null>(null);
    const [applyNormalization, setApplyNormalization] = useState(true);

    const canPredict = !!jobId && jobStatus === 'succeeded';

    useEffect(() => {
        setPreds(null);
        setError(null);
    }, [jobId, jobStatus, mode]);

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
    }, [dataset?.preprocessingConfig.normalizationMethod]);

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
                if (!csvFile) { setError('Select a CSV file first'); return; }
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
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Prediction failed';
            setError(msg);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="h-full flex flex-col p-4 bg-slate-50">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Cpu size={16} /> Inference</h2>
                <div className="text-sm text-slate-600">
                    {canPredict ? 'Ready to predict with last trained model' : 'Train a model first to enable predictions'}
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                {!canPredict ? (
                    <div className="bg-white border rounded-lg p-8 text-center">
                        <Cpu size={64} className="mx-auto mb-4 text-slate-300" />
                        <h3 className="text-lg font-medium text-slate-600 mb-2">No trained model available</h3>
                        <p className="text-sm text-slate-500">Finish a training run (status: succeeded) to enable predictions.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-white border rounded-lg p-4 space-y-3">
                            {/* Expected feature order */}
                            {xColumns && xColumns.length > 0 && (
                                <div className="text-xs text-slate-600">
                                    <div className="mb-1 font-medium">Expected feature order ({xColumns.length}):</div>
                                    <div className="flex flex-wrap gap-1">
                                        {xColumns.map((c) => (
                                            <span key={c} className="px-2 py-0.5 rounded border bg-slate-50 text-slate-700">{c}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3 text-sm">
                                <label className="flex items-center gap-2">
                                    <input type="radio" name="mode" checked={mode === 'json'} onChange={() => setMode('json')} /> JSON
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="radio" name="mode" checked={mode === 'csv'} onChange={() => setMode('csv')} /> CSV
                                </label>
                            </div>

                            {mode === 'json' ? (
                                <div>
                                    <div className="text-xs text-slate-500 mb-1">
                                        Paste an array of arrays (instances) or <code>{"{\"instances\": [...]}"}</code>
                                    </div>
                                    {dataset?.preprocessingConfig?.normalizationMethod !== 'none' && (
                                        <label className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                                            <input type="checkbox" checked={applyNormalization} onChange={(e) => setApplyNormalization(e.target.checked)} />
                                            Apply dataset normalization ({dataset?.preprocessingConfig?.normalizationMethod})
                                        </label>
                                    )}
                                    <textarea
                                        value={jsonText}
                                        onChange={(e) => setJsonText(e.target.value)}
                                        className="w-full h-48 font-mono text-xs border rounded p-2"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <div className="text-xs text-slate-500 mb-1">Upload CSV with header matching training features</div>
                                    <input type="file" accept=".csv,text/csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
                                </div>
                            )}

                            <button
                                onClick={handlePredict}
                                disabled={!canPredict || busy}
                                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
                            >
                                <Play size={16} /> {busy ? 'Predicting...' : 'Predict'}
                            </button>

                            {error && <div className="text-sm text-red-600">{error}</div>}
                        </div>

                        <div className="bg-white border rounded-lg p-4 overflow-auto">
                            <h3 className="text-sm font-semibold text-slate-700 mb-2">Results</h3>
                            {!preds ? (
                                <div className="text-sm text-slate-500">No predictions yet.</div>
                            ) : (
                                <div className="space-y-2">
                                    {/* Raw predictions */}
                                    <pre className="bg-slate-50 border rounded p-3 text-xs max-h-[300px] overflow-auto">{JSON.stringify(preds, null, 2)}</pre>
                                    {/* Argmax preview for classification-like outputs */}
                                    {(() => {
                                        const p = preds as unknown;
                                        let arr: unknown = null;
                                        if (Array.isArray(p)) arr = p;
                                        else if (p && typeof p === 'object' && Array.isArray((p as { predictions?: unknown }).predictions)) arr = (p as { predictions: unknown }).predictions;
                                        if (!arr || !Array.isArray(arr) || !Array.isArray(arr[0])) return null;
                                        const classes = (arr as number[][]).map(row => row.indexOf(Math.max(...row as number[])));
                                        return (
                                            <div className="text-xs text-slate-700">
                                                <div className="font-medium mb-1">Argmax class indices:</div>
                                                <pre className="bg-slate-50 border rounded p-2">{JSON.stringify(classes)}</pre>
                                                <div className="text-slate-500">Tip: For categorical targets, take argmax to get predicted class index. Map to labels based on your dataset’s class encoding.</div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
