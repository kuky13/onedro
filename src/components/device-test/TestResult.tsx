import { TESTS_CONFIG, MANUAL_TESTS_CONFIG, type TestResults } from "@/types/deviceTest";
import {
  Check,
  X,
  Minus,
  Trophy,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Calendar,
  Clock,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface TestResultProps {
  results: TestResults;
  onClose?: () => void;
}

interface CompanyData {
  name: string;
  logo_url: string | null;
}

export function TestResult({ results, onClose }: TestResultProps) {
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch company info for the image
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const { data } = await supabase.from("company_info").select("name, logo_url").limit(1).maybeSingle();

        if (data) {
          setCompanyData(data);
        }
      } catch (err) {
        console.log("Company info not available");
      }
    };
    fetchCompanyInfo();
  }, []);

  const testEntries = [...TESTS_CONFIG, ...MANUAL_TESTS_CONFIG].map((test) => ({
    ...test,
    result: results[test.id],
  }));

  const passed = testEntries.filter((t) => t.result?.status === "passed").length;
  const failed = testEntries.filter((t) => t.result?.status === "failed").length;
  const skipped = testEntries.filter((t) => t.result?.status === "skipped").length;
  const total = testEntries.length - skipped;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;

  const getScoreColor = () => {
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreLabel = () => {
    if (score >= 90) return "Excelente";
    if (score >= 70) return "Bom";
    if (score >= 50) return "Regular";
    return "Problemas detectados";
  };

  const toggleExpanded = (testId: string) => {
    setExpandedTests((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        newSet.add(testId);
      }
      return newSet;
    });
  };

  const formatDetailValue = (_key: string, value: any): string => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const getDetailLabel = (key: string): string => {
    const labels: Record<string, string> = {
      touchedCells: "Áreas tocadas",
      totalCells: "Total de áreas",
      completionRate: "Taxa de conclusão",
      duration_ms: "Duração",
      colors: "Cores testadas",
      passedCount: "Cores OK",
      totalColors: "Total de cores",
      recordingDuration: "Duração gravação",
      maxLevel: "Nível máximo",
      quality: "Qualidade áudio",
      facing: "Câmera",
      resolution: "Resolução",
      flashUsed: "Flash usado",
      patterns: "Padrões testados",
      testedPatterns: "Padrões vibrados",
      totalPatterns: "Total padrões",
      buttons: "Botões",
      autoDetected: "Detectados automaticamente",
      manualTested: "Testados manualmente",
      testedCount: "Total testados",
      workingCount: "Funcionando",
      level: "Nível bateria",
      charging: "Carregando",
      chargerWorking: "Carregador funciona",
      hasMovement: "Movimento detectado",
      accelerometer: "Acelerômetro",
      gyroscope: "Giroscópio",
      proximityTested: "Proximidade testada",
      proximitySupported: "Proximidade suportada",
      latitude: "Latitude",
      longitude: "Longitude",
      accuracy: "Precisão GPS",
      altitude: "Altitude",
      gpsWorking: "GPS funcionando",
      city: "Cidade",
      neighborhood: "Bairro",
      state: "Estado",
    };
    return labels[key] || key;
  };

  const renderDetails = (details: Record<string, any> | undefined) => {
    if (!details || Object.keys(details).length === 0) return null;

    return (
      <div className="mt-2 space-y-1 bg-muted/30 rounded-lg p-3">
        {Object.entries(details).map(([key, value]) => {
          if (
            key === "state" ||
            key === "reason" ||
            key === "hasCapturedImage" ||
            key === "mode" ||
            key === "manualConfirmation" ||
            key === "issue"
          )
            return null;

          if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            return (
              <div key={key} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{getDetailLabel(key)}:</p>
                <div className="pl-2 space-y-0.5">
                  {Object.entries(value).map(([subKey, subValue]) => (
                    <div key={subKey} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{getDetailLabel(subKey)}:</span>
                      <span className="font-mono">{formatDetailValue(subKey, subValue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (Array.isArray(value)) {
            return (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{getDetailLabel(key)}:</span>
                <span className="font-mono">{value.join(", ")}</span>
              </div>
            );
          }

          if (key === "duration_ms" || key === "recordingDuration") {
            return (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{getDetailLabel(key)}:</span>
                <span className="font-mono">{(Number(value) / 1000).toFixed(1)}s</span>
              </div>
            );
          }

          if (key === "completionRate") {
            return (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{getDetailLabel(key)}:</span>
                <span className="font-mono">{Number(value).toFixed(1)}%</span>
              </div>
            );
          }

          if (key === "resolution" && typeof value === "object") {
            return (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{getDetailLabel(key)}:</span>
                <span className="font-mono">
                  {value.width}x{value.height}
                </span>
              </div>
            );
          }

          return (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{getDetailLabel(key)}:</span>
              <span className="font-mono">{formatDetailValue(key, value)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const now = new Date();

  // Generate image from canvas
  const handleDownloadImage = () => {
    setIsGeneratingImage(true);

    // Use setTimeout to allow UI to update before processing
    setTimeout(() => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          setIsGeneratingImage(false);
          return;
        }

        // Image dimensions
        const width = 800;
        const height = 1800;
        canvas.width = width;
        canvas.height = height;

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, "#0f0f1a");
        gradient.addColorStop(0.5, "#1a1a2e");
        gradient.addColorStop(1, "#0f0f1a");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        let headerOffset = 60;

        // Company name at top if available
        if (companyData?.name) {
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 24px system-ui";
          ctx.textAlign = "center";
          ctx.fillText(companyData.name, width / 2, headerOffset);
          headerOffset += 50;
        }

        // Header
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Diagnóstico do Dispositivo", width / 2, headerOffset);

        // Date and time
        ctx.font = "16px system-ui";
        ctx.fillStyle = "#888888";
        ctx.fillText(format(now, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }), width / 2, headerOffset + 35);

        // Score circle
        const centerX = width / 2;
        const centerY = headerOffset + 140;
        const radius = 80;

        // Outer ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 10, 0, Math.PI * 2);
        ctx.strokeStyle = score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
        ctx.lineWidth = 4;
        ctx.stroke();

        // Inner circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
        ctx.fill();

        // Score text
        ctx.fillStyle = score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
        ctx.font = "bold 56px system-ui";
        ctx.fillText(`${score}%`, centerX, centerY + 18);

        // Score label
        ctx.fillStyle = "#ffffff";
        ctx.font = "20px system-ui";
        ctx.fillText(getScoreLabel(), centerX, centerY + 50);

        // Stats bar
        const statsY = centerY + 130;
        ctx.font = "18px system-ui";

        ctx.fillStyle = "#22c55e";
        ctx.fillText(`✅ ${passed} aprovados`, width / 4, statsY);

        ctx.fillStyle = "#ef4444";
        ctx.fillText(`❌ ${failed} reprovados`, width / 2, statsY);

        ctx.fillStyle = "#888888";
        ctx.fillText(`⏭️ ${skipped} pulados`, (width * 3) / 4, statsY);

        // Separator
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(50, statsY + 50);
        ctx.lineTo(width - 50, statsY + 50);
        ctx.stroke();

        // Test results
        let yPos = statsY + 100;
        ctx.textAlign = "left";
        ctx.font = "bold 18px system-ui";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("Resultados dos Testes", 50, yPos);
        yPos += 40;

        testEntries.forEach((test) => {
          if (yPos > height - 150) return;

          const statusIcon = test.result?.status === "passed" ? "✅" : test.result?.status === "failed" ? "❌" : "⏭️";

          ctx.fillStyle =
            test.result?.status === "passed" ? "#22c55e" : test.result?.status === "failed" ? "#ef4444" : "#888888";

          ctx.font = "16px system-ui";
          ctx.fillText(`${statusIcon} ${test.label}`, 60, yPos);

          // Status text aligned right
          ctx.textAlign = "right";
          const statusText =
            test.result?.status === "passed" ? "Passou" : test.result?.status === "failed" ? "Falhou" : "Pulado";
          ctx.fillText(statusText, width - 60, yPos);
          ctx.textAlign = "left";

          yPos += 35;
        });

        // Footer separator
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.beginPath();
        ctx.moveTo(50, height - 100);
        ctx.lineTo(width - 50, height - 100);
        ctx.stroke();

        // Footer with onedrip.com.br
        ctx.textAlign = "center";
        ctx.fillStyle = "#666666";
        ctx.font = "14px system-ui";
        ctx.fillText(format(now, "'Gerado em' dd/MM/yyyy 'às' HH:mm:ss"), width / 2, height - 70);

        // OneDrip branding
        ctx.fillStyle = "#888888";
        ctx.font = "bold 16px system-ui";
        ctx.fillText("onedrip.com.br", width / 2, height - 35);

        // Download
        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `diagnostico-${format(now, "yyyy-MM-dd-HHmm")}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("Error generating image:", err);
      }

      setIsGeneratingImage(false);
    }, 100);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }

    try {
      window.close();
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0" ref={reportRef}>
      {/* Header with Score */}
      <div className="bg-gradient-to-b from-muted/50 to-background p-6 text-center safe-area-top">
        <div className="relative inline-block">
          <div
            className={cn(
              "w-24 h-24 rounded-full border-4 flex items-center justify-center mx-auto",
              score >= 80 ? "border-green-500" : score >= 50 ? "border-amber-500" : "border-red-500",
            )}
          >
            <span className={cn("text-3xl font-bold", getScoreColor())}>{score}%</span>
          </div>
          {score >= 80 && (
            <div className="absolute -top-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
              <Trophy className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        <h1 className="text-lg font-bold mt-3">{getScoreLabel()}</h1>
        <p className="text-muted-foreground text-xs mt-1">
          {passed} de {total} testes passaram
        </p>
      </div>

      {/* Mini Stats */}
      <div className="flex justify-center gap-4 px-4 py-2 border-b border-border/30">
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-3 h-3 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="w-2 h-2 text-green-500" />
          </div>
          <span className="text-muted-foreground">{passed}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-3 h-3 rounded-full bg-red-500/20 flex items-center justify-center">
            <X className="w-2 h-2 text-red-500" />
          </div>
          <span className="text-muted-foreground">{failed}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-3 h-3 rounded-full bg-muted flex items-center justify-center">
            <Minus className="w-2 h-2 text-muted-foreground" />
          </div>
          <span className="text-muted-foreground">{skipped}</span>
        </div>
      </div>

      {/* Device & Time Info */}
      <div className="flex items-center justify-center gap-4 py-3 text-xs text-muted-foreground border-b border-border/30">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>{format(now, "dd/MM/yyyy", { locale: ptBR })}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{format(now, "HH:mm", { locale: ptBR })}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5" />
          <span>Mobile</span>
        </div>
      </div>

      {/* Test Details */}
      <div className="flex-1 p-4 space-y-2 overflow-y-auto">
        {testEntries.map((test) => {
          const hasDetails = test.result?.details && Object.keys(test.result.details).length > 0;
          const isExpanded = expandedTests.has(test.id);

          return (
            <Collapsible key={test.id} open={isExpanded} onOpenChange={() => toggleExpanded(test.id)}>
              <div
                className={cn(
                  "rounded-xl border overflow-hidden",
                  test.result?.status === "passed" && "bg-green-500/5 border-green-500/20",
                  test.result?.status === "failed" && "bg-red-500/5 border-red-500/20",
                  test.result?.status === "skipped" && "bg-muted/50 border-border/50",
                  !test.result && "bg-muted/30 border-border/30",
                )}
              >
                <CollapsibleTrigger className="flex items-center gap-3 p-3 w-full">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                      test.result?.status === "passed" && "bg-green-500/20",
                      test.result?.status === "failed" && "bg-red-500/20",
                      test.result?.status === "skipped" && "bg-muted",
                      !test.result && "bg-muted",
                    )}
                  >
                    {test.result?.status === "passed" && <Check className="w-3.5 h-3.5 text-green-500" />}
                    {test.result?.status === "failed" && <X className="w-3.5 h-3.5 text-red-500" />}
                    {test.result?.status === "skipped" && <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
                    {!test.result && <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-sm">{test.label}</p>
                  </div>

                  {hasDetails && (
                    <div className="flex items-center">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </CollapsibleTrigger>

                {hasDetails && (
                  <CollapsibleContent className="px-3 pb-3">{renderDetails(test.result?.details)}</CollapsibleContent>
                )}
              </div>
            </Collapsible>
          );
        })}
      </div>

      {/* Actions */}
      <div className="p-4 space-y-3 safe-area-bottom border-t border-border/50">
        <Button
          onClick={handleDownloadImage}
          variant="outline"
          className="w-full h-12 gap-3 text-base font-medium border-primary/30 hover:bg-primary/5 hover:border-primary/50 transition-all duration-300"
          disabled={isGeneratingImage}
        >
          {isGeneratingImage ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span>Gerando relatório...</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>Baixar Relatório</span>
            </>
          )}
        </Button>
        <Button onClick={handleClose} className="w-full h-12 gap-3 text-base font-medium">
          <Check className="w-5 h-5" />
          Concluir
        </Button>
      </div>
    </div>
  );
}
