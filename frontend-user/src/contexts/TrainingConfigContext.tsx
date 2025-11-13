import { createContext, useState, ReactNode } from 'react';

type EsMode = 'auto' | 'min' | 'max';

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
};

export const TrainingConfigContext = createContext<TrainingConfigState | undefined>(undefined);

export function TrainingConfigProvider({ children }: { children: ReactNode }) {
  const [optimizer, setOptimizer] = useState<string>('adam');
  const [loss, setLoss] = useState<string>('MeanSquaredError');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['mae']);
  const [epochs, setEpochs] = useState<number>(10);
  const [batchSize, setBatchSize] = useState<number>(32);
  const [learningRate, setLearningRate] = useState<number | ''>('');
  const [shuffle, setShuffle] = useState<boolean>(true);
  const [valBatchSize, setValBatchSize] = useState<number | ''>('');
  const [useEarlyStopping, setUseEarlyStopping] = useState<boolean>(false);
  const [esMonitor, setEsMonitor] = useState<string>('val_loss');
  const [esMode, setEsMode] = useState<EsMode>('auto');
  const [esPatience, setEsPatience] = useState<number>(5);
  const [esMinDelta, setEsMinDelta] = useState<number>(0);
  const [esRestoreBest, setEsRestoreBest] = useState<boolean>(true);
  const [useReduceLR, setUseReduceLR] = useState<boolean>(false);
  const [rlrMonitor, setRlrMonitor] = useState<string>('val_loss');
  const [rlrFactor, setRlrFactor] = useState<number>(0.1);
  const [rlrPatience, setRlrPatience] = useState<number>(3);
  const [rlrMinLR, setRlrMinLR] = useState<number>(1e-6);

  const value: TrainingConfigState = {
    optimizer, setOptimizer,
    loss, setLoss,
    selectedMetrics, setSelectedMetrics,
    epochs, setEpochs,
    batchSize, setBatchSize,
    learningRate, setLearningRate,
    shuffle, setShuffle,
    valBatchSize, setValBatchSize,
    useEarlyStopping, setUseEarlyStopping,
    esMonitor, setEsMonitor,
    esMode, setEsMode,
    esPatience, setEsPatience,
    esMinDelta, setEsMinDelta,
    esRestoreBest, setEsRestoreBest,
    useReduceLR, setUseReduceLR,
    rlrMonitor, setRlrMonitor,
    rlrFactor, setRlrFactor,
    rlrPatience, setRlrPatience,
    rlrMinLR, setRlrMinLR,
  };

  return (
    <TrainingConfigContext.Provider value={value}>
      {children}
    </TrainingConfigContext.Provider>
  );
}
export default TrainingConfigProvider;
