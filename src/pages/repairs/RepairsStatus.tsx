// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { WarrantyStatusBadge } from '@/components/repairs/WarrantyStatusBadge';
import { useToast } from '@/hooks/useToast';
import { Calendar, Archive, Eye, Search, Pencil, Trash2, Download, Shield, ShieldCheck, ShieldAlert, ChevronRight, TrendingUp, TrendingDown, FileSpreadsheet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DevicePasswordDisplay } from '@/components/service-orders/DevicePasswordDisplay';
import { SimpleDeviceChecklist } from '@/components/service-orders/SimpleDeviceChecklist';
import { exportRepairsMonthToXlsx } from '@/utils/repairs/exportRepairsMonthXlsx';
import * as XLSX from 'xlsx';

type MonthlyClosing = {
  id: string;
  reference_month: string;
  total_revenue: number;
  total_net_profit: number;
  total_commissions: number;
  total_services: number;
  closed_at: string;
  notes?: string;
};

type WarrantyInfo = {
  id: string;
  repair_service_id: string;
  status: string;
  reopen_count: number;
  reason: string;
};

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);

const warrantyStatusLabel = (status: string) => {
  switch (status) {
    case 'in_progress': return 'Em andamento';
    case 'completed': return 'Concluída';
    case 'delivered': return 'Entregue';
    default: return status;
  }
};


