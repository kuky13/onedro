import { useState } from 'react';
import { AlertTriangle, ChevronRight, Database, Download, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { SettingsGlassCard, SettingsRow } from '@/components/lite/settings/SettingsLitePrimitives';

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
    <SettingsGlassCard className={className}>
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-purple-500/15 flex items-center justify-center">
            <Database className="h-[18px] w-[18px] text-purple-300" />
          </div>
          <div>
            <div className="text-base font-semibold text-foreground">Dados da conta</div>
            <div className="text-xs text-muted-foreground">Exportar e solicitações LGPD</div>
          </div>
        </div>
      </div>

      <Separator className="bg-border/30" />

      <div className="divide-y divide-border/30">
        <SettingsRow
          icon={Download}
          title={isExporting ? 'Exportando...' : 'Exportar dados'}
          description="Baixe uma cópia completa dos seus dados"
          iconBgClassName="bg-blue-500/15"
          iconClassName="text-blue-300"
          onClick={handleExportData}
          disabled={isExporting}
        />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 min-h-11 text-left transition-colors hover:bg-muted/35 active:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            >
              <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 bg-destructive/15">
                <Trash2 className="h-[18px] w-[18px] text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate text-destructive">Excluir conta</div>
                <div className="text-xs text-muted-foreground truncate">Solicitar exclusão permanente (LGPD)</div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-destructive/50" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Excluir conta
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>Você está prestes a solicitar a exclusão permanente da sua conta e de todos os seus dados pessoais.</p>
                <div className="bg-muted/30 border border-border/30 p-3 rounded-xl text-xs">
                  Esta ação é irreversível e resultará na perda de dados como orçamentos, ordens de serviço e cadastros.
                </div>
                <p className="text-sm font-medium text-foreground">
                  Prazo: solicitações são processadas em até 30 dias conforme a LGPD.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteRequest} className="bg-destructive hover:bg-destructive/90 rounded-xl">
                Solicitar exclusão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SettingsGlassCard>
  );
};
