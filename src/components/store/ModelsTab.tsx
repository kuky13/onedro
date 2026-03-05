import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Pencil, Trash2, Check, Smartphone, AlertTriangle, ChevronLeft } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Brand {
  id: string;
  name: string;
}

interface Device {
  id: string;
  name: string;
  brand_id: string;
  image_url?: string;
  chronic_issues?: string;
}

interface ModelsTabProps {
  storeId: string;
  brands: Brand[];
  selectedBrand: Brand | null;
  onSelectBrand: (brand: Brand | null) => void;
  devices: Device[];
  onRefresh: () => void;
  onSelectDevice: (device: Device) => void;
}

export function ModelsTab({ 
  storeId, 
  brands, 
  selectedBrand, 
  onSelectBrand, 
  devices, 
  onRefresh,
  onSelectDevice 
}: ModelsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', image_url: '', chronic_issues: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredDevices = devices.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async () => {
    if (!formData.name.trim() || !selectedBrand) return;
    
    const { error } = await supabase.from('store_devices').insert({
      store_id: storeId,
      brand_id: selectedBrand.id,
      name: formData.name.trim(),
      image_url: formData.image_url || null,
      chronic_issues: formData.chronic_issues || null
    });

    if (error) {
      toast.error('Erro ao criar modelo');
    } else {
      toast.success('Modelo criado!');
      resetForm();
      onRefresh();
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.name.trim()) return;

    const { error } = await supabase.from('store_devices')
      .update({ 
        name: formData.name.trim(),
        image_url: formData.image_url || null,
        chronic_issues: formData.chronic_issues || null
      })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar modelo');
    } else {
      toast.success('Modelo atualizado!');
      resetForm();
      onRefresh();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('store_devices').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir modelo');
    } else {
      toast.success('Modelo excluído!');
      onRefresh();
    }
    setDeleteConfirm(null);
  };

  const startEdit = (device: Device) => {
    setEditingId(device.id);
    setFormData({
      name: device.name,
      image_url: device.image_url || '',
      chronic_issues: device.chronic_issues || ''
    });
    setIsCreating(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ name: '', image_url: '', chronic_issues: '' });
  };

  return (
    <div className="space-y-4">
      {/* Brand selector */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {selectedBrand ? (
          <Button variant="ghost" onClick={() => onSelectBrand(null)} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            <span className="font-semibold">{selectedBrand.name}</span>
          </Button>
        ) : (
          <Select onValueChange={(val) => {
            const brand = brands.find(b => b.id === val);
            if (brand) onSelectBrand(brand);
          }}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Selecione uma marca" />
            </SelectTrigger>
            <SelectContent>
              {brands.map(brand => (
                <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {selectedBrand && (
          <>
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar modelos..."
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={() => { setIsCreating(true); setEditingId(null); setFormData({ name: '', image_url: '', chronic_issues: '' }); }}>
              <Plus className="mr-2 h-4 w-4" /> Novo Modelo
            </Button>
          </>
        )}
      </div>

      {!selectedBrand ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Smartphone className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-lg font-medium mb-1">Selecione uma marca</p>
          <p className="text-sm">Escolha uma marca acima para ver e gerenciar os modelos</p>
        </div>
      ) : (
        <>
          {/* Create/Edit form */}
          {(isCreating || editingId) && (
            <Card className="p-4 border-primary/50 bg-primary/5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Modelo *</Label>
                  <Input
                    placeholder="Ex: iPhone 15 Pro Max"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL da Imagem (opcional)</Label>
                  <Input
                    placeholder="https://..."
                    value={formData.image_url}
                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Problemas Crônicos (opcional)</Label>
                <Textarea
                  placeholder="Descreva defeitos comuns deste modelo..."
                  value={formData.chronic_issues}
                  onChange={e => setFormData({ ...formData, chronic_issues: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
                <Button onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}>
                  <Check className="mr-2 h-4 w-4" /> {editingId ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </Card>
          )}

          {/* Models list */}
          {filteredDevices.length === 0 && !isCreating && !editingId ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
              <Smartphone className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium mb-1">Nenhum modelo em {selectedBrand.name}</p>
              <p className="text-sm mb-4">Adicione os modelos de dispositivos que você repara</p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar Modelo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDevices.map(device => (
                <Card
                  key={device.id}
                  className={`p-4 transition-all cursor-pointer hover:shadow-md hover:border-primary/30 ${
                    editingId === device.id ? 'hidden' : ''
                  }`}
                  onClick={() => onSelectDevice(device)}
                >
                  <div className="flex items-start gap-3">
                    {device.image_url ? (
                      <img src={device.image_url} alt={device.name} className="w-12 h-12 rounded-lg object-cover border bg-white" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg border bg-muted flex items-center justify-center">
                        <Smartphone className="w-6 h-6 opacity-40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate max-w-[120px] sm:max-w-[180px]" title={device.name}>{device.name}</p>
                        {device.chronic_issues && (
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{selectedBrand.name}</p>
                    </div>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(device)}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(device.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá também todos os serviços relacionados a este modelo.
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
