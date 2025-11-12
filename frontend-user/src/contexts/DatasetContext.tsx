import { createContext, useContext, useState, ReactNode } from 'react';
import {
  columnToNumeric,
  handleMissingNumeric,
  handleMissingCategorical,
  labelEncode,
  oneHotEncode,
  standardScale,
  minMaxScale,
  splitData,
} from '../utils/dataPreprocessing';

export interface CsvRow {
  [key: string]: string;
}

export interface ColumnInfo {
  name: string;
  type: 'numeric' | 'categorical' | 'text';
  role: 'feature' | 'target' | 'ignore';
  missingCount: number;
  uniqueCount: number;
  samples: string[];
}

export interface DatasetPreprocessingConfig {
  // Column handling
  categoricalEncoding: 'one-hot' | 'label' | 'remove';
  missingValueStrategy: 'remove-rows' | 'fill-mean' | 'fill-median' | 'fill-mode' | 'fill-zero';
  
  // Feature scaling
  normalizationMethod: 'standard' | 'minmax' | 'none';
  
  // Data splitting
  trainSplit: number;
  validationSplit: number;
  testSplit: number;
  randomSeed: number;
  
  // Target configuration
  targetColumn: string | null;
  taskType: 'classification' | 'regression' | 'auto';
}

export interface ProcessedDataset {
  original: CsvRow[];
  cleaned?: CsvRow[]; // Rows after cleaning (missing values handled, rows removed, etc.)
  columns: ColumnInfo[];
  preprocessingConfig: DatasetPreprocessingConfig;
  
  // Processed splits
  trainData?: {
    X: number[][];
    y: number[];
    featureNames: string[];
  };
  validationData?: {
    X: number[][];
    y: number[];
  };
  testData?: {
    X: number[][];
    y: number[];
  };
  
  // Metadata
  datasetName: string;
  datasetId?: string;
  totalRows: number;
  totalColumns: number;
  isProcessed: boolean;
}

