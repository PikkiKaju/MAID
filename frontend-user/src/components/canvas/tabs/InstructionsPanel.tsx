import { X, BookOpen, Lightbulb, AlertCircle, CheckCircle2, ArrowRight, MousePointer, Image as ImageIcon, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../ui/button';
import { cn } from '../../../utils/tailwind';

interface InstructionsPanelProps {
    activeTab: string;
    onClose: () => void;
}

/**
 * Placeholder component for instruction images.
 * Replace the src with actual screenshots when available.
 */
function InstructionImage({
    alt,
    placeholderText,
    className
}: {
    alt: string;
    placeholderText: string;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "relative bg-muted/50 border border-border rounded-lg overflow-hidden flex items-center justify-center",
                "min-h-[120px] my-3",
                className
            )}
        >
            {/* Replace this with actual image when available */}
            <div className="flex flex-col items-center gap-2 p-4 text-center">
                <ImageIcon size={32} className="text-muted-foreground/50" />
                <span className="text-xs text-muted-foreground">{placeholderText}</span>
                <span className="text-[10px] text-muted-foreground/70">{alt}</span>
            </div>
            {/* Uncomment and use this when you have actual images:
      <img 
        src={src} 
        alt={alt} 
        className="w-full h-auto object-contain"
      /> 
      */}
        </div>
    );
}

/**
 * Section component for organizing instruction content
 */
function InstructionSection({
    title,
    icon: Icon,
    children,
    variant = 'default'
}: {
    title: string;
    icon?: React.ComponentType<{ size?: number; className?: string }>;
    children: React.ReactNode;
    variant?: 'default' | 'tip' | 'warning' | 'success';
}) {
    const variantStyles = {
        default: 'bg-card border-border',
        tip: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
        warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
        success: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    };

    const iconStyles = {
        default: 'text-primary',
        tip: 'text-blue-600 dark:text-blue-400',
        warning: 'text-amber-600 dark:text-amber-400',
        success: 'text-emerald-600 dark:text-emerald-400',
    };

    return (
        <div className={cn("border rounded-lg p-4 mb-4", variantStyles[variant])}>
            <div className="flex items-center gap-2 mb-3">
                {Icon && <Icon size={18} className={iconStyles[variant]} />}
                <h3 className="font-semibold text-foreground text-sm">{title}</h3>
            </div>
            <div className="text-sm text-foreground/90 space-y-2">
                {children}
            </div>
        </div>
    );
}

/**
 * Step-by-step instruction list
 */
function StepList({ steps }: { steps: string[] }) {
    return (
        <ol className="list-none space-y-2 ml-0">
            {steps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                        {index + 1}
                    </span>
                    <span className="text-sm text-foreground/90 pt-0.5">{step}</span>
                </li>
            ))}
        </ol>
    );
}

/**
 * Canvas tab instructions - for building neural network models
 */
