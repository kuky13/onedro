import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, Plus, Trash2, RefreshCw, Users, Eye, EyeOff, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendPushToAll, sendPushToUser } from '@/lib/pushNotifications';
interface AdminNotificationForm {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  targetType: 'all' | 'specific' | 'push_enabled';
  targetUserId: string;
  expiresAt: string;
  sendPush: boolean;
  pushUrl?: string;
}
const typeLabels: Record<AdminNotificationForm['type'], string> = {
  info: 'Informativo',
  warning: 'Aviso',
  success: 'Sucesso',
  error: 'Crítico'
};
const typeVariant: Record<AdminNotificationForm['type'], string> = {
  info: 'outline',
  warning: 'secondary',
  success: 'default',
  error: 'destructive'
};
export const SmsManagement: React.FC = () => {
  const {
    user
  } = useAuth();
  const {
    showError,
    showSuccess
  } = useToast();
  const isAuthenticated = !!user?.id;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | AdminNotificationForm['type']>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [form, setForm] = useState<AdminNotificationForm>({
    title: '',
    message: '',
    type: 'info',
    targetType: 'all',
    targetUserId: '',
    expiresAt: '',
    sendPush: false,
    pushUrl: '/msg'
  });
  const {
    data: users = [],
    isLoading: usersLoading
  } = useQuery({
    queryKey: ['superadmin-sms-users'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.rpc('admin_get_all_users');
      if (error) throw error;
      return data?.map((u: any) => ({
        id: u.id,
        name: u.name || u.email || 'Usuário sem nome'
      })) || [];
    },
    enabled: isAuthenticated
  });
  const {
    data: notifications = [],
    isLoading: notificationsLoading,
    refetch
  } = useQuery({
    queryKey: ['superadmin-sms-notifications'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.rpc('admin_list_notifications', {
        p_limit: 200,
        p_offset: 0
      });
      if (error) throw error;
      return data || [];
    },
    enabled: isAuthenticated
  });
  const {
    data: userNotifications = []
  } = useQuery({
    queryKey: ['superadmin-sms-user-notifications'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.rpc('admin_list_user_notifications', {
        p_limit: 500,
        p_offset: 0
      });
      if (error) throw error;
      return data || [];
    },
    enabled: isAuthenticated
  });
  const createNotification = useMutation({
    mutationFn: async (payload: AdminNotificationForm) => {
      const rpcPayload: Record<string, unknown> = {
        p_title: payload.title,
        p_message: payload.message,
        p_type: payload.type,
        p_target_type: payload.targetType
      };
      if (payload.targetType === 'specific') {
        rpcPayload.p_target_user_id = payload.targetUserId;
      }
      if (payload.expiresAt) {
        rpcPayload.p_expires_at = payload.expiresAt;
      }
      const {
        data,
        error
      } = await supabase.rpc('admin_create_notification', rpcPayload as any);
      if (error) throw error;
      if (payload.sendPush) {
        try {
          const commonPayload = {
            title: payload.title,
            body: payload.message,
            url: payload.pushUrl || '/msg',
            data: {
              type: payload.type,
              source: 'admin_sms'
            }
          } as const;
          if (payload.targetType === 'specific' && payload.targetUserId) {
            await sendPushToUser(payload.targetUserId, commonPayload);
          } else {
            await sendPushToAll(commonPayload);
          }
        } catch (pushError) {
          console.error('Erro ao enviar push a partir do painel SMS:', pushError);
        }
      }
      return data;
    },
    onSuccess: () => {
      showSuccess({
        title: 'Mensagem enviada',
        description: 'A mensagem foi criada e será distribuída para os usuários.'
      });
      setDialogOpen(false);
      setForm({
        title: '',
        message: '',
        type: 'info',
        targetType: 'all',
        targetUserId: '',
        expiresAt: '',
        sendPush: false,
        pushUrl: '/msg'
      });
      refetch();
    },
    onError: (error: any) => {
      showError({
        title: 'Erro ao enviar',
        description: error.message || 'Não foi possível criar a mensagem.'
      });
    }
  });
  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const {
        error
      } = await supabase.rpc('admin_delete_notification', {
        p_notification_id: notificationId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess({
        title: 'Mensagem excluída',
        description: 'A mensagem foi removida.'
      });
      refetch();
      setSelectedId(current => current === null ? null : current);
      setSelectedNotifications([]);
    },
    onError: (error: any) => {
      showError({
        title: 'Erro ao excluir',
        description: error.message || 'Não foi possível excluir a mensagem.'
      });
    }
  });
  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map(id => supabase.rpc('admin_delete_notification', {
        p_notification_id: id
      })));
      const errors = results.filter(r => r.status === 'rejected');
      if (errors.length) {
        throw new Error(`Falha ao excluir ${errors.length} mensagens`);
      }
    },
    onSuccess: () => {
      showSuccess({
        title: 'Mensagens excluídas',
        description: 'As mensagens selecionadas foram removidas.'
      });
      refetch();
      setSelectedNotifications([]);
    },
    onError: (error: any) => {
      showError({
        title: 'Erro ao excluir em lote',
        description: error.message || 'Não foi possível excluir em lote.'
      });
    }
  });
  const filteredNotifications = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return notifications.filter((n: any) => {
      const matchesSearch = !term || n.title.toLowerCase().includes(term) || n.message.toLowerCase().includes(term) || n.type && n.type.toLowerCase().includes(term);
      const matchesType = filterType === 'all' || n.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [notifications, searchTerm, filterType]);
  const stats = useMemo(() => {
    const total = notifications.length;
    const now = new Date();
    const active = notifications.filter((n: any) => !n.expires_at || new Date(n.expires_at) >= now).length;
    const expired = total - active;
    return {
      total,
      active,
      expired
    };
  }, [notifications]);
  const selectedNotification = useMemo(() => filteredNotifications.find((n: any) => n.id === selectedId) || filteredNotifications[0] || null, [filteredNotifications, selectedId]);
  const selectedRecipients = useMemo(() => {
    if (!selectedNotification) return [];
    return userNotifications.filter((un: any) => un.notification_id === selectedNotification.id);
  }, [selectedNotification, userNotifications]);
  const viewedCount = selectedRecipients.filter((r: any) => r.read_at).length;
  const handleToggleSelect = (id: string) => {
    setSelectedNotifications(prev => prev.includes(id) ? prev.filter(nid => nid !== id) : [...prev, id]);
  };
  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map((n: any) => n.id));
    }
  };
  const canSubmit = form.title.trim().length > 0 && form.message.trim().length > 0 && (form.targetType !== 'specific' || !!form.targetUserId);
  return <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">SMS &amp; Mensagens</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Crie, envie e acompanhe mensagens enviadas para os usuários. Veja quem recebeu, quem visualizou
            e gerencie o histórico de comunicação.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={notificationsLoading} className="hidden sm:inline-flex">
            <RefreshCw className={cn('h-4 w-4', notificationsLoading && 'animate-spin')} />
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova mensagem
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar nova mensagem</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Título</label>
                  <Input value={form.title} onChange={e => setForm(f => ({
                  ...f,
                  title: e.target.value
                }))} placeholder="Ex: Aviso importante sobre o sistema" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Mensagem</label>
                  <Textarea value={form.message} onChange={e => setForm(f => ({
                  ...f,
                  message: e.target.value
                }))} placeholder="Digite o conteúdo completo da mensagem que será exibida para os usuários" rows={4} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo</label>
                    <Select value={form.type} onValueChange={(value: AdminNotificationForm['type']) => setForm(f => ({
                    ...f,
                    type: value
                  }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Informativo</SelectItem>
                        <SelectItem value="success">Sucesso</SelectItem>
                        <SelectItem value="warning">Aviso</SelectItem>
                        <SelectItem value="error">Crítico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Destino</label>
                    <Select value={form.targetType} onValueChange={(value: AdminNotificationForm['targetType']) => setForm(f => ({
                    ...f,
                    targetType: value,
                    targetUserId: value === 'specific' ? f.targetUserId : ''
                  }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o destino" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os usuários</SelectItem>
                        <SelectItem value="specific">Usuário específico</SelectItem>
                        <SelectItem value="push_enabled">Usuários com push ativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {form.targetType === 'specific' && <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" /> Selecionar usuário
                    </label>
                    <Select value={form.targetUserId} onValueChange={value => setForm(f => ({
                  ...f,
                  targetUserId: value
                }))} disabled={usersLoading}>
                      <SelectTrigger>
                        <SelectValue placeholder={usersLoading ? 'Carregando usuários...' : 'Escolha um usuário'} />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(u => <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>}

                <div className="space-y-3 border-t pt-3 mt-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Checkbox checked={form.sendPush} onCheckedChange={checked => setForm(f => ({
                    ...f,
                    sendPush: !!checked
                  }))} />
                    Enviar também como push do navegador
                  </label>
                  {form.sendPush && <div className="space-y-1 pl-6">
                      <label className="text-xs text-muted-foreground">
                        URL ao clicar na notificação (opcional)
                      </label>
                      <Input value={form.pushUrl || '/msg'} onChange={e => setForm(f => ({
                    ...f,
                    pushUrl: e.target.value
                  }))} placeholder="/msg" />
                      <p className="text-[11px] text-muted-foreground">
                        Por padrão, os usuários serão levados para a central de mensagens (/msg).
                      </p>
                    </div>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Expira em (opcional)</label>
                  <Input type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({
                  ...f,
                  expiresAt: e.target.value
                }))} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => createNotification.mutate(form)} disabled={!canSubmit || createNotification.isPending}>
                  <SendIcon loading={createNotification.isPending} />
                  <span className="ml-2">Enviar mensagem</span>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border/60 bg-card/80">
          <CardContent className="py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total de mensagens</p>
              <p className="text-lg font-semibold">{stats.total}</p>
            </div>
            <MessageSquare className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardContent className="py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Ativas</p>
              <p className="text-lg font-semibold">{stats.active}</p>
            </div>
            <Eye className="h-5 w-5 text-emerald-500" />
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardContent className="py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Expiradas</p>
              <p className="text-lg font-semibold">{stats.expired}</p>
            </div>
            <EyeOff className="h-5 w-5 text-destructive" />
          </CardContent>
        </Card>
      </div>

      {/* Área principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de mensagens */}
        <Card className="border-border/60 bg-card/80 flex flex-col">
          <CardHeader className="pb-2 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Mensagens
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} disabled={notificationsLoading}>
                  <RefreshCw className={cn('h-4 w-4', notificationsLoading && 'animate-spin')} />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input placeholder="Buscar por título, conteúdo ou tipo" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pr-8 h-9 text-sm" />
                  <Filter className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Checkbox checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0} onCheckedChange={handleSelectAll} className="h-3.5 w-3.5" />
                    <span>
                      {selectedNotifications.length > 0 ? `${selectedNotifications.length} selecionada(s)` : 'Selecionar todas'}
                    </span>
                  </div>

                    {selectedNotifications.length > 0 && <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={() => bulkDelete.mutate(selectedNotifications)} disabled={bulkDelete.isPending}>
                      <Trash2 className="h-3 w-3 mr-1" /> Excluir selecionadas
                    </Button>}
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={filterType === 'all' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setFilterType('all')}>
                    Todas
                  </Badge>
                  <Badge variant={filterType === 'info' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setFilterType('info')}>
                    Info
                  </Badge>
                  <Badge variant={filterType === 'success' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setFilterType('success')}>
                    Sucesso
                  </Badge>
                  
                  
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0 flex-1 min-h-[260px]">
            <ScrollArea className="h-[360px] pr-2">
              <div className="space-y-1">
                {filteredNotifications.length === 0 && <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground gap-2">
                    <MessageSquare className="h-8 w-8 opacity-60" />
                    <p className="font-medium text-sm">Nenhuma mensagem encontrada</p>
                    <p className="text-xs max-w-xs">
                      Use os filtros ou crie uma nova mensagem para começar a se comunicar com seus usuários.
                    </p>
                  </div>}

                {filteredNotifications.map((n: any) => {
                const isSelected = selectedId ? selectedId === n.id : filteredNotifications[0]?.id === n.id;
                const isChecked = selectedNotifications.includes(n.id);
                const createdAt = n.created_at ? format(new Date(n.created_at), "dd/MM/yyyy HH:mm", {
                  locale: ptBR
                }) : '-';
                return <button key={n.id} type="button" onClick={() => setSelectedId(n.id)} className={cn('w-full flex items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors', isSelected ? 'border-primary bg-primary/5' : 'border-border/60 hover:bg-muted/40')}>
                      <Checkbox checked={isChecked} onCheckedChange={() => handleToggleSelect(n.id)} className="mt-1 h-3.5 w-3.5" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate">{n.title}</p>
                          <Badge variant={typeVariant[n.type as AdminNotificationForm['type']] as any} className="text-[10px]">
                            {typeLabels[n.type as AdminNotificationForm['type']] ?? 'Info'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground/80">
                          <span>{createdAt}</span>
                          {n.expires_at && <span>Expira em {format(new Date(n.expires_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR
                        })}</span>}
                        </div>
                      </div>
                    </button>;
              })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Detalhes da mensagem selecionada */}
        <Card className="border-border/60 bg-card/80 flex flex-col">
          <CardHeader className="pb-2 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" /> Detalhes da mensagem
              </CardTitle>
              {selectedNotification && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteNotification.mutate(selectedNotification.id)} disabled={deleteNotification.isPending}>
                  <Trash2 className="h-4 w-4" />
                </Button>}
            </div>
          </CardHeader>

          <CardContent className="pt-0 flex-1 flex flex-col gap-4 min-h-[260px]">
            {!selectedNotification ? <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground text-center px-6">
                Selecione uma mensagem na lista ao lado para ver os detalhes e os usuários que a receberam.
              </div> : <>
                <div className="space-y-1">
                  <h2 className="font-semibold text-lg leading-snug break-words">{selectedNotification.title}</h2>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {selectedNotification.message}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <p className="text-muted-foreground/80">Tipo</p>
                    <Badge variant={typeVariant[selectedNotification.type as AdminNotificationForm['type']] as any}>
                      {typeLabels[selectedNotification.type as AdminNotificationForm['type']] ?? 'Informativo'}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground/80">Destino</p>
                    <p className="font-medium">
                      {selectedNotification.target_type === 'all' ? 'Todos os usuários' : selectedNotification.target_type === 'specific' ? 'Usuário específico' : 'Usuários com push ativo'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground/80">Criada em</p>
                    <p className="font-medium">
                      {selectedNotification.created_at ? format(new Date(selectedNotification.created_at), "dd/MM/yyyy HH:mm", {
                    locale: ptBR
                  }) : '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground/80">Expira em</p>
                    <p className="font-medium">
                      {selectedNotification.expires_at ? format(new Date(selectedNotification.expires_at), "dd/MM/yyyy HH:mm", {
                    locale: ptBR
                  }) : 'Sem data de expiração'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 flex-1 flex flex-col min-h-[160px]">
                  <div className="flex items-center justify-between text-xs">
                    <p className="font-medium flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" /> Destinatários
                    </p>
                    <p className="text-muted-foreground">
                      {selectedRecipients.length} enviados • {viewedCount} visualizados
                    </p>
                  </div>

                  <ScrollArea className="flex-1 pr-2">
                    <div className="space-y-2 text-xs">
                      {selectedRecipients.length === 0 && <p className="text-muted-foreground/80">
                          Ainda não há registros de envio para esta mensagem.
                        </p>}

                      {selectedRecipients.map((r: any) => {
                    const readAt = r.read_at ? format(new Date(r.read_at), "dd/MM/yyyy HH:mm", {
                      locale: ptBR
                    }) : null;
                    const sentAt = r.sent_at ? format(new Date(r.sent_at), "dd/MM/yyyy HH:mm", {
                      locale: ptBR
                    }) : null;
                    return <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2">
                            <div className="space-y-0.5 min-w-0">
                              <p className="font-medium truncate">{r.user_name || r.user_email || r.user_id}</p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                Enviado em {sentAt || '-'}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant={readAt ? 'default' : 'outline'} className={cn('text-[10px] px-2 py-0', readAt ? 'bg-emerald-500 text-emerald-50' : '')}>
                                {readAt ? 'Visualizado' : 'Não visualizado'}
                              </Badge>
                              {readAt && <span className="text-[10px] text-muted-foreground">{readAt}</span>}
                            </div>
                          </div>;
                  })}
                    </div>
                  </ScrollArea>
                </div>
              </>}
          </CardContent>
        </Card>
      </div>
    </div>;
};
const SendIcon: React.FC<{
  loading?: boolean;
}> = ({
  loading
}) => <span className="inline-flex items-center">
    {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M22 2 11 13" />
        <path d="M22 2 15 22 11 13 2 9 22 2z" />
      </svg>}
  </span>;
export default SmsManagement;