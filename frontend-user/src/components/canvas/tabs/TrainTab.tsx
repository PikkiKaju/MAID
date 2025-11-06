import { useState } from 'react';
import { Play, Settings } from 'lucide-react';
import { Button } from '../../../ui/button';

export default function TrainTab() {
  const [optimizer, setOptimizer] = useState('adam');
  const [loss, setLoss] = useState('categorical_crossentropy');
  const [epochs, setEpochs] = useState(10);
  const [batchSize, setBatchSize] = useState(32);
  const [validationSplit, setValidationSplit] = useState(0.2);

  const handleStartTraining = () => {
    // TODO: Integrate with backend training API
    console.log('Starting training with:', {
      optimizer,
      loss,
      epochs,
      batchSize,
      validationSplit,
    });
    alert('Training will be implemented with backend integration');
  };

  return (
    <div className="h-full flex flex-col p-4 bg-slate-50">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Training Configuration</h2>
        <Button onClick={handleStartTraining}>
          <Play size={16} className="mr-2" />
          Start Training
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="bg-white border rounded-lg p-6 space-y-6">
          {/* Compilation Settings */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Settings size={18} className="text-slate-600" />
              <h3 className="font-semibold text-slate-700">Compilation Settings</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Optimizer
                </label>
                <select
                  value={optimizer}
                  onChange={(e) => setOptimizer(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="adam">Adam</option>
                  <option value="sgd">SGD</option>
                  <option value="rmsprop">RMSprop</option>
                  <option value="adagrad">Adagrad</option>
                  <option value="adadelta">Adadelta</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Loss Function
                </label>
                <select
                  value={loss}
                  onChange={(e) => setLoss(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="categorical_crossentropy">Categorical Crossentropy</option>
                  <option value="binary_crossentropy">Binary Crossentropy</option>
                  <option value="sparse_categorical_crossentropy">Sparse Categorical Crossentropy</option>
                  <option value="mse">Mean Squared Error</option>
                  <option value="mae">Mean Absolute Error</option>
                </select>
              </div>
            </div>
          </div>

          {/* Training Parameters */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-4">Training Parameters</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Epochs
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={epochs}
                  onChange={(e) => setEpochs(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Batch Size
                </label>
                <input
                  type="number"
                  min="1"
                  max="512"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Validation Split
                </label>
                <input
                  type="number"
                  min="0"
                  max="0.5"
                  step="0.05"
                  value={validationSplit}
                  onChange={(e) => setValidationSplit(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Fraction of data to use for validation (0.0 - 0.5)
                </p>
              </div>
            </div>
          </div>

          {/* Metrics Selection */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-4">Metrics</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked className="rounded" />
                <span>Accuracy</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" />
                <span>Precision</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" />
                <span>Recall</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" />
                <span>F1 Score</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
