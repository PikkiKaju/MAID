import { CsvRow, ColumnInfo, DatasetPreprocessingConfig } from '../contexts/DatasetContext';

/**
 * Analyzes a column to determine its type and statistics
 */
export function analyzeColumn(data: CsvRow[], columnName: string): ColumnInfo {
  const values = data.map(row => row[columnName]).filter(v => v !== undefined && v !== null && v !== '');
  const nonEmptyValues = values.filter(v => v.trim() !== '');
  const uniqueValues = [...new Set(nonEmptyValues)];
  
  // Determine if column is numeric
  const numericValues = nonEmptyValues.filter(v => !isNaN(Number(v)));
  const isNumeric = numericValues.length > 0 && numericValues.length / nonEmptyValues.length > 0.8;
  
  // Determine type
  let type: 'numeric' | 'categorical' | 'text';
  if (isNumeric) {
    type = 'numeric';
  } else if (uniqueValues.length < nonEmptyValues.length * 0.5 && uniqueValues.length < 50) {
    type = 'categorical';
  } else {
    type = 'text';
  }
  
  return {
    name: columnName,
    type,
    role: 'feature', // Default role
    missingCount: data.length - nonEmptyValues.length,
    uniqueCount: uniqueValues.length,
    samples: uniqueValues.slice(0, 5),
  };
}

/**
 * Converts categorical values to numeric using label encoding
 */
export function labelEncode(values: string[]): { encoded: number[]; mapping: Map<string, number> } {
  const uniqueValues = [...new Set(values)].sort();
  const mapping = new Map<string, number>();
  uniqueValues.forEach((val, idx) => mapping.set(val, idx));
  
  const encoded = values.map(v => mapping.get(v) ?? -1);
  return { encoded, mapping };
}

/**
 * One-hot encodes categorical values
 */
export function oneHotEncode(values: string[]): { encoded: number[][]; categories: string[] } {
  const uniqueValues = [...new Set(values)].sort();
  const categories = uniqueValues;
  
  const encoded = values.map(v => {
    const oneHot = new Array(uniqueValues.length).fill(0);
    const idx = uniqueValues.indexOf(v);
    if (idx !== -1) oneHot[idx] = 1;
    return oneHot;
  });
  
  return { encoded, categories };
}

/**
 * Standardizes numeric data (z-score normalization)
 */
export function standardScale(values: number[]): { scaled: number[]; mean: number; std: number } {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);
  
  if (std === 0) {
    return { scaled: values.map(() => 0), mean, std: 1 };
  }
  
  const scaled = values.map(v => (v - mean) / std);
  return { scaled, mean, std };
}

/**
 * Min-max scales numeric data to [0, 1]
 */
export function minMaxScale(values: number[]): { scaled: number[]; min: number; max: number } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  
  if (range === 0) {
    return { scaled: values.map(() => 0.5), min, max };
  }
  
  const scaled = values.map(v => (v - min) / range);
  return { scaled, min, max };
}

/**
 * Handles missing values in numeric data
 */
export function handleMissingNumeric(
  values: (number | null)[],
  strategy: 'mean' | 'median' | 'zero' | 'remove'
): number[] {
  const validValues = values.filter(v => v !== null) as number[];
  
  if (strategy === 'remove') {
    return validValues;
  }
  
  let fillValue = 0;
  if (strategy === 'mean') {
    fillValue = validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
  } else if (strategy === 'median') {
    const sorted = [...validValues].sort((a, b) => a - b);
    fillValue = sorted[Math.floor(sorted.length / 2)];
  }
  
  return values.map(v => v ?? fillValue);
}

/**
 * Handles missing values in categorical data
 */
export function handleMissingCategorical(
  values: (string | null)[],
  strategy: 'mode' | 'remove'
): string[] {
  if (strategy === 'remove') {
    return values.filter(v => v !== null) as string[];
  }
  
  // Find mode (most common value)
  const validValues = values.filter(v => v !== null) as string[];
  const counts = new Map<string, number>();
  validValues.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
  
  let mode = validValues[0] || 'MISSING';
  let maxCount = 0;
  counts.forEach((count, value) => {
    if (count > maxCount) {
      maxCount = count;
      mode = value;
    }
  });
  
  return values.map(v => v ?? mode);
}

/**
 * Splits data into train/validation/test sets
 */
export function splitData<T>(
  data: T[],
  trainRatio: number,
  valRatio: number,
  testRatio: number,
  seed: number = 42
): { train: T[]; validation: T[]; test: T[] } {
  // Normalize ratios
  const total = trainRatio + valRatio + testRatio;
  const normTrain = trainRatio / total;
  const normVal = valRatio / total;
  
  // Shuffle data with seed
  const seededRandom = createSeededRandom(seed);
  const shuffled = [...data].sort(() => seededRandom() - 0.5);
  
  const n = shuffled.length;
  const trainEnd = Math.floor(n * normTrain);
  const valEnd = trainEnd + Math.floor(n * normVal);
  
  return {
    train: shuffled.slice(0, trainEnd),
    validation: shuffled.slice(trainEnd, valEnd),
    test: shuffled.slice(valEnd),
  };
}

/**
 * Creates a seeded random number generator
 */
function createSeededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

/**
 * Converts column data to numeric array, handling type conversion
 */
export function columnToNumeric(data: CsvRow[], columnName: string): (number | null)[] {
  return data.map(row => {
    const value = row[columnName];
    if (value === undefined || value === null || value.trim() === '') {
      return null;
    }
    const num = Number(value);
    return isNaN(num) ? null : num;
  });
}

/**
 * Validates preprocessing configuration
 */
export function validatePreprocessingConfig(
  config: DatasetPreprocessingConfig,
  columns: ColumnInfo[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check splits sum to 1
  const totalSplit = config.trainSplit + config.validationSplit + config.testSplit;
  if (Math.abs(totalSplit - 1.0) > 0.01) {
    errors.push('Train/validation/test splits must sum to 1.0');
  }
  
  // Check target column is selected
  if (!config.targetColumn) {
    errors.push('Target column must be selected');
  }
  
  // Check target column exists
  if (config.targetColumn && !columns.find(c => c.name === config.targetColumn)) {
    errors.push('Selected target column does not exist');
  }
  
  // Check at least one feature is selected
  const features = columns.filter(c => c.role === 'feature');
  if (features.length === 0) {
    errors.push('At least one feature column must be selected');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
