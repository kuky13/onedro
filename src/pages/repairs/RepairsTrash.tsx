// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/useToast';
import { Trash2, RotateCcw, RefreshCw, CheckSquare } from 'lucide-react';

interface RepairTrashItem {
  id: string;
  created_at: string;
  device_name: string;
  service_description: string;
  deleted_at: string;
}

const RepairsTrash: React.FC = () => {
  const { showError, showSuccess } = useToast();
  const [items, setItems] = useState<RepairTrashItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  const loadTrash = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      await supabase
        .from<any>('repair_services')
        .delete()
        .eq('user_id', user.id)
        .lt('deleted_at', ninetyDaysAgo.toISOString());

      const { data, error } = await supabase
        .from<any>('repair_services')
        .select('id, created_at, device_name, service_description, deleted_at')
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;

      setItems((data || []).map((item: any) => ({
        id: item.id,
        created_at: item.created_at,
        device_name: item.device_name,
        service_description: item.service_description,
        deleted_at: item.deleted_at
      })));
      setSelectedIds([]);
    } catch (err: any) {
      showError({
        title: 'Erro ao carregar lixeira',
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrash();
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(item => item.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handlePermanentDelete = async (ids: string[]) => {
    if (!ids.length) return;
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from<any>('repair_services')
        .delete()
        .eq('user_id', user.id)
        .in('id', ids);

      if (error) throw error;

      setItems(prev => prev.filter(item => !ids.includes(item.id)));
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));

      showSuccess({
        title: 'Reparos apagados definitivamente'
      });
    } catch (err: any) {
      showError({
        title: 'Erro ao apagar definitivamente',
        description: err.message
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRestore = async (ids: string[]) => {
    if (!ids.length) return;
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from<any>('repair_services')
        .update({ deleted_at: null, deleted_by: null })
        .eq('user_id', user.id)
        .in('id', ids);

      if (error) throw error;

      setItems(prev => prev.filter(item => !ids.includes(item.id)));
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));

      showSuccess({
        title: 'Reparos restaurados com sucesso'
      });
    } catch (err: any) {
      showError({
        title: 'Erro ao restaurar reparos',
        description: err.message
      });
    } finally {
      setProcessing(false);
    }
  };

  const anySelected = selectedIds.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lixeira de reparos"
        description="Reparos apagados ficam aqui por até 90 dias antes de serem removidos definitivamente."
        icon={<Trash2 className="h-4 w-4" />}
      />

      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={loadTrash}
          disabled={loading || processing}
          className="rounded-xl h-9 gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSelectAll}
          disabled={loading || !items.length}
          className="rounded-xl h-9 gap-1.5"
        >
          <CheckSquare className="h-3.5 w-3.5" />
          {selectedIds.length === items.length && items.length > 0
            ? 'Desmarcar todos'
            : 'Selecionar todos'}
        </Button>
        {anySelected && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleRestore(selectedIds)}
              disabled={processing}
              className="rounded-xl h-9 gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar ({selectedIds.length})
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handlePermanentDelete(selectedIds)}
              disabled={processing}
              className="rounded-xl h-9 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Apagar ({selectedIds.length})
            </Button>
          </>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando lixeira...</div>
      ) : !items.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-3xl bg-muted/40 p-5 mb-4">
            <Trash2 className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-base font-semibold">Lixeira vazia</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Nenhum reparo na lixeira.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 transition-all duration-200 ${
                selectedIds.includes(item.id)
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border/30 bg-muted/5 hover:bg-muted/15'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="pt-0.5">
                  <Checkbox
                    checked={selectedIds.includes(item.id)}
                    onCheckedChange={() => toggleSelect(item.id)}
                    className="rounded-lg"
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-sm truncate">{item.device_name}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted/40 rounded-full px-2 py-0.5">
                      Apagado em {new Date(item.deleted_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {item.service_description}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted-foreground">
                      Criado em {new Date(item.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore([item.id])}
                        disabled={processing}
                        className="h-7 px-2.5 text-[10px] rounded-xl gap-1 hover:bg-primary/10 hover:text-primary"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restaurar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePermanentDelete([item.id])}
                        disabled={processing}
                        className="h-7 px-2.5 text-[10px] rounded-xl gap-1 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                        Apagar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RepairsTrash;