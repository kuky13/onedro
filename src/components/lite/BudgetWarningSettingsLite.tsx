import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Save } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface BudgetWarningSettingsLiteProps {
  userId: string;
  profile: any;
}

export const BudgetWarningSettingsLite = ({
  userId,
  profile
}: BudgetWarningSettingsLiteProps) => {
  const queryClient = useQueryClient();
  const [isEnabled, setIsEnabled] = useState(true);
  const [days, setDays] = useState('15');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setIsEnabled(profile.budget_warning_enabled ?? true);
      const warningDays = profile.budget_warning_days ?? 15;
      setDays(warningDays.toString());
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

      queryClient.invalidateQueries({
        queryKey: ['user-profile', userId]
      });
      alert('Configurações de aviso salvas com sucesso!');
    } catch (error) {
      console.error('Error updating warning settings:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-foreground">
          <Bell className="h-5 w-5 text-primary" />
          Avisos de Vencimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="warning-enabled" className="text-sm font-medium">
            Ativar avisos
          </Label>
          <Switch
            id="warning-enabled"
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="warning-days" className="text-sm font-medium">
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
          />
        </div>
        <Button onClick={handleSave} disabled={isLoading} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Salvando...' : 'Salvar'}
        </Button>
      </CardContent>
    </Card>
  );
};