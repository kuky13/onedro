import { TESTS_CONFIG, type TestConfig, type TestResults } from "@/types/deviceTest";
import { cn } from "@/lib/utils";
import { Cloud, CloudOff } from "lucide-react";

interface TestProgressProps {
  current: number;
  total: number;
  currentTest: TestConfig;
  results: TestResults;
  isSyncing?: boolean;
  isOnline?: boolean;
}

export function TestProgress({ 
  current, 
  total, 
  currentTest, 
  results, 
  isSyncing = false,
  isOnline = true 
}: TestProgressProps) {
  const progress = (current / total) * 100;

  return (
    <div className="bg-muted/30 border-b border-border/50 px-4 py-3 safe-area-top">
      {/* Progress Bar */}
      <div className="h-1 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Test Info */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            Teste {current} de {total}
          </p>
          <h2 className="font-semibold">{currentTest.label}</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Cloud Sync Indicator */}
          <div className="flex items-center gap-1">
            {isOnline ? (
              <div className={cn(
                "flex items-center gap-1 text-[10px]",
                isSyncing ? "text-blue-500" : "text-green-500"
              )}>
                <Cloud className={cn("h-3 w-3", isSyncing && "animate-pulse")} />
                <span className="hidden xs:inline">
                  {isSyncing ? "Salvando..." : "Salvo"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <CloudOff className="h-3 w-3" />
                <span className="hidden xs:inline">Offline</span>
              </div>
            )}
          </div>

          {/* Mini Status Indicators */}
          <div className="flex items-center gap-1">
            {TESTS_CONFIG.map((test, index) => {
              const result = results[test.id];
              const isCurrent = index === current - 1;
              const isPast = index < current - 1;

              return (
                <div
                  key={test.id}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    isCurrent && "w-4 bg-primary",
                    isPast && result?.status === "passed" && "bg-green-500",
                    isPast && result?.status === "failed" && "bg-red-500",
                    isPast && result?.status === "skipped" && "bg-muted-foreground/50",
                    !isCurrent && !isPast && "bg-muted"
                  )}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
