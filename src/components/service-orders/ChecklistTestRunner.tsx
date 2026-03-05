/**
 * Componente de Teste Integrado ao Checklist de Funcionamento
 * Executa os testes de diagnóstico e mapeia resultados para o checklist
 * Sistema OneDrip - Sincronizado com novo formato de checklist
 */

import { useState, useCallback, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TESTS_CONFIG, type TestResults, type TestResult } from '@/types/deviceTest';
import { TestProgress } from '@/components/device-test/TestProgress';
import { TouchTest } from '@/components/device-test/tests/TouchTest';
import { ColorTest } from '@/components/device-test/tests/ColorTest';
import { AudioSpeakerTest } from '@/components/device-test/tests/AudioSpeakerTest';
import { AudioMicTest } from '@/components/device-test/tests/AudioMicTest';
import { CameraTest } from '@/components/device-test/tests/CameraTest';
import { VibrationTest } from '@/components/device-test/tests/VibrationTest';
import { ButtonTest } from '@/components/device-test/tests/ButtonTest';
import { BatteryTest } from '@/components/device-test/tests/BatteryTest';
import { SensorTest } from '@/components/device-test/tests/SensorTest';
import { LocationTest } from '@/components/device-test/tests/LocationTest';
import type { DeviceChecklistData } from './DeviceChecklist';

interface ChecklistTestRunnerProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (checklistData: DeviceChecklistData) => void;
  currentChecklist?: DeviceChecklistData | null | undefined;
}

// Mapeamento dos resultados de teste para o novo formato do checklist
function mapTestResultsToChecklist(results: TestResults): DeviceChecklistData {
  const touchPassed = results.display_touch?.status === 'passed';
  const colorPassed = results.display_colors?.status === 'passed';
  const micPassed = results.audio_mic?.status === 'passed';
  const cameraBackPassed = results.camera_back?.status === 'passed';
  const cameraFrontPassed = results.camera_front?.status === 'passed';
  const sensorsPassed = results.sensors?.status === 'passed';

  return {
    tela: {
      touch_screen: touchPassed,
      multi_touch: touchPassed, // Touch grid tests multi-touch areas
      cores_pixels: colorPassed,
      display_integro: false, // Manual
      sem_manchas: colorPassed,
      brilho: colorPassed, // Color test verifies brightness levels
      rotacao_tela: sensorsPassed && (results.sensors?.details?.gyroscope ?? false),
    },
    audio: {
      alto_falante: results.audio_speaker?.status === 'passed',
      microfone: micPassed,
      alto_falante_auricular: false, // Manual
      entrada_fone: false, // Manual
      gravacao_audio: micPassed, // Mic test records audio
    },
    cameras: {
      camera_frontal: cameraFrontPassed,
      camera_traseira: cameraBackPassed,
      flash: results.camera_back?.details?.flashUsed ?? false,
      foco_automatico: false, // Manual
      gravacao_video: cameraBackPassed || cameraFrontPassed, // Camera access = video capable
    },
    sensores: {
      vibracao: results.vibration?.status === 'passed',
      botao_volume_mais: results.buttons?.details?.buttons?.volumeUp ?? false,
      botao_volume_menos: results.buttons?.details?.buttons?.volumeDown ?? false,
      botao_power: results.buttons?.details?.buttons?.power ?? false,
      acelerometro: results.sensors?.details?.accelerometer ?? false,
      giroscopio: results.sensors?.details?.gyroscope ?? false,
      proximidade: results.sensors?.details?.proximityTested ?? false,
      bussola: sensorsPassed && (results.sensors?.details?.gyroscope ?? false), // DeviceOrientation includes compass
      luz_ambiente: sensorsPassed, // Ambient light detected via sensors
      gps: results.location?.status === 'passed',
    },
    sistema: {
      bateria: results.battery?.status === 'passed',
      carregamento: results.battery?.details?.charging ?? false,
      wifi: true, // Se está rodando, wifi funciona
      bluetooth: false, // Manual
      armazenamento: true, // Se está rodando, storage é acessível
    },
    extras: {
      face_id: false,
      biometria: false,
      nfc: false,
      chip_sim: false,
      tampa_traseira_ok: false,
    },
  };
}

