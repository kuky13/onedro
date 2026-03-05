import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RotateCcw, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useBudgetDeletion } from '@/hooks/useBudgetDeletion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
interface WormTrashProps {
  userId: string;
  onRestore?: () => void;
}
export const WormTrash = ({
  userId,
  onRestore
}: WormTrashProps) => {
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const {
    handleRestore,
    isRestoring
  } = useBudgetDeletion();
  const {
    data: deletedBudgets,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['worm-trash', userId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('budget_deletion_audit').select(`
          budget_id,
          budget_data,
          created_at,
          can_restore
        `).eq('deleted_by', userId).eq('can_restore', true).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    refetchOnWindowFocus: false
  });
  const handleRestoreBudget = async (auditRecord: any) => {
    const budgetId = auditRecord.budget_id;
    if (!budgetId) {
      toast.error('ID do orçamento inválido');
      return;
    }
    if (!userId) {
      toast.error('Usuário não autenticado');
      return;
    }
    try {
      setRestoringId(budgetId);
      console.log(`[WormTrash] Iniciando restauração do orçamento: ${budgetId}`);
      await handleRestore(budgetId);
      console.log(`[WormTrash] Orçamento ${budgetId} restaurado com sucesso`);
      refetch();
      onRestore?.();
    } catch (error) {
      console.error(`[WormTrash] Erro ao restaurar orçamento ${budgetId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao restaurar orçamento';
      toast.error(`Falha na restauração: ${errorMessage}`);
    } finally {
      setRestoringId(null);
    }
  };
  const handlePermanentDelete = async (budgetId: string) => {
    if (!budgetId) {
      toast.error('ID do orçamento inválido');
      return;
    }
    if (!userId) {
      toast.error('Usuário não autenticado');
      return;
    }
    try {
      setDeletingId(budgetId);
      console.log(`[WormTrash] Iniciando exclusão permanente do orçamento: ${budgetId}`);

      // Verificar se o orçamento existe na lixeira
      const budgetExists = deletedBudgets?.some(record => record.budget_id === budgetId);
      if (!budgetExists) {
        throw new Error('Orçamento não encontrado na lixeira');
      }

      // Marcar como não restaurável no audit (exclusão permanente)
      const {
        error
      } = await supabase.from('budget_deletion_audit').update({
        can_restore: false
      }).eq('budget_id', budgetId).eq('deleted_by', userId);
      if (error) {
        console.error(`[WormTrash] Erro do Supabase:`, error);
        throw new Error(`Falha na exclusão: ${error.message}`);
      }
      console.log(`[WormTrash] Orçamento ${budgetId} excluído permanentemente`);
      toast.success('Orçamento excluído permanentemente');
      refetch();
    } catch (error) {
      console.error(`[WormTrash] Erro ao excluir permanentemente orçamento ${budgetId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido na exclusão permanente';
      toast.error(`Falha na exclusão: ${errorMessage}`);
    } finally {
      setDeletingId(null);
    }
  };
  const handleEmptyTrash = async () => {
    if (!deletedBudgets || deletedBudgets.length === 0) {
      toast.error('Não há orçamentos na lixeira para excluir');
      return;
    }
    if (!userId) {
      toast.error('Usuário não autenticado');
      return;
    }
    try {
      const budgetIds = deletedBudgets.map(record => record.budget_id);
      const totalCount = budgetIds.length;
      console.log(`[WormTrash] Iniciando esvaziamento da lixeira: ${totalCount} orçamentos`);

      // Validar se todos os IDs são válidos
      const invalidIds = budgetIds.filter(id => !id || typeof id !== 'string');
      if (invalidIds.length > 0) {
        throw new Error(`IDs de orçamento inválidos encontrados: ${invalidIds.length}`);
      }

      // Marcar todos como não restauráveis em batch
      const { error, data: updatedRows } = await supabase
        .from('budget_deletion_audit')
        .update({ can_restore: false })
        .in('budget_id', budgetIds)
        .eq('deleted_by', userId)
        .select('budget_id');
      if (error) {
        console.error(`[WormTrash] Erro do Supabase ao esvaziar lixeira:`, error);
        throw new Error(`Falha ao esvaziar lixeira: ${error.message}`);
      }
      const affectedRows = updatedRows?.length || 0;
      console.log(`[WormTrash] Lixeira esvaziada: ${affectedRows}/${totalCount} orçamentos processados`);
      if (affectedRows === 0) {
        toast.warning('Nenhum orçamento foi processado. Verifique as permissões.');
      } else if (affectedRows < totalCount) {
        toast.warning(`${affectedRows} de ${totalCount} orçamentos foram excluídos permanentemente`);
      } else {
        toast.success(`${affectedRows} orçamento(s) excluído(s) permanentemente`);
      }
      refetch();
    } catch (error) {
      console.error('[WormTrash] Erro ao esvaziar lixeira:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao esvaziar lixeira';
      toast.error(`Falha ao esvaziar lixeira: ${errorMessage}`);
    }
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };
  if (isLoading) {
    return <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Lixeira</h2>
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="p-4 bg-muted rounded-lg animate-pulse">
              <div className="h-4 bg-background rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-background rounded w-1/3"></div>
            </div>)}
        </div>
      </div>;
  }
  return <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Lixeira</h2>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!deletedBudgets || deletedBudgets.length === 0 ? <div className="text-center py-8">
          <Trash2 className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-medium mb-2">Lixeira vazia</h3>
          <p className="text-sm text-muted-foreground">
            Orçamentos excluídos aparecerão aqui
          </p>
        </div> : <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {deletedBudgets.length} item(s) na lixeira
            </p>
            
            {deletedBudgets.length > 1 && <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={restoringId !== null || deletingId !== null || isRestoring} className="flex items-center gap-2">
                    <Trash2 className="h-3 w-3" />
                    Esvaziar Lixeira
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Esvaziar Lixeira Permanentemente
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      <strong>Esta ação não pode ser desfeita!</strong>
                      <br /><br />
                      Todos os {deletedBudgets.length} orçamentos na lixeira serão completamente removidos e não poderão ser recuperados.
                      <br /><br />
                      Tem certeza de que deseja continuar?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleEmptyTrash} className="bg-destructive hover:bg-destructive/90">
                      Confirmar Exclusão de Todos
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>}
          </div>
          
          {deletedBudgets.map(record => {
        const budget = (record.budget_data as any) || {};
        return <div key={record.budget_id} className="p-4 bg-muted rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium">
                      {budget.client_name || 'Cliente não informado'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {budget.device_type} {budget.device_model}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleRestoreBudget(record)} disabled={restoringId === record.budget_id || deletingId === record.budget_id || isRestoring}>
                      {restoringId === record.budget_id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                      Restaurar
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={restoringId === record.budget_id || deletingId === record.budget_id || isRestoring}>
                          <Trash2 className="h-3 w-3" />
                          Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Excluir Permanentemente
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            <strong>Esta ação não pode ser desfeita!</strong>
                            <br /><br />
                            O orçamento de <strong>{budget.client_name || 'Cliente não informado'}</strong> será removido permanentemente da lixeira e não poderá ser recuperado.
                            <br /><br />
                            Tem certeza de que deseja continuar?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => record.budget_id && handlePermanentDelete(record.budget_id)}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={deletingId === record.budget_id}
                          >
                            {deletingId === record.budget_id ? 'Excluindo...' : 'Confirmar Exclusão'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                  
                  <div>
                    <span>Excluído em: </span>
                    {formatDate(record.created_at || new Date().toISOString())}
                  </div>
                </div>
              </div>;
      })}
        </div>}
    </div>;
};