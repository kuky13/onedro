
import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { UniversalSearchInput } from '@/components/ui/ios-optimized/UniversalSearchInput';
import { EnhancedBudgetCard } from './ios/EnhancedBudgetCard';
import { FloatingActionButton, createDefaultFABActions } from '@/components/ui/ios-optimized/FloatingActionButton';
import { BottomSheet } from '@/components/ui/ios-optimized/BottomSheet';
import { PullToRefresh } from '@/components/ui/ios-optimized/PullToRefresh';
import { IOSToastContainer, useIOSToast } from '@/components/ui/ios-optimized/IOSToast';
import { BudgetCardSkeleton } from '@/components/ui/ios-optimized/SkeletonLoader';
import { useBudgetData } from '@/hooks/useBudgetData';
import { useAuth } from '@/hooks/useAuth';
import { Filter, SortAsc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveBudgetPDF, hasValidCompanyDataForPDF } from '@/utils/pdfUtils';
import { useCompanyDataLoader } from '@/hooks/useCompanyDataLoader';

interface Budget {
  id: string;
  client_name?: string;
  device_model?: string;
  device_type?: string;
  issue?: string;
  total_price?: number;
  cash_price?: number;
  workflow_status?: string;
  is_paid?: boolean;
  is_delivered?: boolean;
  expires_at?: string;
  created_at: string;
}

interface BudgetLiteListEnhancedProps {
  onNavigateTo?: (view: string, id?: string) => void;
}