function CanvasInstructions() {
    const { t } = useTranslation();

    return (
        <>
            <InstructionSection title={t('canvas.instructions.canvas.overview.title')} icon={BookOpen}>
                <p>{t('canvas.instructions.canvas.overview.description')}</p>
                <InstructionImage
                    alt="Model Canvas Overview"
                    placeholderText={t('canvas.instructions.canvas.overview.imagePlaceholder')}
                />
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.canvas.gettingStarted.title')} icon={MousePointer}>
                <StepList steps={[
                    t('canvas.instructions.canvas.gettingStarted.step1'),
                    t('canvas.instructions.canvas.gettingStarted.step2'),
                    t('canvas.instructions.canvas.gettingStarted.step3'),
                    t('canvas.instructions.canvas.gettingStarted.step4'),
                    t('canvas.instructions.canvas.gettingStarted.step5'),
                ]} />
                <InstructionImage
                    alt="Drag and drop layers"
                    placeholderText={t('canvas.instructions.canvas.gettingStarted.imagePlaceholder')}
                />
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.canvas.layers.title')} icon={BookOpen}>
                <p className="mb-2">{t('canvas.instructions.canvas.layers.description')}</p>
                <ul className="list-disc ml-5 space-y-1 text-sm">
                    <li><strong>Input:</strong> {t('canvas.instructions.canvas.layers.input')}</li>
                    <li><strong>Dense:</strong> {t('canvas.instructions.canvas.layers.dense')}</li>
                    <li><strong>Conv2D:</strong> {t('canvas.instructions.canvas.layers.conv2d')}</li>
                    <li><strong>MaxPooling2D:</strong> {t('canvas.instructions.canvas.layers.maxpool')}</li>
                    <li><strong>Dropout:</strong> {t('canvas.instructions.canvas.layers.dropout')}</li>
                    <li><strong>Flatten:</strong> {t('canvas.instructions.canvas.layers.flatten')}</li>
                    <li><strong>BatchNormalization:</strong> {t('canvas.instructions.canvas.layers.batchnorm')}</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">{t('canvas.instructions.canvas.layers.examplesNote')}</p>
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.canvas.tips.title')} icon={Lightbulb} variant="tip">
                <ul className="list-disc ml-5 space-y-1">
                    <li>{t('canvas.instructions.canvas.tips.tip1')}</li>
                    <li>{t('canvas.instructions.canvas.tips.tip2')}</li>
                    <li>{t('canvas.instructions.canvas.tips.tip3')}</li>
                    <li>{t('canvas.instructions.canvas.tips.tip4')}</li>
                </ul>
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.canvas.toolbar.title')} icon={BookOpen}>
                <ul className="list-disc ml-5 space-y-1">
                    <li><strong>{t('canvas.instructions.canvas.toolbar.save')}:</strong> {t('canvas.instructions.canvas.toolbar.saveDesc')}</li>
                    <li><strong>{t('canvas.instructions.canvas.toolbar.load')}:</strong> {t('canvas.instructions.canvas.toolbar.loadDesc')}</li>
                    <li><strong>{t('canvas.instructions.canvas.toolbar.compile')}:</strong> {t('canvas.instructions.canvas.toolbar.compileDesc')}</li>
                    <li><strong>{t('canvas.instructions.canvas.toolbar.importExport')}:</strong> {t('canvas.instructions.canvas.toolbar.importExportDesc')}</li>
                </ul>
            </InstructionSection>
        </>
    );
}

/**
 * Model Summary tab instructions
 */
function SummaryInstructions() {
    const { t } = useTranslation();

    return (
        <>
            <InstructionSection title={t('canvas.instructions.summary.overview.title')} icon={BookOpen}>
                <p>{t('canvas.instructions.summary.overview.description')}</p>
                <InstructionImage
                    alt="Model Summary View"
                    placeholderText={t('canvas.instructions.summary.overview.imagePlaceholder')}
                />
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.summary.howToUse.title')} icon={MousePointer}>
                <StepList steps={[
                    t('canvas.instructions.summary.howToUse.step1'),
                    t('canvas.instructions.summary.howToUse.step2'),
                    t('canvas.instructions.summary.howToUse.step3'),
                ]} />
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.summary.understanding.title')} icon={BookOpen}>
                <ul className="list-disc ml-5 space-y-1">
                    <li><strong>{t('canvas.instructions.summary.understanding.layerType')}:</strong> {t('canvas.instructions.summary.understanding.layerTypeDesc')}</li>
                    <li><strong>{t('canvas.instructions.summary.understanding.outputShape')}:</strong> {t('canvas.instructions.summary.understanding.outputShapeDesc')}</li>
                    <li><strong>{t('canvas.instructions.summary.understanding.params')}:</strong> {t('canvas.instructions.summary.understanding.paramsDesc')}</li>
                </ul>
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.summary.tips.title')} icon={Lightbulb} variant="tip">
                <ul className="list-disc ml-5 space-y-1">
                    <li>{t('canvas.instructions.summary.tips.tip1')}</li>
                    <li>{t('canvas.instructions.summary.tips.tip2')}</li>
                    <li>{t('canvas.instructions.summary.tips.tip3')}</li>
                </ul>
            </InstructionSection>
        </>
    );
}

