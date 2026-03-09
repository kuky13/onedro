import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Download, Trash2, AlertTriangle } from 'lucide-react';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AccountDataSettingsLiteProps {
  userId: string;
  userEmail?: string;
  className?: string;
}

export const AccountDataSettingsLite = ({ userId, userEmail, className }: AccountDataSettingsLiteProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      toast.info('Iniciando exportação de dados...');

      // Fetch data sequentially to avoid overwhelming the client or DB
      const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
      const { data: budgets } = await supabase.from('budgets').select('*').eq('owner_id', userId);
      const { data: serviceOrders } = await supabase.from('service_orders').select('*').eq('owner_id', userId);
      const { data: clients } = await supabase.from('clients').select('*').eq('user_id', userId);

      const exportData = {
        export_date: new Date().toISOString(),
        user_profile: profile,
        budgets: budgets || [],
        service_orders: serviceOrders || [],
        clients: clients || [],
      };

      // Create blob and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `onedrip-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Exportação concluída com sucesso!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar dados. Tente novamente mais tarde.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteRequest = () => {
    const subject = `Solicitação de Exclusão de Conta - ${userEmail || userId}`;
    const body = `Olá equipe de suporte,\n\nSolicito a exclusão permanente da minha conta e de todos os dados pessoais associados ao meu usuário.\n\nID do Usuário: ${userId}\nE-mail: ${userEmail || 'Não informado'}\n\nEstou ciente de que esta ação é irreversível e do prazo de 30 dias para processamento conforme a LGPD.\n\nAtenciosamente,`;
    
    // Open default mail client
    window.open(`mailto:suporte@onedrip.email?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    
    toast.info('Cliente de e-mail aberto para enviar a solicitação.');
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Database className="h-5 w-5 mr-2 text-primary" />
          Dados e Privacidade
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Export Section */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Download className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-foreground">Exportar Dados</p>
              <p className="text-xs text-muted-foreground">
                Baixe uma cópia completa dos seus dados
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportData}
            disabled={isExporting}
            className="text-blue-600 border-blue-600 hover:bg-blue-50"
          >
            {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
        </div>

        {/* Delete Section */}
        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20">
          <div className="flex items-center space-x-3">
            <Trash2 className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Excluir Conta</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/80">
                Solicitar exclusão permanente (LGPD)
              </p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Excluir Conta
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    Você está prestes a solicitar a exclusão permanente da sua conta e de todos os seus dados pessoais.
                  </p>
                  <div className="bg-muted p-3 rounded-md text-xs font-mono">
                    Atenção: Esta ação é irreversível e resultará na perda de todos os seus orçamentos, ordens de serviço e cadastros.
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Prazo: Solicitações de exclusão são processadas em até 30 dias conforme a LGPD.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteRequest} className="bg-destructive hover:bg-destructive/90">
                  Solicitar Exclusão
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};
