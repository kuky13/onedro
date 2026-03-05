// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/useToast';

type Technician = {
  id: string;
  user_id: string;
  name: string;
  default_commission_rate: number;
  is_active: boolean;
  created_at: string;
};

const RepairsTechnicians = () => {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Technician[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Technician | null>(null);
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [active, setActive] = useState(true);

  const canSubmit = useMemo(() => {
    const r = Number(rate);
    return name.trim().length > 1 && !Number.isNaN(r) && r >= 0 && r <= 100;
  }, [name, rate]);

  const resetForm = () => {
    setEditing(null);
    setName('');
    setRate('');
    setActive(true);
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from<any>('repair_technicians')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems((data || []).map((d: any) => ({
        id: d.id,
        user_id: d.user_id,
        name: d.name,
        default_commission_rate: Number(d.default_commission_rate || 0),
        is_active: Boolean(d.is_active),
        created_at: d.created_at
      })));
    } catch (err: any) {
      showError({ title: 'Erro ao carregar técnicos', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const onCreateOrUpdate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      const payload = {
        user_id: user.id,
        name: name.trim(),
        default_commission_rate: Number(rate),
        is_active: active
      };
      if (editing) {
        const { error } = await supabase
          .from<any>('repair_technicians')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        showSuccess({ title: 'Técnico atualizado' });
      } else {
        const { error } = await supabase
          .from<any>('repair_technicians')
          .insert([payload]);
        if (error) throw error;
        showSuccess({ title: 'Técnico cadastrado' });
      }
      setOpen(false);
      resetForm();
      fetchItems();
    } catch (err: any) {
      showError({ title: 'Erro ao salvar técnico', description: err.message });
    }
  };

  const onDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from<any>('repair_technicians')
        .delete()
        .eq('id', id);
      if (error) throw error;
      showSuccess({ title: 'Técnico removido' });
      fetchItems();
    } catch (err: any) {
      showError({ title: 'Erro ao remover técnico', description: err.message });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Técnicos</h2>
        <Button size="lg" onClick={() => { resetForm(); setOpen(true); }}>Novo Técnico</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {loading && <div className="text-sm text-muted-foreground">Carregando...</div>}
            {!loading && items.length === 0 && (
              <div className="text-sm text-muted-foreground">Nenhum técnico cadastrado.</div>
            )}
            {!loading && items.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex-1">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">Comissão padrão: {t.default_commission_rate}%</div>
                  <div className="text-xs text-muted-foreground">{t.is_active ? 'Ativo' : 'Inativo'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => { setEditing(t); setName(t.name); setRate(String(t.default_commission_rate)); setActive(t.is_active); setOpen(true); }}>Editar</Button>
                  <Button variant="destructive" onClick={() => onDelete(t.id)}>Excluir</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Técnico' : 'Novo Técnico'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João Silva" />
            </div>
            <div className="grid gap-2">
              <Label>Comissão padrão (%)</Label>
              <Input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Ex: 40" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={!canSubmit} onClick={onCreateOrUpdate}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RepairsTechnicians;