/**
 * Dataset tab instructions
 */
function DatasetInstructions() {
    const { t } = useTranslation();

    return (
        <>
            <InstructionSection title={t('canvas.instructions.dataset.overview.title')} icon={BookOpen}>
                <p>{t('canvas.instructions.dataset.overview.description')}</p>
                <InstructionImage
                    alt="Dataset Manager"
                    placeholderText={t('canvas.instructions.dataset.overview.imagePlaceholder')}
                />
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.dataset.uploading.title')} icon={MousePointer}>
                <StepList steps={[
                    t('canvas.instructions.dataset.uploading.step1'),
                    t('canvas.instructions.dataset.uploading.step2'),
                    t('canvas.instructions.dataset.uploading.step3'),
                ]} />
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.dataset.columnConfig.title')} icon={BookOpen}>
                <p className="mb-2">{t('canvas.instructions.dataset.columnConfig.description')}</p>
                <ul className="list-disc ml-5 space-y-1">
                    <li><strong>{t('canvas.instructions.dataset.columnConfig.feature')}:</strong> {t('canvas.instructions.dataset.columnConfig.featureDesc')}</li>
                    <li><strong>{t('canvas.instructions.dataset.columnConfig.target')}:</strong> {t('canvas.instructions.dataset.columnConfig.targetDesc')}</li>
                    <li><strong>{t('canvas.instructions.dataset.columnConfig.ignore')}:</strong> {t('canvas.instructions.dataset.columnConfig.ignoreDesc')}</li>
                </ul>
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.dataset.preprocessing.title')} icon={BookOpen}>
                <p className="mb-2">{t('canvas.instructions.dataset.preprocessing.description')}</p>
                <ul className="list-disc ml-5 space-y-2">
                    <li>
                        <strong>{t('canvas.instructions.dataset.preprocessing.encoding')}:</strong>
                        <ul className="list-disc ml-5 mt-1">
                            <li>{t('canvas.instructions.dataset.preprocessing.labelEncoding')}</li>
                            <li>{t('canvas.instructions.dataset.preprocessing.oneHotEncoding')}</li>
                        </ul>
                    </li>
                    <li>
                        <strong>{t('canvas.instructions.dataset.preprocessing.missing')}:</strong>
                        <span> {t('canvas.instructions.dataset.preprocessing.missingDesc')}</span>
                    </li>
                    <li>
                        <strong>{t('canvas.instructions.dataset.preprocessing.normalization')}:</strong>
                        <ul className="list-disc ml-5 mt-1">
                            <li>{t('canvas.instructions.dataset.preprocessing.standard')}</li>
                            <li>{t('canvas.instructions.dataset.preprocessing.minmax')}</li>
                        </ul>
                    </li>
                </ul>
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.dataset.splitting.title')} icon={BookOpen}>
                <p>{t('canvas.instructions.dataset.splitting.description')}</p>
                <ul className="list-disc ml-5 space-y-1 mt-2">
                    <li><strong>{t('canvas.instructions.dataset.splitting.train')}:</strong> {t('canvas.instructions.dataset.splitting.trainDesc')}</li>
                    <li><strong>{t('canvas.instructions.dataset.splitting.validation')}:</strong> {t('canvas.instructions.dataset.splitting.validationDesc')}</li>
                    <li><strong>{t('canvas.instructions.dataset.splitting.test')}:</strong> {t('canvas.instructions.dataset.splitting.testDesc')}</li>
                </ul>
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.dataset.important.title')} icon={AlertCircle} variant="warning">
                <ul className="list-disc ml-5 space-y-1">
                    <li>{t('canvas.instructions.dataset.important.warning1')}</li>
                    <li>{t('canvas.instructions.dataset.important.warning2')}</li>
                    <li>{t('canvas.instructions.dataset.important.warning3')}</li>
                </ul>
            </InstructionSection>
        </>
    );
}

