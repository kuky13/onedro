import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useSecureServiceOrders } from '@/hooks/useSecureServiceOrders';
import { useWarranties } from '@/hooks/useWarranties';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Smartphone, Wrench, CreditCard, User, Hash, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  prefill?: {
    serviceOrderId?: string;
    serviceOrderNumber?: string;
    repairId?: string;
  };
}

type SourceTab = 'os' | 'reparos';

interface RepairService {
  id: string;
  device_name: string;
  service_description: string;
  client_name: string | null;
  client_phone: string | null;
  imei_serial: string | null;
  charged_amount: number;
  cost_amount: number;
  created_at: string;
  service_order_number: string | null;
  technician_id: string | null;
}

const WarrantyCreateDialog: React.FC<Props> = ({ open, onOpenChange, onCreated, prefill }) => {
  const { user } = useAuth();
  const [sourceTab, setSourceTab] = useState<SourceTab>('os');
  const [search, setSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedRepair, setSelectedRepair] = useState<RepairService | null>(null);
  const [reason, setReason] = useState('');
  const [repairs, setRepairs] = useState<RepairService[]>([]);
  const [repairsLoading, setRepairsLoading] = useState(false);
  const [repairSearch, setRepairSearch] = useState('');

  const soFilters = useMemo(() => ({ search }), [search]);
  const { serviceOrders } = useSecureServiceOrders(user?.id, soFilters);
  const { createWarranty, isCreating } = useWarranties(user?.id);

  const selectedOS = useMemo(() =>
    serviceOrders.find(so => so.id === selectedOrderId),
    [serviceOrders, selectedOrderId]);

  // Prefill
  useEffect(() => {
    if (!open) return;
    if (prefill?.serviceOrderId) {
      setSourceTab('os');
      setSelectedOrderId(prefill.serviceOrderId);
    } else if (prefill?.serviceOrderNumber) {
      setSourceTab('os');
      setSearch(prefill.serviceOrderNumber);
    } else if (prefill?.repairId) {
      setSourceTab('reparos');
    }
  }, [open, prefill]);

  // Auto-select OS from prefill number
  useEffect(() => {
    if (!open || selectedOrderId || !prefill?.serviceOrderNumber || !serviceOrders.length) return;
    const normalized = prefill.serviceOrderNumber.trim();
    const match = serviceOrders.find(so => {
      const raw = typeof so.sequential_number === 'number' ? String(so.sequential_number) : '';
      const padded = typeof so.sequential_number === 'number' ? raw.padStart(4, '0') : '';
      return normalized === raw || normalized === padded;
    });
    if (match) setSelectedOrderId(match.id);
  }, [open, prefill?.serviceOrderNumber, serviceOrders, selectedOrderId]);

  // Search repairs
  useEffect(() => {
    if (!open || sourceTab !== 'reparos' || !user?.id) return;
    const timeout = setTimeout(async () => {
      setRepairsLoading(true);
      try {
        let query = supabase
          .from('repair_services')
          .select('id, device_name, service_description, client_name, client_phone, imei_serial, charged_amount, cost_amount, created_at, service_order_number, technician_id')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(20);

        if (repairSearch.trim()) {
          query = query.or(`device_name.ilike.%${repairSearch}%,client_name.ilike.%${repairSearch}%,service_description.ilike.%${repairSearch}%,service_order_number.ilike.%${repairSearch}%`);
        }

        const { data } = await query;
        setRepairs((data as RepairService[]) || []);
      } catch {
        setRepairs([]);
      } finally {
        setRepairsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [open, sourceTab, user?.id, repairSearch]);

  // Auto-fill reason from selected repair
  useEffect(() => {
    if (!open || !selectedRepair) return;
    if (reason.trim().length > 0) return;
    const lines = [
      `Retorno de garantia referente ao reparo: ${selectedRepair.device_name}.`,
      `Serviço: ${selectedRepair.service_description}.`,
      selectedRepair.imei_serial ? `IMEI/Série: ${selectedRepair.imei_serial}.` : null,
      selectedRepair.client_name ? `Cliente: ${selectedRepair.client_name}.` : null,
    ].filter(Boolean);
    setReason(lines.join('\n'));
  }, [open, selectedRepair]);

  // Auto-fill reason from selected OS
  useEffect(() => {
    if (!open || !selectedOS || sourceTab !== 'os') return;
    if (reason.trim().length > 0) return;
    if (selectedOS.reported_issue) {
      setReason(`Retorno de garantia. Defeito reportado na OS: ${selectedOS.reported_issue}`);
    }
  }, [open, selectedOS, sourceTab]);

  const canSave = (selectedOrderId || selectedRepair) && reason.trim().length > 0;
  const fmtSeq = (n?: number | null) => typeof n === 'number' ? n.toString().padStart(4, '0') : 'N/A';
  const fmtCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const handleSave = () => {
    if (sourceTab === 'os' && selectedOrderId) {
      createWarranty({ service_order_id: selectedOrderId, reason }, {
        onSuccess: () => { resetState(); onCreated?.(); }
      });
    } else if (sourceTab === 'reparos' && selectedRepair) {
      const params = {
        repair_service_id: selectedRepair.id,
        reason,
        device_name: selectedRepair.device_name,
        service_description: selectedRepair.service_description,
        ...(selectedRepair.imei_serial ? { imei_serial: selectedRepair.imei_serial } : {}),
        ...(selectedRepair.client_name ? { client_name: selectedRepair.client_name } : {}),
        ...(selectedRepair.client_phone ? { client_phone: selectedRepair.client_phone } : {}),
        charged_amount: selectedRepair.charged_amount,
        cost_amount: selectedRepair.cost_amount,
      };
      createWarranty(params, {
        onSuccess: () => { resetState(); onCreated?.(); }
      });
    }
  };

  const resetState = () => {
    setSearch('');
    setSelectedOrderId('');
    setSelectedRepair(null);
    setReason('');
    setRepairSearch('');
    setRepairs([]);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Garantia</DialogTitle>
        </DialogHeader>

        {/* Segmented Control */}
        {!selectedOS && !selectedRepair && (
          <div className="flex p-1 bg-muted/40 rounded-xl gap-1">
            <button
              onClick={() => { setSourceTab('os'); setRepairSearch(''); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                sourceTab === 'os'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Ordem de Serviço
            </button>
            <button
              onClick={() => { setSourceTab('reparos'); setSearch(''); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                sourceTab === 'reparos'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Reparos
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* === TAB: ORDEM DE SERVIÇO === */}
          {sourceTab === 'os' && !selectedOS && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Selecionar Ordem de Serviço</label>
              <Input
                placeholder="Buscar por cliente, modelo ou nº OS"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              <div className="max-h-60 overflow-auto rounded-lg border border-border bg-card">
                {serviceOrders.map((so) => (
                  <button
                    key={so.id}
                    onClick={() => setSelectedOrderId(so.id)}
                    className="w-full text-left p-3 hover:bg-muted/50 border-b last:border-0 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm">OS #{fmtSeq(so.sequential_number)}</span>
                      <span className="text-xs text-muted-foreground">{new Date(so.created_at ?? Date.now()).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm mb-1 font-medium">{so.device_model || 'Dispositivo Desconhecido'}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{so.reported_issue || 'Sem descrição'}</div>
                  </button>
                ))}
                {serviceOrders.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {search ? 'Nenhuma OS encontrada' : 'Digite para buscar...'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* OS Selected Summary */}
          {sourceTab === 'os' && selectedOS && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">OS Selecionada</h3>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedOrderId(''); setReason(''); }}>
                  Trocar
                </Button>
              </div>
              <Card className="bg-muted/30">
                <CardContent className="p-4 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Smartphone className="w-3 h-3" /> Modelo
                    </div>
                    <p className="text-sm font-medium">{selectedOS.device_model}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Wrench className="w-3 h-3" /> Defeito
                    </div>
                    <p className="text-sm font-medium">{selectedOS.reported_issue || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" /> Data
                    </div>
                    <p className="text-sm font-medium">{new Date(selectedOS.created_at ?? Date.now()).toLocaleDateString()}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CreditCard className="w-3 h-3" /> Pagamento
                    </div>
                    <Badge variant={selectedOS.is_paid ? "default" : "secondary"} className="h-5 text-[10px]">
                      {selectedOS.is_paid ? 'Pago' : 'Pendente'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* === TAB: REPAROS === */}
          {sourceTab === 'reparos' && !selectedRepair && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Selecionar Reparo</label>
              <Input
                placeholder="Buscar por dispositivo, cliente ou serviço"
                value={repairSearch}
                onChange={(e) => setRepairSearch(e.target.value)}
                autoFocus
              />
              <div className="max-h-60 overflow-auto rounded-lg border border-border bg-card">
                {repairsLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Buscando...</div>
                ) : repairs.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRepair(r)}
                    className="w-full text-left p-3 hover:bg-muted/50 border-b last:border-0 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm">{r.device_name}</span>
                      <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{r.service_description}</div>
                    {r.client_name && (
                      <div className="text-xs text-muted-foreground mt-0.5">👤 {r.client_name}</div>
                    )}
                  </button>
                ))}
                {!repairsLoading && repairs.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {repairSearch ? 'Nenhum reparo encontrado' : 'Reparos recentes aparecerão aqui'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Repair Selected Summary */}
          {sourceTab === 'reparos' && selectedRepair && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Reparo Selecionado</h3>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedRepair(null); setReason(''); }}>
                  Trocar
                </Button>
              </div>
              <Card className="bg-muted/30">
                <CardContent className="p-4 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Smartphone className="w-3 h-3" /> Dispositivo
                    </div>
                    <p className="text-sm font-medium">{selectedRepair.device_name}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Wrench className="w-3 h-3" /> Serviço
                    </div>
                    <p className="text-sm font-medium line-clamp-2">{selectedRepair.service_description}</p>
                  </div>
                  {selectedRepair.client_name && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="w-3 h-3" /> Cliente
                      </div>
                      <p className="text-sm font-medium">{selectedRepair.client_name}</p>
                      {selectedRepair.client_phone && (
                        <p className="text-[10px] text-muted-foreground">{selectedRepair.client_phone}</p>
                      )}
                    </div>
                  )}
                  {selectedRepair.imei_serial && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Hash className="w-3 h-3" /> IMEI/Série
                      </div>
                      <p className="text-sm font-medium font-mono">{selectedRepair.imei_serial}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <DollarSign className="w-3 h-3" /> Cobrado
                    </div>
                    <p className="text-sm font-medium">{fmtCurrency(selectedRepair.charged_amount)}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" /> Data
                    </div>
                    <p className="text-sm font-medium">{new Date(selectedRepair.created_at).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Reason - shown when something is selected */}
          {(selectedOS || selectedRepair) && (
            <div className="space-y-2 animate-in fade-in">
              <label className="text-sm font-medium">Motivo da Garantia <span className="text-destructive">*</span></label>
              <Textarea
                placeholder="Descreva detalhadamente o motivo do retorno..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button
            disabled={!canSave || isCreating}
            onClick={handleSave}
          >
            {isCreating ? 'Criando...' : 'Criar Garantia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WarrantyCreateDialog;
