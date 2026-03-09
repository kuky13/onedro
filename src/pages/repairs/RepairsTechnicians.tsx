// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/useToast';
import { Users, Pencil, Trash2, UserPlus, Percent } from 'lucide-react';

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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const avatarColors = [
    'bg-primary/15 text-primary',
    'bg-chart-2/15 text-chart-2',
    'bg-chart-3/15 text-chart-3',
    'bg-chart-4/15 text-chart-4',
    'bg-chart-5/15 text-chart-5',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Técnicos"
          description="Cadastre, edite e defina a comissão padrão"
          icon={<Users className="h-4 w-4" />}
          className="flex-1"
        />
        <Button
          className="rounded-2xl h-11 px-5 gap-2 font-medium shadow-lg shadow-primary/20"
          onClick={() => { resetForm(); setOpen(true); }}
        >
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Técnico</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {/* List */}
      {loading && (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando...</div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-3xl bg-muted/40 p-5 mb-4">
            <Users className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-base font-semibold">Nenhum técnico cadastrado</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Cadastre técnicos para gerenciar comissões automaticamente.
          </p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((t, index) => (
            <div
              key={t.id}
              className="group rounded-2xl border border-border/30 bg-muted/5 p-4 hover:bg-muted/15 hover:border-primary/20 transition-all duration-300"
            >
              <div className="flex items-center gap-3.5">
                {/* Avatar */}
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0 ${avatarColors[index % avatarColors.length]}`}>
                  {getInitials(t.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{t.name}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      t.is_active
                        ? 'bg-primary/10 text-primary'
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {t.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Percent className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Comissão: </span>
                    <span className="text-xs font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5">
                      {t.default_commission_rate}%
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl hover:bg-muted/50"
                    onClick={() => { setEditing(t); setName(t.name); setRate(String(t.default_commission_rate)); setActive(t.is_active); setOpen(true); }}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onDelete(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              {editing ? 'Editar Técnico' : 'Novo Técnico'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="text-sm font-medium">Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João Silva" className="h-11 rounded-xl" />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium">Comissão padrão (%)</Label>
              <Input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Ex: 40" className="h-11 rounded-xl" />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl border border-border/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Ativo</Label>
                <p className="text-xs text-muted-foreground">Técnicos inativos não aparecem ao criar serviços.</p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button disabled={!canSubmit} onClick={onCreateOrUpdate} className="rounded-xl">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RepairsTechnicians;