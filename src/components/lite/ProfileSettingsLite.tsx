import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Check, Save, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SettingsGlassCard } from '@/components/lite/settings/SettingsLitePrimitives';
import { useToast } from '@/hooks/useToast';

interface Profile {
  name?: string;
  email?: string;
  id?: string;
}

interface ProfileSettingsLiteProps {
  userId: string;
  profile: Profile | null;
}

export const ProfileSettingsLite = ({ userId, profile }: ProfileSettingsLiteProps) => {
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    email: profile?.email || ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { showSuccess, showError } = useToast();
  const [nameFocused, setNameFocused] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || ''
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showError({ title: 'Campo obrigatório', description: 'O nome é obrigatório.' });
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_profiles')
        .update({ name: formData.name })
        .eq('id', userId);
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      showSuccess({ title: 'Perfil atualizado', description: 'Seu nome foi salvo com sucesso.' });
    } catch (error) {
      console.error('Error updating profile:', error);
      showError({ title: 'Erro ao salvar', description: 'Não foi possível atualizar seu perfil.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsGlassCard>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-500/15 flex items-center justify-center">
              <User className="h-[18px] w-[18px] text-blue-300" />
            </div>
            <div>
              <div className="text-base font-semibold text-foreground">Perfil</div>
              <div className="text-xs text-muted-foreground">Seu nome e informações básicas</div>
            </div>
          </div>
        </div>

      </div>

      <Separator className="bg-border/30" />

      <div className="p-5 space-y-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">Informações</div>

        <div className="relative">
          <input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            className={cn(
              'w-full h-12 rounded-xl px-3 pt-5 pb-2',
              'bg-background/50 border border-border/30 text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary/35'
            )}
            placeholder=""
            autoComplete="name"
          />
          <label
            htmlFor="name"
            className={cn(
              'absolute left-3 transition-all text-muted-foreground',
              nameFocused || !!formData.name.trim() ? 'top-2 text-[10px] uppercase tracking-wide' : 'top-1/2 -translate-y-1/2 text-sm'
            )}
          >
            Nome
          </label>
        </div>

        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:to-primary/70"
          size="lg"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          ) : success ? (
            <Check className="h-4 w-4 mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {loading ? 'Salvando...' : success ? 'Salvo' : 'Salvar alterações'}
        </Button>
      </div>
    </SettingsGlassCard>
  );
};
