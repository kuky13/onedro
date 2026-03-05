import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useNotifications, type NotificationData } from '@/hooks/useNotifications';
import { NotificationCard } from './NotificationCard';
import { NotificationFiltersComponent } from './NotificationFilters';
import { 
  Bell, 
  RefreshCw, 
  AlertCircle, 
  CheckCheck,
  Trash2,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptimizedNotificationPanelProps {
  className?: string;
  isFullPage?: boolean;
  onClose?: () => void;
}

export const OptimizedNotificationPanel: React.FC<OptimizedNotificationPanelProps> = ({
  className,
  isFullPage = false,
  onClose
}) => {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    filters,
    markAsRead,
    markAllAsRead,
    updateFilters,
    refreshNotifications,
    isMarkingAsRead,
    isMarkingAllAsRead,
    deleteNotification,
    isDeletingNotification
  } = useNotifications();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Ao abrir em tela cheia (rota /msg), marcar todas como lidas de forma silenciosa
  useEffect(() => {
    if (isFullPage && notifications.length > 0) {
      markAllAsRead(true);
    }
  }, [isFullPage, notifications.length, markAllAsRead]);

  // Memoized filtered notifications for better performance
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification =>
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [notifications, searchTerm]);

  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
  };

  const handleSelectNotification = (id: string) => {
    setSelectedNotifications(prev => 
      prev.includes(id) 
        ? prev.filter(nId => nId !== id)
        : [...prev, id]
    );
  };

  const handleBulkMarkAsRead = () => {
    selectedNotifications.forEach(id => {
      const notification = notifications.find(n => n.id === id);
      if (notification && !notification.is_read) {
        markAsRead(id);
      }
    });
    setSelectedNotifications([]);
  };

  const handleBulkDelete = () => {
    selectedNotifications.forEach(id => {
      deleteNotification(id);
    });
    setSelectedNotifications([]);
    setShowDeleteConfirm(false);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    updateFilters({ type: 'all', read_status: 'all' });
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-center">
            <div className="space-y-3">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <div>
                <h3 className="font-medium text-foreground">Erro ao carregar notificações</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Não foi possível carregar suas notificações. Verifique sua conexão.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshNotifications}
                disabled={isLoading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                Tentar novamente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const content = (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Mobile-optimized header */}
      <div className="glass-card p-3 sm:p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-primary rounded-full animate-pulse" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-2xl font-bold text-foreground truncate">
                {isFullPage ? 'Suas Mensagens' : 'Central de Mensagens'}
              </h2>
              <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-lg truncate">
                {unreadCount > 0 
                  ? `${unreadCount} ${unreadCount === 1 ? 'mensagem não lida' : 'mensagens não lidas'}`
                  : 'Todas as mensagens foram lidas'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshNotifications}
              disabled={isLoading}
              className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              <span className="hidden sm:inline ml-2">Atualizar</span>
            </Button>
            
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Filters */}
        <NotificationFiltersComponent
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filters}
          onFiltersChange={updateFilters}
          onClearFilters={handleClearFilters}
        />
        
        {/* Mobile-optimized filters */}
        <div className="flex flex-col gap-3 sm:gap-4 mt-3 sm:mt-4">
          <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1">
            <Button
              variant={filters.read_status === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilters({ ...filters, read_status: 'all' })}
              className={cn(
                "text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0",
                filters.read_status === 'all' 
                  ? "bg-primary text-primary-foreground shadow-medium" 
                  : "glass hover:bg-muted/50"
              )}
            >
              Todas ({notifications.length})
            </Button>
            <Button
              variant={filters.read_status === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilters({ ...filters, read_status: 'unread' })}
              className={cn(
                "text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0",
                filters.read_status === 'unread' 
                  ? "bg-primary text-primary-foreground shadow-medium" 
                  : "glass hover:bg-muted/50"
              )}
            >
              Não lidas ({unreadCount})
            </Button>
            <Button
              variant={filters.read_status === 'read' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilters({ ...filters, read_status: 'read' })}
              className={cn(
                "text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0",
                filters.read_status === 'read' 
                  ? "bg-primary text-primary-foreground shadow-medium" 
                  : "glass hover:bg-muted/50"
              )}
            >
              Lidas ({notifications.length - unreadCount})
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile-optimized Bulk Actions Bar */}
      {filteredNotifications.length > 0 && (
        <div className="border-b bg-muted/30 p-2 sm:p-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Checkbox
                checked={selectedNotifications.length === filteredNotifications.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-xs sm:text-sm font-medium truncate">
                {selectedNotifications.length > 0 
                  ? `${selectedNotifications.length} selecionada${selectedNotifications.length > 1 ? 's' : ''}` 
                  : 'Selecionar todas'
                }
              </span>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllAsRead()}
                  disabled={isMarkingAllAsRead}
                  className="h-8 sm:h-9 text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
                >
                  <CheckCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Marcar todas como lidas</span>
                  <span className="xs:hidden">Todas</span>
                </Button>
              )}

              {selectedNotifications.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkMarkAsRead}
                    disabled={isMarkingAsRead}
                    className="h-8 sm:h-9 text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
                  >
                    <CheckCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Marcar como lidas</span>
                    <span className="xs:hidden">Lidas</span>
                  </Button>
                  
                  <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive h-8 sm:h-9 text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">Excluir</span>
                        <span className="xs:hidden">Del</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirmar exclusão</DialogTitle>
                        <DialogDescription>
                          Tem certeza que deseja excluir {selectedNotifications.length} notificação{selectedNotifications.length > 1 ? 'ões' : ''}? Esta ação não pode ser desfeita.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowDeleteConfirm(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleBulkDelete}
                          disabled={isDeletingNotification}
                        >
                          Excluir
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}


            </div>
          </div>
        </div>
      )}
      
      {/* Mobile-optimized notifications list */}
      <div className="flex-1 overflow-hidden mt-3 sm:mt-6">
        <div className="glass-card h-full">
          <ScrollArea className="h-full">
            <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-muted/50 h-24 rounded-xl"></div>
                    </div>
                  ))}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-16">
                  <div className="glass-card rounded-full p-6 w-24 h-24 mx-auto mb-6">
                    <Bell className="w-12 h-12 text-muted-foreground mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {searchTerm ? 'Nenhuma mensagem encontrada' : 'Nenhuma mensagem'}
                  </h3>
                  <p className="text-muted-foreground text-lg">
                    {searchTerm 
                      ? 'Tente ajustar os filtros ou termo de busca'
                      : filters.read_status === 'unread' 
                        ? 'Você não tem mensagens não lidas'
                        : 'Você não tem mensagens no momento'
                    }
                  </p>
                  {searchTerm && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearFilters}
                      className="mt-4"
                    >
                      Limpar filtros
                    </Button>
                  )}
                </div>
              ) : (
                 <div className="space-y-4">
                   {filteredNotifications.map((notification, index) => (
                     <div
                       key={notification.id}
                       className="animate-in slide-in-from-bottom-4 fade-in"
                       style={{
                         animationDelay: `${index * 100}ms`,
                         animationDuration: '500ms',
                         animationFillMode: 'both'
                       }}
                     >
                       <NotificationCard
                         notification={notification as NotificationData}
                         isSelected={selectedNotifications.includes(notification.id)}
                         onSelect={handleSelectNotification}
                         onMarkAsRead={markAsRead}
                         onDelete={deleteNotification}
                         isMarkingAsRead={isMarkingAsRead}
                         isDeletingNotification={isDeletingNotification}
                       />
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );

  if (isFullPage) {
    return (
      <div className="container mx-auto py-6">
        <Card className="h-[calc(100vh-8rem)]">
          {content}
        </Card>
      </div>
    );
  }

  return <Card className={className}>{content}</Card>;
};