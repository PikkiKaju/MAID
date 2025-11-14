import { useContext } from 'react';
import { TrainingConfigContext, TrainingConfigState } from './trainingConfigContext';

export function useTrainingConfig(): TrainingConfigState {
  const ctx = useContext(TrainingConfigContext);
  if (!ctx) throw new Error('useTrainingConfig must be used within TrainingConfigProvider');
  return ctx;
}
