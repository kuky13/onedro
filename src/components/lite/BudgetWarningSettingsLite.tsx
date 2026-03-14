import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Save, Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface BudgetWarningSettingsLiteProps {
  userId: string;
  profile: any;
}

export const BudgetWarningSettingsLite = ({ userId, profile }: BudgetWarningSettingsLiteProps) => {
  const queryClient = useQueryClient();
  const [isEnabled, setIsEnabled] = useState(true);
  const [days, setDays] = useState('15');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setIsEnabled(profile.budget_warning_enabled ?? true);
      setDays((profile.budget_warning_days ?? 15).toString());
    }
  }, [profile]);

  const handleSave = async () => {
    const numericDays = parseInt(days) || 15;
    if (isNaN(numericDays) || numericDays < 1 || numericDays > 365) {
      alert('O número de dias deve ser entre 1 e 365.');
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
    } catch (error) {
      console.error('Error updating warning settings:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Bell className="h-4 w-4 text-amber-400" />
          </div>
          Avisos de Vencimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
          <Label htmlFor="warning-enabled" className="text-sm font-medium cursor-pointer">
            Ativar avisos
          </Label>
          <Switch id="warning-enabled" checked={isEnabled} onCheckedChange={setIsEnabled} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="warning-days" className="text-xs text-muted-foreground">
            Dias antes do vencimento
          </Label>
          <Input
            id="warning-days"
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            disabled={!isEnabled}
            className="rounded-xl"
          />
        </div>
        <Button onClick={handleSave} disabled={isLoading} className="w-full rounded-xl">
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          ) : success ? (
            <Check className="h-4 w-4 mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isLoading ? 'Salvando...' : success ? 'Salvo!' : 'Salvar'}
        </Button>
      </CardContent>
    </Card>
  );
};
