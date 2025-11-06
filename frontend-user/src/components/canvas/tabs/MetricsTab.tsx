import { BarChart, TrendingUp, Award } from 'lucide-react';

export default function MetricsTab() {
  // Placeholder data - will be replaced with actual training results
  const metrics = {
    finalLoss: 0.234,
    finalAccuracy: 0.921,
    epochs: 10,
    trainingTime: '2m 34s',
  };

  return (
    <div className="h-full flex flex-col p-4 bg-slate-50">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800">Training Metrics</h2>
      </div>

      <div className="flex-1 overflow-auto">
        {/* No training data placeholder */}
        <div className="bg-white border rounded-lg p-8 text-center">
          <BarChart size={64} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No Training Data Available</h3>
          <p className="text-sm text-slate-500 mb-6">
            Train your model to see metrics and performance charts here
          </p>

          {/* Preview of what metrics will look like */}
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">Final Loss</span>
                  <TrendingUp size={16} className="text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{metrics.finalLoss}</p>
              </div>

              <div className="bg-slate-50 border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">Final Accuracy</span>
                  <Award size={16} className="text-green-500" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{(metrics.finalAccuracy * 100).toFixed(1)}%</p>
              </div>

              <div className="bg-slate-50 border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">Epochs</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{metrics.epochs}</p>
              </div>

              <div className="bg-slate-50 border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">Training Time</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{metrics.trainingTime}</p>
              </div>
            </div>

            <div className="bg-slate-50 border rounded-lg p-4 text-left">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Training History</h4>
              <div className="h-48 flex items-center justify-center border-2 border-dashed border-slate-300 rounded">
                <p className="text-xs text-slate-400">Loss & Accuracy charts will appear here</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
