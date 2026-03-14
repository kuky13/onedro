import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Check, Pencil, Save, User } from 'lucide-react';
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
  const { showSuccess, showError, showInfo } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [nameFocused, setNameFocused] = useState(false);

  const initials = useMemo(() => {
    const src = (formData.name || '').trim() || (formData.email || '').trim();
    if (!src) return 'U';
    const parts = src.split(/\s+/g).filter(Boolean);
    const a = parts[0]?.[0] ?? 'U';
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1];
    return `${a}${b ?? ''}`.toUpperCase();
  }, [formData.email, formData.name]);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || ''
      });
    }
  }, [profile]);

  useEffect(() => {
    return () => {
      if (avatarUrl) URL.revokeObjectURL(avatarUrl);
    };
  }, [avatarUrl]);

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

  const onPickAvatar = () => {
    showInfo({ title: 'Imagem local', description: 'Por enquanto a foto fica apenas neste dispositivo.' });
    fileRef.current?.click();
  };

  const onAvatarFileChange = (file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
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

        <div className="mt-5 flex flex-col items-center text-center">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-1 ring-border/40">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={formData.name || formData.email || 'Usuário'} /> : null}
              <AvatarFallback className="text-xl font-semibold bg-muted/40">{initials}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={onPickAvatar}
              className="absolute -bottom-2 -right-2 h-9 w-9 rounded-full bg-background/70 backdrop-blur-sm border border-border/40 shadow-sm flex items-center justify-center hover:bg-background/90 transition-colors"
              aria-label="Editar avatar"
            >
              <Pencil className="h-4 w-4 text-foreground" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onAvatarFileChange(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="mt-3 text-sm font-medium text-foreground">{formData.name || 'Seu nome'}</div>
          <div className="text-xs text-muted-foreground">{formData.email || '—'}</div>
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
