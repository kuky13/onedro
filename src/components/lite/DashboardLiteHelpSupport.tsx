import { Lightbulb } from 'lucide-react';

const tips = [
  'Use a busca para encontrar orçamentos rapidamente',
  'Personalize dados da empresa em Configurações',
  'Compartilhe orçamentos com um clique no WhatsApp',
];

export const DashboardLiteHelpSupport = () => {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-accent/50 flex items-center justify-center">
          <Lightbulb className="h-4 w-4 text-accent-foreground" />
        </div>
        <h4 className="text-sm font-semibold text-foreground">Dicas Rápidas</h4>
      </div>

      <div className="space-y-2">
        {tips.map((tip, i) => (
          <div
            key={i}
            className="rounded-xl bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed"
          >
            {tip}
          </div>
        ))}
      </div>
    </div>
  );
};
