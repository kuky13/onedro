import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Pencil, Trash2, Check, Wrench, Copy, ChevronLeft, Smartphone, Clock, Shield, DollarSign, Link2, Unlink } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { syncServiceToPart, unlinkService, type SyncLink } from '@/hooks/useServiceSync';

interface Brand {
  id: string;
  name: string;
}

interface Device {
  id: string;
  name: string;
  brand_id: string;
  image_url?: string;
}

const formatEstimatedTime = (minutes: number) => {
  if (!minutes) return "-";
  if (minutes >= 1440 && minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} ${days === 1 ? 'dia' : 'dias'}`;
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    return rem > 0 ? `${hours}h ${rem}min` : `${hours}h`;
  }
  return `${minutes} min`;
};

interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  installment_price?: number;
  estimated_time_minutes: number;
  warranty_days: number;
  max_installments: number;
  description?: string;
  device_id: string;
}

interface ServicesTabProps {
  storeId: string;
  brands: Brand[];
  selectedBrand: Brand | null;
  onSelectBrand: (brand: Brand | null) => void;
  devices: Device[];
  selectedDevice: Device | null;
  onSelectDevice: (device: Device | null) => void;
  services: Service[];
  onRefresh: () => void;
}

const defaultFormData = {
  name: '',
  category: '',
  price: '',
  installment_price: '',
  time_value: '60',
  time_unit: 'minutes',
  warranty_value: '90',
  warranty_unit: 'days',
  max_installments: '1',
  description: ''
};

export function ServicesTab({ 
  storeId, 
  brands, 
  selectedBrand, 
  onSelectBrand, 
  devices,
  selectedDevice,
  onSelectDevice,
  services, 
  onRefresh 
}: ServicesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [syncLinks, setSyncLinks] = useState<Record<string, SyncLink>>({});

  // Fetch sync links for displayed services
  useEffect(() => {
    if (!services.length) return;
    const serviceIds = services.map(s => s.id);
    supabase
      .from('service_sync_links')
      .select('*')
      .in('store_service_id', serviceIds)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, SyncLink> = {};
          data.forEach((l: any) => { map[l.store_service_id] = l as SyncLink; });
          setSyncLinks(map);
        }
      });
  }, [services]);

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const convertTimeToMinutes = () => {
    let minutes = parseInt(formData.time_value) || 0;
    if (formData.time_unit === 'hours') minutes *= 60;
    if (formData.time_unit === 'days') minutes *= 1440;
    return minutes;
  };

  const convertWarrantyToDays = () => {
    let days = parseInt(formData.warranty_value) || 0;
    if (formData.warranty_unit === 'months') days *= 30;
    return days;
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !selectedDevice) return;
    
    const { error } = await supabase.from('store_services').insert({
      store_id: storeId,
      device_id: selectedDevice.id,
      name: formData.name.trim(),
      category: formData.category || 'Geral',
      price: parseFloat(formData.price) || 0,
      installment_price: parseFloat(formData.installment_price) || parseFloat(formData.price) || 0,
      estimated_time_minutes: convertTimeToMinutes(),
      warranty_days: convertWarrantyToDays(),
      max_installments: Math.max(1, parseInt(formData.max_installments) || 1),
      interest_rate: 0,
      description: formData.description || null
    });

    if (error) {
      toast.error('Erro ao criar serviço');
    } else {
      toast.success('Serviço criado!');
      resetForm();
      onRefresh();
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.name.trim()) return;

    const { error } = await supabase.from('store_services')
      .update({ 
        name: formData.name.trim(),
        category: formData.category || 'Geral',
        price: parseFloat(formData.price) || 0,
        installment_price: parseFloat(formData.installment_price) || parseFloat(formData.price) || 0,
        estimated_time_minutes: convertTimeToMinutes(),
        warranty_days: convertWarrantyToDays(),
        max_installments: Math.max(1, parseInt(formData.max_installments) || 1),
        description: formData.description || null
      })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar serviço');
    } else {
      // Reverse sync to budget_part if linked
      syncServiceToPart(id, {
        name: formData.name.trim(),
        category: formData.category || 'Geral',
        price: parseFloat(formData.price) || 0,
        installment_price: parseFloat(formData.installment_price) || parseFloat(formData.price) || 0,
        warranty_days: convertWarrantyToDays(),
        max_installments: Math.max(1, parseInt(formData.max_installments) || 1),
      }).catch(console.error);
      toast.success('Serviço atualizado!');
      resetForm();
      onRefresh();
    }
  };

  const handleDelete = async (id: string) => {
    // Unlink before deleting (cascade also handles it but be explicit)
    unlinkService(id).catch(console.error);
    const { error } = await supabase.from('store_services').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir serviço');
    } else {
      toast.success('Serviço excluído!');
      onRefresh();
    }
    setDeleteConfirm(null);
  };

  const handleDuplicate = (service: Service) => {
    let timeVal = service.estimated_time_minutes;
    let timeUnit = 'minutes';
    if (timeVal >= 1440 && timeVal % 1440 === 0) {
      timeVal = timeVal / 1440;
      timeUnit = 'days';
    } else if (timeVal >= 60 && timeVal % 60 === 0) {
      timeVal = timeVal / 60;
      timeUnit = 'hours';
    }

    let warrantyVal = service.warranty_days;
    let warrantyUnit = 'days';
    if (warrantyVal >= 30 && warrantyVal % 30 === 0) {
      warrantyVal = warrantyVal / 30;
      warrantyUnit = 'months';
    }

    setFormData({
      name: `${service.name} (Cópia)`,
      category: service.category,
      price: service.price.toString(),
      installment_price: (service.installment_price || service.price).toString(),
      time_value: timeVal.toString(),
      time_unit: timeUnit,
      warranty_value: warrantyVal.toString(),
      warranty_unit: warrantyUnit,
      max_installments: (service.max_installments || 1).toString(),
      description: service.description || ''
    });
    setIsCreating(true);
    setEditingId(null);
  };

  const startEdit = (service: Service) => {
    let timeVal = service.estimated_time_minutes;
    let timeUnit = 'minutes';
    if (timeVal >= 1440 && timeVal % 1440 === 0) {
      timeVal = timeVal / 1440;
      timeUnit = 'days';
    } else if (timeVal >= 60 && timeVal % 60 === 0) {
      timeVal = timeVal / 60;
      timeUnit = 'hours';
    }

    let warrantyVal = service.warranty_days;
    let warrantyUnit = 'days';
    if (warrantyVal >= 30 && warrantyVal % 30 === 0) {
      warrantyVal = warrantyVal / 30;
      warrantyUnit = 'months';
    }

    setEditingId(service.id);
    setFormData({
      name: service.name,
      category: service.category,
      price: service.price.toString(),
      installment_price: (service.installment_price || service.price).toString(),
      time_value: timeVal.toString(),
      time_unit: timeUnit,
      warranty_value: warrantyVal.toString(),
      warranty_unit: warrantyUnit,
      max_installments: (service.max_installments || 1).toString(),
      description: service.description || ''
    });
    setIsCreating(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData(defaultFormData);
  };

  // Breadcrumb navigation
  const renderBreadcrumb = () => {
    if (!selectedBrand) return null;
    
    return (
      <div className="flex items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => { onSelectBrand(null); onSelectDevice(null); }}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium">{selectedBrand.name}</span>
        {selectedDevice && (
          <>
            <span className="text-muted-foreground">/</span>
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onSelectDevice(null)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium">{selectedDevice.name}</span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Selection flow */}
      <div className="flex flex-col gap-3">
        {renderBreadcrumb()}
        
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {!selectedBrand ? (
            <Select onValueChange={(val) => {
              const brand = brands.find(b => b.id === val);
              if (brand) onSelectBrand(brand);
            }}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="1. Selecione a marca" />
              </SelectTrigger>
              <SelectContent>
                {brands.map(brand => (
                  <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : !selectedDevice ? (
            <Select onValueChange={(val) => {
              const device = devices.find(d => d.id === val);
              if (device) onSelectDevice(device);
            }}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="2. Selecione o modelo" />
              </SelectTrigger>
              <SelectContent>
                {devices.map(device => (
                  <SelectItem key={device.id} value={device.id}>{device.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <>
              <div className="relative flex-1 w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar serviços..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={() => { setIsCreating(true); setEditingId(null); setFormData(defaultFormData); }}>
                <Plus className="mr-2 h-4 w-4" /> Novo Serviço
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Empty states */}
      {!selectedBrand && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Wrench className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-lg font-medium mb-1">Gerenciar Serviços</p>
          <p className="text-sm">Selecione uma marca e modelo para ver os serviços</p>
        </div>
      )}

      {selectedBrand && !selectedDevice && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Smartphone className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-lg font-medium mb-1">Selecione um modelo</p>
          <p className="text-sm">Escolha o modelo de {selectedBrand.name} acima</p>
        </div>
      )}

      {selectedDevice && (
        <>
          {/* Create/Edit form */}
          {(isCreating || editingId) && (
            <Card className="p-4 border-primary/50 bg-primary/5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Serviço *</Label>
                  <Input
                    placeholder="Ex: Troca de Tela (Original)"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input
                    placeholder="Ex: Tela, Bateria, Placa..."
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Preço à Vista (R$)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço Parcelado (R$)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.installment_price}
                    onChange={e => setFormData({ ...formData, installment_price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tempo Estimado</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      className="flex-1"
                      value={formData.time_value}
                      onChange={e => setFormData({ ...formData, time_value: e.target.value })}
                    />
                    <Select value={formData.time_unit} onValueChange={val => setFormData({ ...formData, time_unit: val })}>
                      <SelectTrigger className="w-[80px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Min</SelectItem>
                        <SelectItem value="hours">Hrs</SelectItem>
                        <SelectItem value="days">Dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Garantia</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      className="flex-1"
                      value={formData.warranty_value}
                      onChange={e => setFormData({ ...formData, warranty_value: e.target.value })}
                    />
                    <Select value={formData.warranty_unit} onValueChange={val => setFormData({ ...formData, warranty_unit: val })}>
                      <SelectTrigger className="w-[80px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Dias</SelectItem>
                        <SelectItem value="months">Meses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Máx. Parcelas</Label>
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    value={formData.max_installments}
                    onChange={e => setFormData({ ...formData, max_installments: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    placeholder="Detalhes do serviço..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows={1}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
                <Button onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}>
                  <Check className="mr-2 h-4 w-4" /> {editingId ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </Card>
          )}

          {/* Services list */}
          {filteredServices.length === 0 && !isCreating && !editingId ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
              <Wrench className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium mb-1">Nenhum serviço cadastrado</p>
              <p className="text-sm mb-4">Adicione os serviços disponíveis para {selectedDevice.name}</p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar Serviço
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredServices.map(service => (
                <Card
                  key={service.id}
                  className={`p-4 transition-all hover:shadow-md ${editingId === service.id ? 'hidden' : ''}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-base">{service.name}</h4>
                        {syncLinks[service.id] && (
                          <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
                            <Link2 className="h-3 w-3" />
                            Sincronizado
                          </Badge>
                        )}
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground mt-1">
                        {service.category}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {syncLinks[service.id] && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Desvincular do orçamento"
                          onClick={async () => {
                            await unlinkService(service.id);
                            setSyncLinks(prev => { const next = { ...prev }; delete next[service.id]; return next; });
                            toast.success('Serviço desvinculado');
                          }}
                        >
                          <Unlink className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(service)}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDuplicate(service)}>
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(service.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {service.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{service.description}</p>
                  )}

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                    <div className="flex items-center gap-1.5 text-sm">
                      <DollarSign className="h-3.5 w-3.5 text-primary" />
                      <span className="font-semibold">R$ {service.price}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatEstimatedTime(service.estimated_time_minutes)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Shield className="h-3.5 w-3.5" />
                      <span>{service.warranty_days} dias</span>
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
            <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
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