interface DatasetContextType {
  dataset: ProcessedDataset | null;
  setDataset: (dataset: ProcessedDataset | null) => void;
  updatePreprocessingConfig: (config: Partial<DatasetPreprocessingConfig>) => void;
  processDataset: () => Promise<void>;
  clearDataset: () => void;
}

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [dataset, setDatasetState] = useState<ProcessedDataset | null>(null);

  const setDataset = (newDataset: ProcessedDataset | null) => {
    setDatasetState(newDataset);
  };

  const updatePreprocessingConfig = (config: Partial<DatasetPreprocessingConfig>) => {
    if (!dataset) return;
    
    setDatasetState({
      ...dataset,
      preprocessingConfig: {
        ...dataset.preprocessingConfig,
        ...config,
      },
      isProcessed: false, // Mark as needing reprocessing
    });
  };

  const processDataset = async () => {
    if (!dataset) return;
    // 1) Validate config
    const cfg = dataset.preprocessingConfig;
    const features = dataset.columns.filter((c) => c.role === 'feature');
    const targetName = cfg.targetColumn;
    if (!targetName) throw new Error('Target column not set');

    // 2) Build per-column arrays
    // Keep raw rows aligned via index
    let rows = [...dataset.original];
    
    // Create a cleaned rows copy that we'll update with filled values
    let cleanedRows = rows.map(r => ({...r}));

    // Helper to detect missing according to config
    const isMissing = (val: unknown) => {
      if (val === null || val === undefined) return true;
      const s = typeof val === 'string' ? val : String(val);
      return s.trim() === '';
    };

    // 3) Handle remove-rows policy early if requested
    if (cfg.missingValueStrategy === 'remove-rows') {
      const validIndices: number[] = [];
      rows.forEach((r, idx) => {
        // require target and all feature values exist
        const targetOk = !isMissing(r[targetName as string]);
        if (!targetOk) return;
        for (const f of features) {
          if (f.type === 'text' && f.role === 'feature') continue; // text can be empty
          if (isMissing(r[f.name])) return;
        }
        validIndices.push(idx);
      });
      rows = validIndices.map(i => rows[i]);
      cleanedRows = validIndices.map(i => ({...cleanedRows[i]}));
    }

    // 4) Convert features to numeric arrays / categorical values as needed
    // We'll build an array of feature columns (may expand with one-hot)
    const featureNames: string[] = [];
    const featureColumns: number[][] = []; // each entry will be numeric column

    // We'll process target values later

    // For each feature column
    for (const col of features) {
      if (col.type === 'categorical' && cfg.categoricalEncoding === 'remove') {
        continue; // skip
      }

      if (col.type === 'numeric') {
        // convert to numeric
        let numeric = columnToNumeric(rows, col.name) as (number | null)[];

        // handle missing according to strategy
        if (cfg.missingValueStrategy === 'remove-rows') {
          // already removed above
        } else {
          const strategy: 'mean' | 'median' | 'zero' | 'remove' = cfg.missingValueStrategy === 'fill-mean' ? 'mean' : cfg.missingValueStrategy === 'fill-median' ? 'median' : cfg.missingValueStrategy === 'fill-zero' ? 'zero' : 'mean';
          numeric = handleMissingNumeric(numeric, strategy) as number[];
          // Update cleanedRows with filled values
          numeric.forEach((val, idx) => {
            if (val !== null && val !== undefined) {
              cleanedRows[idx][col.name] = val.toString();
            }
          });
        }

        // normalization to be applied later per-column
        featureNames.push(col.name);
        featureColumns.push(numeric as number[]);
      } else if (col.type === 'categorical') {
        // extract string values
        const rawVals = rows.map((r) => {
          const v = r[col.name];
          return v === undefined || v === null || String(v).trim() === '' ? null : String(v);
        });

        // handle missing
        let filled: string[];
        if (cfg.missingValueStrategy === 'remove-rows') {
          // removed earlier
          filled = rawVals.map((v) => v ?? 'MISSING');
        } else {
          // use mode for categorical
          filled = handleMissingCategorical(rawVals, 'mode');
          // Update cleanedRows with filled values
          filled.forEach((val, idx) => {
            cleanedRows[idx][col.name] = val;
          });
        }

        if (cfg.categoricalEncoding === 'label') {
          const { encoded } = labelEncode(filled);
          featureNames.push(col.name);
          featureColumns.push(encoded);
        } else if (cfg.categoricalEncoding === 'one-hot') {
          const { encoded, categories } = oneHotEncode(filled);
          // encoded is array of arrays
          // append each category as separate numeric column
          for (let k = 0; k < categories.length; k++) {
            featureNames.push(`${col.name}__${categories[k]}`);
            featureColumns.push(encoded.map((row) => row[k]));
          }
        }
      } else {
        // text: attempt to drop or treat as categorical
        // treat as categorical with label encoding
        const rawVals = rows.map((r) => {
          const v = r[col.name];
          return v === undefined || v === null || String(v).trim() === '' ? null : String(v);
        });
        const filled = handleMissingCategorical(rawVals, 'mode');
        // Update cleanedRows with filled values
        filled.forEach((val, idx) => {
          cleanedRows[idx][col.name] = val;
        });
        const { encoded } = labelEncode(filled);
        featureNames.push(col.name);
        featureColumns.push(encoded);
      }
    }

    // 5) Apply normalization per numeric feature according to config
    const normalizedColumns: number[][] = [];
    for (let i = 0; i < featureColumns.length; i++) {
      const colArr = featureColumns[i];
      if (dataset.columns.find((c) => c.name === featureNames[i])?.type === 'numeric') {
        if (cfg.normalizationMethod === 'standard') {
          const { scaled } = standardScale(colArr);
          normalizedColumns.push(scaled);
        } else if (cfg.normalizationMethod === 'minmax') {
          const { scaled } = minMaxScale(colArr);
          normalizedColumns.push(scaled);
        } else {
          normalizedColumns.push(colArr);
        }
      } else {
        normalizedColumns.push(colArr);
      }
    }

    // 6) Build row-wise X and y
    const X: number[][] = [];
    for (let r = 0; r < rows.length; r++) {
      const rowVec: number[] = [];
      for (let c = 0; c < normalizedColumns.length; c++) {
        rowVec.push(normalizedColumns[c][r]);
      }
      X.push(rowVec);
    }

    // target processing
    let y: number[] = [];
    const targetColMeta = dataset.columns.find((c) => c.name === targetName);
    if (!targetColMeta) throw new Error('Target column metadata missing');
    if (targetColMeta.type === 'numeric') {
      const numeric = columnToNumeric(rows, targetName as string) as (number | null)[];
      if (cfg.missingValueStrategy === 'remove-rows') {
        // already removed
        y = numeric.map((v) => v ?? 0) as number[];
      } else {
        const targetStrategy: 'mean' | 'median' | 'zero' | 'remove' = cfg.missingValueStrategy === 'fill-mean' ? 'mean' : cfg.missingValueStrategy === 'fill-median' ? 'median' : cfg.missingValueStrategy === 'fill-zero' ? 'zero' : 'mean';
        y = handleMissingNumeric(numeric, targetStrategy) as number[];
        // Update cleanedRows with filled target values
        y.forEach((val, idx) => {
          if (val !== null && val !== undefined) {
            cleanedRows[idx][targetName as string] = val.toString();
          }
        });
      }
    } else {
      const raw = rows.map((r) => {
        const v = r[targetName as string];
        return v === undefined || v === null || String(v).trim() === '' ? null : String(v);
      });
      const filled = handleMissingCategorical(raw, 'mode');
      // Update cleanedRows with filled target values
      filled.forEach((val, idx) => {
        cleanedRows[idx][targetName as string] = val;
      });
      const { encoded } = labelEncode(filled);
      y = encoded;
    }

    // 7) Remove rows where X or y contain NaN or undefined (sanity)
    const validIndices: number[] = [];
    for (let i = 0; i < X.length; i++) {
      const hasNaN = X[i].some((v) => v === null || v === undefined || Number.isNaN(v));
      const yVal = y[i];
      if (!hasNaN && yVal !== null && yVal !== undefined && !Number.isNaN(yVal)) validIndices.push(i);
    }

    const Xclean = validIndices.map((i) => X[i]);
    const yclean = validIndices.map((i) => y[i]);

    // 8) Split data
    const splits = splitData(
      Xclean.map((x, idx) => ({ x, y: yclean[idx] })),
      cfg.trainSplit,
      cfg.validationSplit,
      cfg.testSplit,
      cfg.randomSeed
    );

    const trainX = splits.train.map((p) => p.x);
    const trainY = splits.train.map((p) => p.y);
    const valX = splits.validation.map((p) => p.x);
    const valY = splits.validation.map((p) => p.y);
    const testX = splits.test.map((p) => p.x);
    const testY = splits.test.map((p) => p.y);

    // 9) Persist processed splits into dataset
    setDatasetState({
      ...dataset,
      cleaned: cleanedRows, // Store the cleaned rows with filled values for preview
      trainData: { X: trainX, y: trainY, featureNames },
      validationData: { X: valX, y: valY },
      testData: { X: testX, y: testY },
      isProcessed: true,
    });
  };

  const clearDataset = () => {
    setDatasetState(null);
  };

  return (
    <DatasetContext.Provider
      value={{
        dataset,
        setDataset,
        updatePreprocessingConfig,
        processDataset,
        clearDataset,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDataset() {
  const context = useContext(DatasetContext);
  if (context === undefined) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
}
