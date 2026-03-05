import { useParams, useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TestRunner } from "@/components/device-test/TestRunner";
import { FullscreenWrapper } from "@/components/device-test/FullscreenWrapper";
import { TestResult } from "@/components/device-test/TestResult";
import { Loader2, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TestSession, TestResults, TestResult as TestResultType, DeviceInfo } from "@/types/deviceTest";

export default function DeviceTestPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);
  
  // Ref to track accumulated results to avoid stale state in rapid updates
  const accumulatedResultsRef = React.useRef<TestResults>({});

  // Atualizar meta tags para link preview (browsers que executam JS)
  useEffect(() => {
    const originalTitle = document.title;
    document.title = "Diagnóstico de Dispositivo | One Drip";

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
      if (el) {
        el.setAttribute("content", content);
      } else {
        el = document.createElement("meta");
        el.setAttribute(property.startsWith("og:") || property.startsWith("twitter:") ? "property" : "name", property);
        el.setAttribute("content", content);
        document.head.appendChild(el);
      }
    };

    setMeta("og:title", "Diagnóstico de Dispositivo | One Drip");
    setMeta("og:description", "Teste todas as funcionalidades do seu aparelho: tela, câmera, áudio, sensores e mais.");
    setMeta("description", "Teste todas as funcionalidades do seu aparelho: tela, câmera, áudio, sensores e mais.");
    setMeta("twitter:title", "Diagnóstico de Dispositivo | One Drip");
    setMeta("twitter:description", "Teste todas as funcionalidades do seu aparelho: tela, câmera, áudio, sensores e mais.");

    return () => {
      document.title = originalTitle;
    };
  }, []);

  useEffect(() => {
    if (!shareToken) {
      setError("Token inválido");
      setLoading(false);
      return;
    }

    loadSession(shareToken);
  }, [shareToken]);

  const loadSession = async (token: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from("device_test_sessions")
        .select("*")
        .eq("share_token", token)
        .single();

      if (fetchError || !data) {
        setError("Sessão de teste não encontrada");
        return;
      }

      // Verificar expiração
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError("Esta sessão de teste expirou");
        return;
      }

      // Verificar se já foi completada
      if (data.status === "completed") {
        setCompleted(true);
        setResults((data.test_results as unknown as TestResults) || {});
      }

      // Map the data to our TestSession type
      const mappedSession: TestSession = {
        id: data.id,
        service_order_id: data.service_order_id,
        share_token: data.share_token,
        device_info: (data.device_info as unknown as DeviceInfo) || {},
        test_results: (data.test_results as unknown as TestResults) || {},
        overall_score: data.overall_score,
        status: data.status as TestSession["status"],
        started_at: data.started_at,
        completed_at: data.completed_at,
        expires_at: data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: data.created_at,
        updated_at: data.updated_at,
        created_by: data.created_by,
      };
      accumulatedResultsRef.current = (data.test_results as unknown as TestResults) || {};
      setSession(mappedSession);
    } catch (err) {
      console.error("Error loading session:", err);
      setError("Erro ao carregar sessão de teste");
    } finally {
      setLoading(false);
    }
  };

  const handleTestStart = async () => {
    if (!session) return;

    try {
      const deviceInfo: DeviceInfo = {
        user_agent: navigator.userAgent,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        platform: navigator.platform,
        language: navigator.language,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      };

      await supabase
        .from("device_test_sessions")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
          device_info: JSON.parse(JSON.stringify(deviceInfo)),
        })
        .eq("id", session.id);

      setSession({ ...session, status: "in_progress", device_info: deviceInfo });
    } catch (err) {
      console.error("Error starting test:", err);
    }
  };

  const handleTestComplete = async (testResults: TestResults) => {
    if (!session) return;

    try {
      accumulatedResultsRef.current = testResults;

      // Calcular score geral
      const testValues = Object.values(testResults);
      const completedTests = testValues.filter(t => t.status !== "skipped");
      const passedTests = testValues.filter(t => t.status === "passed");
      const overallScore = completedTests.length > 0
        ? (passedTests.length / completedTests.length) * 100
        : 0;

      const { data: updatedSession, error: updateError } = await supabase
        .from("device_test_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          test_results: JSON.parse(JSON.stringify(testResults)),
          overall_score: overallScore,
        })
        .eq("id", session.id)
        .select("*")
        .single();

      if (updateError) {
        throw updateError;
      }

      const persistedResults = (updatedSession.test_results as unknown as TestResults) || testResults;
      accumulatedResultsRef.current = persistedResults;

      setSession(prev => prev ? {
        ...prev,
        test_results: persistedResults,
        overall_score: updatedSession.overall_score,
        status: updatedSession.status as TestSession["status"],
        completed_at: updatedSession.completed_at,
        updated_at: updatedSession.updated_at,
      } : prev);
      setResults(persistedResults);
      setCompleted(true);
    } catch (err) {
      console.error("Error completing test:", err);
    }
  };

  const handleResultUpdate = async (testId: string, result: TestResultType): Promise<void> => {
    if (!session) return;

    try {
      // Use ref to accumulate results and avoid stale state overwrites
      accumulatedResultsRef.current = { ...accumulatedResultsRef.current, [testId]: result };
      const updatedResults = { ...accumulatedResultsRef.current };

      const { error } = await supabase
        .from("device_test_sessions")
        .update({ test_results: JSON.parse(JSON.stringify(updatedResults)) })
        .eq("id", session.id);

      if (error) {
        console.error("Error syncing to cloud:", error);
      } else {
        console.log(`☁️ Teste "${testId}" salvo na nuvem`);
      }

      setSession(prev => prev ? { ...prev, test_results: updatedResults } : prev);
    } catch (err) {
      console.error("Error updating result:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Carregando sessão de teste...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="bg-destructive/10 rounded-full p-4 mb-4">
          <ShieldX className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-xl font-bold mb-2">Erro</h1>
        <p className="text-muted-foreground text-center mb-6">{error}</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          Voltar ao início
        </Button>
      </div>
    );
  }

  if (completed && results) {
    return (
      <TestResult 
        results={results} 
        onClose={() => window.close()}
      />
    );
  }

  return (
    <FullscreenWrapper onStart={handleTestStart}>
      <TestRunner
        onComplete={handleTestComplete}
        onResultUpdate={handleResultUpdate}
        initialResults={session?.test_results || {}}
      />
    </FullscreenWrapper>
  );
}
