import React, { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(false);
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
      setLoading(true);
      const {
        error
      } = await supabase.from('user_profiles').update({
        budget_warning_enabled: isEnabled,
        budget_warning_days: numericDays
      }).eq('id', userId);
      if (error) throw error;

      // Invalidar cache do perfil para forçar atualização
      queryClient.invalidateQueries({
        queryKey: ['user-profile', userId]
      });
      alert('Configurações de aviso salvas com sucesso!');
    } catch (error) {
      console.error('Error updating warning settings:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };
  return;
};