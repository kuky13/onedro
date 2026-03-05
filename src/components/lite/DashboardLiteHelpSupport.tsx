import { Card, CardContent } from '@/components/ui/card';

export const DashboardLiteHelpSupport = () => {
  return (
    <div className="space-y-4">
      {/* Dicas Rápidas */}
      <Card className="border-dashed border-muted-foreground/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
            <h4 className="text-sm font-medium text-foreground">Dicas Rápidas</h4>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
              <span>Use a busca para encontrar orçamentos rapidamente</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
              <span>Personalize dados da empresa em Configurações</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
              <span>Compartilhe orçamentos com um clique no WhatsApp</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};