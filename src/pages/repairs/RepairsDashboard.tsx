// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';
import { CalendarCheck, Download, LayoutDashboard, Loader2, Search, Shield, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DevicePasswordDisplay } from '@/components/service-orders/DevicePasswordDisplay';
import { SimpleDeviceChecklist } from '@/components/service-orders/SimpleDeviceChecklist';
import { exportRepairsMonthToXlsx } from '@/utils/repairs/exportRepairsMonthXlsx';
import { formatCurrencyFromReais } from '@/utils/currency';
import { Badge } from '@/components/ui/badge';
import { WarrantyStatusBadge } from '@/components/repairs/WarrantyStatusBadge';

type WarrantyInfo = {
  repair_service_id: string;
  status: string;
  reopen_count: number;
};

type ServiceRow = {
  id: string;
  created_at: string;
  device_name: string;
  service_description: string;
  cost_amount: number;
  charged_amount: number;
  commission_amount: number;
  net_profit: number;
  imei_serial?: string | null;
  device_checklist?: any | null;
  device_password_type?: string | null;
  device_password_value?: string | null;
  device_password_metadata?: any | null;
  client_name?: string | null;
  client_phone?: string | null;
  service_order_number?: string | null;
  repair_technicians?: {
    name?: string;
  } | null;
};
type Technician = {
  id: string;
  name: string;
  default_commission_rate: number;
  is_active: boolean;
};

