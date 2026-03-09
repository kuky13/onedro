import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitleomponents/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Download, Trash2, AlertTriangle, FileText, FileJson, ClClockide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DataPrivacyTabProps {
  userId: string;
  userEmail?: string;
}

export const DataPrivacyTab = ({ userId }: DataPrivacyTabProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [_exportType, setExportType] = useState<'all' | 'budgets' | 'clients' | 'services' | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletionScheduledAt, setDeletionScheduledAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkDeletionStatus();
  }, [userId]);

  const checkDeletionStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('deletion_scheduled_at')
        .eq('id', userId)
        .single();
        
      if (data?.deletion_scheduled_at) {
        setDeletionScheduledAt(data.deletion_scheduled_at);
      }
    } catch (error) {
      console.error('Error checking deletion status:', error);
    }
  };

  const handleExportData = async (type: 'all' | 'budgets' | 'clients' | 'services', formatType: 'json' | 'csv') => {
    try {
      setIsExporting(true);
      setExportType(type);
      toast.info(`Iniciando exportação de ${type}...`);

      let dataToExport: any = {};
      let fileName = `onedrip-export-${type}-${new Date().toISOString().split('T')[0]}`;

      if (type === 'budgets' || type === 'all') {
        const { data } = await supabase.from('budgets').select('*').eq('owner_id', userId);
        if (type === 'budgets') dataToExport = data || [];
        else dataToExport.budgets = data || [];
      }

      if (type === 'clients' || type === 'all') {
        const { data } = await supabase.from('clients').select('*').eq('user_id', userId);
        if (type === 'clients') dataToExport = data || [];
        else dataToExport.clients = data || [];
      }

      if (type === 'services' || type === 'all') {
        const { data } = await supabase.from('service_orders').select('*').eq('owner_id', userId);
        if (type === 'services') dataToExport = data || [];
        else dataToExport.service_orders = data || [];
      }

      if (type === 'all') {
        const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
        dataToExport.user_profile = profile;
      }

      // Convert and Download
      if (formatType === 'json') {
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (formatType === 'csv') {
        // Simple CSV converter for arrays
        const items = Array.isArray(dataToExport) ? dataToExport : [];
        if (items.length === 0) {
          toast.warning('Nenhum dado encontrado para exportar em CSV.');
          return;
        }
        const headers = Object.keys(items[0]).join(',');
        const csvContent = [
          headers,
          ...items.map(row => Object.values(row).map(v => `"${v}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      toast.success('Exportação concluída com sucesso!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar dados.');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleScheduleDeletion = async () => {
    if (deleteConfirmText !== 'EXCLUIR MINHA CONTA') {
      toast.error('Texto de confirmação incorreto.');
      return;
    }

    try {
      setIsLoading(true);
      // Calculate date 30 days from now
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 30);
      const isoDate = scheduledDate.toISOString();

      const { error } = await supabase
        .from('user_profiles')
        .update({ deletion_scheduled_at: isoDate } as any)
        .eq('id', userId);

      if (error) throw error;

      setDeletionScheduledAt(isoDate);
      setIsDeleteDialogOpen(false);
      toast.success('Exclusão agendada com sucesso. Seus dados serão removidos em 30 dias.');
      
      // Send email notification logic here (optional)
      
    } catch (error) {
      console.error('Error scheduling deletion:', error);
      toast.error('Erro ao agendar exclusão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('user_profiles')
        .update({ deletion_scheduled_at: null } as any)
        .eq('id', userId);

      if (error) throw error;

      setDeletionScheduledAt(null);
      toast.success('Agendamento de exclusão cancelado.');
    } catch (error) {
      console.error('Error canceling deletion:', error);
      toast.error('Erro ao cancelar exclusão.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Export Section */}
        <Card className="md:col-span-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Exportar seus Dados
            </CardTitle>
            <CardDescription>
              Baixe uma cópia dos seus dados em formatos compatíveis (JSON ou CSV).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-24 flex flex-col gap-2 hover:bg-primary/10 hover:border-primary/50"
              onClick={() => handleExportData('all', 'json')}
              disabled={isExporting}
            >
              <Database className="h-6 w-6 text-blue-500" />
              <span>Tudo (Backup)</span>
              <span className="text-xs text-muted-foreground">JSON Completo</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-24 flex flex-col gap-2 hover:bg-primary/10 hover:border-primary/50"
              onClick={() => handleExportData('budgets', 'csv')}
              disabled={isExporting}
            >
              <FileText className="h-6 w-6 text-green-500" />
              <span>Orçamentos</span>
              <span className="text-xs text-muted-foreground">Planilha CSV</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-24 flex flex-col gap-2 hover:bg-primary/10 hover:border-primary/50"
              onClick={() => handleExportData('clients', 'csv')}
              disabled={isExporting}
            >
              <FileText className="h-6 w-6 text-orange-500" />
              <span>Clientes</span>
              <span className="text-xs text-muted-foreground">Planilha CSV</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-24 flex flex-col gap-2 hover:bg-primary/10 hover:border-primary/50"
              onClick={() => handleExportData('services', 'csv')}
              disabled={isExporting}
            >
              <FileText className="h-6 w-6 text-purple-500" />
              <span>Ordens de Serviço</span>
              <span className="text-xs text-muted-foreground">Planilha CSV</span>
            </Button>
          </CardContent>
        </Card>

        {/* Deletion Section */}
        <Card className="md:col-span-2 border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
              Zona de Perigo
            </CardTitle>
            <CardDescription>
              Gerenciamento de exclusão de conta e dados pessoais (LGPD).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {deletionScheduledAt ? (
              <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg flex items-start gap-4">
                <Clock className="h-6 w-6 text-red-600 mt-1 shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-semibold text-red-700 dark:text-red-400">Exclusão Agendada</h4>
                  <p className="text-sm text-red-600/90 dark:text-red-400/90">
                    Sua conta está programada para ser excluída permanentemente em: <br/>
                    <span className="font-bold text-lg">
                      {format(new Date(deletionScheduledAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Até essa data, você pode cancelar a solicitação e continuar usando o sistema normalmente.
                  </p>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleCancelDeletion}
                    disabled={isLoading}
                    className="mt-2 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isLoading ? 'Cancelando...' : 'Cancelar Exclusão'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-1">
                  <h4 className="font-medium text-foreground">Excluir Conta Permanentemente</h4>
                  <p className="text-sm text-muted-foreground max-w-xl">
                    Ao solicitar a exclusão, seus dados permanecerão em quarentena por 30 dias antes de serem removidos definitivamente, permitindo a recuperação em caso de arrependimento.
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  Solicitar Exclusão
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Exclusão de Conta
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-4">
              <p>
                Esta ação agendará a exclusão permanente da sua conta <strong>{userEmail}</strong> e de todos os dados associados (orçamentos, clientes, ordens de serviço).
              </p>
              <div className="bg-muted p-3 rounded-md text-sm border-l-4 border-destructive">
                <strong>Processo de 30 dias:</strong> Seus dados ficarão inacessíveis após 30 dias. Você pode cancelar este processo a qualquer momento dentro deste período.
              </div>
              <div className="space-y-2 pt-2">
                <Label htmlFor="confirm-delete">
                  Digite <span className="font-mono font-bold text-destructive">EXCLUIR MINHA CONTA</span> para confirmar:
                </Label>
                <Input
                  id="confirm-delete"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="EXCLUIR MINHA CONTA"
                  className="border-destructive/30 focus-visible:ring-destructive"
                />
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={handleScheduleDeletion}
              disabled={deleteConfirmText !== 'EXCLUIR MINHA CONTA' || isLoading}
            >
              {isLoading ? 'Agendando...' : 'Confirmar e Agendar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
