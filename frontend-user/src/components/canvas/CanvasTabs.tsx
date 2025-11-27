import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import { Pencil, Database, Zap, BarChart3, List, Cpu } from 'lucide-react';
import ModelCanvas from './ModelCanvas';
import DatasetTab from './tabs/DatasetTab';
import TrainTab from './tabs/TrainTab';
import MetricsTab from './tabs/MetricsTab';
import InferenceTab from './tabs/InferenceTab';
import { InferenceProvider } from '../../contexts/InferenceContext';
import ModelSummaryTab from './tabs/ModelSummaryTab';
import { DatasetProvider } from '../../contexts/DatasetContext';
import { GraphProvider } from '../../contexts/GraphContext';
import TrainingConfigProvider from '../../contexts/TrainingConfigProvider';
import { ModelSummaryProvider } from '../../contexts/ModelSummaryContext';
import { useTranslation } from 'react-i18next';

export default function CanvasTabs() {
  const [activeTab, setActiveTab] = useState('canvas');
  const { t } = useTranslation();

  return (
    <GraphProvider>
      <DatasetProvider>
        <TrainingConfigProvider>
          <ModelSummaryProvider>
            <InferenceProvider>
              <div className="h-full flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                  {/* Tab Headers */}
                  <div className="bg-background border-b border-border px-4 py-2">
                    <TabsList className="w-full justify-start">
                      <TabsTrigger value="canvas" className="flex items-center gap-2">
                        <Pencil size={16} />
                        {t('canvas.tabs.canvas')}
                      </TabsTrigger>
                      <TabsTrigger value="summary" className="flex items-center gap-2">
                        <List size={16} />
                        {t('canvas.tabs.summary')}
                      </TabsTrigger>
                      <TabsTrigger value="dataset" className="flex items-center gap-2">
                        <Database size={16} />
                        {t('canvas.tabs.dataset')}
                      </TabsTrigger>
                      <TabsTrigger value="train" className="flex items-center gap-2">
                        <Zap size={16} />
                        {t('canvas.tabs.train')}
                      </TabsTrigger>
                      <TabsTrigger value="metrics" className="flex items-center gap-2">
                        <BarChart3 size={16} />
                        {t('canvas.tabs.metrics')}
                      </TabsTrigger>
                      <TabsTrigger value="inference" className="flex items-center gap-2">
                        <Cpu size={16} />
                        {t('canvas.tabs.inference')}
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <TabsContent value="canvas" className="h-full m-0">
                      <ModelCanvas />
                    </TabsContent>

                    <TabsContent value="dataset" className="h-full m-0">
                      <DatasetTab />
                    </TabsContent>

                    <TabsContent value="train" className="h-full m-0">
                      <TrainTab />
                    </TabsContent>

                    <TabsContent value="metrics" className="h-full m-0">
                      <MetricsTab />
                    </TabsContent>

                    <TabsContent value="summary" className="h-full m-0">
                      <ModelSummaryTab />
                    </TabsContent>

                    <TabsContent value="inference" className="h-full m-0">
                      <InferenceTab />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </InferenceProvider>
          </ModelSummaryProvider>
        </TrainingConfigProvider>
      </DatasetProvider>
    </GraphProvider>
  );
}
