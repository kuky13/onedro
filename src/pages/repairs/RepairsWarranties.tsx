// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWarranties, WarrantyStatus } from '@/hooks/useWarranties';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { WarrantyStatusBadge } from '@/components/repairs/WarrantyStatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Search, PlusCircle, CheckCircle, Truck, RotateCcw, Trash2, 
  Smartphone, Wrench, User, DollarSign, Shield, Hash, ChevronDown, ChevronRight 
} from 'lucide-react';
import { formatCurrencyFromReais } from '@/utils/currency';
import { DeviceChecklist, DeviceChecklistData } from '@/components/service-orders/DeviceChecklist';

type RepairServiceForWarranty = {
  id: string;
  created_at: string;
  device_name: string;
  service_description: string;
  imei_serial: string | null;
  client_name: string | null;
  client_phone: string | null;
  charged_amount: number;
  cost_amount: number;
  service_order_number: string | null;
  repair_technicians: { name: string } | null;
};

const RepairsWarranties = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  // Create dialog state
  const [repairSearch, setRepairSearch] = useState('');
  const [repairResults, setRepairResults] = useState<RepairServiceForWarranty[]>([]);
  const [searchingRepairs, setSearchingRepairs] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<RepairServiceForWarranty | null>(null);
  const [reason, setReason] = useState('');

  const filters = useMemo(() => ({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    limit: 50,
  }), [search, statusFilter]);

  const {
    warranties, isLoading, error, refetch,
    createWarranty, isCreating,
    updateStatus, isUpdating,
    deleteWarranty, isDeleting,
    updateDeviceChecklist, isUpdatingChecklist,
  } = useWarranties(user?.id, filters);

  const [expandedChecklist, setExpandedChecklist] = useState<string | null>(null);

  // Search repair services (all months, including archived)
  useEffect(() => {
    if (!openDialog) return;
    const timeout = setTimeout(async () => {
      if (!user?.id) return;
      setSearchingRepairs(true);
      try {
        let query = supabase
          .from('repair_services')
          .select('id, created_at, device_name, service_description, imei_serial, client_name, client_phone, charged_amount, cost_amount, service_order_number, repair_technicians(name)')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(20);

        if (repairSearch.trim()) {
          query = query.or(`device_name.ilike.%${repairSearch}%,service_description.ilike.%${repairSearch}%,client_name.ilike.%${repairSearch}%,service_order_number.ilike.%${repairSearch}%,imei_serial.ilike.%${repairSearch}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        setRepairResults((data || []).map((r: any) => ({
          id: r.id,
          created_at: r.created_at,
          device_name: r.device_name,
          service_description: r.service_description,
          imei_serial: r.imei_serial,
          client_name: r.client_name,
          client_phone: r.client_phone,
          charged_amount: Number(r.charged_amount || 0),
          cost_amount: Number(r.cost_amount || 0),
          service_order_number: r.service_order_number,
          repair_technicians: r.repair_technicians || null,
        })));
      } catch (err) {
        console.error('Erro ao buscar reparos:', err);
      } finally {
        setSearchingRepairs(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [repairSearch, openDialog, user?.id]);

  // Auto-fill reason when repair selected
  useEffect(() => {
    if (!selectedRepair || reason.trim()) return;
    const lines = [
      `Retorno de garantia - ${selectedRepair.device_name}`,
      selectedRepair.service_description ? `Serviço: ${selectedRepair.service_description}` : null,
      selectedRepair.imei_serial ? `IMEI/Série: ${selectedRepair.imei_serial}` : null,
      selectedRepair.client_name ? `Cliente: ${selectedRepair.client_name}` : null,
      selectedRepair.repair_technicians?.name ? `Técnico: ${selectedRepair.repair_technicians.name}` : null,
    ].filter(Boolean);
    setReason(lines.join('\n'));
  }, [selectedRepair]);

  const handleCreate = () => {
    if (!selectedRepair || !reason.trim()) return;
    createWarranty({
      repair_service_id: selectedRepair.id,
      reason,
      device_name: selectedRepair.device_name,
      service_description: selectedRepair.service_description,
      imei_serial: selectedRepair.imei_serial,
      client_name: selectedRepair.client_name,
      client_phone: selectedRepair.client_phone,
      technician_name: selectedRepair.repair_technicians?.name || null,
      charged_amount: selectedRepair.charged_amount,
      cost_amount: selectedRepair.cost_amount,
    }, {
      onSuccess: () => {
        handleCloseDialog();
        refetch();
      },
    });
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setRepairSearch('');
    setRepairResults([]);
    setSelectedRepair(null);
    setReason('');
  };

  const handleDelete = (id: string) => {
    deleteWarranty(id);
    setDeleteConfirmation(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 rounded-xl text-xs">Em andamento</Badge>;
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30 rounded-xl text-xs">Concluído</Badge>;
      case 'delivered':
        return <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30 rounded-xl text-xs">Entregue</Badge>;
      default:
        return <Badge variant="outline" className="rounded-xl text-xs">{status}</Badge>;
    }
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');
  const fmtMoney = (v: number | null) => v != null ? formatCurrencyFromReais(v) : '—';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Garantias
          </h2>
          <p className="text-sm text-muted-foreground">Garantias vinculadas aos seus reparos</p>
        </div>
        <Button onClick={() => setOpenDialog(true)} className="rounded-xl h-10 px-4 gap-2 font-medium">
          <PlusCircle className="h-4 w-4" />
          <span className="hidden md:inline">Nova Garantia</span>
          <span className="md:hidden">Nova</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Buscar por motivo, dispositivo..." 
            className="pl-11 h-11 rounded-2xl bg-muted/30 border-border/50" 
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11 rounded-xl border-border/50 bg-muted/10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="in_progress">Em andamento</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="delivered">Entregue</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => refetch()} className="h-11 rounded-xl">Atualizar</Button>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground text-center py-8">Carregando garantias...</div>}
      {error && <div className="text-sm text-red-500 text-center py-4">Erro ao carregar garantias</div>}

      {/* Warranty Cards */}
      <div className="space-y-3">
        {warranties.map(w => (
          <div key={w.id} className="rounded-2xl border border-border/30 bg-muted/5 p-4 space-y-3 transition-all duration-300 hover:bg-muted/15">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                {/* Device + Service */}
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm truncate">
                    {w.device_name || (w.service_order?.sequential_number ? `OS #${String(w.service_order.sequential_number).padStart(4, '0')}` : 'Garantia')}
                  </span>
                </div>
                {w.service_description && (
                  <div className="flex items-center gap-2">
                    <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">{w.service_description}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground line-clamp-2 pl-6">{w.reason}</p>
              </div>
              {getStatusBadge(w.status)}
            </div>

            {/* Info pills */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {w.client_name && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded-xl px-2.5 py-1.5">
                  <User className="h-3 w-3 shrink-0" />
                  <span className="truncate">{w.client_name}</span>
                </div>
              )}
              {w.technician_name && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded-xl px-2.5 py-1.5">
                  <Wrench className="h-3 w-3 shrink-0" />
                  <span className="truncate">{w.technician_name}</span>
                </div>
              )}
              {w.charged_amount != null && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded-xl px-2.5 py-1.5">
                  <DollarSign className="h-3 w-3 shrink-0" />
                  <span>Cobrado: {fmtMoney(w.charged_amount)}</span>
                </div>
              )}
              {w.imei_serial && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded-xl px-2.5 py-1.5">
                  <Hash className="h-3 w-3 shrink-0" />
                  <span className="truncate">{w.imei_serial}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/20">
              <span className="text-[10px] text-muted-foreground">{fmtDate(w.created_at)}</span>
              <div className="flex flex-wrap gap-2">
                {w.status === 'in_progress' && (
                  <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 gap-1.5" 
                    onClick={() => updateStatus({ id: w.id, status: 'completed' })} disabled={isUpdating}>
                    <CheckCircle className="w-3.5 h-3.5" /> Concluir
                  </Button>
                )}
                {w.status === 'completed' && (
                  <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 gap-1.5"
                    onClick={() => updateStatus({ id: w.id, status: 'delivered' })} disabled={isUpdating}>
                    <Truck className="w-3.5 h-3.5" /> Entregar
                  </Button>
                )}
                {w.status === 'delivered' && (
                  <Button size="sm" variant="ghost" className="h-8 rounded-xl text-xs text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 gap-1.5"
                    onClick={() => updateStatus({ id: w.id, status: 'completed' })} disabled={isUpdating}>
                    <RotateCcw className="w-3.5 h-3.5" /> Reverter
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-8 rounded-xl text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 gap-1.5"
                  onClick={() => setDeleteConfirmation(w.id)} disabled={isDeleting || isUpdating}>
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </Button>
              </div>
            </div>

            {/* Checklist de Funcionamento */}
            <Collapsible open={expandedChecklist === w.id} onOpenChange={(open) => setExpandedChecklist(open ? w.id : null)}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors pt-1">
                {expandedChecklist === w.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <Smartphone className="h-3.5 w-3.5" />
                Checklist de Funcionamento
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <DeviceChecklist
                  value={w.device_checklist as DeviceChecklistData | null}
                  onChange={(data) => updateDeviceChecklist({ id: w.id, device_checklist: data })}
                  disabled={isUpdatingChecklist}
                />
              </CollapsibleContent>
            </Collapsible>
          </div>
        ))}
        {warranties.length === 0 && !isLoading && (
          <div className="text-center py-12 text-muted-foreground rounded-2xl border border-border/30 bg-muted/5">
            <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma garantia encontrada</p>
            <p className="text-xs mt-1">Crie uma garantia a partir de qualquer reparo</p>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={openDialog} onOpenChange={(o) => !o ? handleCloseDialog() : setOpenDialog(true)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Garantia de Reparo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!selectedRepair ? (
              <div className="space-y-3">
                <label className="text-sm font-medium">Selecionar Reparo</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por aparelho, serviço, cliente, IMEI, nº OS..."
                    value={repairSearch}
                    onChange={e => setRepairSearch(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">Mostra reparos de todos os meses (incluindo arquivados)</p>
                <div className="max-h-60 overflow-auto rounded-xl border border-border bg-card">
                  {searchingRepairs && <div className="p-4 text-center text-xs text-muted-foreground">Buscando...</div>}
                  {!searchingRepairs && repairResults.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRepair(r)}
                      className="w-full text-left p-3 hover:bg-muted/50 border-b last:border-0 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm">{r.device_name}</span>
                        <span className="text-[10px] text-muted-foreground">{fmtDate(r.created_at)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{r.service_description}</div>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {r.client_name && <span className="text-[10px] bg-muted/50 rounded px-1.5 py-0.5">{r.client_name}</span>}
                        {r.repair_technicians?.name && <span className="text-[10px] bg-muted/50 rounded px-1.5 py-0.5">Téc: {r.repair_technicians.name}</span>}
                        {r.service_order_number && <span className="text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5">OS #{r.service_order_number}</span>}
                        <span className="text-[10px] bg-muted/50 rounded px-1.5 py-0.5">{fmtMoney(r.charged_amount)}</span>
                      </div>
                    </button>
                  ))}
                  {!searchingRepairs && repairResults.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {repairSearch ? 'Nenhum reparo encontrado' : 'Digite para buscar reparos...'}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">Reparo Selecionado</h3>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedRepair(null); setReason(''); }}>
                    Trocar
                  </Button>
                </div>

                <Card className="bg-muted/30 border-border/30">
                  <CardContent className="p-4 grid grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Smartphone className="w-3 h-3" /> Dispositivo
                      </div>
                      <p className="text-sm font-medium">{selectedRepair.device_name}</p>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Wrench className="w-3 h-3" /> Serviço
                      </div>
                      <p className="text-sm font-medium">{selectedRepair.service_description || '—'}</p>
                    </div>
                    {selectedRepair.client_name && (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="w-3 h-3" /> Cliente
                        </div>
                        <p className="text-sm font-medium">{selectedRepair.client_name}</p>
                      </div>
                    )}
                    {selectedRepair.repair_technicians?.name && (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Wrench className="w-3 h-3" /> Técnico
                        </div>
                        <p className="text-sm font-medium">{selectedRepair.repair_technicians.name}</p>
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <DollarSign className="w-3 h-3" /> Cobrado
                      </div>
                      <p className="text-sm font-medium">{fmtMoney(selectedRepair.charged_amount)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <DollarSign className="w-3 h-3" /> Custo
                      </div>
                      <p className="text-sm font-medium">{fmtMoney(selectedRepair.cost_amount)}</p>
                    </div>
                    {selectedRepair.imei_serial && (
                      <div className="col-span-2 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Hash className="w-3 h-3" /> IMEI/Série
                        </div>
                        <p className="text-sm font-medium font-mono">{selectedRepair.imei_serial}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Motivo da Garantia <span className="text-red-500">*</span></label>
                  <Textarea
                    placeholder="Descreva detalhadamente o motivo do retorno..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button 
              disabled={!selectedRepair || !reason.trim() || isCreating}
              onClick={handleCreate}
            >
              {isCreating ? 'Criando...' : 'Criar Garantia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmation} onOpenChange={open => !open && setDeleteConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação excluirá permanentemente a garantia.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmation && handleDelete(deleteConfirmation)} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RepairsWarranties;