/**
 * Train tab instructions
 */
function TrainInstructions() {
    const { t } = useTranslation();

    return (
        <>
            <InstructionSection title={t('canvas.instructions.train.overview.title')} icon={BookOpen}>
                <p>{t('canvas.instructions.train.overview.description')}</p>
                <InstructionImage
                    alt="Training Configuration"
                    placeholderText={t('canvas.instructions.train.overview.imagePlaceholder')}
                />
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.train.beforeTraining.title')} icon={CheckCircle2} variant="success">
                <p className="mb-2">{t('canvas.instructions.train.beforeTraining.description')}</p>
                <ul className="list-disc ml-5 space-y-1">
                    <li>{t('canvas.instructions.train.beforeTraining.req1')}</li>
                    <li>{t('canvas.instructions.train.beforeTraining.req2')}</li>
                    <li>{t('canvas.instructions.train.beforeTraining.req3')}</li>
                </ul>
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.train.compilation.title')} icon={BookOpen}>
                <ul className="list-disc ml-5 space-y-2">
                    <li>
                        <strong>{t('canvas.instructions.train.compilation.optimizer')}:</strong>
                        <span> {t('canvas.instructions.train.compilation.optimizerDesc')}</span>
                    </li>
                    <li>
                        <strong>{t('canvas.instructions.train.compilation.loss')}:</strong>
                        <ul className="list-disc ml-5 mt-1">
                            <li>{t('canvas.instructions.train.compilation.lossRegression')}</li>
                            <li>{t('canvas.instructions.train.compilation.lossBinary')}</li>
                            <li>{t('canvas.instructions.train.compilation.lossMulticlass')}</li>
                        </ul>
                    </li>
                </ul>
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.train.hyperparameters.title')} icon={BookOpen}>
                <ul className="list-disc ml-5 space-y-1">
                    <li><strong>{t('canvas.instructions.train.hyperparameters.epochs')}:</strong> {t('canvas.instructions.train.hyperparameters.epochsDesc')}</li>
                    <li><strong>{t('canvas.instructions.train.hyperparameters.batchSize')}:</strong> {t('canvas.instructions.train.hyperparameters.batchSizeDesc')}</li>
                    <li><strong>{t('canvas.instructions.train.hyperparameters.learningRate')}:</strong> {t('canvas.instructions.train.hyperparameters.learningRateDesc')}</li>
                </ul>
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.train.callbacks.title')} icon={BookOpen}>
                <ul className="list-disc ml-5 space-y-2">
                    <li>
                        <strong>{t('canvas.instructions.train.callbacks.earlyStopping')}:</strong>
                        <span> {t('canvas.instructions.train.callbacks.earlyStoppingDesc')}</span>
                    </li>
                    <li>
                        <strong>{t('canvas.instructions.train.callbacks.reduceLr')}:</strong>
                        <span> {t('canvas.instructions.train.callbacks.reduceLrDesc')}</span>
                    </li>
                </ul>
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.train.tips.title')} icon={Lightbulb} variant="tip">
                <ul className="list-disc ml-5 space-y-1">
                    <li>{t('canvas.instructions.train.tips.tip1')}</li>
                    <li>{t('canvas.instructions.train.tips.tip2')}</li>
                    <li>{t('canvas.instructions.train.tips.tip3')}</li>
                    <li>{t('canvas.instructions.train.tips.tip4')}</li>
                </ul>
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.train.metricsTitle')} icon={BarChart3} variant="tip">
                <p className="mb-0 text-sm">{t('canvas.instructions.train.metricsBlurb')}</p>
            </InstructionSection>
        </>
    );
}

/**
 * Metrics tab instructions
 */
