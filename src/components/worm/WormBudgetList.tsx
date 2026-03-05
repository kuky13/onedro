import { useState, useCallback, useMemo, useEffect } from 'react';
// @ts-nocheck
import { WormBudgetCard } from './WormBudgetCard';
import { WormBudgetSearch } from './WormBudgetSearch';
import { WormBudgetForm } from './WormBudgetForm';
import { WormWhatsAppSelector } from './WormWhatsAppSelector';
import { useWormBudgets } from '@/hooks/worm/useWormBudgets';
import { useWormActions } from '@/hooks/worm/useWormActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Plus, RefreshCw, Smartphone, FileText, MessageCircle } from 'lucide-react';
import { isIOS } from '@/utils/whatsappUtils';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { useQueryClient } from '@tanstack/react-query';
type WormBudget = {
  id: string;
  client_name?: string | null;
  device_model?: string | null;
  device_type?: string | null;
  sequential_number?: number | null;
  created_at?: string | null;
  [key: string]: any;
};
interface WormBudgetListProps {
  userId: string;
}
interface DeviceGroup {
  key: string;
  device_type: string;
  device_model: string;
  budgets: any[];
  totalCount: number;
  lastCreatedAt?: string | null;
}
export const WormBudgetList = ({
  userId
}: WormBudgetListProps) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [isNewBudgetOpen, setIsNewBudgetOpen] = useState(false);
  const [aiResults, setAiResults] = useState<any[]>([]);
  const [newBudgetInitialData, setNewBudgetInitialData] = useState<any | null>(null);
  const [sharingBudgets, setSharingBudgets] = useState<any[] | null>(null);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    setShowTutorial(true);
  }, []);

  const handleCloseTutorial = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem('has_seen_copy_budget_tutorial', 'true');
    setShowTutorial(false);
  };

  const {
    data: budgets = [],
    isLoading,
    error,
    refetch
  } = useWormBudgets(userId, {
    search: activeSearchTerm
  });
  const budgetsList = budgets as WormBudget[];
  const {
    handleDelete,
    handleWhatsAppShare,
    handleCopyDeviceBudgets,
    isDeleting
  } = useWormActions();
  const handleBudgetsRealtime = useCallback(async () => {
    queryClient.invalidateQueries({
      queryKey: ['worm-budgets', userId]
    });
  }, [queryClient, userId]);
  useSupabaseRealtime({
    channelName: `worm-budgets-${userId}`,
    table: 'budgets',
    event: '*',
    filter: `owner_id=eq.${userId}`,
    enabled: !!userId,
    onPayload: handleBudgetsRealtime
  });
  const filteredBudgets = useMemo<WormBudget[]>(() => {
    if (aiResults.length > 0) return aiResults as WormBudget[];
    if (!activeSearchTerm.trim()) return budgetsList;
    const searchLower = activeSearchTerm.toLowerCase();
    return budgetsList.filter((budget) => budget.client_name?.toLowerCase().includes(searchLower) || budget.device_model?.toLowerCase().includes(searchLower) || budget.device_type?.toLowerCase().includes(searchLower) || budget.sequential_number?.toString().padStart(4, '0').includes(activeSearchTerm) || budget.sequential_number?.toString().includes(activeSearchTerm));
  }, [budgetsList, activeSearchTerm, aiResults]);
  const [visibleGroupsCount, setVisibleGroupsCount] = useState(5);

  const handleLoadMore = () => {
    setVisibleGroupsCount(prev => prev + 5);
  };

  const deviceGroups = useMemo<DeviceGroup[]>(() => {
    const map = new Map<string, DeviceGroup>();
    for (const budget of filteredBudgets) {
      const deviceType = budget.device_type || 'Outro dispositivo';
      const deviceModel = budget.device_model || 'Modelo não informado';
      const key = `${deviceType}::${deviceModel}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          device_type: deviceType,
          device_model: deviceModel,
          budgets: [budget],
          totalCount: 1,
          lastCreatedAt: budget.created_at ?? null
        });
      } else {
        existing.budgets.push(budget);
        existing.totalCount += 1;
        if (budget.created_at && (!existing.lastCreatedAt || new Date(budget.created_at) > new Date(existing.lastCreatedAt))) {
          existing.lastCreatedAt = budget.created_at;
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      // Sort by lastCreatedAt descending
      const dateA = a.lastCreatedAt ? new Date(a.lastCreatedAt).getTime() : 0;
      const dateB = b.lastCreatedAt ? new Date(b.lastCreatedAt).getTime() : 0;
      if (dateB !== dateA) {
        return dateB - dateA;
      }

      const typeCmp = a.device_type.localeCompare(b.device_type);
      if (typeCmp !== 0) return typeCmp;
      return a.device_model.localeCompare(b.device_model);
    });
  }, [filteredBudgets]);

  const visibleDeviceGroups = useMemo(() => {
    return deviceGroups.slice(0, visibleGroupsCount);
  }, [deviceGroups, visibleGroupsCount]);
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setActiveSearchTerm(term);
  };
  const handleClearSearch = () => {
    setSearchTerm('');
    setActiveSearchTerm('');
    setAiResults([]);
  };
  const handleBudgetCreated = useCallback(() => {
    setIsNewBudgetOpen(false);
    setNewBudgetInitialData(null);
    refetch();
  }, [refetch]);
  const handleBudgetDeleted = useCallback(async (budgetId: string) => {
    await handleDelete(budgetId);
    refetch();
  }, [handleDelete, refetch]);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };
  if (isLoading) {
    return <div className="space-y-6">
      {/* Hero skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-40 bg-muted rounded-full animate-pulse" />
        <div className="h-10 w-64 bg-muted rounded animate-pulse" />
        <div className="h-4 w-80 bg-muted rounded animate-pulse" />
      </div>
      {/* Cards skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="p-6 bg-card rounded-2xl border animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3 mb-2" />
          <div className="h-3 bg-muted rounded w-1/2 mb-4" />
          <div className="h-3 bg-muted rounded w-1/4" />
        </div>)}
      </div>
    </div>;
  }
  if (error) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-4">
        <div className="text-destructive text-6xl">⚠️</div>
        <h3 className="text-lg font-semibold text-destructive mb-2">Erro ao carregar orçamentos</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {typeof error === 'string' ? error : 'Erro inesperado'}
        </p>
        <Button onClick={() => refetch()} variant="outline" className="rounded-xl">
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar Novamente
        </Button>
      </div>
    </div>;
  }
  return <div className="space-y-6 lg:space-y-10">
    {/* Hero Section */}
    <section className="text-center lg:text-left">
      <div className="flex justify-center lg:justify-start">




      </div>
      <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
        Orçamentos
      </h1>
      <p className="mt-2 text-muted-foreground max-w-2xl mx-auto lg:mx-0">
        <span className="font-medium text-foreground">{filteredBudgets.length}</span> orçamento(s) encontrado(s). Gerencie, compartilhe e acompanhe.
      </p>
    </section>

    {/* Filter Section */}
    <section className="bg-muted/20 border border-border/30 rounded-2xl p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 flex gap-2">
          <WormBudgetSearch searchTerm={searchTerm} onSearch={handleSearch} onClearSearch={handleClearSearch} />
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing} className="shrink-0 rounded-xl" title="Atualizar lista">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <Sheet open={isNewBudgetOpen} onOpenChange={setIsNewBudgetOpen}>
          <SheetTrigger asChild>
            <Button onClick={() => {
              setNewBudgetInitialData(null);
              setIsNewBudgetOpen(true);
            }} className="btn-premium h-10 px-4 rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Novo Orçamento
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-lg p-0">
            <WormBudgetForm initialData={newBudgetInitialData || undefined} onSuccess={handleBudgetCreated} onCancel={() => setIsNewBudgetOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </section>

    {/* Budget List */}
    <section className="space-y-4">
      {filteredBudgets.length === 0 ? <Card className="rounded-2xl">
        <CardContent className="flex flex-col items-center justify-center py-14">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {aiResults.length > 0 ? 'Nenhum resultado da IA encontrado' : activeSearchTerm ? 'Nenhum resultado encontrado' : 'Nenhum orçamento'}
          </h3>
          <p className="text-muted-foreground text-center mb-4">
            {aiResults.length > 0 ? 'Tente um comando diferente ou use a busca tradicional' : activeSearchTerm ? 'Tente ajustar sua busca ou criar um novo orçamento' : 'Comece criando seu primeiro orçamento'}
          </p>
          {(activeSearchTerm || aiResults.length > 0) && <Button variant="outline" onClick={handleClearSearch} className="rounded-xl">
            Limpar busca
          </Button>}
          {!activeSearchTerm && aiResults.length === 0 && <Button onClick={() => {
            setNewBudgetInitialData(null);
            setIsNewBudgetOpen(true);
          }} className="btn-premium h-11 px-6 rounded-xl">
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Orçamento
          </Button>}
        </CardContent>
      </Card> : 
      <>
        {visibleDeviceGroups.map((group) => <Card key={group.key} className="rounded-2xl">
        <CardContent className="p-4 sm:p-6">
          {/* Device Group Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-lg leading-tight truncate">
                  {group.device_model}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {group.device_type} • {group.totalCount} orçamento(s)
                {group.lastCreatedAt && ` • Último em ${new Date(group.lastCreatedAt).toLocaleDateString('pt-BR')}`}
              </p>
            </div>

            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => {
                if (isIOS()) {
                  setSharingBudgets(group.budgets);
                  setIsShareSheetOpen(true);
                } else {
                  handleCopyDeviceBudgets(group.budgets);
                }
              }} className="rounded-xl shrink-0 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                Copiar
              </Button>

              {showTutorial && deviceGroups[0]?.key === group.key &&
                <div className="absolute right-0 top-12 z-50 w-56 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="bg-primary text-primary-foreground p-3 rounded-xl shadow-lg relative">
                    <div className="absolute right-6 -top-2 w-4 h-4 bg-primary rotate-45" />
                    <div className="relative z-10">
                      <div className="flex items-start gap-2 mb-2">

                        <p className="text-xs font-medium leading-relaxed">
                          Use este botão para copiar os orçamentos
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full text-xs h-7 rounded-lg font-semibold text-primary"
                        onClick={handleCloseTutorial}>

                        Entendi
                      </Button>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>

          {/* Budgets inside group */}
          <div className="space-y-3">
            {group.budgets.map((budget) => {
              return (
                <WormBudgetCard
                  key={budget.id}
                  budget={budget}
                  onDelete={handleBudgetDeleted}
                  onWhatsAppShare={handleWhatsAppShare}
                  onUpdate={refetch}
                  isDeleting={isDeleting === budget.id} />);


            })}
          </div>
        </CardContent>
      </Card>)}
      
      {visibleGroupsCount < deviceGroups.length && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={handleLoadMore} className="rounded-xl">
            Carregar mais modelos
          </Button>
        </div>
      )}
      </>
      }
    </section>

    {/* iOS Share Sheet */}
    <Sheet open={isShareSheetOpen} onOpenChange={setIsShareSheetOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        {sharingBudgets && <WormWhatsAppSelector budgets={sharingBudgets} onClose={() => setIsShareSheetOpen(false)} />}
      </SheetContent>
    </Sheet>
  </div>;
};