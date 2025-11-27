import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import { Pencil, Database, Zap, BarChart3, List, Cpu, BookOpen } from 'lucide-react';
import ModelCanvas from './ModelCanvas';
import DatasetTab from './tabs/DatasetTab';
import TrainTab from './tabs/TrainTab';
import MetricsTab from './tabs/MetricsTab';
import InferenceTab from './tabs/InferenceTab';
import InstructionsPanel from './tabs/InstructionsPanel';
import { InferenceProvider } from '../../contexts/InferenceContext';
import ModelSummaryTab from './tabs/ModelSummaryTab';
import { DatasetProvider } from '../../contexts/DatasetContext';
import { GraphProvider } from '../../contexts/GraphContext';
import TrainingConfigProvider from '../../contexts/TrainingConfigProvider';
import { ModelSummaryProvider } from '../../contexts/ModelSummaryContext';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../ui/tooltip';

export default function CanvasTabs() {
  const [activeTab, setActiveTab] = useState('canvas');
  const [showInstructions, setShowInstructions] = useState(false);
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
                  <div className="bg-background border-b border-border px-4 py-2 flex items-center justify-between">
                    <TabsList className="flex-1 flex items-center gap-2">
                      <TabsTrigger value="canvas" className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1 text-sm font-medium transition-colors hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-foreground">
                        <Pencil size={16} />
                        {t('canvas.tabs.canvas')}
                      </TabsTrigger>
                      <TabsTrigger value="summary" className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1 text-sm font-medium transition-colors hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-foreground">
                        <List size={16} />
                        {t('canvas.tabs.summary')}
                      </TabsTrigger>
                      <TabsTrigger value="dataset" className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1 text-sm font-medium transition-colors hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-foreground">
                        <Database size={16} />
                        {t('canvas.tabs.dataset')}
                      </TabsTrigger>
                      <TabsTrigger value="train" className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1 text-sm font-medium transition-colors hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-foreground">
                        <Zap size={16} />
                        {t('canvas.tabs.train')}
                      </TabsTrigger>
                      <TabsTrigger value="metrics" className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1 text-sm font-medium transition-colors hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-foreground">
                        <BarChart3 size={16} />
                        {t('canvas.tabs.metrics')}
                      </TabsTrigger>
                      <TabsTrigger value="inference" className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1 text-sm font-medium transition-colors hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-foreground">
                        <Cpu size={16} />
                        {t('canvas.tabs.inference')}
                      </TabsTrigger>
                    </TabsList>
                    {/* Instructions Button */}
                    <div className="ml-4 flex-shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild className="cursor-pointer">
                          <button
                            onClick={() => setShowInstructions(!showInstructions)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${showInstructions
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-accent text-muted-foreground hover:text-foreground'
                              }`}
                          >
                            <BookOpen size={16} />
                            {t('canvas.instructions.button')}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={6} className="bg-popover text-popover-foreground text-sm px-3 py-1.5 rounded-md shadow-lg">
                          {t('canvas.instructions.buttonTooltip')}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Tab Content with Instructions Panel */}
                  <div className="flex-1 min-h-0 overflow-hidden flex">
                    <div className={`flex-1 min-w-0 ${showInstructions ? '' : ''}`}>
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

                    {/* Instructions Panel */}
                    {showInstructions && (
                      <div className="w-96 flex-shrink-0 h-full">
                        <InstructionsPanel
                          activeTab={activeTab}
                          onClose={() => setShowInstructions(false)}
                        />
                      </div>
                    )}
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