const RepairsStatus = () => {
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();
  const [closings, setClosings] = useState<MonthlyClosing[]>([]);
  const [filteredClosings, setFilteredClosings] = useState<MonthlyClosing[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClosing, setSelectedClosing] = useState<MonthlyClosing | null>(null);
  const [selectedServiceDetails, setSelectedServiceDetails] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [monthServices, setMonthServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [showServicesList, setShowServicesList] = useState(false);

  // Warranty map for services
  const [warrantyMap, setWarrantyMap] = useState<Record<string, WarrantyInfo>>({});

  const loadClosings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from<any>('repair_monthly_closings')
        .select('*')
        .eq('user_id', user.id)
        .order('reference_month', { ascending: false });
      if (error) throw error;
      const formattedData = (data || []).map((c: any) => ({
        id: c.id,
        reference_month: c.reference_month,
        total_revenue: Number(c.total_revenue),
        total_net_profit: Number(c.total_net_profit),
        total_commissions: Number(c.total_commissions),
        total_services: Number(c.total_services),
        closed_at: c.closed_at,
        notes: c.notes
      }));
      setClosings(formattedData);
      setFilteredClosings(formattedData);
    } catch (err: any) {
      showError({ title: 'Erro ao carregar fechamentos', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClosings(); }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClosings(closings);
    } else {
      const lowerTerm = searchTerm.toLowerCase();
      setFilteredClosings(closings.filter(c => formatMonth(c.reference_month).toLowerCase().includes(lowerTerm)));
    }
  }, [searchTerm, closings]);

  const fetchServicesForMonth = async (closing: MonthlyClosing) => {
    setLoadingServices(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from<any>('repair_services')
        .select(`id, created_at, device_name, service_description, charged_amount, cost_amount, net_profit, commission_amount, client_name, client_phone, service_order_number, imei_serial, device_password_type, device_password_value, device_password_metadata, device_checklist, repair_technicians (name)`)
        .eq('user_id', user.id)
        .eq('closing_id', closing.id)
        .order('created_at', { ascending: false });

      if (serviceSearchTerm.trim()) {
        const term = serviceSearchTerm.trim();
        query = query.or(`device_name.ilike.%${term}%,service_description.ilike.%${term}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      setMonthServices(data || []);

      // Load warranties for these services
      if (data && data.length > 0) {
        const repairIds = data.map((s: any) => s.id);
        const { data: warranties } = await supabase
          .from('warranties')
          .select('id, repair_service_id, status, reopen_count, reason')
          .eq('owner_id', user.id)
          .is('deleted_at', null)
          .in('repair_service_id', repairIds);
        if (warranties) {
          const map: Record<string, WarrantyInfo> = {};
          warranties.forEach((w: any) => {
            if (w.repair_service_id) map[w.repair_service_id] = w;
          });
          setWarrantyMap(map);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
    } finally {
      setLoadingServices(false);
    }
  };

  useEffect(() => {
    if (selectedClosing && showServicesList) {
      const timeoutId = setTimeout(() => fetchServicesForMonth(selectedClosing), 300);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedClosing, showServicesList, serviceSearchTerm]);

  useEffect(() => {
    if (!selectedClosing) {
      setShowServicesList(false);
      setMonthServices([]);
      setServiceSearchTerm('');
      setWarrantyMap({});
    }
  }, [selectedClosing]);

  const formatMonth = (dateString: string) => {
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    return adjustedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const handleDeleteClosing = async () => {
    if (!selectedClosing) return;
    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error: servicesError } = await supabase
        .from('repair_services')
        .delete()
        .eq('user_id', user.id)
        .eq('closing_id', selectedClosing.id);
      if (servicesError) throw servicesError;

      const { error: closingError } = await supabase
        .from('repair_monthly_closings')
        .delete()
        .eq('user_id', user.id)
        .eq('id', selectedClosing.id);
      if (closingError) throw closingError;

      showSuccess({ title: 'Fechamento excluído com sucesso' });
      setSelectedClosing(null);
      loadClosings();
    } catch (err: any) {
      showError({ title: 'Erro ao excluir', description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenWarranty = (service: any) => {
    navigate('/garantia', {
      state: {
        warrantyPrefill: {
          serviceOrderNumber: service?.service_order_number ? String(service.service_order_number) : undefined,
          repairId: String(service.id),
        },
      },
    });
  };

  const handleExportFullReport = async () => {
    if (!selectedClosing) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Fetch all services for this closing
      const { data: allServices, error } = await supabase
        .from<any>('repair_services')
        .select(`id, created_at, device_name, service_description, charged_amount, cost_amount, net_profit, commission_amount, client_name, client_phone, service_order_number, imei_serial, repair_technicians (name)`)
        .eq('user_id', user.id)
        .eq('closing_id', selectedClosing.id)
        .order('created_at', { ascending: true });
      if (error) throw error;

      // Fetch warranties for these services
      const repairIds = (allServices || []).map((s: any) => s.id);
      let warrantyData: any[] = [];
      if (repairIds.length > 0) {
        const { data: wData } = await supabase
          .from('warranties')
          .select('repair_service_id, status, reopen_count, reason, created_at')
          .eq('owner_id', user.id)
          .is('deleted_at', null)
          .in('repair_service_id', repairIds);
        warrantyData = wData || [];
      }
      const wMap: Record<string, any> = {};
      warrantyData.forEach((w: any) => {
        if (w.repair_service_id) wMap[w.repair_service_id] = w;
      });

      const monthName = formatMonth(selectedClosing.reference_month);

      // Build complete XLSX
      const headers = [
        'Data', 'Dispositivo', 'Serviço', 'Cliente', 'Telefone', 'IMEI/Serial',
        'Nº OS', 'Técnico', 'Custo (R$)', 'Cobrado (R$)', 'Comissão (R$)', 'Lucro (R$)',
        'Garantia Status', 'Garantia Motivo', 'Garantia Reaberturas'
      ];

      const rows = (allServices || []).map((s: any) => {
        const w = wMap[s.id];
        return [
          new Date(s.created_at).toLocaleDateString('pt-BR'),
          s.device_name || '',
          s.service_description || '',
          s.client_name || '',
          s.client_phone || '',
          s.imei_serial || '',
          s.service_order_number || '',
          s.repair_technicians?.name || '',
          Number(s.cost_amount || 0),
          Number(s.charged_amount || 0),
          Number(s.commission_amount || 0),
          Number(s.net_profit || 0),
          w ? warrantyStatusLabel(w.status) : '',
          w ? (w.reason || '') : '',
          w ? (w.reopen_count || 0) : '',
        ];
      });

      // Summary row
      const totalCost = rows.reduce((sum, r) => sum + (r[8] as number), 0);
      const totalCharged = rows.reduce((sum, r) => sum + (r[9] as number), 0);
      const totalCommission = rows.reduce((sum, r) => sum + (r[10] as number), 0);
      const totalProfit = rows.reduce((sum, r) => sum + (r[11] as number), 0);

      const summaryRow = [
        `TOTAL (${monthName})`, '', '', '', '', '', '', '',
        +totalCost.toFixed(2), +totalCharged.toFixed(2), +totalCommission.toFixed(2), +totalProfit.toFixed(2),
        '', '', ''
      ];

      const sheet = XLSX.utils.aoa_to_sheet([headers, summaryRow, ...rows]);
      sheet['!cols'] = [
        { wch: 12 }, { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 18 },
        { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 18 }, { wch: 30 }, { wch: 12 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, 'Relatório Completo');
      const safeMonth = selectedClosing.reference_month.replace(/[^0-9-]/g, '');
      XLSX.writeFile(wb, `relatorio_completo_${safeMonth}.xlsx`);

      showSuccess({ title: 'Planilha exportada com sucesso!' });
    } catch (err: any) {
      showError({ title: 'Erro ao exportar', description: err.message });
    }
  };

  // Stats
  const totalRevenue = useMemo(() => closings.reduce((sum, c) => sum + c.total_revenue, 0), [closings]);
  const totalProfit = useMemo(() => closings.reduce((sum, c) => sum + c.total_net_profit, 0), [closings]);
  const totalServices = useMemo(() => closings.reduce((sum, c) => sum + c.total_services, 0), [closings]);

  return (
    <div className="space-y-6 pb-6">
      <PageHeader
        title="Status e Fechamentos"
        description="Histórico de meses fechados e desempenho financeiro"
        icon={<Archive className="h-4 w-4" />}
      />

      {/* Stats pills */}
      {closings.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-muted/40 backdrop-blur-sm border border-border/40 p-3 space-y-1 min-w-0 overflow-hidden">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total faturado</span>
            <div className="text-xs sm:text-base font-bold tabular-nums break-all leading-tight">{formatBRL(totalRevenue)}</div>
          </div>
          <div className="rounded-2xl bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/20 p-3 space-y-1 min-w-0 overflow-hidden">
            <span className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold">Lucro total</span>
            <div className="text-xs sm:text-base font-bold tabular-nums text-emerald-500 break-all leading-tight">{formatBRL(totalProfit)}</div>
          </div>
          <div className="rounded-2xl bg-muted/40 backdrop-blur-sm border border-border/40 p-3 space-y-1 min-w-0 overflow-hidden">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Serviços</span>
            <div className="text-xs sm:text-base font-bold tabular-nums leading-tight">{totalServices}</div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar mês..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-9 h-11 rounded-xl bg-muted/40 border-border/40 backdrop-blur-sm"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando histórico...</div>
      ) : filteredClosings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-2xl bg-muted/40 p-4 mb-4">
            <Archive className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">Nenhum fechamento encontrado</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {searchTerm ? 'Nenhum resultado para sua busca.' : 'Feche um mês no Dashboard para ver o histórico aqui.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClosings.map((closing) => {
            const profitMargin = closing.total_revenue > 0
              ? ((closing.total_net_profit / closing.total_revenue) * 100).toFixed(0)
              : '0';

            return (
              <button
                key={closing.id}
                onClick={() => setSelectedClosing(closing)}
                className="w-full text-left rounded-2xl bg-muted/30 backdrop-blur-sm border border-border/40 p-4 hover:bg-muted/50 hover:border-primary/30 transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-xl bg-primary/10 p-2">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-semibold capitalize text-sm">
                      {formatMonth(closing.reference_month)}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xl font-bold tabular-nums">{formatBRL(closing.total_revenue)}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-emerald-500 font-medium tabular-nums">
                        Lucro: {formatBRL(closing.total_net_profit)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="text-[10px] text-muted-foreground">{closing.total_services} serviços</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="rounded-full text-[10px] border-primary/30 text-primary bg-primary/5">
                    {profitMargin}% margem
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Dialog de detalhes do mês */}
      <Dialog open={!!selectedClosing} onOpenChange={open => !open && setSelectedClosing(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="capitalize text-xl flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Relatório de {selectedClosing && formatMonth(selectedClosing.reference_month)}
            </DialogTitle>
          </DialogHeader>

          {selectedClosing && (
            <div className="space-y-4 py-2">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-muted/40 border border-border/40 p-4 space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Faturamento</span>
                  <div className="text-xl font-bold tabular-nums">{formatBRL(selectedClosing.total_revenue)}</div>
                </div>
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 space-y-1">
                  <span className="text-[10px] text-emerald-500 uppercase font-semibold tracking-wider">Lucro Líquido</span>
                  <div className="text-xl font-bold text-emerald-500 tabular-nums">{formatBRL(selectedClosing.total_net_profit)}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-3 space-y-1">
                  <span className="text-[10px] text-red-400 font-semibold">Comissões</span>
                  <div className="text-sm font-bold text-red-400 tabular-nums">{formatBRL(selectedClosing.total_commissions)}</div>
                </div>
                <div className="rounded-2xl bg-orange-500/10 border border-orange-500/20 p-3 space-y-1">
                  <span className="text-[10px] text-orange-400 font-semibold">Custo Peças</span>
                  <div className="text-sm font-bold text-orange-400 tabular-nums">
                    {formatBRL(selectedClosing.total_revenue - selectedClosing.total_net_profit - selectedClosing.total_commissions)}
                  </div>
                </div>
                <div className="rounded-2xl bg-muted/40 border border-border/40 p-3 space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold">Serviços</span>
                  <div className="text-sm font-bold">{selectedClosing.total_services}</div>
                </div>
              </div>

              {/* Metadata */}
              <div className="rounded-2xl bg-muted/20 border border-border/30 p-3 text-xs flex justify-between items-center">
                <span className="text-muted-foreground">Fechado em:</span>
                <span className="font-medium">
                  {new Date(selectedClosing.closed_at).toLocaleDateString('pt-BR')} às{' '}
                  {new Date(selectedClosing.closed_at).toLocaleTimeString('pt-BR')}
                </span>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                {!showServicesList && (
                  <Button
                    variant="outline"
                    className="rounded-xl h-11 text-xs font-medium"
                    onClick={() => setShowServicesList(true)}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Ver serviços
                  </Button>
                )}
                {showServicesList && (
                  <Button
                    variant="ghost"
                    className="rounded-xl h-11 text-xs font-medium"
                    onClick={() => setShowServicesList(false)}
                  >
                    Ocultar serviços
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="rounded-xl h-11 text-xs font-medium"
                  onClick={handleExportFullReport}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Baixar planilha
                </Button>
              </div>

              {/* Services list */}
              {showServicesList && (
                <div className="space-y-3 pt-2 border-t border-border/30">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Filtrar por dispositivo..."
                      className="pl-8 h-9 text-xs rounded-xl bg-muted/30"
                      value={serviceSearchTerm}
                      onChange={e => setServiceSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                    {loadingServices ? (
                      <div className="text-center py-6 text-xs text-muted-foreground">Carregando...</div>
                    ) : monthServices.length === 0 ? (
                      <div className="text-center py-6 text-xs text-muted-foreground">Nenhum serviço encontrado.</div>
                    ) : (
                      monthServices.map(service => (
                        <div
                          key={service.id}
                          className="rounded-xl border border-border/40 bg-muted/20 p-3 text-xs hover:bg-muted/40 transition-colors space-y-2"
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-0.5">
                              <div className="font-semibold text-sm">{service.device_name}</div>
                              <div className="text-muted-foreground">{service.service_description}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold tabular-nums">{formatBRL(Number(service.charged_amount))}</div>
                              <div className="text-emerald-500 font-medium tabular-nums text-[10px]">
                                Lucro: {formatBRL(Number(service.net_profit))}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <span>{new Date(service.created_at).toLocaleDateString('pt-BR')}</span>
                              {service.repair_technicians?.name && (
                                <span>• {service.repair_technicians.name}</span>
                              )}
                            </div>
                          </div>

                          {/* Warranty badge */}
                          {warrantyMap[service.id] && (
                            <div className="flex items-center gap-1.5">
                              <Badge className={`text-[10px] px-2 py-0.5 rounded-full gap-1 border ${warrantyStatusColor(warrantyMap[service.id].status)}`}>
                                <Shield className="h-3 w-3" />
                                {warrantyStatusLabel(warrantyMap[service.id].status)}
                                {warrantyMap[service.id].reopen_count > 0 && ` (${warrantyMap[service.id].reopen_count + 1}ª)`}
                              </Badge>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-1 border-t border-border/20">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[10px] rounded-lg"
                              onClick={() => setSelectedServiceDetails(service)}
                            >
                              <Eye className="h-3 w-3 mr-1" /> Detalhes
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[10px] rounded-lg text-primary"
                              onClick={() => navigate(`/reparos/editar/${service.id}`)}
                            >
                              <Pencil className="h-3 w-3 mr-1" /> Editar
                            </Button>
                            {!warrantyMap[service.id] ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[10px] rounded-lg text-yellow-500"
                                onClick={() => handleOpenWarranty(service)}
                              >
                                <ShieldAlert className="h-3 w-3 mr-1" /> Abrir garantia
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[10px] rounded-lg text-emerald-500"
                                onClick={() => navigate('/garantia')}
                              >
                                <ShieldCheck className="h-3 w-3 mr-1" /> Ver garantia
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex justify-between items-center pt-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive text-xs h-8 rounded-lg">
                      <Trash2 className="h-3 w-3 mr-1" /> Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir fechamento?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Todos os reparos deste mês serão apagados permanentemente. Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteClosing}
                        className="bg-destructive text-destructive-foreground"
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Excluindo...' : 'Excluir permanentemente'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="outline" size="sm" className="rounded-lg h-8" onClick={() => setSelectedClosing(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de detalhes do serviço */}
      <Dialog open={!!selectedServiceDetails} onOpenChange={(open) => !open && setSelectedServiceDetails(null)}>
        <DialogContent className="w-[95vw] max-w-xl max-h-[80vh] overflow-y-auto rounded-2xl p-5 sm:p-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-base sm:text-lg">Checklist e dados do aparelho</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Identificação do cliente, senha de desbloqueio e checklist de funcionamento.
            </DialogDescription>
          </DialogHeader>
          
          {selectedServiceDetails && (
            <div className="mt-4 space-y-4">
              {(selectedServiceDetails.client_name || selectedServiceDetails.client_phone || selectedServiceDetails.service_order_number || selectedServiceDetails.imei_serial) && (
                <div className="rounded-xl border border-border/40 bg-muted/30 p-4 space-y-2">
                  <div className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Identificação</div>
                  {selectedServiceDetails.client_name && (
                    <div className="text-sm"><span className="font-medium">Cliente: </span>{selectedServiceDetails.client_name}</div>
                  )}
                  {selectedServiceDetails.client_phone && (
                    <div className="text-sm"><span className="font-medium">Telefone: </span>{selectedServiceDetails.client_phone}</div>
                  )}
                  {selectedServiceDetails.service_order_number && (
                    <div className="text-sm"><span className="font-medium">Nº OS: </span>{selectedServiceDetails.service_order_number}</div>
                  )}
                  {selectedServiceDetails.imei_serial && (
                    <div className="text-sm"><span className="font-medium">IMEI: </span><span className="font-mono text-xs">{selectedServiceDetails.imei_serial}</span></div>
                  )}
                </div>
              )}

              {(selectedServiceDetails.device_password_type || selectedServiceDetails.device_password_value) && (
                <div className="rounded-xl border border-border/40 bg-muted/30 p-4">
                  <div className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Senha do dispositivo</div>
                  <DevicePasswordDisplay value={{ type: selectedServiceDetails.device_password_type, value: selectedServiceDetails.device_password_value, metadata: selectedServiceDetails.device_password_metadata }} />
                </div>
              )}

              {selectedServiceDetails.device_checklist && (
                <div className="rounded-xl border border-border/40 bg-muted/30 p-4">
                  <div className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Checklist</div>
                  <SimpleDeviceChecklist data={selectedServiceDetails.device_checklist} />
                </div>
              )}

              {!(selectedServiceDetails.client_name || selectedServiceDetails.client_phone || selectedServiceDetails.service_order_number || selectedServiceDetails.imei_serial || selectedServiceDetails.device_password_type || selectedServiceDetails.device_password_value || selectedServiceDetails.device_checklist) && (
                <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                  Nenhuma informação adicional registrada.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RepairsStatus;