function MetricsInstructions() {
    const { t } = useTranslation();

    return (
        <>
            <InstructionSection title={t('canvas.instructions.metrics.overview.title')} icon={BookOpen}>
                <p>{t('canvas.instructions.metrics.overview.description')}</p>
                <InstructionImage
                    alt="Metrics Dashboard"
                    placeholderText={t('canvas.instructions.metrics.overview.imagePlaceholder')}
                />
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.metrics.keyMetrics.title')} icon={BookOpen}>
                <ul className="list-disc ml-5 space-y-2">
                    <li>
                        <strong>{t('canvas.instructions.metrics.keyMetrics.loss')}:</strong>
                        <span> {t('canvas.instructions.metrics.keyMetrics.lossDesc')}</span>
                    </li>
                    <li>
                        <strong>{t('canvas.instructions.metrics.keyMetrics.accuracy')}:</strong>
                        <span> {t('canvas.instructions.metrics.keyMetrics.accuracyDesc')}</span>
                    </li>
                    <li>
                        <strong>{t('canvas.instructions.metrics.keyMetrics.valMetrics')}:</strong>
                        <span> {t('canvas.instructions.metrics.keyMetrics.valMetricsDesc')}</span>
                    </li>
                </ul>
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.metrics.charts.title')} icon={BookOpen}>
                <p>{t('canvas.instructions.metrics.charts.description')}</p>
                <ul className="list-disc ml-5 space-y-1 mt-2">
                    <li>{t('canvas.instructions.metrics.charts.lossChart')}</li>
                    <li>{t('canvas.instructions.metrics.charts.accuracyChart')}</li>
                    <li>{t('canvas.instructions.metrics.charts.confusionMatrix')}</li>
                    <li>{t('canvas.instructions.metrics.charts.rocCurve')}</li>
                </ul>
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.metrics.interpreting.title')} icon={Lightbulb} variant="tip">
                <ul className="list-disc ml-5 space-y-1">
                    <li>{t('canvas.instructions.metrics.interpreting.tip1')}</li>
                    <li>{t('canvas.instructions.metrics.interpreting.tip2')}</li>
                    <li>{t('canvas.instructions.metrics.interpreting.tip3')}</li>
                    <li>{t('canvas.instructions.metrics.interpreting.tip4')}</li>
                </ul>
            </InstructionSection>
        </>
    );
}

/**
 * Inference tab instructions
 */
function InferenceInstructions() {
    const { t } = useTranslation();

    return (
        <>
            <InstructionSection title={t('canvas.instructions.inference.overview.title')} icon={BookOpen}>
                <p>{t('canvas.instructions.inference.overview.description')}</p>
                <InstructionImage
                    alt="Inference Interface"
                    placeholderText={t('canvas.instructions.inference.overview.imagePlaceholder')}
                />
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.inference.prerequisites.title')} icon={CheckCircle2} variant="success">
                <ul className="list-disc ml-5 space-y-1">
                    <li>{t('canvas.instructions.inference.prerequisites.req1')}</li>
                    <li>{t('canvas.instructions.inference.prerequisites.req2')}</li>
                    <li>{t('canvas.instructions.inference.prerequisites.req3')}</li>
                </ul>
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.inference.inputMethods.title')} icon={BookOpen}>
                <p className="mb-2">{t('canvas.instructions.inference.inputMethods.description')}</p>
                <ul className="list-disc ml-5 space-y-2">
                    <li>
                        <strong>{t('canvas.instructions.inference.inputMethods.json')}:</strong>
                        <span> {t('canvas.instructions.inference.inputMethods.jsonDesc')}</span>
                    </li>
                    <li>
                        <strong>{t('canvas.instructions.inference.inputMethods.csv')}:</strong>
                        <span> {t('canvas.instructions.inference.inputMethods.csvDesc')}</span>
                    </li>
                </ul>
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.inference.howToUse.title')} icon={MousePointer}>
                <StepList steps={[
                    t('canvas.instructions.inference.howToUse.step1'),
                    t('canvas.instructions.inference.howToUse.step2'),
                    t('canvas.instructions.inference.howToUse.step3'),
                    t('canvas.instructions.inference.howToUse.step4'),
                    t('canvas.instructions.inference.howToUse.step5'),
                ]} />
            </InstructionSection>

            <InstructionSection title={t('canvas.instructions.inference.tips.title')} icon={Lightbulb} variant="tip">
                <ul className="list-disc ml-5 space-y-1">
                    <li>{t('canvas.instructions.inference.tips.tip1')}</li>
                    <li>{t('canvas.instructions.inference.tips.tip2')}</li>
                    <li>{t('canvas.instructions.inference.tips.tip3')}</li>
                </ul>
            </InstructionSection>
        </>
    );
}

