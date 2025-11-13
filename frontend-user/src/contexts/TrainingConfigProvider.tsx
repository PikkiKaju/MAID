import { useState, ReactNode } from 'react';
import { TrainingConfigContext, TrainingConfigState, EsMode } from './trainingConfigContext';

export default function TrainingConfigProvider({ children }: { children: ReactNode }) {
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
