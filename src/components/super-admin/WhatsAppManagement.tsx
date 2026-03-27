// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/useResponsive';
import { Badge } from '@/components/ui/badge';
import { Info, Users as UsersIcon, MessageSquare, DollarSign, Settings, ShoppingBag, RefreshCw, MessageCircle, Search, MoreVertical, Paperclip, Smile, Mic, User as UserIcon, Send, CheckCircle, XCircle, AlertTriangle, Eye, FileJson, Link as LinkIcon, ExternalLink, Users, User } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SuperAdminUserOption {
  id: string;
  name: string;
}
interface WhatsAppZapiSettingRow {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  allowed_numbers?: string | null;
  allowed_groups?: string | null;
  admin_notification_phone?: string | null;
  purchase_approved_template?: string | null;
  buyer_notification_template?: string | null;
  evolution_instance_name?: string | null;
  provider?: string | null;
  waha_session?: string | null;
}
interface WhatsAppZapiLogRow {
  id: string;
  created_at: string;
  owner_id: string | null;
  from_phone: string | null;
  chat_id: string | null;
  is_group: boolean;
  raw_message: string | null;
  ai_json: any | null;
  budget_id: string | null;
  status: string;
  error_message: string | null;
}
interface PurchaseRegistration {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  amount: number | null;
  status: string | null;
  plan_type: string | null;
  license_code: string | null;
  license_id: string | null;
  payment_method: string | null;
  licenses?: {
    is_active: boolean;
    expires_at: string | null;
  } | null;
}
export function WhatsAppManagement() {
  const isMobile = useIsMobile();

  const {
    user
  } = useAuth();
  const {
    showSuccess,
    showError
  } = useToast();
  const isAuthenticated = !!user?.id;

  const getJidString = (jid: any): string => {
    if (!jid) return '';
    if (typeof jid === 'string') return jid;
    if (typeof jid === 'object') {
      return jid._serialized || jid.user || JSON.stringify(jid);
    }
    return String(jid);
  };
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
  const [allowedNumbers, setAllowedNumbers] = useState<string>('');
  const [allowedGroups, setAllowedGroups] = useState<string>('');
  const [evolutionInstanceName, setEvolutionInstanceName] = useState<string>('');
  const [adminNotificationPhone, setAdminNotificationPhone] = useState<string>('');
  const [purchaseTemplate, setPurchaseTemplate] = useState<string>(`*🚀 Nova Venda Aprovada!*\n\n` + `👤 *Cliente:* {{client_name}}\n` + `📧 *Email:* {{email}}\n` + `📱 *Tel:* {{phone}}\n` + `💰 *Valor:* R$ {{amount}}\n` + `📦 *Plano:* {{plan_type}}\n` + `🎫 *Licença:* \`{{license_code}}\`\n\n` + `*ID Abacate Pay:* \`{{mp_id}}\`\n` + `*Status:* {{status}}\n` + `*Método:* {{method}}\n\n` + `{{datetime_brt}}\n\n` + `O sistema processou tudo automaticamente. ✅`);
  const [buyerTemplate, setBuyerTemplate] = useState<string>(`*✅ Pagamento Confirmado!*\n\n` + `Olá *{{client_name}}*, seu pagamento foi aprovado com sucesso!\n\n` + `*Detalhes da Compra:*\n` + `📦 *Plano:* {{plan_name}}\n` + `💰 *Valor:* R$ {{amount}}\n` + `🎫 *Licença:* \`{{license_code}}\`\n` + `📅 *Validade:* {{validity}}\n\n` + `{{datetime_brt}}\n\n` + `Obrigado por escolher nosso sistema! 🐧`);

  // --- Queries ---

  const {
    data: chatsList = [],
    isLoading: chatsLoading,
    refetch: refetchChats
  } = useQuery<any[]>({
    queryKey: ['superadmin-whatsapp-evo-chats', evolutionInstanceName],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.functions.invoke('whatsapp-proxy', {
        body: {
          action: 'get_chats',
          payload: {
            instanceName: evolutionInstanceName || undefined
          }
        }
      });
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
    enabled: isAuthenticated && !!evolutionInstanceName
  });

  const {
    data: chatMessages = [],
    isLoading: messagesLoading,
    refetch: refetchMessages
  } = useQuery<any[]>({
    queryKey: ['superadmin-whatsapp-evo-messages', selectedChatId, evolutionInstanceName],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.functions.invoke('whatsapp-proxy', {
        body: {
          action: 'get_messages',
          payload: {
            remoteJid: selectedChatId,
            instanceName: evolutionInstanceName || undefined
          }
        }
      });
      if (error) throw error;
      const msgs = data?.messages || data;
      return Array.isArray(msgs) ? msgs : [];
    },
    enabled: isAuthenticated && !!selectedChatId && !!evolutionInstanceName,
    refetchInterval: 5000 // Polling a cada 5 segundos para o "ao vivo"
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, text }: { chatId: string, text: string }) => {
      const cleanNumber = chatId.split('@')[0];
      const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
        body: {
          action: 'send_message',
          payload: {
            to: cleanNumber,
            text,
            instanceName: evolutionInstanceName || undefined
          }
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setChatMessage('');
      refetchMessages();
    },
    onError: (err: any) => {
      showError({ title: 'Erro ao enviar', description: err.message });
    }
  });

  const {
    data: users = [],
    isLoading: usersLoading
  } = useQuery<SuperAdminUserOption[]>({
    queryKey: ['superadmin-whatsapp-users'],
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
    data: groups = [],
    isLoading: groupsLoading
  } = useQuery<any[]>({
    queryKey: ['superadmin-whatsapp-evo-groups', evolutionInstanceName],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.functions.invoke('whatsapp-proxy', {
        body: {
          action: 'get_groups',
          payload: {
            instanceName: evolutionInstanceName || undefined
          }
        }
      });
      if (error) throw error;
      return Array.isArray(data) ? data : (data?.groups || []);
    },
    enabled: isAuthenticated && !!evolutionInstanceName
  });
  const {
    data: logs = [],
    isLoading: logsLoading,
    refetch: refetchLogs
  } = useQuery<WhatsAppZapiLogRow[]>({
    queryKey: ['superadmin-whatsapp-zapi-logs'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('whatsapp_zapi_logs').select('*').order('created_at', {
        ascending: false
      }).limit(50);
      if (error) throw error;
      return data as WhatsAppZapiLogRow[] || [];
    },
    enabled: isAuthenticated
  });
  const {
    data: currentSetting,
    refetch: refetchSetting,
    isLoading: settingLoading
  } = useQuery<WhatsAppZapiSettingRow | null>({
    queryKey: ['superadmin-whatsapp-setting'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('whatsapp_zapi_settings').select('*').eq('is_active', true).order('created_at', {
        ascending: false
      }).limit(1).maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data as WhatsAppZapiSettingRow | null ?? null;
    },
    enabled: isAuthenticated
  });
  const {
    data: sales = [],
    isLoading: salesLoading
  } = useQuery<PurchaseRegistration[]>({
    queryKey: ['superadmin-whatsapp-sales'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('purchase_registrations').select('id, created_at, customer_name, customer_email, customer_phone, amount, status, plan_type, license_code, license_id, payment_method, licenses (is_active, expires_at)').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      return data as PurchaseRegistration[];
    },
    enabled: isAuthenticated
  });

  // --- State ---

  // Test Dialog State
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testInstanceName, setTestInstanceName] = useState('');
  const [testType, setTestType] = useState<'admin' | 'buyer'>('admin');
  const [selectedLog, setSelectedLog] = useState<WhatsAppZapiLogRow | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
      case 'budget_created':
      case 'budget_replaced':
      case 'budget_created_recovery':
      case 'reply_sent':
        return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 border-none"><CheckCircle className="w-3 h-3 mr-1"/> Sucesso</Badge>;
      case 'error':
      case 'parts_insert_failed':
      case 'ai_error':
      case 'critical_error':
      case 'ai_error_draft':
        return <Badge variant="destructive" className="border-none"><XCircle className="w-3 h-3 mr-1"/> Erro</Badge>;
      case 'ignored_not_budget':
      case 'blocked_group':
      case 'not_allowed_sender':
      case 'ignored_system_event':
      case 'ignored_event_type':
        return <Badge variant="secondary" className="text-muted-foreground border-border"><AlertTriangle className="w-3 h-3 mr-1"/> Ignorado</Badge>;
      case 'processing':
      case 'received_raw':
        return <Badge variant="outline" className="text-blue-500 border-blue-200 bg-blue-50"><RefreshCw className="w-3 h-3 mr-1 animate-spin"/> Processando</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // --- Mutations ---

  const sendTestMutation = useMutation({
    mutationFn: async () => {
      const template = testType === 'admin' ? purchaseTemplate : buyerTemplate;
      const dummyVars: Record<string, string> = {
        client_name: 'marilene',
        email: 'kukysolutions@gmail.com',
        phone: '(64) 99978-0952',
        amount: '0,20',
        plan_type: 'monthly',
        plan_name: 'Mensal',
        license_code: 'OLIVEIRA20000',
        mp_id: 'bill_abc123456',
        status: 'Aprovado',
        method: 'PIX',
        datetime_brt: '19/01/2025 as 15:00 (Brasília)',
        validity: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')
      };
      const processedMessage = template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_m, key) => dummyVars[key] ?? '');
      const {
        data,
        error
      } = await supabase.functions.invoke('whatsapp-zapi-orcamentos', {
        body: {
          event: 'send_admin_notification',
          // Reusing the manual send event
          target_phone: testPhone,
          message: processedMessage,
          // Para WAHA, este campo passa a representar a *sessão*
          instance_name: testInstanceName?.trim() || undefined
        }
      });
      if (error) throw error;
      if (data && !data.ok) {
        throw new Error(data.reason || data.error || 'Erro desconhecido ao enviar mensagem');
      }
    },
    onSuccess: () => {
      showSuccess({
        title: 'Mensagem enviada',
        description: `Teste enviado para ${testPhone}`
      });
      setIsTestDialogOpen(false);
    },
    onError: (error: any) => {
      console.error('Erro no envio de teste:', error);
      showError({
        title: 'Erro ao enviar',
        description: error.message || 'Falha no envio do teste'
      });
    }
  });
  const openTestDialog = (type: 'admin' | 'buyer') => {
    setTestType(type);
    setTestPhone('');
    setTestInstanceName(evolutionInstanceName || '');
    setIsTestDialogOpen(true);
  };
  const clearAllLogsMutation = useMutation({
    mutationFn: async () => {
      // Para deletar tudo no Supabase via client, precisamos de um filtro que englobe tudo
      const {
        error
      } = await supabase.from('whatsapp_zapi_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess({
        title: 'Logs limpos',
        description: 'Todos os registros de logs foram removidos com sucesso.'
      });
      refetchLogs();
    },
    onError: (error: any) => showError({
      title: 'Erro ao limpar logs',
      description: error.message
    })
  });
  type SavePayload = {
    ownerId: string;
    allowedNumbers: string;
    allowedGroups: string;
    evolutionInstanceName: string;
    adminNotificationPhone: string;
    purchaseTemplate: string;
    buyerTemplate: string;
  };
  const saveMutation = useMutation({
    mutationFn: async ({
      ownerId,
      allowedNumbers,
      allowedGroups,
      evolutionInstanceName,
      adminNotificationPhone,
      purchaseTemplate,
      buyerTemplate
    }: SavePayload) => {
      const {
        error: updateError
      } = await supabase.from('whatsapp_zapi_settings').update({
        is_active: false
      }).eq('is_active', true);
      if (updateError && updateError.code !== 'PGRST116') throw updateError;
      const {
        error: insertError
      } = await supabase.from('whatsapp_zapi_settings').insert({
        owner_id: ownerId,
        is_active: true,
        provider: 'evolution-go',
        allowed_numbers: allowedNumbers || null,
        allowed_groups: allowedGroups || null,
        waha_session: evolutionInstanceName?.trim() || null,
        // compat: mantemos o campo antigo preenchido para n e3o quebrar flows antigos
        evolution_instance_name: evolutionInstanceName?.trim() || null,
        admin_notification_phone: adminNotificationPhone || null,
        purchase_approved_template: purchaseTemplate || null,
        buyer_notification_template: buyerTemplate || null
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      showSuccess({
        title: 'Configuração salva',
        description: 'Configurações atualizadas com sucesso.'
      });
      refetchSetting();
    },
    onError: (error: any) => showError({
      title: 'Erro ao salvar',
      description: error.message
    })
  });

  const clearGroupsSelection = () => {
    if (!selectedOwnerId) {
      showError({
        title: 'Selecione um usuário',
        description: 'Escolha o usuário responsável antes de limpar os grupos.'
      });
      return;
    }

    // Otimista: limpa UI imediatamente e persiste no backend criando uma nova config ativa
    setAllowedGroups('');
    saveMutation.mutate({
      ownerId: selectedOwnerId,
      allowedNumbers,
      allowedGroups: '',
      evolutionInstanceName,
      adminNotificationPhone,
      purchaseTemplate,
      buyerTemplate
    });
  };

  // --- Effects ---

  useEffect(() => {
    if (currentSetting?.owner_id) setSelectedOwnerId(currentSetting.owner_id);
    setAllowedNumbers(currentSetting?.allowed_numbers ?? '');
    setAllowedGroups(currentSetting?.allowed_groups ?? '');
    setEvolutionInstanceName((currentSetting as any)?.waha_session ?? currentSetting?.evolution_instance_name ?? '');
    setAdminNotificationPhone(currentSetting?.admin_notification_phone ?? '');
    if (currentSetting?.purchase_approved_template) setPurchaseTemplate(currentSetting.purchase_approved_template);
    if (currentSetting?.buyer_notification_template) setBuyerTemplate(currentSetting.buyer_notification_template);
  }, [currentSetting]);

  // --- Memos ---

  const selectedUser = useMemo(() => users.find(u => u.id === selectedOwnerId) || null, [users, selectedOwnerId]);
  // Use the Supabase URL from the client configuration dynamically
  const webhookUrl = `${(supabase as any).supabaseUrl}/functions/v1/whatsapp-zapi-orcamentos`;
  const parsedGroups = useMemo(() => {
    return (groups || []).map((g: any) => {
      const rawId = g.id || g.groupId || g.jid || g.remoteJid || g.remoteJid?._serialized || '';
      const id = typeof rawId === 'string' ? rawId : typeof rawId?._serialized === 'string' ? rawId._serialized : '';
      const name = g.name || g.subject || 'Grupo sem nome';
      return {
        id,
        name
      };
    });
  }, [groups]);
  const selectedGroupIds = useMemo(() => {
    return (allowedGroups || '').split(',').map(g => g.trim()).filter(Boolean);
  }, [allowedGroups]);

  // --- Render Helpers ---

  const toggleGroup = (groupId: string, checked: boolean) => {
    setAllowedGroups(prev => {
      const current = (prev || '').split(',').map(g => g.trim()).filter(Boolean);
      let next: string[];
      if (checked) {
        next = Array.from(new Set([...current, groupId]));
      } else {
        next = current.filter(id => id !== groupId);
      }
      return next.join(',');
    });
  };
  return <div className="space-y-6">
      {/* Premium Header */}
      <div className="space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <MessageSquare className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl lg:text-3xl font-bold tracking-tight">WhatsApp & Notificações</h1>
        <p className="text-sm lg:text-base text-muted-foreground">
          Gerencie integrações, orçamentos e notificações automáticas via Evolution GO.
        </p>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-4">
          <TabsTrigger value="config" className="gap-2 text-xs sm:text-sm">
            <Settings className="h-4 w-4" /> Configuração
          </TabsTrigger>
          <TabsTrigger value="conversas" className="gap-2 text-xs sm:text-sm">
            <MessageCircle className="h-4 w-4" /> Conversas
          </TabsTrigger>
          <TabsTrigger value="sales" className="gap-2 text-xs sm:text-sm">
            <ShoppingBag className="h-4 w-4" /> Vendas
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 text-xs sm:text-sm">
            <MessageSquare className="h-4 w-4" /> Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Configuração Geral</CardTitle>
              <CardDescription>Configure o comportamento da IA e as notificações.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Usuário Responsável */}
              <div className="space-y-2">
                <Label>Usuário responsável pelos orçamentos</Label>
                <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId} disabled={usersLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Orçamentos gerados pela IA serão atribuídos a este usuário.</p>
              </div>

              {/* Instância Evolution GO */}
              <div className="space-y-2 border p-3 rounded-md bg-muted/20">
                <Label>Nome da Instância (Evolution GO)</Label>
                <Input value={evolutionInstanceName} onChange={e => setEvolutionInstanceName(e.target.value)} placeholder="Ex: onedrip_main" />
                <p className="text-[11px] text-muted-foreground">Esta instância será usada para envio de mensagens e listagem de grupos via Evolution GO.
                  <br />Configure sua Evolution API URL e chave em /whats ou na tabela evolution_config.</p>
              </div>
              {/* Grupos Permitidos */}
              <div className="space-y-3 rounded-xl border bg-card/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      Grupos do WhatsApp (Origem dos Orçamentos)
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Selecione os grupos onde a IA deve atuar.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAllowedGroups('*')}
                      disabled={allowedGroups === '*'}
                    >
                      Liberar Todos
                    </Button>
                    <Badge variant="secondary" className="shrink-0 text-[11px]">
                      {allowedGroups === '*' ? 'Todos Liberados' : `${selectedGroupIds.length} selecionado(s)`}
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearGroupsSelection}
                      disabled={saveMutation.isPending || (selectedGroupIds.length === 0 && allowedGroups !== '*')}
                    >
                      Limpar seleção
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-44 rounded-lg border bg-background/40">
                  <div className="p-2">
                    {groupsLoading && <p className="px-2 py-3 text-xs text-muted-foreground">Carregando grupos...</p>}

                    {!groupsLoading && parsedGroups.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">
                        Nenhum grupo encontrado no WAHA.
                      </p>}

                     {!groupsLoading && parsedGroups.map(group => {
                     const isChecked = selectedGroupIds.includes(group.id);
                     return <label
                             key={group.id}
                             className={
                               "group flex items-center gap-3 rounded-md px-2 py-2 transition-all cursor-pointer select-none pointer-events-auto border " +
                               (isChecked
                                 ? "bg-primary/10 border-primary/20 shadow-soft ring-1 ring-primary/20"
                                 : "bg-transparent border-transparent hover:bg-muted/30 hover:border-border/40")
                             }
                             title={`${group.name}\n${group.id}`}
                             onClick={e => e.stopPropagation()}
                           >
                             <input
                               type="checkbox"
                               className="h-4 w-4"
                               checked={isChecked}
                               onChange={e => toggleGroup(group.id, e.target.checked)}
                             />

                             <div className="flex-1 min-w-0">
                               <div className="text-xs leading-snug truncate">
                                 {group.name}
                               </div>
                               <div className="text-[10px] text-muted-foreground font-mono truncate">
                                 {group.id}
                               </div>
                             </div>
                           </label>;
                   })}
                  </div>
                </ScrollArea>
              </div>

              {/* Notificações Admin */}
              <div className="space-y-4 border p-3 rounded-md bg-muted/20">
                <h3 className="font-medium text-sm flex items-center gap-2">
                   Notificações para Administradores
                </h3>
                <div className="space-y-2">
                  <Label className="text-xs">Número do Admin (ex: 5511999999999)</Label>
                  <Input value={adminNotificationPhone} onChange={e => setAdminNotificationPhone(e.target.value)} placeholder="5511999999999" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Template (Admin)</Label>
                  <div className="flex gap-2">
                    <Textarea value={purchaseTemplate} onChange={e => setPurchaseTemplate(e.target.value)} className="h-20 flex-1" placeholder="Mensagem para o admin..." />
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="icon" onClick={() => openTestDialog('admin')} title="Enviar teste">
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setPurchaseTemplate(`*🚀 Nova Venda Aprovada!*\n\n` + `👤 *Cliente:* {{client_name}}\n` + `📧 *Email:* {{email}}\n` + `📱 *Tel:* {{phone}}\n` + `💰 *Valor:* R$ {{amount}}\n` + `📦 *Plano:* {{plan_type}}\n` + `🎫 *Licença:* \`{{license_code}}\`\n\n` + `*ID Abacate Pay:* \`{{mp_id}}\`\n` + `*Status:* {{status}}\n` + `*Método:* {{method}}\n\n` + `{{datetime_brt}}\n\n` + `O sistema processou tudo automaticamente. ✅`)} title="Aplicar modelo sugerido">
                        Modelo
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Vars: {'{{client_name}}'}, {'{{email}}'}, {'{{phone}}'}, {'{{amount}}'}, {'{{plan_type}}'}, {'{{license_code}}'}, {'{{mp_id}}'}, {'{{status}}'}, {'{{method}}'}, {'{{datetime_brt}}'}
                  </p>
                </div>
              </div>

              {/* Notificações Comprador */}
              <div className="space-y-4 border p-3 rounded-md bg-muted/20">
                <h3 className="font-medium text-sm flex items-center gap-2">
                   Notificações para Compradores
                </h3>
                <div className="space-y-2">
                  <Label className="text-xs">Template (Comprador)</Label>
                  <div className="flex gap-2">
                    <Textarea value={buyerTemplate} onChange={e => setBuyerTemplate(e.target.value)} className="h-20 flex-1" placeholder="Mensagem para o cliente..." />
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="icon" onClick={() => openTestDialog('buyer')} title="Enviar teste">
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setBuyerTemplate(`*✅ Pagamento Confirmado!*\n\n` + `Olá *{{client_name}}*, seu pagamento foi aprovado com sucesso!\n\n` + `*Detalhes da Compra:*\n` + `📦 *Plano:* {{plan_name}}\n` + `💰 *Valor:* R$ {{amount}}\n` + `🎫 *Licença:* \`{{license_code}}\`\n` + `📅 *Validade:* {{validity}}\n\n` + `{{datetime_brt}}\n\n` + `Obrigado por escolher nosso sistema! 🐧`)} title="Aplicar modelo sugerido">
                        Modelo
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Esta mensagem será enviada automaticamente para o número do cliente após a aprovação da compra.
                    <br />Vars: {'{{client_name}}'}, {'{{amount}}'}, {'{{plan_name}}'}, {'{{license_code}}'}, {'{{validity}}'}, {'{{datetime_brt}}'}
                  </p>
                </div>
              </div>

              <Button onClick={() => saveMutation.mutate({
              ownerId: selectedOwnerId,
              allowedNumbers,
              allowedGroups,
              evolutionInstanceName,
              adminNotificationPhone,
              purchaseTemplate,
              buyerTemplate
            })} disabled={saveMutation.isPending || !selectedOwnerId} className="w-full sm:w-auto">
                {saveMutation.isPending ? 'Salvando...' : 'Salvar Todas as Configurações'}
              </Button>

              {/* Webhook Info */}
              <div className="pt-4 border-t space-y-2">
                <Label>Webhook URL (WAHA)</Label>
                <div className="p-2 bg-muted rounded text-[10px] font-mono break-all">{webhookUrl}</div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversas" className="mt-4">
          <Card className="h-[700px] flex flex-col overflow-hidden border-none shadow-xl bg-[#f0f2f5] dark:bg-[#111b21]">
            <CardContent className="p-0 flex-1 flex overflow-hidden">
              {/* Sidebar de Conversas (Estilo WhatsApp) */}
              <div className="w-[350px] flex flex-col border-r border-border/40 bg-white dark:bg-[#111b21]">
                {/* Header Sidebar */}
                <div className="p-3 bg-[#f0f2f5] dark:bg-[#202c33] flex justify-between items-center border-b border-border/10">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-[#54656f] dark:text-[#aebac1]" onClick={() => refetchChats()}>
                      <RefreshCw className={`h-5 w-5 ${chatsLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-[#54656f] dark:text-[#aebac1]">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Busca Sidebar */}
                <div className="p-2 border-b border-border/10">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      value={chatSearch}
                      onChange={(e) => setChatSearch(e.target.value)}
                      placeholder="Pesquisar ou começar uma nova conversa" 
                      className="pl-10 h-9 bg-[#f0f2f5] dark:bg-[#202c33] border-none focus-visible:ring-0 text-sm rounded-lg"
                    />
                  </div>
                </div>

                {/* Lista de Conversas */}
                <ScrollArea className="flex-1">
                  <div className="divide-y divide-border/5">
                    {chatsLoading && (
                      <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
                        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-xs text-muted-foreground">Sincronizando conversas...</p>
                      </div>
                    )}
                    {!chatsLoading && chatsList.length === 0 && (
                      <div className="p-8 text-center text-xs text-muted-foreground">Nenhuma conversa encontrada.</div>
                    )}
                    {chatsList
                      .filter(chat => {
                        const idStr = getJidString(chat.id).toLowerCase();
                        const nameStr = (chat.name || '').toLowerCase();
                        const search = chatSearch.toLowerCase();
                        return idStr.includes(search) || nameStr.includes(search);
                      })
                      .map((chat) => {
                        const chatIdStr = getJidString(chat.id);
                        const isSelected = selectedChatId === chatIdStr;
                        return (
                          <div
                            key={chatIdStr}
                            onClick={() => setSelectedChatId(chatIdStr)}
                            className={`flex items-center gap-3 p-3 cursor-pointer transition-colors relative ${
                              isSelected 
                                ? 'bg-[#f0f2f5] dark:bg-[#2a3942]' 
                                : 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'
                            }`}
                          >
                            <div className="h-12 w-12 rounded-full bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden border border-border/10">
                              {chat.image ? (
                                <img src={chat.image} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <User className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 border-b border-border/5 py-1">
                              <div className="flex justify-between items-baseline mb-1">
                                <h3 className="font-medium text-sm text-[#111b21] dark:text-[#e9edef] truncate">
                                  {chat.name || chatIdStr}
                                </h3>
                                <span className="text-[10px] text-[#667781] dark:text-[#8696a0]">
                                  {chat.timestamp ? new Date(chat.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </div>
                              <p className="text-xs text-[#667781] dark:text-[#8696a0] truncate">
                                {chatIdStr}
                              </p>
                            </div>
                            {isSelected && <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary" />}
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              </div>

              {/* Janela de Chat (Estilo WhatsApp) */}
              <div className="flex-1 flex flex-col relative bg-[#efeae2] dark:bg-[#0b141a]">
                {/* Background Pattern (Simulado) */}
                <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[url('https://wweb.dev/assets/whatsapp-chat-bg.png')] bg-repeat" />

                {!selectedChatId ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-12 relative z-10">
                    <div className="h-24 w-24 rounded-full bg-muted/20 flex items-center justify-center mb-6">
                      <MessageCircle className="h-12 w-12 text-muted-foreground opacity-30" />
                    </div>
                    <h2 className="text-xl font-light text-[#41525d] dark:text-[#e9edef] mb-2">WhatsApp Web</h2>
                    <p className="text-sm text-[#667781] dark:text-[#8696a0] max-w-md">
                      Envie e receba mensagens sem precisar manter seu celular conectado. <br/>
                      Selecione uma conversa para começar a interagir.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Header Chat */}
                    <div className="p-3 bg-[#f0f2f5] dark:bg-[#202c33] flex justify-between items-center border-b border-border/10 relative z-10 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-[#111b21] dark:text-[#e9edef]">
                            {chatsList.find(c => getJidString(c.id) === selectedChatId)?.name || selectedChatId}
                          </span>
                          <span className="text-[10px] text-[#667781] dark:text-[#8696a0]">
                            online
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-[#54656f] dark:text-[#aebac1]" onClick={() => refetchMessages()}>
                          <RefreshCw className={`h-4 w-4 ${messagesLoading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-[#54656f] dark:text-[#aebac1]">
                          <Search className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-[#54656f] dark:text-[#aebac1]">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Área de Mensagens */}
                    <ScrollArea className="flex-1 p-4 relative z-10">
                      <div className="space-y-2 flex flex-col">
                        {messagesLoading && chatMessages.length === 0 && (
                          <div className="flex justify-center py-12">
                            <Badge variant="secondary" className="bg-white/80 dark:bg-[#202c33] text-[10px] font-normal py-1 px-3">
                              Carregando histórico...
                            </Badge>
                          </div>
                        )}
                        
                        {/* Divisor de Data (Exemplo) */}
                        <div className="flex justify-center my-4">
                          <Badge variant="secondary" className="bg-[#e1f3fb] dark:bg-[#182229] text-[#54656f] dark:text-[#8696a0] text-[10px] font-normal uppercase py-1 px-3 rounded-md shadow-sm border-none">
                            HOJE
                          </Badge>
                        </div>

                        {chatMessages.map((msg: any) => {
                          const isMe = msg.fromMe;
                          const msgId = typeof msg.id === 'object' ? msg.id._serialized : msg.id;
                          return (
                            <div key={msgId} className={`flex w-full mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className={`relative max-w-[85%] px-2.5 py-1.5 rounded-lg shadow-sm text-[13px] ${
                                isMe 
                                  ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none' 
                                  : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none'
                              }`}>
                                {/* Pequeno triângulo da bolha (opcional para realismo) */}
                                <div className={`absolute top-0 w-2 h-2 ${
                                  isMe 
                                    ? '-right-1 bg-[#d9fdd3] dark:bg-[#005c4b] [clip-path:polygon(0_0,100%_0,0_100%)]' 
                                    : '-left-1 bg-white dark:bg-[#202c33] [clip-path:polygon(0_0,100%_0,100%_100%)]'
                                }`} />
                                
                                <div className="break-words leading-relaxed whitespace-pre-wrap">
                                  {msg.body}
                                </div>
                                <div className="flex items-center justify-end gap-1 mt-0.5">
                                  <span className={`text-[9px] opacity-60`}>
                                    {new Date(msg.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {isMe && (
                                    <svg viewBox="0 0 16 11" width="14" height="10" className="fill-primary">
                                      <path d="M15.01 1.91L14.1 1l-5.99 5.99-2.73-2.73-.9-.9-1.82 1.82 4.54 4.54 8.81-8.81zM8.11 8.81l8.81-8.81L16 1l-8.81 8.81-.89-.89zm-1.81-1.81l1.82-1.82-4.54-4.54L0 3.37l1.82 1.82 4.54 4.54z"></path>
                                    </svg>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>

                    {/* Footer Chat / Input */}
                    <div className="p-2 bg-[#f0f2f5] dark:bg-[#202c33] flex items-center gap-2 relative z-10">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-[#54656f] dark:text-[#aebac1]">
                          <Smile className="h-6 w-6" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-[#54656f] dark:text-[#aebac1]">
                          <Paperclip className="h-6 w-6" />
                        </Button>
                      </div>
                      
                      <div className="flex-1">
                        <Input
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          placeholder="Digite uma mensagem"
                          className="h-10 bg-white dark:bg-[#2a3942] border-none focus-visible:ring-0 text-sm rounded-lg"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && chatMessage.trim()) {
                              sendMessageMutation.mutate({ chatId: selectedChatId, text: chatMessage });
                            }
                          }}
                        />
                      </div>

                      {chatMessage.trim() ? (
                        <Button
                          size="icon"
                          className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 flex-shrink-0"
                          onClick={() => sendMessageMutation.mutate({ chatId: selectedChatId, text: chatMessage })}
                          disabled={sendMessageMutation.isPending}
                        >
                          <Send className="h-5 w-5 text-white" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-[#54656f] dark:text-[#aebac1]">
                          <Mic className="h-6 w-6" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Vendas</CardTitle>
              <CardDescription>Histórico completo de vendas registradas.</CardDescription>
            </CardHeader>
            <CardContent>
              {salesLoading ? (
                <p className="text-sm">Carregando...</p>
              ) : isMobile ? (
                <div className="space-y-3">
                  {sales.map((sale) => {
                    const createdAt = new Date(sale.created_at);
                    const expiresAt = sale.licenses?.expires_at ? new Date(sale.licenses.expires_at) : null;
                    const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;
                    const licenseStatus =
                      !sale.license_code ? '—' : sale.licenses?.is_active ? (isExpired ? 'expired' : 'active') : 'inactive';

                    return (
                      <Card key={sale.id} className="border-border/60 bg-background/40">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{sale.customer_name}</div>
                              <div className="text-[11px] text-muted-foreground truncate">{sale.customer_email}</div>
                              <div className="text-[11px] text-muted-foreground font-mono truncate">{sale.customer_phone}</div>
                            </div>
                            <div className="text-right text-xs">
                              <div>{createdAt.toLocaleDateString('pt-BR')}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 grid gap-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Plano</span>
                              <span>{sale.plan_type || '—'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Valor</span>
                              <span>{sale.amount != null ? `R$ ${sale.amount.toFixed(2)}` : '-'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Pagamento</span>
                              <div className="flex items-center gap-2">
                                <Badge variant={sale.status === 'approved' ? 'default' : 'secondary'} className="text-[10px]">
                                  {sale.status || '—'}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">{sale.payment_method || '—'}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Licença</span>
                              <span className="font-mono text-[11px]">{sale.license_code || '—'}</span>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-muted-foreground">Status</span>
                              <div className="text-right">
                                <Badge variant={licenseStatus === 'active' ? 'default' : 'secondary'} className="text-[10px] w-fit ml-auto">
                                  {licenseStatus}
                                </Badge>
                                {expiresAt ? (
                                  <div className="text-[10px] text-muted-foreground mt-1">expira: {expiresAt.toLocaleDateString('pt-BR')}</div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {sales.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">Nenhuma venda encontrada.</div>
                  )}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Licença</TableHead>
                        <TableHead>Status da Licença</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map(sale => {
                        const createdAt = new Date(sale.created_at);
                        const expiresAt = sale.licenses?.expires_at ? new Date(sale.licenses.expires_at) : null;
                        const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;
                        const licenseStatus = !sale.license_code ? '—' : sale.licenses?.is_active ? isExpired ? 'expired' : 'active' : 'inactive';
                        return <TableRow key={sale.id}>
                            <TableCell className="text-xs">
                              <div>{createdAt.toLocaleDateString('pt-BR')}</div>
                              <div className="text-[10px] text-muted-foreground">{createdAt.toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</div>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="font-medium">{sale.customer_name}</div>
                              <div className="text-muted-foreground text-[10px]">{sale.customer_email}</div>
                              <div className="text-muted-foreground text-[10px] font-mono">{sale.customer_phone}</div>
                            </TableCell>
                            <TableCell className="text-xs">{sale.plan_type}</TableCell>
                            <TableCell className="text-xs">
                              {sale.amount != null ? `R$ ${sale.amount.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="flex flex-col gap-1">
                                <Badge variant={sale.status === 'approved' ? 'default' : 'secondary'} className="text-[10px] w-fit">
                                  {sale.status || '—'}
                                </Badge>
                                <div className="text-[10px] text-muted-foreground">{sale.payment_method || '—'}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {sale.license_code ? `\`${sale.license_code}\`` : '—'}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant={licenseStatus === 'active' ? 'default' : 'secondary'} className="text-[10px] w-fit">
                                  {licenseStatus}
                                </Badge>
                                {expiresAt && <div className="text-[10px] text-muted-foreground">
                                    expira: {expiresAt.toLocaleDateString('pt-BR')}
                                  </div>}
                              </div>
                            </TableCell>
                          </TableRow>;
                      })}
                      {sales.length === 0 && <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">Nenhuma venda encontrada.</TableCell>
                        </TableRow>}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="logs" className="mt-4">
          <Card>
             <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Logs de Interação</CardTitle>
                <CardDescription>Histórico de mensagens processadas pela IA.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => refetchLogs()}
                  disabled={logsLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${logsLoading ? 'animate-spin' : ''}`} />
                  Recarregar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                  onClick={() => {
                    if (window.confirm('Tem certeza que deseja apagar TODOS os logs do banco de dados? Esta ação não pode ser desfeita.')) {
                      clearAllLogsMutation.mutate();
                    }
                  }}
                  disabled={clearAllLogsMutation.isPending}
                >
                  {clearAllLogsMutation.isPending ? 'Limpando...' : 'Limpar Tudo'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Data</TableHead>
                      <TableHead className="w-[180px]">Origem</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="min-w-[300px]">Mensagem / Erro</TableHead>
                      <TableHead className="w-[150px]">IA (Resumo)</TableHead>
                      <TableHead className="text-right w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsLoading && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <div className="flex justify-center items-center gap-2 text-muted-foreground">
                            <RefreshCw className="h-4 w-4 animate-spin" /> Carregando logs...
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    
                    {!logsLoading && logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Nenhum log encontrado.
                        </TableCell>
                      </TableRow>
                    )}

                    {!logsLoading && logs.map(log => {
                      const ai: any = log.ai_json || {};
                      const hasError = !!log.error_message;
                      const date = new Date(log.created_at);
                      
                      return (
                        <TableRow key={log.id} className={hasError ? "bg-red-50/50 dark:bg-red-900/10" : ""}>
                          <TableCell className="text-xs text-muted-foreground">
                            <div className="font-medium text-foreground">{date.toLocaleDateString('pt-BR')}</div>
                            <div>{date.toLocaleTimeString('pt-BR')}</div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 font-medium text-xs">
                                {log.is_group ? <UsersIcon className="h-3 w-3 text-blue-500" /> : <UserIcon className="h-3 w-3 text-green-500" />}
                                {log.from_phone || 'Desconhecido'}
                              </div>
                              {log.chat_id && (
                                <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px]" title={log.chat_id}>
                                  {log.chat_id.replace('@g.us', '').replace('@s.whatsapp.net', '')}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            {getStatusBadge(log.status)}
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex flex-col gap-2 max-w-[400px]">
                              {log.raw_message && (
                                <div className="text-xs line-clamp-2 font-mono bg-muted/50 p-1 rounded text-muted-foreground" title={log.raw_message}>
                                  {log.raw_message}
                                </div>
                              )}
                              {hasError && (
                                <div className="text-xs text-red-600 dark:text-red-400 font-medium flex items-start gap-1">
                                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                  <span className="line-clamp-2" title={log.error_message!}>{log.error_message}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            {ai.service_type || ai.device ? (
                              <div className="text-xs">
                                <div className="font-medium text-primary">{ai.service_type}</div>
                                <div className="text-muted-foreground">{ai.device}</div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => setSelectedLog(log)}
                              title="Ver Detalhes JSON"
                            >
                              <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Mensagem de Teste</DialogTitle>
            <DialogDescription>
              A mensagem será enviada usando o template configurado atualmente (mesmo que não salvo).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Número de destino</Label>
              <Input placeholder="Ex: 5511999999999" value={testPhone} onChange={e => setTestPhone(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Digite o número com DDD e DDI (ex: 5511...) para receber o teste.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Sessão (WAHA)</Label>
              <Input placeholder='Ex: default' value={testInstanceName} onChange={e => setTestInstanceName(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Se vazio, será usada a sessão global salva em "Configuração".
              </p>
            </div>

            <div className="rounded-md bg-muted p-3 text-xs font-mono whitespace-pre-wrap">
              {testType === 'admin' ? purchaseTemplate : buyerTemplate}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => sendTestMutation.mutate()} disabled={sendTestMutation.isPending || !testPhone}>
              {sendTestMutation.isPending ? 'Enviando...' : 'Enviar Teste'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
            <DialogDescription>
              ID: {selectedLog?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div>{getStatusBadge(selectedLog.status)}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Data</Label>
                  <div>{new Date(selectedLog.created_at).toLocaleString('pt-BR')}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Origem</Label>
                  <div className="font-mono">{selectedLog.from_phone}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Chat ID</Label>
                  <div className="font-mono text-xs">{selectedLog.chat_id}</div>
                </div>
              </div>

              {selectedLog.error_message && (
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800">
                  <Label className="text-xs text-red-600 dark:text-red-400 font-bold mb-1 block">Erro</Label>
                  <p className="text-red-700 dark:text-red-300 font-mono text-xs whitespace-pre-wrap">{selectedLog.error_message}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Mensagem Original</Label>
                <div className="bg-muted p-3 rounded-md font-mono text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {selectedLog.raw_message}
                </div>
              </div>

              {selectedLog.ai_json && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    Dados Extraídos pela IA
                  </Label>
                  <div className="bg-slate-950 text-slate-50 p-4 rounded-md font-mono text-xs overflow-x-auto">
                    <pre>{JSON.stringify(selectedLog.ai_json, null, 2)}</pre>
                  </div>
                </div>
              )}
              
              {selectedLog.budget_id && (
                 <div className="pt-4 border-t flex justify-end">
                   <Button variant="outline" className="gap-2" asChild>
                     <a href={`/admin/budgets?id=${selectedLog.budget_id}`} target="_blank" rel="noopener noreferrer">
                       <ExternalLink className="h-4 w-4" />
                       Ver Orçamento Criado
                     </a>
                   </Button>
                 </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>;
}