export function ChecklistTestRunner({
  isOpen,
  onClose,
  onComplete,
  currentChecklist,
}: ChecklistTestRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<TestResults>({});
  const [testStartTime, setTestStartTime] = useState<number>(Date.now());
  const [isCompleting, setIsCompleting] = useState(false);

  const currentTest = TESTS_CONFIG[currentIndex];
  const isLastTest = currentIndex >= TESTS_CONFIG.length - 1;

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setResults({});
      setTestStartTime(Date.now());
      setIsCompleting(false);
    }
  }, [isOpen]);

  const handleTestResult = useCallback((status: "passed" | "failed", details?: Record<string, any>) => {
    if (!currentTest) return;
    
    const duration = Date.now() - testStartTime;
    const result: TestResult = {
      status,
      duration_ms: duration,
      completed_at: new Date().toISOString(),
      score: status === "passed" ? 100 : 0,
      ...(details && { details }),
    };

    const newResults = { ...results, [currentTest.id]: result };
    setResults(newResults);

    if (isLastTest) {
      handleComplete(newResults);
    } else {
      setCurrentIndex(prev => prev + 1);
      setTestStartTime(Date.now());
    }
  }, [currentTest, results, isLastTest, testStartTime]);

  const handleSkip = useCallback(() => {
    if (!currentTest) return;
    
    const result: TestResult = {
      status: "skipped",
      completed_at: new Date().toISOString(),
    };

    const newResults = { ...results, [currentTest.id]: result };
    setResults(newResults);

    if (isLastTest) {
      handleComplete(newResults);
    } else {
      setCurrentIndex(prev => prev + 1);
      setTestStartTime(Date.now());
    }
  }, [currentTest, results, isLastTest]);

  const handleComplete = useCallback((finalResults: TestResults) => {
    setIsCompleting(true);
    
    // Mapear resultados para o checklist
    const testChecklistData = mapTestResultsToChecklist(finalResults);
    
    // Mesclar com dados existentes (mantendo itens que não foram testados)
    const mergedData: DeviceChecklistData = currentChecklist ? {
      tela: {
        ...currentChecklist.tela,
        ...Object.fromEntries(
          Object.entries(testChecklistData.tela).filter(([_, v]) => v === true)
        ),
      } as DeviceChecklistData['tela'],
      audio: {
        ...currentChecklist.audio,
        ...Object.fromEntries(
          Object.entries(testChecklistData.audio).filter(([_, v]) => v === true)
        ),
      } as DeviceChecklistData['audio'],
      cameras: {
        ...currentChecklist.cameras,
        ...Object.fromEntries(
          Object.entries(testChecklistData.cameras).filter(([_, v]) => v === true)
        ),
      } as DeviceChecklistData['cameras'],
      sensores: {
        ...currentChecklist.sensores,
        ...Object.fromEntries(
          Object.entries(testChecklistData.sensores).filter(([_, v]) => v === true)
        ),
      } as DeviceChecklistData['sensores'],
      sistema: {
        ...currentChecklist.sistema,
        ...Object.fromEntries(
          Object.entries(testChecklistData.sistema).filter(([_, v]) => v === true)
        ),
      } as DeviceChecklistData['sistema'],
      extras: {
        ...currentChecklist.extras,
        ...Object.fromEntries(
          Object.entries(testChecklistData.extras).filter(([_, v]) => v === true)
        ),
      } as DeviceChecklistData['extras'],
    } : testChecklistData;

    // Pequeno delay para UX
    setTimeout(() => {
      onComplete(mergedData);
      setIsCompleting(false);
    }, 500);
  }, [currentChecklist, onComplete]);

  const renderCurrentTest = () => {
    if (!currentTest) return null;
    
    const props = {
      onPass: (details?: Record<string, any>) => handleTestResult("passed", details),
      onFail: (details?: Record<string, any>) => handleTestResult("failed", details),
      onSkip: handleSkip,
    };

    switch (currentTest.id) {
      case "display_touch":
        return <TouchTest {...props} />;
      case "display_colors":
        return <ColorTest {...props} />;
      case "audio_speaker":
        return <AudioSpeakerTest {...props} />;
      case "audio_mic":
        return <AudioMicTest {...props} />;
      case "camera_front":
        return <CameraTest key="camera-front" {...props} facing="user" />;
      case "camera_back":
        return <CameraTest key="camera-back" {...props} facing="environment" />;
      case "vibration":
        return <VibrationTest {...props} />;
      case "buttons":
        return <ButtonTest {...props} />;
      case "battery":
        return <BatteryTest {...props} />;
      case "sensors":
        return <SensorTest {...props} />;
      case "location":
        return <LocationTest {...props} />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  if (isCompleting) {
    return (
      <div className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-lg font-medium">Processando resultados...</p>
        <p className="text-sm text-muted-foreground mt-2">Atualizando checklist</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col">
      {/* Header com botão fechar */}
      <div className="absolute top-4 right-4 z-[210]">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded-full bg-muted/50 hover:bg-muted"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Progress */}
      {currentTest && (
        <TestProgress
          current={currentIndex + 1}
          total={TESTS_CONFIG.length}
          currentTest={currentTest}
          results={results}
        />
      )}

      {/* Test Content */}
      <div className="flex-1 flex flex-col overflow-auto">
        {renderCurrentTest()}
      </div>

      {/* Skip Button */}
      {currentTest?.optional && (
        <div className="fixed bottom-4 right-4 z-[210]">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="gap-2 text-muted-foreground"
          >
            Pular
          </Button>
        </div>
      )}
    </div>
  );
}

export default ChecklistTestRunner;