const parsePtBrMoneyToNumber = (raw: string) => {
  // Aceita: "1234.56", "1.234,56", "1234,56".
  const cleaned = String(raw ?? '').trim();
  if (!cleaned) return 0;

  const normalized = cleaned
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

const RepairsDashboard = () => {
  const {
    showError,
    showSuccess
  } = useToast();
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [closingMonth, setClosingMonth] = useState(false);
  const [isMonthClosed, setIsMonthClosed] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closingData, setClosingData] = useState<any>(null);
  const [hasOverdueClosings, setHasOverdueClosings] = useState(false);

  // Layout dos cards de resumo (salvo por usuário)
  const [showMonthlyRevenue, setShowMonthlyRevenue] = useState(true);
  const [showAssistantNetProfit, setShowAssistantNetProfit] = useState(true);
  const [showPartsCosts, setShowPartsCosts] = useState(true);
  const [showTechnicianProfit, setShowTechnicianProfit] = useState(true);
  const [layoutLoading, setLayoutLoading] = useState(true);
  const [layoutSaving, setLayoutSaving] = useState(false);
  const [showLayoutEditor, setShowLayoutEditor] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);

  // Preferências de quais informações mostrar em cada serviço
  const [showRowChargedAmount, setShowRowChargedAmount] = useState(true);
  const [showRowCostAmount, setShowRowCostAmount] = useState(true);
  const [showRowTechnicianProfit, setShowRowTechnicianProfit] = useState(true);
  const [showRowAssistantProfit, setShowRowAssistantProfit] = useState(true);

  // Warranty status for each repair
  const [warrantyMap, setWarrantyMap] = useState<Record<string, WarrantyInfo>>({});

  // Vale do técnico (descontado do "Lucro do técnico" na dashboard)
  const [technicianValeInput, setTechnicianValeInput] = useState('');
  const technicianVale = useMemo(() => parsePtBrMoneyToNumber(technicianValeInput), [technicianValeInput]);
  const [valeLoadedForMonth, setValeLoadedForMonth] = useState<string | null>(null);

  useEffect(() => {
    const loadLayout = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Layout dos cards de resumo
        const { data: layoutData, error: layoutError } = await supabase
          .from('repair_dashboard_layout')
          .select('show_monthly_revenue, show_parts_costs, show_assistant_net_profit, show_technician_profit')
          .eq('user_id', user.id)
          .maybeSingle();

        if (layoutError) throw layoutError;
        if (layoutData) {
          setShowMonthlyRevenue(layoutData.show_monthly_revenue ?? true);
          setShowAssistantNetProfit(layoutData.show_assistant_net_profit ?? true);
          setShowPartsCosts(layoutData.show_parts_costs ?? true);
          setShowTechnicianProfit(layoutData.show_technician_profit ?? true);
        }

        // Preferências das informações por serviço
        const { data: columnsData, error: columnsError } = await supabase
          .from('repair_dashboard_columns')
          .select('show_charged_amount, show_cost_amount, show_technician_profit, show_assistant_profit')
          .eq('user_id', user.id)
          .maybeSingle();

        if (columnsError && columnsError.code !== 'PGRST116') {
          // PGRST116 = not found para maybeSingle
          throw columnsError;
        }

        if (columnsData) {
          setShowRowChargedAmount(columnsData.show_charged_amount ?? true);
          setShowRowCostAmount(columnsData.show_cost_amount ?? true);
          setShowRowTechnicianProfit(columnsData.show_technician_profit ?? true);
          setShowRowAssistantProfit(columnsData.show_assistant_profit ?? true);
        }
      } catch (error) {
        console.error('Erro ao carregar layout da dashboard de reparos:', error);
      } finally {
        setLayoutLoading(false);
      }
    };

    loadLayout();
  }, []);

  const saveLayout = async () => {
    try {
      setLayoutSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error: layoutError } = await supabase
        .from('repair_dashboard_layout')
        .upsert({
          user_id: user.id,
          show_monthly_revenue: showMonthlyRevenue,
          show_assistant_net_profit: showAssistantNetProfit,
          show_parts_costs: showPartsCosts,
          show_technician_profit: showTechnicianProfit,
        }, { onConflict: 'user_id' });

      if (layoutError) throw layoutError;

      const { error: columnsError } = await supabase
        .from('repair_dashboard_columns')
        .upsert({
          user_id: user.id,
          show_charged_amount: showRowChargedAmount,
          show_cost_amount: showRowCostAmount,
          show_technician_profit: showRowTechnicianProfit,
          show_assistant_profit: showRowAssistantProfit,
        }, { onConflict: 'user_id' });

      if (columnsError) throw columnsError;

      showSuccess({ title: 'Layout atualizado com sucesso!' });
      setShowLayoutEditor(false);
    } catch (err: any) {
      showError({
        title: 'Erro ao salvar layout',
        description: err.message,
      });
    } finally {
      setLayoutSaving(false);
    }
  };

  useEffect(() => {
    const checkOverdue = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      // Primeiro dia do mês atual (ex: 01/02/2026)
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Busca serviços não arquivados anteriores ao mês atual
      const { data } = await supabase
        .from('repair_services')
        .select('id')
        .eq('user_id', user.id)
        .is('archived_at', null)
        .lt('created_at', startOfCurrentMonth)
        .limit(1);

      setHasOverdueClosings(!!data && data.length > 0);
    };

    checkOverdue();
  }, []);

  // Mês selecionado para análise/fechamento
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${month}`; // formato YYYY-MM
  });

  // Datas de início/fim do mês selecionado
  const {
    startOfMonth,
    endOfMonth,
    referenceMonthString,
    monthLabel
  } = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1; // 0-based
    const start = new Date(year, monthIndex, 1, 0, 0, 0);
    const end = new Date(year, monthIndex + 1, 0, 23, 59, 59);
    const reference = start.toISOString().split('T')[0];
    const label = start.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric'
    });
    return {
      startOfMonth: start,
      endOfMonth: end,
      referenceMonthString: reference,
      monthLabel: label
    };
  }, [selectedMonth]);

  // Search state for Technicians
  const [searchTerm, setSearchTerm] = useState('');
  const [foundTechnicians, setFoundTechnicians] = useState<Technician[]>([]);
  const [searching, setSearching] = useState(false);

  // Search state for Services
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceSearchResults, setServiceSearchResults] = useState<ServiceRow[]>([]);
  const [isServiceSearching, setIsServiceSearching] = useState(false);
  const loadMonth = async () => {
    setLoading(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      let query = supabase.from<any>('repair_services').select('id, created_at, device_name, service_description, imei_serial, cost_amount, charged_amount, commission_amount, net_profit, device_checklist, device_password_type, device_password_value, device_password_metadata, client_name, client_phone, service_order_number, repair_technicians(name)').eq('user_id', user.id).is('deleted_at', null).gte('created_at', startOfMonth.toISOString()).lte('created_at', endOfMonth.toISOString()).order('created_at', { ascending: false });

      // Só filtra archived_at = null se o mês NÃO estiver fechado
      // (meses fechados arquivam os serviços, então precisamos mostrá-los)
      const { data: closingCheck } = await supabase.from<any>('repair_monthly_closings').select('id').eq('user_id', user.id).eq('reference_month', referenceMonthString).maybeSingle();
      if (!closingCheck) {
        query = query.is('archived_at', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setServices((data || []).map((r: any) => ({
        id: r.id,
        created_at: r.created_at,
        device_name: r.device_name,
        service_description: r.service_description,
        cost_amount: Number(r.cost_amount || 0),
        charged_amount: Number(r.charged_amount || 0),
        commission_amount: Number(r.commission_amount || 0),
        net_profit: Number(r.net_profit || 0),
        imei_serial: r.imei_serial ?? null,
        device_checklist: r.device_checklist ?? null,
        device_password_type: r.device_password_type ?? null,
        device_password_value: r.device_password_value ?? null,
        device_password_metadata: r.device_password_metadata ?? null,
        client_name: r.client_name ?? null,
        client_phone: r.client_phone ?? null,
        service_order_number: r.service_order_number ?? null,
        repair_technicians: r.repair_technicians || null
      })));
    } catch (err: any) {
      showError({
        title: 'Erro ao carregar serviços',
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  };
  // Load warranty status for displayed repairs
  useEffect(() => {
    const loadWarranties = async () => {
      if (services.length === 0) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const repairIds = services.map(s => s.id);
      const { data } = await supabase
        .from('warranties')
        .select('repair_service_id, status, reopen_count')
        .eq('owner_id', user.id)
        .is('deleted_at', null)
        .in('repair_service_id', repairIds);
      if (data) {
        const map: Record<string, WarrantyInfo> = {};
        data.forEach((w: any) => {
          if (w.repair_service_id) map[w.repair_service_id] = w;
        });
        setWarrantyMap(map);
      }
    };
    loadWarranties();
  }, [services]);

  const checkMonthStatus = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data
      } = await supabase.from<any>('repair_monthly_closings').select('id').eq('user_id', user.id).eq('reference_month', referenceMonthString).maybeSingle();
      setIsMonthClosed(!!data);
    } catch (error) {
      console.error('Erro ao verificar status do mês:', error);
    }
  };
  useEffect(() => {
    loadMonth();
    checkMonthStatus();
  }, [selectedMonth]);

  // Search effect
  useEffect(() => {
    const searchTechs = async () => {
      setSearching(true);
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) return;
        let query = supabase.from<any>('repair_technicians').select('id, name, default_commission_rate, is_active').eq('user_id', user.id).limit(3);
        if (searchTerm.trim().length > 0) {
          query = query.ilike('name', `%${searchTerm}%`);
        } else {
          query = query.order('created_at', {
            ascending: false
          });
        }
        const {
          data,
          error
        } = await query;
        if (error) throw error;
        setFoundTechnicians((data || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          default_commission_rate: Number(t.default_commission_rate),
          is_active: Boolean(t.is_active)
        })));
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    };
    const timeoutId = setTimeout(searchTechs, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Service search effect
  useEffect(() => {
    const searchServices = async () => {
      if (!serviceSearch.trim()) {
        setServiceSearchResults([]);
        return;
      }
      setIsServiceSearching(true);
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) return;
        const {
          data,
          error
        } = await supabase.from<any>('repair_services').select('id, created_at, device_name, service_description, imei_serial, cost_amount, charged_amount, commission_amount, net_profit, device_checklist, device_password_type, device_password_value, device_password_metadata, client_name, client_phone, service_order_number, repair_technicians(name)').eq('user_id', user.id).is('deleted_at', null).or(`device_name.ilike.%${serviceSearch}%,service_description.ilike.%${serviceSearch}%`).order('created_at', {
          ascending: false
        }).limit(20); // Limite para não sobrecarregar na dashboard

        if (error) throw error;
        setServiceSearchResults((data || []).map((r: any) => ({
          id: r.id,
          created_at: r.created_at,
          device_name: r.device_name,
          service_description: r.service_description,
          cost_amount: Number(r.cost_amount || 0),
          charged_amount: Number(r.charged_amount || 0),
          commission_amount: Number(r.commission_amount || 0),
          net_profit: Number(r.net_profit || 0),
          imei_serial: r.imei_serial ?? null,
          device_checklist: r.device_checklist ?? null,
          device_password_type: r.device_password_type ?? null,
          device_password_value: r.device_password_value ?? null,
          device_password_metadata: r.device_password_metadata ?? null,
          client_name: r.client_name ?? null,
          client_phone: r.client_phone ?? null,
          service_order_number: r.service_order_number ?? null,
          repair_technicians: r.repair_technicians || null
        })));
      } catch (err) {
        console.error(err);
      } finally {
        setIsServiceSearching(false);
      }
    };
    const timeoutId = setTimeout(searchServices, 500);
    return () => clearTimeout(timeoutId);
  }, [serviceSearch]);
  const totals = useMemo(() => {
    const faturamento = services.reduce((sum, s) => sum + s.charged_amount, 0);
    const lucro = services.reduce((sum, s) => sum + s.net_profit, 0);
    const comissoes = services.reduce((sum, s) => sum + s.commission_amount, 0);
    const custoPecas = faturamento - lucro - comissoes;
    return {
      // Mantém como número (sem string/rounding), e formata somente na UI
      faturamento,
      lucro,
      comissoes,
      custoPecas
    };
  }, [services]);

  // Carrega o vale do mês selecionado
  useEffect(() => {
    const loadVale = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('repair_technician_vales_monthly')
          .select('vale_amount')
          .eq('user_id', user.id)
          .eq('reference_month', referenceMonthString)
          .maybeSingle();

        if (error) throw error;

        const vale = Number(data?.vale_amount ?? 0);
        // Preenche no formato pt-BR para o input
        setTechnicianValeInput(vale ? vale.toFixed(2).replace('.', ',') : '');
        setValeLoadedForMonth(referenceMonthString);
      } catch (err) {
        // Sem toast para não poluir a dashboard; log para diagnóstico
        console.error('Erro ao carregar vale do técnico:', err);
      }
    };

    // ao trocar o mês, força reload
    setValeLoadedForMonth(null);
    loadVale();
  }, [referenceMonthString]);

  // Salva (upsert) vale + valores calculados (gross/net) quando o usuário altera
  useEffect(() => {
    // Evita gravar antes do primeiro load do mês (senão sobrescreve com vazio)
    if (valeLoadedForMonth !== referenceMonthString) return;

    const timeoutId = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const commissionsGross = Number(totals.comissoes || 0);
        const valeAmount = Number(technicianVale || 0);
        const commissionsNet = commissionsGross - valeAmount;

        const { error } = await supabase
          .from('repair_technician_vales_monthly')
          .upsert({
            user_id: user.id,
            reference_month: referenceMonthString,
            vale_amount: valeAmount,
            commissions_gross: commissionsGross,
            commissions_net: commissionsNet,
          }, { onConflict: 'user_id,reference_month' });

        if (error) throw error;
      } catch (err) {
        console.error('Erro ao salvar vale do técnico:', err);
      }
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [technicianVale, totals.comissoes, referenceMonthString, valeLoadedForMonth]);
  const handleMoveToTrash = async (id: string) => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      const {
        error
      } = await supabase.from<any>('repair_services').update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      }).eq('id', id).is('deleted_at', null);
      if (error) throw error;
      setServices(prev => prev.filter(s => s.id !== id));
      showSuccess({
        title: 'Reparo movido para a lixeira'
      });
    } catch (err: any) {
      showError({
        title: 'Erro ao mover para lixeira',
        description: err.message
      });
    }
  };

  const handleOpenWarranty = (service: any) => {
    navigate('/garantia', {
      state: {
        warrantyPrefill: {
          // Se tiver número de OS, pré-preenche a busca; senão apenas abre o dialog
          serviceOrderNumber: service?.service_order_number ? String(service.service_order_number) : undefined,
          repairId: String(service.id),
        },
      },
    });
  };
  const handleCloseMonth = async () => {
    // Confirm removido a pedido do usuário
    setClosingMonth(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      const payload = {
        user_id: user.id,
        reference_month: referenceMonthString,
        total_revenue: totals.faturamento,
        total_net_profit: totals.lucro,
        total_commissions: totals.comissoes,
        total_services: services.length,
        status: 'closed',
        closed_at: new Date().toISOString()
      };

      // 1. Criar o fechamento
      const {
        data: closingData,
        error: closingError
      } = await supabase.from<any>('repair_monthly_closings').insert([payload]).select().single();
      if (closingError) throw closingError;

      // 2. Arquivar os serviços (Update em vez de Delete)
      const {
        error: archiveError
      } = await supabase.from<any>('repair_services').update({
        archived_at: new Date().toISOString(),
        closing_id: closingData.id
      }).eq('user_id', user.id).gte('created_at', startOfMonth.toISOString()).lte('created_at', endOfMonth.toISOString()).is('archived_at', null); // Garante que só arquiva os ativos

      if (archiveError) {
        console.error('Erro ao arquivar serviços:', archiveError);
        showError({
          title: 'Atenção',
          description: 'Mês fechado, mas houve erro ao arquivar serviços.'
        });
      } else {
        showSuccess({
          title: 'Mês fechado com sucesso!'
        });
        setServices([]); // Limpar lista local pois foram arquivados
      }
      setIsMonthClosed(true);
    } catch (err: any) {
      showError({
        title: 'Erro ao fechar mês',
        description: err.message
      });
    } finally {
      setClosingMonth(false);
    }
  };

  const handleExportMonth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from<any>('repair_services')
        .select(
          'created_at, device_name, service_description, cost_amount, charged_amount, net_profit, commission_amount, repair_technicians(name)'
        )
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      exportRepairsMonthToXlsx((data || []).map((r: any) => ({
        created_at: r.created_at,
        device_name: r.device_name,
        service_description: r.service_description,
        cost_amount: Number(r.cost_amount || 0),
        charged_amount: Number(r.charged_amount || 0),
        net_profit: r.net_profit ?? null,
        commission_amount: r.commission_amount ?? null,
        repair_technicians: r.repair_technicians || null,
      })), {
        monthLabel,
        filename: `reparos_${selectedMonth}.xlsx`,
      });
    } catch (err: any) {
      showError({
        title: 'Erro ao exportar planilha',
        description: err.message,
      });
    }
  };
  const handleReopenMonth = async () => {
    // Confirm removido a pedido do usuário

    setClosingMonth(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Buscar o ID do fechamento para restaurar os serviços corretos
      const {
        data: closingData,
        error: fetchError
      } = await supabase.from<any>('repair_monthly_closings').select('id').eq('user_id', user.id).eq('reference_month', referenceMonthString).maybeSingle();
      if (fetchError) throw fetchError;
      if (closingData) {
        // 2. Restaurar serviços (Desarquivar)
        const {
          error: restoreError
        } = await supabase.from<any>('repair_services').update({
          archived_at: null,
          closing_id: null
        }).eq('closing_id', closingData.id);
        if (restoreError) {
          console.error('Erro ao restaurar serviços:', restoreError);
          // Não interrompe, tenta apagar o fechamento mesmo assim
        }

        // 3. Apagar o registro de fechamento
        const {
          error: deleteError
        } = await supabase.from<any>('repair_monthly_closings').delete().eq('id', closingData.id);
        if (deleteError) throw deleteError;
      }
      showSuccess({
        title: 'Mês reaberto e dados recuperados!'
      });
      setIsMonthClosed(false);
      loadMonth(); // Recarregar os serviços que voltaram
    } catch (err: any) {
      showError({
        title: 'Erro ao reabrir mês',
        description: err.message
      });
    } finally {
      setClosingMonth(false);
    }
  };
  const monthOptions = useMemo(() => {
    const now = new Date();
    const options: { value: string; label: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
  }, []);

  return <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        description="Resumo do mês, serviços e fechamento"
        icon={<LayoutDashboard className="h-4 w-4" />}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring capitalize"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
              <span className={`h-1.5 w-1.5 rounded-full ${isMonthClosed ? 'bg-primary' : 'bg-primary/60'}`} />
              <span>{isMonthClosed ? 'Mês fechado' : 'Mês em aberto'}</span>
            </div>
          </div>

          {/* Ações em desktop */}
          <div className="hidden flex-col items-end gap-2 sm:flex sm:flex-row sm:items-center sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/reparos/servicos')}
              className="h-8 px-2 text-xs sm:text-sm font-medium"
            >
              Criar
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportMonth}
              className="h-8 px-2 text-xs sm:text-sm font-medium"
              disabled={loading}
            >
              <Download className="h-4 w-4" />
              <span className="hidden text-xs font-medium sm:inline">Exportar planilha</span>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => navigate('/reparos/lixeira')}
              className="h-8 px-2 text-xs sm:text-sm font-medium"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden text-xs font-medium sm:inline">Lixeira</span>
            </Button>

            {!isMonthClosed && services.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCloseMonth}
                disabled={closingMonth}
                className="h-8 px-2 text-xs sm:text-sm font-medium"
              >
                {closingMonth ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden text-xs font-medium sm:inline">Fechando mês...</span>
                  </>
                ) : (
                  <>
                    <CalendarCheck className="h-4 w-4" />
                    <span className="hidden text-xs font-medium sm:inline">Fechar mês</span>
                  </>
                )}
              </Button>
            )}

            {isMonthClosed && (
              <Button
                variant="outline"
                onClick={handleReopenMonth}
                disabled={closingMonth}
              >
                {closingMonth ? 'Reabrindo...' : 'Reabrir Mês'}
              </Button>
            )}

            {/* Editor de layout dos cards */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLayoutEditor(prev => !prev)}
              disabled={layoutLoading}
            >
              {showLayoutEditor ? 'Fechar edição' : 'Editar cards'}
            </Button>
          </div>

          {/* Menu compacto em mobile */}
          <div className="sm:hidden">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between px-3 text-xs font-medium"
              onClick={() => setShowMobileActions(prev => !prev)}
            >
              <span>Opções rápidas</span>
              <span className={`transition-transform ${showMobileActions ? 'rotate-90' : ''}`}>
                ▸
              </span>
            </Button>
            {showMobileActions && (
              <div className="mt-2 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center text-xs font-medium"
                  onClick={() => navigate('/reparos/servicos')}
                >
                  Criar serviço
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center text-xs font-medium"
                  onClick={handleExportMonth}
                  disabled={loading}
                >
                  Exportar planilha
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full justify-center text-xs font-medium"
                  onClick={() => navigate('/reparos/lixeira')}
                >
                  Lixeira
                </Button>

                {!isMonthClosed && services.length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-center text-xs font-medium"
                    disabled={closingMonth}
                    onClick={handleCloseMonth}
                  >
                    {closingMonth ? 'Fechando mês...' : 'Fechar mês'}
                  </Button>
                )}

                {isMonthClosed && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center text-xs font-medium"
                    disabled={closingMonth}
                    onClick={handleReopenMonth}
                  >
                    {closingMonth ? 'Reabrindo...' : 'Reabrir mês'}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center text-xs font-medium"
                  disabled={layoutLoading}
                  onClick={() => {
                    setShowLayoutEditor(prev => !prev);
                    setShowMobileActions(false);
                  }}
                >
                  {showLayoutEditor ? 'Fechar edição de cards' : 'Editar cards'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </PageHeader>

      {showLayoutEditor && (
        <Card className="border-dashed border-primary/40 bg-muted/40">
          <CardHeader className="space-y-1">
            <CardTitle className="text-sm">Escolha o que aparece na sua dashboard</CardTitle>
            <p className="text-xs text-muted-foreground">
              Personalize os resumos do topo e também quais informações aparecem em cada serviço.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
            {/* Cards de resumo */}
            <label
              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition-colors ${
                showMonthlyRevenue ? 'border-primary/70 bg-primary/5' : 'border-border/70 bg-muted/40'
              }`}
            >
              <div className="flex flex-col">
                <span className="font-medium">Faturamento do mês</span>
                <span className="text-xs text-muted-foreground">Total que você cobrou neste mês.</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    showMonthlyRevenue ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {showMonthlyRevenue ? 'Visível' : 'Oculto'}
                </span>
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                  checked={showMonthlyRevenue}
                  onChange={e => setShowMonthlyRevenue(e.target.checked)}
                />
              </div>
            </label>

            <label
              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition-colors ${
                showAssistantNetProfit ? 'border-primary/70 bg-primary/5' : 'border-border/70 bg-muted/40'
              }`}
            >
              <div className="flex flex-col">
                <span className="font-medium">Lucro líquido da Assistência</span>
                <span className="text-xs text-muted-foreground">Quanto sobrou para a assistência após custos e comissões.</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    showAssistantNetProfit ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {showAssistantNetProfit ? 'Visível' : 'Oculto'}
                </span>
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                  checked={showAssistantNetProfit}
                  onChange={e => setShowAssistantNetProfit(e.target.checked)}
                />
              </div>
            </label>

            <label
              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition-colors ${
                showPartsCosts ? 'border-primary/70 bg-primary/5' : 'border-border/70 bg-muted/40'
              }`}
            >
              <div className="flex flex-col">
                <span className="font-medium">Custos de peças</span>
                <span className="text-xs text-muted-foreground">Estimativa do que foi gasto em peças neste mês.</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    showPartsCosts ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {showPartsCosts ? 'Visível' : 'Oculto'}
                </span>
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                  checked={showPartsCosts}
                  onChange={e => setShowPartsCosts(e.target.checked)}
                />
              </div>
            </label>

            <label
              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition-colors ${
                showTechnicianProfit ? 'border-primary/70 bg-primary/5' : 'border-border/70 bg-muted/40'
              }`}
            >
              <div className="flex flex-col">
                <span className="font-medium">Lucro do técnico</span>
                <span className="text-xs text-muted-foreground">Total de comissões pagas aos técnicos.</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    showTechnicianProfit ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {showTechnicianProfit ? 'Visível' : 'Oculto'}
                </span>
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                  checked={showTechnicianProfit}
                  onChange={e => setShowTechnicianProfit(e.target.checked)}
                />
              </div>
            </label>

            {/* Informações por serviço */}
            <div className="md:col-span-2 lg:col-span-4 mt-4 border-t border-dashed border-border/60 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Informações que aparecem em cada reparo
              </p>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <label
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition-colors ${
                    showRowChargedAmount ? 'border-primary/70 bg-primary/5' : 'border-border/70 bg-muted/40'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">Cobrado</span>
                    <span className="text-xs text-muted-foreground">Valor que você cobrou do cliente.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        showRowChargedAmount ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {showRowChargedAmount ? 'Visível' : 'Oculto'}
                    </span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                      checked={showRowChargedAmount}
                      onChange={e => setShowRowChargedAmount(e.target.checked)}
                    />
                  </div>
                </label>

                <label
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition-colors ${
                    showRowCostAmount ? 'border-primary/70 bg-primary/5' : 'border-border/70 bg-muted/40'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">Custo</span>
                    <span className="text-xs text-muted-foreground">Quanto você gastou em peças e insumos.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        showRowCostAmount ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {showRowCostAmount ? 'Visível' : 'Oculto'}
                    </span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                      checked={showRowCostAmount}
                      onChange={e => setShowRowCostAmount(e.target.checked)}
                    />
                  </div>
                </label>

                <label
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition-colors ${
                    showRowTechnicianProfit ? 'border-primary/70 bg-primary/5' : 'border-border/70 bg-muted/40'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">Lucro do técnico</span>
                    <span className="text-xs text-muted-foreground">Total pago de comissão para este reparo.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        showRowTechnicianProfit ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {showRowTechnicianProfit ? 'Visível' : 'Oculto'}
                    </span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                      checked={showRowTechnicianProfit}
                      onChange={e => setShowRowTechnicianProfit(e.target.checked)}
                    />
                  </div>
                </label>

                <label
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition-colors ${
                    showRowAssistantProfit ? 'border-primary/70 bg-primary/5' : 'border-border/70 bg-muted/40'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">Lucro da assistência</span>
                    <span className="text-xs text-muted-foreground">Lucro líquido da assistência neste reparo.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        showRowAssistantProfit ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {showRowAssistantProfit ? 'Visível' : 'Oculto'}
                    </span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                      checked={showRowAssistantProfit}
                      onChange={e => setShowRowAssistantProfit(e.target.checked)}
                    />
                  </div>
                </label>
              </div>
            </div>

            <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLayoutEditor(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={saveLayout}
                disabled={layoutSaving}
              >
                {layoutSaving ? 'Salvando...' : 'Salvar layout'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {showMonthlyRevenue && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Faturamento do mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{formatCurrencyFromReais(totals.faturamento)}</div>
            </CardContent>
          </Card>
        )}
        {showAssistantNetProfit && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Lucro líquido da Assistência</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{formatCurrencyFromReais(totals.lucro)}</div>
            </CardContent>
          </Card>
        )}
        {showPartsCosts && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Custos de peças</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{formatCurrencyFromReais(totals.custoPecas)}</div>
            </CardContent>
          </Card>
        )}
        {showTechnicianProfit && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Lucro do técnico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {formatCurrencyFromReais(totals.comissoes - technicianVale)}
              </div>

              <div className="mt-3 space-y-2">
                <div className="text-xs text-muted-foreground">Vale do técnico (R$)</div>
                <Input
                  inputMode="decimal"
                  placeholder="Ex: 50,00"
                  value={technicianValeInput}
                  onChange={e => setTechnicianValeInput(e.target.value)}
                  className="h-9"
                />

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Vale aplicado</span>
                  <span className="font-medium text-foreground">{formatCurrencyFromReais(technicianVale)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="relative overflow-visible md:max-w-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Buscar técnico rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Nome do técnico..." className="h-9 pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="mt-4 space-y-2">
            {searching && <div className="py-2 text-center text-xs text-muted-foreground">Buscando...</div>}
            {!searching && foundTechnicians.length === 0 && <div className="py-2 text-center text-xs text-muted-foreground">
                Nenhum técnico encontrado
              </div>}
            {!searching && foundTechnicians.map(tech => <div key={tech.id} className="flex items-center justify-between gap-2 rounded border p-2 text-sm transition-colors hover:bg-muted/50">
                  <div>
                    <div className="font-medium">{tech.name}</div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${tech.is_active ? 'bg-primary' : 'bg-destructive'}`} />
                      {tech.is_active ? 'Ativo' : 'Inativo'}
                    </div>
                  </div>
                  <div className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {tech.default_commission_rate}%
                  </div>
                </div>)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Últimos serviços do mês</CardTitle>
            <Button variant="outline" onClick={loadMonth} disabled={loading}>
              Atualizar
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar serviço por aparelho ou descrição..." className="pl-8" value={serviceSearch} onChange={e => setServiceSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {(loading || isServiceSearching) && <div className="text-sm text-muted-foreground">Carregando...</div>}

            {!loading && !isServiceSearching && serviceSearch.trim() && serviceSearchResults.length === 0 && <div className="text-sm text-muted-foreground">
                  Nenhum serviço encontrado.
                </div>}

            {!loading && !isServiceSearching && !serviceSearch.trim() && services.length === 0 && <div className="text-sm text-muted-foreground">
                  Nenhum serviço lançado neste mês.
                </div>}

            {!loading && !isServiceSearching && (serviceSearch.trim() ? serviceSearchResults : services).map((s: any) => <div key={s.id} className="grid grid-cols-1 gap-2 rounded-lg border p-3 md:grid-cols-6">
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{s.device_name}</div>
                      {warrantyMap[s.id] && (
                        <WarrantyStatusBadge
                          status={warrantyMap[s.id].status}
                          reopenCount={warrantyMap[s.id].reopen_count}
                          className="text-[10px] px-1.5 py-0 rounded-full"
                        />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.service_description}</div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mt-1">
                      <span>{new Date(s.created_at).toLocaleDateString()}</span>
                      <Button
                        variant="outline"
                        size="xs"
                        className="h-6 px-2 text-[10px] rounded-full"
                        onClick={() => handleOpenWarranty(s)}
                      >
                        Abrir garantia
                      </Button>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="xs"
                            className="h-6 px-2 text-[10px] text-black bg-[#fec834] border-0 border-none rounded-full shadow-none opacity-100 border-white"
                          >
                            Ver detalhes
                          </Button>
                        </DialogTrigger>

                        <DialogContent className="w-[95vw] max-w-xl max-h-[80vh] overflow-y-auto rounded-lg p-5 sm:p-6">
                          <DialogHeader className="space-y-1.5">
                            <DialogTitle className="text-base sm:text-lg">Checklist e dados do aparelho</DialogTitle>
                            <DialogDescription className="text-xs sm:text-sm">
                              Veja identificação do cliente, IMEI, senha de desbloqueio e o checklist de funcionamento deste reparo em um único lugar.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="mt-4 space-y-5 sm:space-y-6">
                            {(s.client_name || s.client_phone || s.service_order_number) && (
                              <div className="rounded-md border border-border/70 bg-muted/40 p-3 sm:p-4 space-y-1.5">
                                <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                  Identificação
                                </div>
                                {s.client_name && (
                                  <div className="text-sm sm:text-base">
                                    <span className="font-medium">Cliente: </span>
                                    <span>{s.client_name}</span>
                                  </div>
                                )}
                                {s.client_phone && (
                                  <div className="text-sm sm:text-base">
                                    <span className="font-medium">Telefone: </span>
                                    <span>{s.client_phone}</span>
                                  </div>
                                )}
                                {s.service_order_number && (
                                  <div className="text-sm sm:text-base">
                                    <span className="font-medium">Nº OS / Protocolo: </span>
                                    <span>{s.service_order_number}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {s.imei_serial && (
                              <div className="rounded-md border border-border/70 bg-muted/40 p-3 sm:p-4 space-y-1.5">
                                <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                  IMEI / Série
                                </div>
                                <div className="text-sm sm:text-base font-mono break-all">
                                  {s.imei_serial}
                                </div>
                              </div>
                            )}

                            {(s.device_password_type || s.device_password_value) && (
                              <div className="rounded-md border border-border/70 bg-muted/40 p-3 sm:p-4">
                                <div className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                  Senha do dispositivo
                                </div>
                                <DevicePasswordDisplay
                                  value={{
                                    type: s.device_password_type as any,
                                    value: s.device_password_value,
                                    metadata: s.device_password_metadata as any,
                                  }}
                                />
                              </div>
                            )}

                            {s.device_checklist && (
                              <div className="rounded-md border border-border/70 bg-muted/40 p-3 sm:p-4">
                                <div className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                  Checklist de funcionamento
                                </div>
                                <SimpleDeviceChecklist data={s.device_checklist as any} />
                              </div>
                            )}

                            {!s.imei_serial &&
                              !s.device_password_type &&
                              !s.device_password_value &&
                              !s.device_checklist &&
                              !s.client_name &&
                              !s.client_phone &&
                              !s.service_order_number && (
                                <div className="rounded-md border border-dashed border-border/70 bg-muted/30 p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground text-center">
                                  Nenhum detalhe adicional registrado para este reparo ainda.
                                </div>
                              )}

                            <div className="pt-2 border-t border-border/60 flex flex-wrap justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2"
                                onClick={() => handleOpenWarranty(s)}
                              >
                                Abrir garantia
                              </Button>
                              <Button
                                size="sm"
                                className="mt-2 bg-primary text-primary-foreground hover:bg-primary/90"
                                onClick={() => navigate(`/reparos/editar/${s.id}`)}
                              >
                                Editar
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <div>
                    {showRowChargedAmount && (
                      <>
                        <div className="text-xs text-muted-foreground">Cobrado</div>
                        <div className="font-medium">{formatCurrencyFromReais(s.charged_amount)}</div>
                      </>
                    )}
                  </div>
                  <div>
                    {showRowCostAmount && (
                      <>
                        <div className="text-xs text-muted-foreground">Custo</div>
                        <div className="font-medium">{formatCurrencyFromReais(s.cost_amount)}</div>
                      </>
                    )}
                  </div>
                  <div>
                    {showRowTechnicianProfit && (
                      <>
                        <div className="text-xs text-muted-foreground">Lucro do&nbsp;técnico</div>
                        <div className="font-medium">{formatCurrencyFromReais(s.commission_amount)}</div>
                      </>
                    )}
                  </div>
                  <div>
                    {showRowAssistantProfit && (
                      <>
                        <div className="text-xs text-muted-foreground">Lucro assistência</div>
                        <div className="font-medium">{formatCurrencyFromReais(s.net_profit)}</div>
                      </>
                    )}
                    <div className="mt-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Mover para lixeira
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Mover reparo para a lixeira?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Este reparo será movido para a lixeira e poderá ser apagado
                              definitivamente após 90 dias.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleMoveToTrash(s.id)}>
                              Confirmar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>)}
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default RepairsDashboard;