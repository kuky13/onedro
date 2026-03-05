import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Check, X, AlertTriangle, Sparkles, Zap, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AnalyzedItem {
  budget_id: string;
  brand: string;
  model: string;
  service_category: string;
  service_name: string;
  cash_price_reais: number;
  credit_card_total_reais?: number;
  max_installments?: number;
  quality: string;
  warranty_days: number;
  sync_status?: "new" | "updated" | "unchanged";
  changes?: string[];
  selected?: boolean;
}

interface AIAnalysisTabProps {
  storeId: string;
  onApplied: () => void;
}

export function AIAnalysisTab({ storeId, onApplied }: AIAnalysisTabProps) {
  const [items, setItems] = useState<AnalyzedItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [, setTotalBudgets] = useState(0);
  const [stats, setStats] = useState<{new: number;updated: number;unchanged: number;} | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-budgets", {
        body: { action: "analyze", storeId }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Auto-select only new and updated items; unchanged are deselected
      const analyzed = (data.items || []).map((item: AnalyzedItem) => ({
        ...item,
        selected: item.sync_status !== "unchanged"
      }));

      setItems(analyzed);
      setTotalBudgets(data.total_budgets || 0);
      setStats(data.stats || null);
      setHasAnalyzed(true);

      const s = data.stats || { new: 0, updated: 0, unchanged: 0 };
      toast.success(`${s.new} novos, ${s.updated} com alterações, ${s.unchanged} já atualizados`);
    } catch (err: any) {
      console.error("Analysis error:", err);
      toast.error(err.message || "Erro ao analisar orçamentos");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = async () => {
    const selected = items.filter((i) => i.selected);
    if (selected.length === 0) {
      toast.warning("Selecione ao menos um item");
      return;
    }

    setIsApplying(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-budgets", {
        body: { action: "apply", storeId, analyzedItems: selected }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const created = data.results?.filter((r: any) => r.action === "created").length || 0;
      const updated = data.results?.filter((r: any) => r.action === "updated").length || 0;
      const errors = data.results?.filter((r: any) => r.action === "error").length || 0;

      toast.success(`✅ ${created} criados, ${updated} atualizados${errors > 0 ? `, ${errors} erros` : ""}`);
      setItems([]);
      setHasAnalyzed(false);
      onApplied();
    } catch (err: any) {
      console.error("Apply error:", err);
      toast.error(err.message || "Erro ao aplicar");
    } finally {
      setIsApplying(false);
    }
  };

  const toggleItem = (index: number) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, selected: !item.selected } : item));
  };

  const toggleAll = (checked: boolean) => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: checked })));
  };

  const selectedCount = items.filter((i) => i.selected).length;

  // Group by brand for display
  const grouped = items.reduce<Record<string, AnalyzedItem[]>>((acc, item) => {
    const key = item.brand;
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(item);
    return acc;
  }, {});

  const categoryColors: Record<string, string> = {
    "Troca de Tela": "bg-blue-500/10 text-blue-700 border-blue-200",
    "Troca de Bateria": "bg-green-500/10 text-green-700 border-green-200",
    "Troca de Câmera": "bg-purple-500/10 text-purple-700 border-purple-200",
    "Conector de Carga": "bg-orange-500/10 text-orange-700 border-orange-200",
    "Alto-Falante": "bg-yellow-500/10 text-yellow-700 border-yellow-200",
    "Reparo de Placa": "bg-red-500/10 text-red-700 border-red-200",
    "Software/Sistema": "bg-cyan-500/10 text-cyan-700 border-cyan-200",
    "Carcaça/Vidro Traseiro": "bg-pink-500/10 text-pink-700 border-pink-200"
  };

  const formatPrice = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
        {/* Background decoration */}
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
        
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold tracking-tight">Análise Inteligente</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                Use IA para analisar seus orçamentos e identificar marcas, modelos, categorias, preços e qualidade automaticamente.
              </p>
            </div>
          </div>
          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing} 
            size="lg" 
            className="shrink-0 rounded-xl gap-2 px-6 font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                {hasAnalyzed ? "Reanalisar" : "Analisar com IA"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Stats pills when analyzed */}
        {hasAnalyzed && stats && (
          <div className="relative mt-5 flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-xs font-medium text-green-400">{stats.new} novos</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="text-xs font-medium text-amber-400">{stats.updated} alterados</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-muted/50 border border-border px-3 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
              <span className="text-xs font-medium text-muted-foreground">{stats.unchanged} iguais</span>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {hasAnalyzed && items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-muted-foreground/20 bg-card/50 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50 mb-4">
            <AlertTriangle className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <p className="text-sm text-muted-foreground">Nenhum serviço identificado nos orçamentos.</p>
        </div>
      )}

      {items.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="sticky top-0 z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-border bg-card/80 backdrop-blur-xl p-4">
            <div className="flex items-center gap-3">
              <Checkbox checked={selectedCount === items.length} onCheckedChange={(checked) => toggleAll(!!checked)} />
              <span className="text-sm text-muted-foreground font-medium">
                {selectedCount} de {items.length} selecionados
              </span>
            </div>
            <Button 
              onClick={handleApply} 
              disabled={isApplying || selectedCount === 0} 
              className="shrink-0 rounded-xl gap-2 font-semibold shadow-lg shadow-primary/20"
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aplicando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Aplicar {selectedCount} ao Catálogo
                </>
              )}
            </Button>
          </div>

          {/* Grouped results */}
          <div className="pb-8 space-y-8">
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([brand, brandItems]) => (
                <div key={brand}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <span className="text-xs font-bold text-primary">{brand.charAt(0)}</span>
                    </div>
                    <h4 className="text-sm font-bold tracking-tight">{brand}</h4>
                    <Badge variant="secondary" className="text-[10px] rounded-full px-2 py-0.5">
                      {brandItems.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {brandItems.map((item) => {
                      const globalIndex = items.indexOf(item);
                      return (
                        <div
                          key={`${item.budget_id}-${item.service_name}`}
                          className={`group relative rounded-xl border p-4 transition-all duration-200 ${
                            item.sync_status === "unchanged"
                              ? "opacity-35 border-border bg-card/30"
                              : item.selected
                              ? "border-primary/30 bg-primary/5 shadow-sm shadow-primary/5"
                              : "border-border bg-card/50 opacity-60"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={item.selected ?? false}
                              onCheckedChange={() => toggleItem(globalIndex)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                <span className="font-semibold text-sm">{item.model}</span>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] rounded-full px-2 ${categoryColors[item.service_category] || "bg-muted"}`}
                                >
                                  {item.service_category}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] rounded-full px-2 border-border">
                                  {item.quality}
                                </Badge>
                                {item.sync_status === "new" && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-400">
                                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                    Novo
                                  </span>
                                )}
                                {item.sync_status === "updated" && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400">
                                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    Alterado
                                  </span>
                                )}
                                {item.sync_status === "unchanged" && (
                                  <span className="text-[10px] text-muted-foreground/60">Igual</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground/80">{item.service_name}</p>
                              {item.changes && item.changes.length > 0 && (
                                <div className="mt-1.5 space-y-0.5">
                                  {item.changes.map((c, ci) => (
                                    <p key={ci} className="text-[11px] text-amber-400/80 pl-2 border-l-2 border-amber-500/30">
                                      {c}
                                    </p>
                                  ))}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-3 mt-2.5 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  💰 <strong className="text-foreground font-medium">{formatPrice(item.cash_price_reais)}</strong>
                                </span>
                                {item.credit_card_total_reais && item.credit_card_total_reais > 0 && (
                                  <span className="inline-flex items-center gap-1">
                                    💳{" "}
                                    <strong className="text-foreground font-medium">
                                      {item.max_installments}x {formatPrice(item.credit_card_total_reais / (item.max_installments || 1))}
                                    </strong>
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1">
                                  🛡️ <strong className="text-foreground font-medium">{item.warranty_days}d</strong>
                                </span>
                              </div>
                            </div>
                            <button
                              className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                              onClick={() => toggleItem(globalIndex)}
                            >
                              {item.selected ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </>
      )}
    </div>);

}