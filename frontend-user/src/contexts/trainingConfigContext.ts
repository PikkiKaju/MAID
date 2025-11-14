import { createContext } from 'react';

export type EsMode = 'auto' | 'min' | 'max';

export type TrainingConfigState = {
  optimizer: string;
  setOptimizer: (v: string) => void;
  loss: string;
  setLoss: (v: string) => void;
  selectedMetrics: string[];
  setSelectedMetrics: (v: string[] | ((prev: string[]) => string[])) => void;
  epochs: number;
  setEpochs: (v: number) => void;
  batchSize: number;
  setBatchSize: (v: number) => void;
  learningRate: number | '';
  setLearningRate: (v: number | '') => void;
  shuffle: boolean;
  setShuffle: (v: boolean) => void;
  valBatchSize: number | '';
  setValBatchSize: (v: number | '') => void;
  useEarlyStopping: boolean;
  setUseEarlyStopping: (v: boolean) => void;
  esMonitor: string;
  setEsMonitor: (v: string) => void;
  esMode: EsMode;
  setEsMode: (v: EsMode) => void;
  esPatience: number;
  setEsPatience: (v: number) => void;
  esMinDelta: number;
  setEsMinDelta: (v: number) => void;
  esRestoreBest: boolean;
  setEsRestoreBest: (v: boolean) => void;
  useReduceLR: boolean;
  setUseReduceLR: (v: boolean) => void;
  rlrMonitor: string;
  setRlrMonitor: (v: string) => void;
  rlrFactor: number;
  setRlrFactor: (v: number) => void;
  rlrPatience: number;
  setRlrPatience: (v: number) => void;
  rlrMinLR: number;
  setRlrMinLR: (v: number) => void;
  // Training job state (persist across tabs)
  jobId: string | null;
  setJobId: (v: string | null) => void;
  jobStatus: string | null;
  setJobStatus: (v: string | null) => void;
  jobProgress: number | null;
  setJobProgress: (v: number | null) => void;
  jobError: string | null;
  setJobError: (v: string | null) => void;
  jobResult: unknown | null;
  setJobResult: (v: unknown | null) => void;
};

export const TrainingConfigContext = createContext<TrainingConfigState | undefined>(undefined);
