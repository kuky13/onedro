// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWarranties, WarrantyStatus } from '@/hooks/useWarranties';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import WarrantyCreateDialog from '@/components/warranty/WarrantyCreateDialog';
import { PlusCircle, CheckCircle, Truck, RotateCcw, ArrowLeft, Trash2, Smartphone, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLocation, useNavigate } from 'react-router-dom';
import { MobileHamburgerButton } from '@/components/mobile/MobileHamburgerButton';
import { useMobileMenuContext } from '@/components/mobile/MobileMenuProvider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DeviceChecklist, DeviceChecklistData } from '@/components/service-orders/DeviceChecklist';
const WarrantyPageContent = () => {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  // Prefill vindo de /reparos
  const prefill = (location.state as any)?.warrantyPrefill as
    | { serviceOrderId?: string; serviceOrderNumber?: string; repairId?: string }
    | undefined;

  useEffect(() => {
    if (!prefill) return;
    setOpenDialog(true);
    // Limpa o state para não reabrir ao voltar/refresh
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);
  const { isOpen, toggleMenu } = useMobileMenuContext();
  const filters = useMemo(() => ({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    limit: 50
  }), [search, statusFilter]);
  const {
    warranties,
    isLoading,
    error,
    refetch,
    updateStatus,
    isUpdating,
    reopenWarranty,
    isReopening,
    deleteWarranty,
    isDeleting,
    updateDeviceChecklist,
    isUpdatingChecklist
  } = useWarranties(user?.id, filters);

  const [expandedChecklist, setExpandedChecklist] = useState<string | null>(null);
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge className="bg-yellow-500">Em andamento</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Concluído</Badge>;
      case 'delivered':
        return <Badge className="bg-slate-500">Entregue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  const handleStatusChange = (id: string, newStatus: WarrantyStatus) => {
    updateStatus({
      id,
      status: newStatus
    });
  };
  const handleDelete = (id: string) => {
    deleteWarranty(id);
    setDeleteConfirmation(null);
  };
  const getStatusBadgePremium = (status: string) => {
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

  return <div className="min-h-screen bg-background">
      {/* Header - iOS premium */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-2xl border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="rounded-xl h-10 w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="hidden md:block">
              <MobileHamburgerButton isOpen={isOpen} onClick={toggleMenu} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Garantias</h1>
              <p className="text-xs text-muted-foreground hidden md:block">Vinculadas a ordens de serviço e reparos</p>
            </div>
          </div>
          <Button onClick={() => setOpenDialog(true)} className="rounded-xl h-10 px-4 gap-2 font-medium">
            <PlusCircle className="h-4 w-4" />
            <span className="hidden md:inline">Nova Garantia</span>
            <span className="md:hidden">Nova</span>
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-5xl mx-auto pb-[env(safe-area-inset-bottom)]">
        {/* Filters - iOS style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por motivo ou OS" className="pl-11 h-11 rounded-2xl bg-muted/30 border-border/50" />
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

        {/* Cards instead of table on mobile */}
        <div className="space-y-3">
          {warranties.map(w => <div key={w.id} className="rounded-xl border border-border/30 bg-muted/5 p-4 space-y-3 transition-all duration-300 hover:bg-muted/15">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-sm font-medium">
                      {w.service_order?.sequential_number ? `OS: ${w.service_order.sequential_number.toString().padStart(4, '0')}` : w.device_name || w.service_order_id?.slice(0, 8) || 'Reparo'}
                    </div>
                    {w.reopen_count > 0 && (
                      <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 rounded-xl text-[10px] px-1.5 py-0">
                        {w.reopen_count + 1}ª vez
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{w.reason}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</p>
                </div>
                {getStatusBadgePremium(w.status)}
              </div>
              <div className="flex flex-wrap gap-2 pt-1 border-t border-border/20">
                {w.status === 'in_progress' && <Button size="sm" variant="outline" className="h-9 rounded-xl text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-500/10 gap-1.5" onClick={() => handleStatusChange(w.id, 'completed')} disabled={isUpdating}>
                    <CheckCircle className="w-3.5 h-3.5" />
                    Concluir
                  </Button>}
                {w.status === 'completed' && <Button size="sm" variant="outline" className="h-9 rounded-xl text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-500/10 gap-1.5" onClick={() => handleStatusChange(w.id, 'delivered')} disabled={isUpdating}>
                    <Truck className="w-3.5 h-3.5" />
                    Entregar
                  </Button>}
                {(w.status === 'delivered' || w.status === 'completed') && <Button size="sm" variant="outline" className="h-9 rounded-xl text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-500/10 gap-1.5" onClick={() => reopenWarranty(w.id)} disabled={isReopening}>
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reabrir garantia
                  </Button>}
                <Button size="sm" variant="ghost" className="h-9 rounded-xl text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 gap-1.5" onClick={() => setDeleteConfirmation(w.id)} disabled={isDeleting || isUpdating}>
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </Button>
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
            </div>)}
          {warranties.length === 0 && !isLoading && <div className="text-center py-12 text-muted-foreground rounded-2xl border border-border/30 bg-muted/5">
              <p className="font-medium">Nenhuma garantia encontrada</p>
            </div>}
        </div>
      </div>

      <WarrantyCreateDialog
        open={openDialog}
        onOpenChange={o => setOpenDialog(o)}
        prefill={prefill}
        onCreated={() => {
      setOpenDialog(false);
      refetch();
    }}
      />


      <AlertDialog open={!!deleteConfirmation} onOpenChange={open => !open && setDeleteConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a garantia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmation && handleDelete(deleteConfirmation)} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};

// Wrapper com o Provider
const WarrantyPage = () => {
  return <WarrantyPageContent />;
};
export default WarrantyPage;