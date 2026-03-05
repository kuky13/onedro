import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, ShoppingBag, Trash2, X } from 'lucide-react';

const CATEGORIES = [
  { value: 'pelicula', label: 'Película' },
  { value: 'carregador', label: 'Carregador' },
  { value: 'capinha', label: 'Capinha' },
  { value: 'fone', label: 'Fone' },
  { value: 'cabo', label: 'Cabo' },
  { value: 'acessorio', label: 'Acessório' },
  { value: 'outro', label: 'Outro' },
];

interface Product {
  id: string;
  product_name: string;
  price_min: number | null;
  price_max: number | null;
  category: string | null;
  is_active: boolean;
}

interface NewProduct {
  product_name: string;
  price_min: string;
  price_max: string;
  category: string;
}

const EMPTY_PRODUCT: NewProduct = { product_name: '', price_min: '', price_max: '', category: 'acessorio' };

export function ProductCatalogCard() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const ownerId = user?.id ?? null;

  const [showForm, setShowForm] = useState(false);
  const [newProduct, setNewProduct] = useState<NewProduct>(EMPTY_PRODUCT);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['ia-product-catalog', ownerId],
    enabled: Boolean(ownerId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_product_catalog')
        .select('*')
        .eq('owner_id', ownerId as string)
        .order('category')
        .order('product_name');
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!ownerId) throw new Error('Não autenticado');
      if (!newProduct.product_name.trim()) throw new Error('Nome do produto é obrigatório');
      if (!newProduct.price_min) throw new Error('Preço mínimo é obrigatório');

      const priceMin = Math.round(parseFloat(newProduct.price_min) * 100);
      const priceMax = newProduct.price_max ? Math.round(parseFloat(newProduct.price_max) * 100) : null;

      if (isNaN(priceMin) || priceMin <= 0) throw new Error('Preço mínimo inválido');
      if (priceMax !== null && (isNaN(priceMax) || priceMax < priceMin)) throw new Error('Preço máximo deve ser maior ou igual ao mínimo');

      const { error } = await supabase.from('ia_product_catalog').insert({
        owner_id: ownerId,
        product_name: newProduct.product_name.trim(),
        price_min: priceMin,
        price_max: priceMax,
        category: newProduct.category,
        is_active: true,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess({ title: 'Produto adicionado' });
      setNewProduct(EMPTY_PRODUCT);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['ia-product-catalog'] });
    },
    onError: (err: any) => showError({ title: 'Erro', description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ia_product_catalog').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess({ title: 'Produto removido' });
      queryClient.invalidateQueries({ queryKey: ['ia-product-catalog'] });
    },
    onError: (err: any) => showError({ title: 'Erro', description: err.message }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('ia_product_catalog').update({ is_active } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ia-product-catalog'] }),
    onError: (err: any) => showError({ title: 'Erro', description: err.message }),
  });

  const formatPrice = (cents: number | null) => {
    if (!cents) return '—';
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  };

  const getCategoryLabel = (cat: string | null) =>
    CATEGORIES.find((c) => c.value === cat)?.label ?? cat ?? 'Outro';

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          Catálogo de Produtos
        </CardTitle>
        <CardDescription>
          Preços de películas, carregadores, capinhas e acessórios que a IA pode consultar e informar aos clientes. Após informar o preço, a IA transfere para um atendente humano.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Product list */}
        {products.length > 0 ? (
          <div className="space-y-2">
            {products.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{p.product_name}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">{getCategoryLabel(p.category)}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {p.price_max && p.price_max !== p.price_min
                      ? `${formatPrice(p.price_min)} — ${formatPrice(p.price_max)}`
                      : formatPrice(p.price_min)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={p.is_active}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: p.id, is_active: checked })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(p.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum produto cadastrado. Adicione películas, carregadores e outros acessórios.
          </p>
        )}

        {/* Add form */}
        {showForm ? (
          <div className="rounded-lg border border-primary/20 bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Novo Produto</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="prod-name">Nome do Produto</Label>
                <Input
                  id="prod-name"
                  value={newProduct.product_name}
                  onChange={(e) => setNewProduct((p) => ({ ...p, product_name: e.target.value }))}
                  placeholder="Película 3D iPhone 15"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="prod-min">Preço Mínimo (R$)</Label>
                <Input
                  id="prod-min"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newProduct.price_min}
                  onChange={(e) => setNewProduct((p) => ({ ...p, price_min: e.target.value }))}
                  placeholder="30.00"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="prod-max">Preço Máximo (R$) <span className="text-muted-foreground">(opcional)</span></Label>
                <Input
                  id="prod-max"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newProduct.price_max}
                  onChange={(e) => setNewProduct((p) => ({ ...p, price_max: e.target.value }))}
                  placeholder="50.00"
                />
              </div>

              <div className="grid gap-1.5">
                <Label>Categoria</Label>
                <Select value={newProduct.category} onValueChange={(v) => setNewProduct((p) => ({ ...p, category: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending}
              className="w-full"
            >
              {addMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Adicionar Produto
            </Button>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Produto
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
