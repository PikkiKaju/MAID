import { createContext, useContext, useState, ReactNode } from 'react';

type LayerSummary = {
    name: string;
    type: string;
    outputShape: string;
    params: number;
};

type ModelSummaryContextType = {
    summary: LayerSummary[] | null;
    setSummary: (summary: LayerSummary[] | null) => void;
    totalParams: number;
    setTotalParams: (total: number) => void;
};

const ModelSummaryContext = createContext<ModelSummaryContextType | undefined>(undefined);

export function ModelSummaryProvider({ children }: { children: ReactNode }) {
    const [summary, setSummary] = useState<LayerSummary[] | null>(null);
    const [totalParams, setTotalParams] = useState(0);

    return (
        <ModelSummaryContext.Provider
            value={{
                summary,
                setSummary,
                totalParams,
                setTotalParams,
            }}
        >
            {children}
        </ModelSummaryContext.Provider>
    );
}

export function useModelSummary() {
    const context = useContext(ModelSummaryContext);
    if (!context) {
        throw new Error('useModelSummary must be used within ModelSummaryProvider');
    }
    return context;
}
