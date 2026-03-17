import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Search, Pencil, Trash2, Check, X, Layers } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Brand {
  id: string;
  name: string;
  store_id: string;
}

interface BrandsTabProps {
  storeId: string;
  brands: Brand[];
  onRefresh: () => void;
  onSelectBrand: (brand: Brand) => void;
}

export function BrandsTab({ storeId, brands, onRefresh, onSelectBrand }: BrandsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValue, setFormValue] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredBrands = brands.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async () => {
    if (!formValue.trim()) return;
    
    const { error } = await supabase.from('store_brands').insert({
      store_id: storeId,
      name: formValue.trim()
    });

    if (error) {
      toast.error('Erro ao criar marca');
    } else {
      toast.success('Marca criada!');
      setFormValue('');
      setIsCreating(false);
      onRefresh();
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formValue.trim()) return;

    const { error } = await supabase.from('store_brands')
      .update({ name: formValue.trim() })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar marca');
    } else {
      toast.success('Marca atualizada!');
      setEditingId(null);
      setFormValue('');
      onRefresh();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('store_brands').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir marca');
    } else {
      toast.success('Marca excluída!');
      onRefresh();
    }
    setDeleteConfirm(null);
  };

  const startEdit = (brand: Brand) => {
    setEditingId(brand.id);
    setFormValue(brand.name);
    setIsCreating(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormValue('');
  };

  return (
    <div className="space-y-4">
      {/* Header with search and add */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar marcas..."
            className="pl-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => { setIsCreating(true); setEditingId(null); setFormValue(''); }}>
          <Plus className="mr-2 h-4 w-4" /> Nova Marca
        </Button>
      </div>

      {/* Create new brand inline */}
      {isCreating && (
        <Card className="p-4 border-primary/50 bg-primary/5">
          <div className="flex gap-3 items-center">
            <Input
              placeholder="Nome da marca (ex: Apple, Samsung)"
              value={formValue}
              onChange={e => setFormValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
              className="flex-1"
            />
            <Button size="icon" onClick={handleCreate} className="shrink-0">
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={cancelEdit} className="shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Brands list */}
      {filteredBrands.length === 0 && !isCreating ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Layers className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-lg font-medium mb-1">Nenhuma marca cadastrada</p>
          <p className="text-sm mb-4">Comece adicionando as marcas que você trabalha</p>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" /> Criar Primeira Marca
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredBrands.map(brand => (
            <Card
              key={brand.id}
              className={`p-4 transition-all cursor-pointer hover:shadow-md hover:bg-primary/5 hover:border-primary/50 ${
                editingId === brand.id ? 'border-primary ring-1 ring-primary/20' : ''
              }`}
            >
              {editingId === brand.id ? (
                <div className="flex gap-2 items-center">
                  <Input
                    value={formValue}
                    onChange={e => setFormValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleUpdate(brand.id);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    autoFocus
                    className="flex-1"
                  />
                  <Button size="icon" variant="ghost" onClick={() => handleUpdate(brand.id)}>
                    <Check className="h-4 w-4 text-primary" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={cancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between" onClick={() => onSelectBrand(brand)}>
                  <span className="font-semibold text-base">{brand.name}</span>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(brand)}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(brand.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir marca?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá também todos os modelos e serviços relacionados a esta marca.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
