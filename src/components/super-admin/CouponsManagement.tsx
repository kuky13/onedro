import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/useResponsive';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Edit, Ticket, Percent, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';


interface DiscountCoupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  min_purchase_amount: number;
  valid_from: string;
  valid_until: string | null;
  applicable_plans: string[];
  is_active: boolean;
  created_at: string;
}

const defaultCoupon: Partial<DiscountCoupon> = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 10,
  max_uses: null,
  min_purchase_amount: 0,
  valid_from: new Date().toISOString(),
  valid_until: null,
  applicable_plans: [],
  is_active: true
};

export function CouponsManagement() {
  const isMobile = useIsMobile();

  const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Partial<DiscountCoupon>>(defaultCoupon);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons((data || []) as DiscountCoupon[]);
    } catch (error) {
      console.error('Erro ao carregar cupons:', error);
      toast.error('Erro ao carregar cupons');
    } finally {
      setLoading(false);
    }
  };

  const saveCoupon = async () => {
    if (!editingCoupon.code?.trim()) {
      toast.error('Código do cupom é obrigatório');
      return;
    }

    setSaving(true);
    try {
      if (editingCoupon.id) {
        const { error } = await supabase
          .from('discount_coupons')
          .update({
            code: editingCoupon.code?.toUpperCase(),
            description: editingCoupon.description ?? null,
            discount_type: editingCoupon.discount_type ?? 'percentage',
            discount_value: editingCoupon.discount_value ?? 10,
            max_uses: editingCoupon.max_uses ?? null,
            min_purchase_amount: editingCoupon.min_purchase_amount ?? 0,
            valid_from: editingCoupon.valid_from ?? new Date().toISOString(),
            valid_until: editingCoupon.valid_until ?? null,
            applicable_plans: editingCoupon.applicable_plans ?? null,
            is_active: editingCoupon.is_active ?? true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCoupon.id);

        if (error) throw error;
        toast.success('Cupom atualizado!');
      } else {
        const { error } = await supabase
          .from('discount_coupons')
          .insert([
            {
              code: editingCoupon.code?.toUpperCase() || '',
              description: editingCoupon.description ?? null,
              discount_type: editingCoupon.discount_type ?? 'percentage',
              discount_value: editingCoupon.discount_value ?? 10,
              max_uses: editingCoupon.max_uses ?? null,
              min_purchase_amount: editingCoupon.min_purchase_amount ?? 0,
              valid_from: editingCoupon.valid_from ?? new Date().toISOString(),
              valid_until: editingCoupon.valid_until ?? null,
              applicable_plans: editingCoupon.applicable_plans ?? [],
              is_active: editingCoupon.is_active ?? true,
            },
          ]);

        if (error) throw error;
        toast.success('Cupom criado!');
      }

      setDialogOpen(false);
      setEditingCoupon(defaultCoupon);
      fetchCoupons();
    } catch (error) {
      console.error('Erro ao salvar cupom:', error);
      toast.error('Erro ao salvar cupom');
    } finally {
      setSaving(false);
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cupom?')) return;

    try {
      const { error } = await supabase
        .from('discount_coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Cupom excluído!');
      fetchCoupons();
    } catch (error) {
      console.error('Erro ao excluir cupom:', error);
      toast.error('Erro ao excluir cupom');
    }
  };

  const toggleCouponStatus = async (coupon: DiscountCoupon) => {
    try {
      const { error } = await supabase
        .from('discount_coupons')
        .update({ is_active: !coupon.is_active })
        .eq('id', coupon.id);

      if (error) throw error;
      fetchCoupons();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const openEditDialog = (coupon?: DiscountCoupon) => {
    setEditingCoupon(coupon || defaultCoupon);
    setDialogOpen(true);
  };

  const formatDiscount = (coupon: DiscountCoupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}%`;
    }
    return `R$ ${coupon.discount_value.toFixed(2)}`;
  };

  const isExpired = (coupon: DiscountCoupon) => {
    if (!coupon.valid_until) return false;
    return new Date(coupon.valid_until) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cupons de Desconto</h1>
          <p className="text-muted-foreground">Gerencie cupons promocionais</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openEditDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cupom
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCoupon.id ? 'Editar Cupom' : 'Novo Cupom'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Código do Cupom *</Label>
                <Input
                  value={editingCoupon.code || ''}
                  onChange={(e) => setEditingCoupon(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="EX: DESCONTO10"
                  className="uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={editingCoupon.description || ''}
                  onChange={(e) => setEditingCoupon(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição do cupom"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Desconto</Label>
                  <Select
                    value={editingCoupon.discount_type ?? 'percentage'}
                    onValueChange={(value) => setEditingCoupon(prev => ({ 
                      ...prev, 
                      discount_type: value as 'percentage' | 'fixed' 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor do Desconto</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingCoupon.discount_value || 0}
                    onChange={(e) => setEditingCoupon(prev => ({ 
                      ...prev, 
                      discount_value: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Limite de Usos</Label>
                  <Input
                    type="number"
                    value={editingCoupon.max_uses || ''}
                    onChange={(e) => setEditingCoupon(prev => ({ 
                      ...prev, 
                      max_uses: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                    placeholder="Ilimitado"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Compra Mínima (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingCoupon.min_purchase_amount || 0}
                    onChange={(e) => setEditingCoupon(prev => ({ 
                      ...prev, 
                      min_purchase_amount: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Válido Até</Label>
                <Input
                  type="datetime-local"
                  value={editingCoupon.valid_until?.slice(0, 16) || ''}
                  onChange={(e) => setEditingCoupon(prev => ({ 
                    ...prev, 
                    valid_until: e.target.value ? new Date(e.target.value).toISOString() : null 
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Cupom Ativo</Label>
                <Switch
                  checked={editingCoupon.is_active ?? true}
                  onCheckedChange={(checked) => setEditingCoupon(prev => ({ ...prev, is_active: checked }))}
                />
              </div>

              <Button className="w-full" onClick={saveCoupon} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingCoupon.id ? 'Atualizar Cupom' : 'Criar Cupom'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Cupons Cadastrados
          </CardTitle>
          <CardDescription>{coupons.length} cupom(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isMobile ? (
            <div className="space-y-3">
              {coupons.map((coupon) => (
                <Card key={coupon.id} className="border-border/60 bg-background/40">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono font-semibold truncate">{coupon.code}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[11px]">
                            {formatDiscount(coupon)}
                          </Badge>
                          {isExpired(coupon) ? (
                            <Badge variant="destructive">Expirado</Badge>
                          ) : coupon.is_active ? (
                            <Badge variant="default">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch checked={coupon.is_active} onCheckedChange={() => toggleCouponStatus(coupon)} />
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(coupon)} aria-label="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteCoupon(coupon.id)}
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Usos</span>
                        <span>
                          {coupon.current_uses}/{coupon.max_uses || '∞'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Validade</span>
                        <span>
                          {coupon.valid_until
                            ? format(new Date(coupon.valid_until), 'dd/MM/yyyy', { locale: ptBR })
                            : 'Sem limite'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {coupons.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">Nenhum cupom cadastrado</div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map(coupon => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {coupon.discount_type === 'percentage' ? (
                          <Percent className="h-4 w-4 text-green-500" />
                        ) : (
                          <DollarSign className="h-4 w-4 text-green-500" />
                        )}
                        {formatDiscount(coupon)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {coupon.current_uses}/{coupon.max_uses || '∞'}
                    </TableCell>
                    <TableCell>
                      {coupon.valid_until
                        ? format(new Date(coupon.valid_until), 'dd/MM/yyyy', { locale: ptBR })
                        : 'Sem limite'}
                    </TableCell>
                    <TableCell>
                      {isExpired(coupon) ? (
                        <Badge variant="destructive">Expirado</Badge>
                      ) : coupon.is_active ? (
                        <Badge variant="default" className="bg-green-500">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Switch checked={coupon.is_active} onCheckedChange={() => toggleCouponStatus(coupon)} />
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(coupon)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteCoupon(coupon.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {coupons.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum cupom cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
