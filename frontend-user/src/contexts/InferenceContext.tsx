import React, { createContext, useContext, useState, ReactNode } from 'react';

type Mode = 'json' | 'csv';

interface InferenceState {
    mode: Mode;
    setMode: (m: Mode) => void;

    jsonText: string;
    setJsonText: (s: string) => void;

    csvFile: File | null;
    setCsvFile: (f: File | null) => void;

    applyNormalization: boolean;
    setApplyNormalization: (v: boolean) => void;

    preds: unknown | null;
    setPreds: (p: unknown | null) => void;

    busy: boolean;
    setBusy: (b: boolean) => void;

    error: string | null;
    setError: (e: string | null) => void;

    copied: boolean;
    setCopied: (c: boolean) => void;

    lastRunAt: string | null;
    setLastRunAt: (t: string | null) => void;

    lastResetKey: string;
    setLastResetKey: (k: string) => void;
}

const InferenceContext = createContext<InferenceState | undefined>(undefined);

export function InferenceProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<Mode>('json');
    const [jsonText, setJsonText] = useState('[\n  [0, 0, 0]\n]');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [applyNormalization, setApplyNormalization] = useState(true);
    const [preds, setPreds] = useState<unknown | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [lastRunAt, setLastRunAt] = useState<string | null>(null);
    const [lastResetKey, setLastResetKey] = useState('');

    return (
        <InferenceContext.Provider
            value={{
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
            }}
        >
            {children}
        </InferenceContext.Provider>
    );
}

export function useInference() {
    const ctx = useContext(InferenceContext);
    if (!ctx) throw new Error('useInference must be used within InferenceProvider');
    return ctx;
}

export default InferenceProvider;