/**
 * Main Instructions Panel component
 */
export default function InstructionsPanel({ activeTab, onClose }: InstructionsPanelProps) {
    const { t } = useTranslation();

    const getInstructionsContent = () => {
        switch (activeTab) {
            case 'canvas':
                return <CanvasInstructions />;
            case 'summary':
                return <SummaryInstructions />;
            case 'dataset':
                return <DatasetInstructions />;
            case 'train':
                return <TrainInstructions />;
            case 'metrics':
                return <MetricsInstructions />;
            case 'inference':
                return <InferenceInstructions />;
            default:
                return <CanvasInstructions />;
        }
    };

    const getTabTitle = () => {
        switch (activeTab) {
            case 'canvas':
                return t('canvas.tabs.canvas');
            case 'summary':
                return t('canvas.tabs.summary');
            case 'dataset':
                return t('canvas.tabs.dataset');
            case 'train':
                return t('canvas.tabs.train');
            case 'metrics':
                return t('canvas.tabs.metrics');
            case 'inference':
                return t('canvas.tabs.inference');
            default:
                return t('canvas.tabs.canvas');
        }
    };

    return (
        <div className="h-full flex flex-col bg-card border-l border-border">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                    <BookOpen size={18} className="text-primary" />
                    <div>
                        <h2 className="font-semibold text-foreground text-sm">{t('canvas.instructions.title')}</h2>
                        <p className="text-xs text-muted-foreground">
                            {getTabTitle()}
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                    <X size={16} />
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {getInstructionsContent()}

                {/* Quick Navigation */}
                <div className="mt-6 pt-4 border-t border-border">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        {t('canvas.instructions.workflow.title')}
                    </h4>
                    <div className="flex flex-wrap gap-2 text-xs">
                        <span className={`px-2 py-1 rounded-full flex items-center gap-1 ${activeTab === 'canvas' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            1. {t('canvas.tabs.canvas')}
                        </span>
                        <ArrowRight size={12} className="text-muted-foreground self-center" />
                        <span className={`px-2 py-1 rounded-full flex items-center gap-1 ${activeTab === 'summary' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            2. {t('canvas.tabs.summary')}
                        </span>
                        <ArrowRight size={12} className="text-muted-foreground self-center" />
                        <span className={`px-2 py-1 rounded-full flex items-center gap-1 ${activeTab === 'dataset' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            3. {t('canvas.tabs.dataset')}
                        </span>
                        <ArrowRight size={12} className="text-muted-foreground self-center" />
                        <span className={`px-2 py-1 rounded-full flex items-center gap-1 ${activeTab === 'train' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            4. {t('canvas.tabs.train')}
                        </span>
                        <ArrowRight size={12} className="text-muted-foreground self-center" />
                        <span className={`px-2 py-1 rounded-full flex items-center gap-1 ${activeTab === 'metrics' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            5. {t('canvas.tabs.metrics')}
                        </span>
                        <ArrowRight size={12} className="text-muted-foreground self-center" />
                        <span className={`px-2 py-1 rounded-full flex items-center gap-1 ${activeTab === 'inference' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            6. {t('canvas.tabs.inference')}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
