import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';


export const BudgetWarningSettingsEnhanced: React.FC = () => {
  const { user, profile } = useAuth();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();

  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [days, setDays] = useState<string>('');

  useEffect(() => {
    if (profile) {
      setIsEnabled(profile.budget_warning_enabled ?? true);
      const warningDays = profile.budget_warning_days ?? 15;
      setDays(warningDays.toString());
    }
  }, [profile]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: { budget_warning_enabled: boolean; budget_warning_days: number }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          budget_warning_enabled: settings.budget_warning_enabled,
          budget_warning_days: settings.budget_warning_days,
        })
        .eq('id', user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] });
      showSuccess({
        title: 'Configurações salvas',
        description: 'Suas preferências de aviso foram atualizadas.',
      });
    },
    onError: (error: any) => {
      console.error('Erro ao salvar configurações de aviso:', error);
      showError({ title: 'Erro ao salvar', description: 'Não foi possível salvar suas configurações.' });
    },
  });

  const handleSave = () => {
    const numericDays = parseInt(days, 10);
    if (!Number.isFinite(numericDays) || numericDays < 1 || numericDays > 365) {
      showError({ title: 'Valor inválido', description: 'O número de dias deve ser entre 1 e 365.' });
      return;
    }
    // Persist supabase-backed fields
    updateSettingsMutation.mutate({ budget_warning_enabled: isEnabled, budget_warning_days: numericDays });
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Configurações de Avisos de Orçamentos
        </CardTitle>
        <CardDescription>Personalize o sistema de avisos para orçamentos antigos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="warning-enabled" className="flex flex-col">
            <span>Ativar avisos</span>
            <span className="text-xs text-muted-foreground">Exibir alerta para orçamentos antigos</span>
          </Label>
          <Switch id="warning-enabled" checked={isEnabled} onCheckedChange={setIsEnabled} />
        </div>

        {isEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="warning-days">Avisar após (dias)</Label>
              <Input
                id="warning-days"
                type="number"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                min={1}
                max={365}
                placeholder="15"
              />
              <p className="text-xs text-muted-foreground">Defina quantos dias tornam um orçamento "antigo".</p>
            </div>
            {/* Opções de cor e estilo removidas conforme solicitado */}
          </div>
        )}

        <Button onClick={handleSave} disabled={updateSettingsMutation.isPending} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {updateSettingsMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BudgetWarningSettingsEnhanced;