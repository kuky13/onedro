import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import {
  AlertTriangle,
  CheckCircle,
  Save,
  Power,
  PowerOff,
  ArrowLeft,
  Shield,
  RefreshCw,
  Activity,
  Wrench,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const ProblemPageContent: React.FC = () => {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const { systemStatus, loading: statusLoading, refetch } = useMaintenanceMode();
  const { showSuccess, showError } = useToast();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [formData, setFormData] = useState<{
    status: 'maintenance' | 'error';
    message: string;
    estimated_resolution: string;
  }>({
    status: (systemStatus?.status as 'maintenance' | 'error') || 'maintenance',
    message: systemStatus?.message || '',
    estimated_resolution: systemStatus?.estimated_resolution || '',
  });

  React.useEffect(() => {
    if (systemStatus) {
      setFormData({
        status: systemStatus.status,
        message: systemStatus.message,
        estimated_resolution: systemStatus.estimated_resolution || '',
      });
    }
  }, [systemStatus]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const updateData: any = {
        status: formData.status,
        message: formData.message,
        updated_at: new Date().toISOString(),
        updated_by: profile?.id,
      };

      if (formData.estimated_resolution.trim()) {
        updateData.estimated_resolution = new Date(formData.estimated_resolution).toISOString();
      } else {
        updateData.estimated_resolution = null;
      }

      if (!systemStatus?.id) {
        showError({
          title: 'Erro',
          description: 'Status do sistema não encontrado.'
        });
        return;
      }

      const { error } = await supabase
        .from('system_status')
        .update(updateData)
        .eq('id', systemStatus.id);

      if (error) throw error;

      showSuccess({ title: 'Status do sistema atualizado com sucesso!' });
      refetch();
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      showError({
        title: 'Erro ao atualizar status',
        description: String(error?.message || error)
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleMaintenanceMode = async () => {
    setIsToggling(true);

    try {
      const newMaintenanceStatus = !systemStatus?.maintenance_mode_active;
      const { data, error } = await supabase.rpc('toggle_maintenance_mode', {
        active: newMaintenanceStatus
      });
      
      if (error) throw error;
      
      const newStatus = data as boolean;
      showSuccess({
        title: newStatus ? 'Modo de manutenção ativado!' : 'Modo de manutenção desativado!'
      });
      
      refetch();
    } catch (error: any) {
      console.error('Erro ao alternar modo de manutenção:', error);
      showError({
        title: 'Erro ao alternar modo de manutenção',
        description: String(error?.message || error)
      });
    } finally {
      setIsToggling(false);
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      // datetime-local espera horário LOCAL (sem timezone). 
      // toISOString() converte para UTC e “desloca” o horário, então ajustamos pelo offset.
      const date = new Date(dateString);
      const tzOffsetMs = date.getTimezoneOffset() * 60_000;
      const localIso = new Date(date.getTime() - tzOffsetMs).toISOString();
      return localIso.slice(0, 16);
    } catch {
      return '';
    }
  };

  if (authLoading || statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/houston')}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Houston</h1>
                <p className="text-xs text-muted-foreground">Painel Admin</p>
              </div>
            </div>
          </div>
          
          <Badge variant="secondary" className="gap-1">
            <Activity className="h-3 w-3" />
            {profile?.name}
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="rounded-full gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  systemStatus?.status === 'maintenance' 
                    ? 'bg-primary/10' 
                    : 'bg-green-500/10'
                }`}>
                  {systemStatus?.status === 'maintenance' ? (
                    <AlertTriangle className="h-6 w-6 text-primary" />
                  ) : (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-semibold text-foreground">
                    {systemStatus?.status === 'maintenance' ? 'Manutenção' : 'Operacional'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  systemStatus?.maintenance_mode_active 
                    ? 'bg-destructive/10' 
                    : 'bg-green-500/10'
                }`}>
                  {systemStatus?.maintenance_mode_active ? (
                    <PowerOff className="h-6 w-6 text-destructive" />
                  ) : (
                    <Power className="h-6 w-6 text-green-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Manutenção</p>
                  <Badge variant={systemStatus?.maintenance_mode_active ? "destructive" : "secondary"}>
                    {systemStatus?.maintenance_mode_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Última Atualização</p>
                  <p className="text-sm font-medium text-foreground">
                    {systemStatus?.updated_at 
                      ? new Date(systemStatus.updated_at).toLocaleString('pt-BR')
                      : '-'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Maintenance Toggle */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              {systemStatus?.maintenance_mode_active ? (
                <PowerOff className="h-5 w-5 text-destructive" />
              ) : (
                <Power className="h-5 w-5 text-green-500" />
              )}
              Controle de Manutenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">
                  Modo de manutenção está {systemStatus?.maintenance_mode_active ? 'ATIVO' : 'INATIVO'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {systemStatus?.maintenance_mode_active 
                    ? 'Usuários serão redirecionados para a página de manutenção'
                    : 'Sistema funcionando normalmente para todos os usuários'
                  }
                </p>
              </div>
              
              <Button
                onClick={handleToggleMaintenanceMode}
                disabled={isToggling}
                variant={systemStatus?.maintenance_mode_active ? "destructive" : "default"}
                className="rounded-full gap-2 min-w-[180px]"
              >
                {isToggling ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : systemStatus?.maintenance_mode_active ? (
                  <PowerOff className="h-4 w-4" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
                {systemStatus?.maintenance_mode_active ? 'Desativar' : 'Ativar'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Edit Form */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wrench className="h-5 w-5 text-primary" />
              Editar Informações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateStatus} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">Tipo de Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as 'maintenance' | 'error' }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maintenance">🔧 Manutenção</SelectItem>
                      <SelectItem value="error">⚠️ Erro/Problema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="estimated_resolution" className="text-sm font-medium">Previsão de Resolução</Label>
                  <Input
                    id="estimated_resolution"
                    type="datetime-local"
                    value={formatDateTime(formData.estimated_resolution)}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      estimated_resolution: e.target.value 
                    }))}
                    className="rounded-xl"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm font-medium">Mensagem para os Usuários</Label>
                <Textarea
                  id="message"
                  placeholder="Digite a mensagem que será exibida aos usuários..."
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  required
                  className="rounded-xl resize-none"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  type="submit" 
                  disabled={isUpdating}
                  className="rounded-full gap-2"
                >
                  {isUpdating ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar Alterações
                </Button>
                
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => refetch()}
                  className="rounded-full gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Atualizar Dados
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export const ProblemPage: React.FC = () => {
  return <ProblemPageContent />;
};

export default ProblemPage;
