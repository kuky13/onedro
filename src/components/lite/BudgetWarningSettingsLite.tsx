import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Check, Minus, Plus, Save } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { SettingsGlassCard } from '@/components/lite/settings/SettingsLitePrimitives';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/useToast';

interface BudgetWarningSettingsLiteProps {
  userId: string;
  profile: any;
}

export const BudgetWarningSettingsLite = ({ userId, profile }: BudgetWarningSettingsLiteProps) => {
  const queryClient = useQueryClient();
  const [isEnabled, setIsEnabled] = useState(true);
  const [days, setDays] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (profile) {
      setIsEnabled(profile.budget_warning_enabled ?? true);
      setDays(profile.budget_warning_days ?? 15);
    }
  }, [profile]);

  const handleSave = async () => {
    const numericDays = Math.min(365, Math.max(1, Number.isFinite(days) ? days : 15));
    if (numericDays < 1 || numericDays > 365) {
      showError({ title: 'Valor inválido', description: 'O número de dias deve ser entre 1 e 365.' });
      return;
    }
    try {
      setIsLoading(true);
      const { error } = await supabase.from('user_profiles').update({
        budget_warning_enabled: isEnabled,
        budget_warning_days: numericDays
      }).eq('id', userId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      showSuccess({ title: 'Configurações salvas', description: 'Avisos de orçamento atualizados.' });
    } catch (error) {
      console.error('Error updating warning settings:', error);
      showError({ title: 'Erro ao salvar', description: 'Não foi possível atualizar os avisos.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SettingsGlassCard>
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-amber-500/15 flex items-center justify-center">
            <Bell className="h-[18px] w-[18px] text-amber-300" />
          </div>
          <div>
            <div className="text-base font-semibold text-foreground">Avisos de orçamento</div>
            <div className="text-xs text-muted-foreground">Vencimentos e lembretes</div>
          </div>
        </div>
      </div>

      <Separator className="bg-border/30" />

      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/20 border border-border/30 px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground">Ativar avisos</div>
            <div className="text-xs text-muted-foreground">Notifica antes do orçamento vencer</div>
          </div>
          <Switch id="warning-enabled" checked={isEnabled} onCheckedChange={setIsEnabled} />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Dias antes do vencimento</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl h-11 w-11"
              onClick={() => setDays((d) => Math.max(1, d - 1))}
              disabled={!isEnabled}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <input
                inputMode="numeric"
                value={days}
                onChange={(e) => setDays(Math.min(365, Math.max(1, parseInt(e.target.value || '0', 10) || 0)))}
                disabled={!isEnabled}
                className="w-full h-11 rounded-xl px-3 bg-background/50 border border-border/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/35"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl h-11 w-11"
              onClick={() => setDays((d) => Math.min(365, d + 1))}
              disabled={!isEnabled}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:to-primary/70"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          ) : success ? (
            <Check className="h-4 w-4 mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isLoading ? 'Salvando...' : success ? 'Salvo' : 'Salvar'}
        </Button>
      </div>
    </SettingsGlassCard>
  );
};
