/**
 * Componente para exibir resultados dos testes interativos do dispositivo
 * Usado na página pública de compartilhamento de ordens de serviço
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  MinusCircle,
  Smartphone,
  Fingerprint,
  Volume2,
  Camera,
  Vibrate,
  Battery,
  Wifi,
  Move3D,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react';
import type { TestResults, TestResult } from '@/types/deviceTest';

interface TestResultsDisplayProps {
  results: TestResults;
  overallScore?: number | null;
  completedAt?: string | null;
}

// Configuração dos testes com ícones e labels
const testConfig: Record<string, { label: string; icon: React.ComponentType<any>; category: string }> = {
  touch: { label: 'Touch Screen', icon: Fingerprint, category: 'display' },
  display_touch: { label: 'Touch Screen', icon: Fingerprint, category: 'display' },
  colors: { label: 'Cores/Dead Pixels', icon: Smartphone, category: 'display' },
  display_colors: { label: 'Cores/Dead Pixels', icon: Smartphone, category: 'display' },
  speaker: { label: 'Alto-falante', icon: Volume2, category: 'audio' },
  audio_speaker: { label: 'Alto-falante', icon: Volume2, category: 'audio' },
  microphone: { label: 'Microfone', icon: Volume2, category: 'audio' },
  audio_mic: { label: 'Microfone', icon: Volume2, category: 'audio' },
  camera_front: { label: 'Câmera Frontal', icon: Camera, category: 'camera' },
  camera_back: { label: 'Câmera Traseira', icon: Camera, category: 'camera' },
  vibration: { label: 'Vibração', icon: Vibrate, category: 'hardware' },
  buttons: { label: 'Botões', icon: Smartphone, category: 'hardware' },
  battery: { label: 'Bateria', icon: Battery, category: 'hardware' },
  sensors: { label: 'Sensores', icon: Move3D, category: 'hardware' },
  wifi: { label: 'Wi-Fi', icon: Wifi, category: 'connectivity' },
};

const categoryConfig: Record<string, { label: string; emoji: string }> = {
  display: { label: 'Tela', emoji: '📱' },
  audio: { label: 'Áudio', emoji: '🔊' },
  camera: { label: 'Câmeras', emoji: '📸' },
  hardware: { label: 'Hardware', emoji: '⚙️' },
  connectivity: { label: 'Conectividade', emoji: '📶' },
};

const getStatusIcon = (status: TestResult['status']) => {
  switch (status) {
    case 'passed':
      return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'skipped':
      return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
    default:
      return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusLabel = (status: TestResult['status']): string => {
  switch (status) {
    case 'passed':
      return 'OK';
    case 'failed':
      return 'Falhou';
    case 'skipped':
      return 'Pulado';
    default:
      return 'N/A';
  }
};

const formatDetailValue = (key: string, value: any): string => {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (key === "duration_ms" || key === "recordingDuration") {
    return `${(Number(value) / 1000).toFixed(1)}s`;
  }
  if (key === "completionRate") {
    return `${Number(value).toFixed(1)}%`;
  }
  if (key === "level") {
    return `${value}%`;
  }
  if (typeof value === "object") {
    if (value.width && value.height) {
      return `${value.width}x${value.height}`;
    }
    return JSON.stringify(value);
  }
  return String(value);
};

const getDetailLabel = (key: string): string => {
  const labels: Record<string, string> = {
    touchedCells: "Áreas tocadas",
    totalCells: "Total de áreas",
    completionRate: "Taxa de conclusão",
    duration_ms: "Duração",
    passedCount: "OK",
    totalColors: "Total de cores",
    recordingDuration: "Duração gravação",
    maxLevel: "Nível máximo",
    quality: "Qualidade áudio",
    facing: "Câmera",
    resolution: "Resolução",
    flashUsed: "Flash usado",
    totalPatterns: "Total padrões",
    testedCount: "Total testados",
    workingCount: "Funcionando",
    level: "Nível bateria",
    charging: "Carregando",
    estimatedAmps: "Amperagem",
    estimatedVolts: "Voltagem",
    estimatedWatts: "Wattagem",
    chargingSpeed: "Velocidade carga",
    hasMovement: "Movimento",
    accelerometer: "Acelerômetro",
    gyroscope: "Giroscópio",
    proximityTested: "Proximidade",
  };
  return labels[key] || key;
};

export const TestResultsDisplay: React.FC<TestResultsDisplayProps> = ({
  results,
  overallScore,
  completedAt
}) => {
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

  const toggleExpanded = (testId: string) => {
    setExpandedTests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        newSet.add(testId);
      }
      return newSet;
    });
  };

  // Agrupar resultados por categoria
  const groupedResults = Object.entries(results).reduce((acc, [testId, result]) => {
    const config = testConfig[testId];
    const category = config?.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push({ testId, result, config });
    return acc;
  }, {} as Record<string, Array<{ testId: string; result: TestResult; config: typeof testConfig[string] | undefined }>>);

  const categories = Object.keys(groupedResults).filter(c => (groupedResults[c]?.length ?? 0) > 0);
  
  if (categories.length === 0) {
    return null;
  }

  const defaultCategory = categories[0] ?? 'display';

  // Calcular estatísticas
  const allResults = Object.values(results);
  const passed = allResults.filter(r => r.status === 'passed').length;
  const failed = allResults.filter(r => r.status === 'failed').length;
  const skipped = allResults.filter(r => r.status === 'skipped').length;
  const total = passed + failed;
  const scorePercent = total > 0 ? (passed / total) * 100 : 0;

  const renderDetails = (details: Record<string, any> | undefined) => {
    if (!details || Object.keys(details).length === 0) return null;

    // Filter out internal/uninteresting keys
    const displayKeys = Object.keys(details).filter(key => 
      !['state', 'reason', 'hasCapturedImage', 'patterns', 'colors', 'buttons', 'autoDetected', 'manualTested', 'testedPatterns', 'accelerometerValues', 'gyroscopeValues'].includes(key)
    );

    if (displayKeys.length === 0) return null;

    return (
      <div className="grid grid-cols-2 gap-2 mt-2">
        {displayKeys.slice(0, 6).map(key => (
          <div key={key} className="bg-muted/30 rounded-md px-2 py-1">
            <p className="text-[10px] text-muted-foreground">{getDetailLabel(key)}</p>
            <p className="text-xs font-mono font-medium">{formatDetailValue(key, details[key])}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="border-border/30 bg-muted/20 mb-8">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4 text-primary" />
            <span>Teste de Funcionamento</span>
          </CardTitle>
          {overallScore !== null && overallScore !== undefined && (
            <Badge 
              variant="outline" 
              className={overallScore >= 70 
                ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                : 'bg-red-500/10 text-red-600 border-red-500/30'
              }
            >
              Score: {overallScore.toFixed(0)}%
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Teste interativo realizado pelo cliente
          {completedAt && ` em ${new Date(completedAt).toLocaleDateString('pt-BR')}`}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barra de progresso geral */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Funcionalidades OK</span>
            <span className="font-medium text-foreground">{passed}/{total}</span>
          </div>
          <Progress 
            value={scorePercent} 
            className="h-2"
          />
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              {passed} OK
            </span>
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="h-3 w-3" />
              {failed} Falhou
            </span>
            {skipped > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <MinusCircle className="h-3 w-3" />
                {skipped} Pulado
              </span>
            )}
          </div>
        </div>

        {/* Tabs por categoria */}
        <Tabs defaultValue={defaultCategory} className="w-full">
          <TabsList className="grid w-full gap-1 h-auto p-1" style={{ 
            gridTemplateColumns: `repeat(${Math.min(categories.length, 4)}, minmax(0, 1fr))` 
          }}>
            {categories.map((category) => {
              const catConfig = categoryConfig[category];
              return (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="flex flex-col items-center gap-1 p-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-h-[50px]"
                >
                  <span className="text-sm">{catConfig?.emoji || '📦'}</span>
                  <span className="text-[10px] sm:text-xs">{catConfig?.label || category}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category} value={category} className="mt-4">
              <div className="space-y-2">
                {groupedResults[category]?.map(({ testId, result, config }) => {
                  const TestIcon = config?.icon || Smartphone;
                  const hasDetails = result.details && Object.keys(result.details).length > 0;
                  const isExpanded = expandedTests.has(testId);

                  return (
                    <Collapsible 
                      key={testId} 
                      open={isExpanded} 
                      onOpenChange={() => hasDetails && toggleExpanded(testId)}
                    >
                      <div
                        className={`rounded-lg border transition-colors ${
                          result.status === 'passed'
                            ? 'bg-green-500/5 border-green-500/20'
                            : result.status === 'failed'
                            ? 'bg-red-500/5 border-red-500/20'
                            : 'bg-muted/30 border-border/20'
                        }`}
                      >
                        <CollapsibleTrigger 
                          className="flex items-center gap-3 p-3 w-full"
                          disabled={!hasDetails}
                        >
                          <TestIcon className={`h-4 w-4 flex-shrink-0 ${
                            result.status === 'passed'
                              ? 'text-green-600 dark:text-green-400'
                              : result.status === 'failed'
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                          }`} />
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-medium text-foreground truncate">
                              {config?.label || testId}
                            </p>
                            {/* Quick info preview */}
                            {result.details?.level !== undefined && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Battery className="h-3 w-3" />
                                {result.details.level}%
                                {result.details.charging && (
                                  <>
                                    <Zap className="h-3 w-3 text-primary" />
                                    {result.details.estimatedWatts && `~${result.details.estimatedWatts}W`}
                                  </>
                                )}
                              </p>
                            )}
                            {result.details?.resolution && (
                              <p className="text-xs text-muted-foreground">
                                {result.details.resolution.width}x{result.details.resolution.height}
                              </p>
                            )}
                            {result.details?.quality && (
                              <p className="text-xs text-muted-foreground">
                                Qualidade: {result.details.quality}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {getStatusIcon(result.status)}
                            <span className={`text-xs font-medium ${
                              result.status === 'passed'
                                ? 'text-green-600 dark:text-green-400'
                                : result.status === 'failed'
                                ? 'text-destructive'
                                : 'text-muted-foreground'
                            }`}>
                              {getStatusLabel(result.status)}
                            </span>
                            {hasDetails && (
                              isExpanded 
                                ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-1" />
                                : <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
                            )}
                          </div>
                        </CollapsibleTrigger>

                        {hasDetails && (
                          <CollapsibleContent className="px-3 pb-3">
                            {renderDetails(result.details)}
                          </CollapsibleContent>
                        )}
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TestResultsDisplay;
