// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/useToast';
import { Trash2, RotateCcw } from 'lucide-react';

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

      // Limpa automaticamente itens com mais de 90 dias na lixeira
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
    <div className="space-y-4">
      <PageHeader
        title="Lixeira de reparos"
        description="Reparos apagados ficam aqui por até 90 dias antes de serem removidos definitivamente."
        icon={<Trash2 className="h-4 w-4" />}
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTrash}
            disabled={loading || processing}
          >
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            disabled={loading || !items.length}
          >
            {selectedIds.length === items.length && items.length > 0
              ? 'Desmarcar todos'
              : 'Selecionar todos'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleRestore(selectedIds)}
            disabled={!anySelected || processing}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Restaurar selecionados
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handlePermanentDelete(selectedIds)}
            disabled={!anySelected || processing}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Apagar definitivamente
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Itens na lixeira</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando lixeira...</div>
          ) : !items.length ? (
            <div className="text-sm text-muted-foreground">
              Nenhum reparo na lixeira.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <div
                  key={item.id}
                  className="grid grid-cols-[auto,1fr] items-start gap-3 rounded-lg border p-3"
                >
                  <div className="pt-1">
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">{item.device_name}</div>
                      <div className="text-xs text-muted-foreground">
                        Apagado em{' '}
                        {new Date(item.deleted_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.service_description}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Criado em {new Date(item.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleRestore([item.id])}
                        disabled={processing}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restaurar
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handlePermanentDelete([item.id])}
                        disabled={processing}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Apagar definitivamente
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RepairsTrash;
