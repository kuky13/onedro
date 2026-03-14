import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Download, Trash2, AlertTriangle, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
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
    window.open(`mailto:suporte@onedrip.email?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    toast.info('Cliente de e-mail aberto para enviar a solicitação.');
  };

  return (
    <Card className={`rounded-2xl border-border/50 ${className || ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Database className="h-4 w-4 text-purple-400" />
          </div>
          Dados e Privacidade
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <button
          onClick={handleExportData}
          disabled={isExporting}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 transition-colors text-left disabled:opacity-50"
        >
          <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <Download className="h-4 w-4 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {isExporting ? 'Exportando...' : 'Exportar Dados'}
            </p>
            <p className="text-xs text-muted-foreground">Baixe uma cópia completa dos seus dados</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-destructive/5 hover:bg-destructive/10 transition-colors text-left">
              <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-destructive">Excluir Conta</p>
                <p className="text-xs text-destructive/60">Solicitar exclusão permanente (LGPD)</p>
              </div>
              <ChevronRight className="h-4 w-4 text-destructive/40 shrink-0" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Excluir Conta
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>Você está prestes a solicitar a exclusão permanente da sua conta e de todos os seus dados pessoais.</p>
                <div className="bg-secondary/50 p-3 rounded-xl text-xs font-mono">
                  Atenção: Esta ação é irreversível e resultará na perda de todos os seus orçamentos, ordens de serviço e cadastros.
                </div>
                <p className="text-sm font-medium text-foreground">
                  Prazo: Solicitações de exclusão são processadas em até 30 dias conforme a LGPD.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteRequest} className="bg-destructive hover:bg-destructive/90 rounded-xl">
                Solicitar Exclusão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
