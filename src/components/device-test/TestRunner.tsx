import { useState, useCallback, useEffect } from "react";
import { TESTS_CONFIG, type TestResults, type TestResult as TestResultType } from "@/types/deviceTest";
import { TestProgress } from "./TestProgress";
import { TouchTest } from "./tests/TouchTest";
import { ColorTest } from "./tests/ColorTest";
import { AudioSpeakerTest } from "./tests/AudioSpeakerTest";
import { AudioMicTest } from "./tests/AudioMicTest";
import { CameraTest } from "./tests/CameraTest";
import { VibrationTest } from "./tests/VibrationTest";
import { ButtonTest } from "./tests/ButtonTest";
import { BatteryTest } from "./tests/BatteryTest";
import { SensorTest } from "./tests/SensorTest";
import { LocationTest } from "./tests/LocationTest";
import { ManualChecklist } from "./tests/ManualChecklist";
import { SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TestRunnerProps {
  onComplete: (results: TestResults) => void;
  onResultUpdate: (testId: string, result: TestResultType) => void | Promise<void>;
  initialResults?: TestResults;
}

export function TestRunner({ onComplete, onResultUpdate, initialResults = {} }: TestRunnerProps) {
  const getInitialIndex = () => {
    if (!initialResults || Object.keys(initialResults).length === 0) return 0;
    for (let i = 0; i < TESTS_CONFIG.length; i++) {
      const config = TESTS_CONFIG[i];
      if (!config) continue;
      const result = initialResults[config.id];
      if (!result || result.status === 'pending') return i;
    }
    return TESTS_CONFIG.length - 1;
  };

  const [currentIndex, setCurrentIndex] = useState(getInitialIndex);
  const [results, setResults] = useState<TestResults>(initialResults);
  const [testStartTime, setTestStartTime] = useState<number>(Date.now());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const currentTest = currentIndex < TESTS_CONFIG.length ? TESTS_CONFIG[currentIndex] : null;
  const isFinalPhase = currentIndex === TESTS_CONFIG.length;

  const handleTestResult = useCallback((status: "passed" | "failed", details?: Record<string, any>) => {
    if (!currentTest) return;
    const duration = Date.now() - testStartTime;
    const result: TestResultType = {
      status,
      duration_ms: duration,
      completed_at: new Date().toISOString(),
      score: status === "passed" ? 100 : 0,
      ...(details && { details }),
    };
    const newResults = { ...results, [currentTest.id]: result };
    setResults(newResults);

    setIsSyncing(true);
    Promise.resolve(onResultUpdate(currentTest.id, result))
      .then(() => setIsSyncing(false))
      .catch((err: Error) => { console.error("Sync error:", err); setIsSyncing(false); });

    if (currentIndex >= TESTS_CONFIG.length - 1) {
      setCurrentIndex(TESTS_CONFIG.length);
    } else {
      setCurrentIndex(prev => prev + 1);
      setTestStartTime(Date.now());
    }
  }, [currentTest, results, currentIndex, testStartTime, onResultUpdate]);

  const handleSkip = useCallback(() => {
    if (!currentTest) return;
    const result: TestResultType = { status: "skipped", completed_at: new Date().toISOString() };
    const newResults = { ...results, [currentTest.id]: result };
    setResults(newResults);

    setIsSyncing(true);
    Promise.resolve(onResultUpdate(currentTest.id, result))
      .then(() => setIsSyncing(false))
      .catch((err: Error) => { console.error("Sync error:", err); setIsSyncing(false); });

    if (currentIndex >= TESTS_CONFIG.length - 1) {
      setCurrentIndex(TESTS_CONFIG.length);
    } else {
      setCurrentIndex(prev => prev + 1);
      setTestStartTime(Date.now());
    }
  }, [currentTest, results, currentIndex, onResultUpdate]);

  const handleManualComplete = useCallback(async (manualResults: Record<string, TestResultType>) => {
    // Save to server
    setIsSyncing(true);
    try {
      // Loop and sync one by one or create a batched update if possible
      // Since onResultUpdate takes one at a time, we'll loop
      for (const [testId, result] of Object.entries(manualResults)) {
        await onResultUpdate(testId, result);
      }
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setIsSyncing(false);
    }

    const finalResults = { ...results, ...manualResults };
    setResults(finalResults);
    onComplete(finalResults);
  }, [results, onResultUpdate, onComplete]);

  const renderCurrentTest = () => {
    if (!currentTest) return null;
    const props = {
      onPass: (details?: Record<string, any>) => handleTestResult("passed", details),
      onFail: (details?: Record<string, any>) => handleTestResult("failed", details),
      onSkip: handleSkip,
    };

    switch (currentTest.id) {
      case "display_touch": return <TouchTest {...props} />;
      case "display_colors": return <ColorTest {...props} />;
      case "audio_speaker": return <AudioSpeakerTest {...props} />;
      case "audio_mic": return <AudioMicTest {...props} />;
      case "camera_front": return <CameraTest key="camera-front" {...props} facing="user" />;
      case "camera_back": return <CameraTest key="camera-back" {...props} facing="environment" />;
      case "vibration": return <VibrationTest {...props} />;
      case "buttons": return <ButtonTest {...props} />;
      case "battery": return <BatteryTest {...props} />;
      case "sensors": return <SensorTest {...props} />;
      case "location": return <LocationTest {...props} />;
      default: return null;
    }
  };

  if (isFinalPhase) {
    return (
      <div className="flex flex-col h-full min-h-0 bg-background">
        <ManualChecklist
          onComplete={handleManualComplete}
          initialResults={results}
        />
      </div>
    );
  }

  if (!currentTest) return null;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Progress Header - fixed height */}
      <div className="shrink-0">
        <TestProgress
          current={currentIndex + 1}
          total={TESTS_CONFIG.length + 1} // +1 for the manual phase
          currentTest={currentTest}
          results={results}
          isSyncing={isSyncing}
          isOnline={isOnline}
        />
      </div>

      {/* Test Content - fills remaining space, scrollable */}
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
        {renderCurrentTest()}
      </div>

      {/* Skip Button */}
      {currentTest.optional && (
        <div className="shrink-0 flex justify-end p-3 border-t border-border/30">
          <Button variant="ghost" size="sm" onClick={handleSkip} className="gap-2 text-muted-foreground">
            Pular <SkipForward className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
