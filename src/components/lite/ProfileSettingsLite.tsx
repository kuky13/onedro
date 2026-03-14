import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { User, Save, Check } from 'lucide-react';

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
      alert('O nome é obrigatório.');
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
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erro ao salvar informações');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <User className="h-4 w-4 text-blue-400" />
          </div>
          Perfil Pessoal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs text-muted-foreground">Nome</Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="Seu nome completo"
            className="rounded-xl"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full rounded-xl"
          size="lg"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          ) : success ? (
            <Check className="h-4 w-4 mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {loading ? 'Salvando...' : success ? 'Salvo com sucesso!' : 'Salvar Alterações'}
        </Button>
      </CardContent>
    </Card>
  );
};
