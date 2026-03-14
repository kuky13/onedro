import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TestResults } from "@/types/deviceTest";
import { TestResult } from "@/components/device-test/TestResult";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId?: string | null;
  title?: string;
};

export function DeviceTestReportDialog({ open, onOpenChange, sessionId, title = "Relatório do Diagnóstico" }: Props) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedSessionId = useMemo(() => (sessionId ? String(sessionId) : null), [sessionId]);

  useEffect(() => {
    if (!open) {
      setResults(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (!normalizedSessionId) {
      setError("Sessão inválida");
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("device_test_sessions")
          .select("status, test_results")
          .eq("id", normalizedSessionId)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!data) throw new Error("Sessão não encontrada");
        if (data.status !== "completed") throw new Error("O teste ainda não foi concluído");

        const r = (data.test_results as unknown as TestResults) || {};
        if (!cancelled) setResults(r);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Erro ao carregar relatório");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, normalizedSessionId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md p-0 gap-0 max-h-[90vh] overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b border-border/30">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Visualização e download do relatório de testes do dispositivo.
          </DialogDescription>
        </DialogHeader>

        <div className="h-[calc(90vh-72px)] overflow-hidden">
          {loading && (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando relatório...</p>
            </div>
          )}

          {!loading && error && (
            <div className="h-full flex flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {!loading && !error && results && (
            <div className="h-full overflow-auto">
              <TestResult results={results} onClose={() => onOpenChange(false)} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
