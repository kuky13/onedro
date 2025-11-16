import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import { AdminGuard } from '@/components/AdminGuard';
import { 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  Save, 
  Power, 
  PowerOff,
  ArrowLeft,
  Shield,
  RefreshCw,
  Activity
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
  const { profile, loading: authLoading } = useAuth();
  const { systemStatus, loading: statusLoading, refetch } = useMaintenanceMode();
  const { showSuccess, showError } = useToast();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [formData, setFormData] = useState({
    status: systemStatus?.status || 'maintenance',
    message: systemStatus?.message || '',
    estimated_resolution: systemStatus?.estimated_resolution || '',
  });

  // Atualizar form quando systemStatus mudar
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

      // Só incluir estimated_resolution se não estiver vazio
      if (formData.estimated_resolution.trim()) {
        updateData.estimated_resolution = new Date(formData.estimated_resolution).toISOString();
      } else {
        updateData.estimated_resolution = null;
      }

      const { error } = await supabase
        .from('system_status')
        .update(updateData)
        .eq('id', systemStatus?.id);

      if (error) throw error;

      showSuccess({ title: 'Status do sistema atualizado com sucesso!' });
      refetch();
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      showError('Erro ao atualizar status: ' + error.message);
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
      showSuccess(
        newStatus 
          ? 'Modo de manutenção ativado!' 
          : 'Modo de manutenção desativado!'
      );
      
      refetch();
    } catch (error: any) {
      console.error('Erro ao alternar modo de manutenção:', error);
      showError('Erro ao alternar modo de manutenção: ' + error.message);
    } finally {
      setIsToggling(false);
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().slice(0, 16); // Format for datetime-local input
    } catch {
      return '';
    }
  };

  if (authLoading || statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-5xl mx-auto px-4 space-y-8 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/houston'}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Ver Status Público
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
          
          <div className="flex-1 lg:text-center">
            <h1 className="text-3xl font-bold text-foreground flex items-center justify-center lg:justify-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              Painel Administrativo
            </h1>
            <p className="text-muted-foreground mt-2">Gerenciar status do sistema Houston</p>
          </div>
          
          <Badge variant="secondary" className="text-sm self-start lg:self-center">
            <Activity className="h-3 w-3 mr-1" />
            Admin: {profile?.name}
          </Badge>
        </div>

        {/* Status Atual */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              Status Atual do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-4 p-4 bg-muted/30 rounded-xl">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
                  backgroundColor: systemStatus?.status === 'maintenance' ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--success) / 0.1)'
                }}>
                  {systemStatus?.status === 'maintenance' ? (
                    <AlertTriangle className="h-6 w-6 text-primary" />
                  ) : (
                    <CheckCircle className="h-6 w-6 text-success" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Status</p>
                  <p className="font-semibold text-foreground capitalize">
                    {systemStatus?.status === 'maintenance' ? 'Manutenção' : 'Operacional'}
                  </p>
                </div>
              </div>
              
              <div className="p-4 bg-muted/30 rounded-xl">
                <p className="text-sm text-muted-foreground font-medium mb-2">Modo de Manutenção</p>
                <Badge 
                  variant={systemStatus?.maintenance_mode_active ? "destructive" : "secondary"}
                  className="font-semibold"
                >
                  {systemStatus?.maintenance_mode_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              
              <div className="p-4 bg-muted/30 rounded-xl">
                <p className="text-sm text-muted-foreground font-medium mb-2">Última Atualização</p>
                <p className="text-sm font-medium text-foreground">
                  {systemStatus?.updated_at 
                    ? new Date(systemStatus.updated_at).toLocaleString('pt-BR')
                    : 'Não informado'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Controle de Modo de Manutenção */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                systemStatus?.maintenance_mode_active 
                  ? 'bg-destructive/10' 
                  : 'bg-success/10'
              }`}>
                {systemStatus?.maintenance_mode_active ? (
                  <PowerOff className="h-5 w-5 text-destructive" />
                ) : (
                  <Power className="h-5 w-5 text-success" />
                )}
              </div>
              Controle de Modo de Manutenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <p className="font-semibold text-lg text-foreground">
                  Modo de manutenção está {systemStatus?.maintenance_mode_active ? 'ATIVO' : 'INATIVO'}
                </p>
                <p className="text-muted-foreground">
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
                size="lg"
                className="shrink-0 min-w-[200px]"
              >
                {isToggling ? (
                  <div className="loading-spinner mr-2"></div>
                ) : systemStatus?.maintenance_mode_active ? (
                  <PowerOff className="h-4 w-4 mr-2" />
                ) : (
                  <Power className="h-4 w-4 mr-2" />
                )}
                {systemStatus?.maintenance_mode_active ? 'Desativar' : 'Ativar'} Manutenção
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Formulário de Edição */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                <Settings className="h-5 w-5 text-accent" />
              </div>
              Editar Informações de Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateStatus} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="status" className="text-sm font-semibold">Tipo de Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maintenance">🔧 Manutenção</SelectItem>
                      <SelectItem value="error">⚠️ Erro/Problema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="estimated_resolution" className="text-sm font-semibold">Previsão de Resolução</Label>
                  <Input
                    id="estimated_resolution"
                    type="datetime-local"
                    value={formatDateTime(formData.estimated_resolution)}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      estimated_resolution: e.target.value 
                    }))}
                    className="h-12"
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="message" className="text-sm font-semibold">Mensagem para os Usuários</Label>
                <Textarea
                  id="message"
                  placeholder="Digite a mensagem que será exibida aos usuários..."
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  required
                  className="resize-none"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  type="submit" 
                  disabled={isUpdating}
                  className="flex items-center gap-2 px-6"
                >
                  {isUpdating ? (
                    <div className="loading-spinner"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar Alterações
                </Button>
                
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => refetch()}
                  className="flex items-center gap-2 px-6"
                >
                  <RefreshCw className="h-4 w-4" />
                  Atualizar Dados
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const ProblemPage: React.FC = () => {
  return (
    <AdminGuard fallbackPath="/houston">
      <ProblemPageContent />
    </AdminGuard>
  );
};

export default ProblemPage;