export const BudgetLiteListEnhanced = ({
  onNavigateTo
}: BudgetLiteListEnhancedProps) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { budgets, loading, error, handleRefresh } = useBudgetData(user?.id || '');
  const { toasts, showSuccess, showError, showInfo, removeToast } = useIOSToast();
  const { getCompanyDataForPDF } = useCompanyDataLoader();

  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'client'>('date');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search and filter logic
  const filteredBudgets = useMemo(() => {
    let filtered = budgets;

    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(budget => 
        budget.client_name?.toLowerCase().includes(searchLower) ||
        budget.device_model?.toLowerCase().includes(searchLower) ||
        budget.device_type?.toLowerCase().includes(searchLower) ||
        budget.part_quality?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      switch (filterStatus) {
        case 'pending':
          filtered = filtered.filter(b => b.workflow_status === 'pending');
          break;
        case 'approved':
          filtered = filtered.filter(b => b.workflow_status === 'approved');
          break;
        case 'paid':
          filtered = filtered.filter(b => b.is_paid === true);
          break;
        case 'delivered':
          filtered = filtered.filter(b => b.is_delivered === true);
          break;
      }
    }

    // Sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'price':
          return (b.cash_price || b.total_price || 0) - (a.cash_price || a.total_price || 0);
        case 'client':
          return (a.client_name || '').localeCompare(b.client_name || '');
        default:
          return 0;
      }
    });
  }, [budgets, searchTerm, filterStatus, sortBy]);

  // Handlers
  const handleRefreshWithFeedback = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await handleRefresh();
      showSuccess('Atualizado!', 'Lista de orçamentos atualizada.');
    } catch (error) {
      showError('Erro', 'Não foi possível atualizar a lista.');
    } finally {
      setIsRefreshing(false);
    }
  }, [handleRefresh, showSuccess, showError]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const handleToggleFilters = useCallback(() => {
    setShowFilters(!showFilters);
  }, [showFilters]);

  const handleShareWhatsApp = useCallback((budget: Budget) => {
    // Implement WhatsApp sharing logic
    showInfo('WhatsApp', 'Redirecionando para o WhatsApp...');
  }, [showInfo]);

  const handleEdit = useCallback((budget: Budget) => {
    onNavigateTo?.('edit-budget', budget.id);
  }, [onNavigateTo]);

  const handleDelete = useCallback((budgetId: string) => {
    // Implement delete logic
    showSuccess('Removido', 'Orçamento movido para a lixeira.');
  }, [showSuccess]);

  const handleGeneratePDF = useCallback(async (budget: Budget) => {
    try {
      // Verificar se temos dados da empresa no cache
      if (!hasValidCompanyDataForPDF()) {
        showError('Erro', 'Dados da empresa não encontrados. Aguarde o carregamento ou configure-os nas configurações.');
        return;
      }

      showInfo('PDF', 'Gerando PDF...');

      // Preparar dados do orçamento para PDF
      const pdfData = {
        id: budget.id,
        device_model: budget.device_model || 'Dispositivo não informado',
        piece_quality: budget.part_quality || budget.part_type || 'Não informado',
        total_price: (budget.cash_price || budget.total_price || 0) / 100,
        installment_price: budget.installment_price ? budget.installment_price / 100 : undefined,
        installment_count: budget.installments || 1,
        created_at: budget.created_at,
        validity_date: budget.valid_until || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        warranty_months: budget.warranty_months || undefined,
        notes: budget.notes || budget.issue || undefined,
        includes_delivery: budget.includes_delivery === true,
        includes_screen_protector: budget.includes_screen_protector === true
      };

      // Obter dados da empresa diretamente do loader, priorizando /service-orders/settings
      const companyData = getCompanyDataForPDF();
      
      await saveBudgetPDF(pdfData, companyData);
      
      showSuccess('PDF', 'PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      showError('Erro', 'Não foi possível gerar o PDF. Tente novamente.');
    }
  }, [showInfo, showSuccess, showError]);

  // FAB Actions
  const fabActions = createDefaultFABActions({
    onNewBudget: () => navigate('/worm'),
    onSearch: () => document.getElementById('search-input')?.focus(),
    onFilter: handleToggleFilters,
    onSettings: () => onNavigateTo?.('settings'),
    onClients: () => onNavigateTo?.('clients')
  });

  // Loading state
  if (loading && !isRefreshing) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-16 bg-muted/30 rounded-2xl animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <BudgetCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    const errorMessage = typeof error === 'string' ? error : String((error as any)?.message || 'Erro ao carregar orçamentos');
    return (
      <div className="flex items-center justify-center h-64 p-4">
        <div className="text-center">
          <p className="text-destructive mb-4">{errorMessage}</p>
          <Button onClick={handleRefreshWithFeedback}>
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Fixed Header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/30">
          <div className="p-4 space-y-4" style={{ paddingTop: 'env(safe-area-inset-top, 16px)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Orçamentos</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredBudgets.length} {filteredBudgets.length === 1 ? 'item' : 'itens'}
                  {searchTerm && ` • "${searchTerm}"`}
                </p>
              </div>
            </div>
            
            <UniversalSearchInput
              id="search-input"
              value={searchTerm}
              onChange={setSearchTerm}
              onClear={handleClearSearch}
              onFilterToggle={handleToggleFilters}
              placeholder="Buscar por cliente, dispositivo ou serviço..."
              showFilter={true}
              hasActiveFilters={filterStatus !== 'all'}
            />
          </div>
        </div>

        {/* Content with Pull to Refresh */}
        <PullToRefresh onRefresh={handleRefreshWithFeedback} disabled={isRefreshing}>
          <div className="p-4 pb-24">
            {/* Empty State */}
            {filteredBudgets.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16"
              >
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchTerm || filterStatus !== 'all' ? 'Nenhum resultado' : 'Nenhum orçamento'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'Tente ajustar sua busca ou filtros' 
                    : 'Comece criando seu primeiro orçamento'
                  }
                </p>
                {!searchTerm && filterStatus === 'all' && (
                  <Button 
                    onClick={() => navigate('/worm')}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Criar Primeiro Orçamento
                  </Button>
                )}
              </motion.div>
            ) : (
              /* Budget List */
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {filteredBudgets.map((budget, index) => (
                    <motion.div
                      key={budget.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ 
                        duration: 0.3,
                        delay: Math.min(index * 0.05, 0.3)
                      }}
                    >
                      <EnhancedBudgetCard
                        budget={budget}
                        profile={profile}
                        onShareWhatsApp={handleShareWhatsApp}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onGeneratePDF={handleGeneratePDF}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </PullToRefresh>
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton actions={fabActions} />

      {/* Filter Bottom Sheet */}
      <BottomSheet
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filtros e Ordenação"
        snapPoints={[0.4, 0.6]}
      >
        <div className="p-6 space-y-6">
          {/* Status Filter */}
          <div>
            <h3 className="font-medium mb-3">Status</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'all', label: 'Todos' },
                { value: 'pending', label: 'Pendente' },
                { value: 'approved', label: 'Aprovado' },
                { value: 'paid', label: 'Pago' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={filterStatus === option.value ? 'default' : 'outline'}
                  onClick={() => setFilterStatus(option.value)}
                  className="justify-start"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <h3 className="font-medium mb-3">Ordenar por</h3>
            <div className="space-y-2">
              {[
                { value: 'date' as const, label: 'Data de criação' },
                { value: 'price' as const, label: 'Valor' },
                { value: 'client' as const, label: 'Cliente' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={sortBy === option.value ? 'default' : 'ghost'}
                  onClick={() => setSortBy(option.value)}
                  className="w-full justify-start"
                >
                  <SortAsc className="h-4 w-4 mr-2" />
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </BottomSheet>

      {/* Toast Container */}
      <IOSToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
};
