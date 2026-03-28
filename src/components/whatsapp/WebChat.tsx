import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { Chat, Message } from './types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Bot, LogOut, ArrowLeft, Plus, RefreshCw, Search, User } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface WebChatProps {
    instanceName: string;
    onBack: () => void;
}

export function WebChat({ instanceName, onBack }: WebChatProps) {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    
    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageLimit, setMessageLimit] = useState(50);
    const [activeTab, setActiveTab] = useState<'contacts' | 'groups'>('contacts');
    const [loadingChats, setLoadingChats] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const activeChatIdRef = useRef<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');

    const filteredChats = chats.filter(chat => {
        const isGroup = chat.id.includes('@g.us');
        const matchesTab = activeTab === 'groups' ? isGroup : !isGroup;
        if (!matchesTab) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return chat.name.toLowerCase().includes(q) || chat.id.split('@')[0].includes(q);
    });

    useEffect(() => {
        activeChatIdRef.current = activeChatId;
    }, [activeChatId]);

    // NOTE: sem persistência no banco, usamos apenas Broadcast/Webhook + fallback de polling.

    const [presenceMap, setPresenceMap] = useState<Record<string, string>>({});
    const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
    const webhookSetupForInstanceRef = useRef<string | null>(null);

    // ... (rest of the code)

    // Initial Load
    useEffect(() => {
        loadChats();
        checkAiStatus();

        // Se não temos usuário/instância ainda, não configuramos canais.
        if (!user || !instanceName) return;

        // Evita múltiplas tentativas duplicadas (React StrictMode + remounts)
        if (webhookSetupForInstanceRef.current === instanceName) return;
        webhookSetupForInstanceRef.current = instanceName;

        let retryCount = 0;
        const maxRetries = 3;

         const setupWebhook = async () => {
            try {
                console.log("[WebChat] Ensuring webhook configuration...");
                 const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
                    body: { action: 'set_webhook', payload: { instanceName } }
                });

                if (error) throw error;
                 // IMPORTANT: whatsapp-proxy returns 200 even when VPS rejects; check payload.
                 if (data && (data as any).success === false) {
                     throw new Error((data as any).details || (data as any).error || 'VPS rejeitou o webhook');
                 }
                console.log("[WebChat] Webhook configured successfully");
              } catch (err) {
                 // Webhook failure should not block the CRM.
                 // Many VPS setups (proxy/CDN) can temporarily return non-JSON 502.
                 console.warn("[WebChat] Webhook setup failed (non-blocking):", err);
                  const msg = (err as any)?.message ? String((err as any).message) : '';
                  // Se a VPS retorna 404/Not Found nos endpoints de webhook, retentar não ajuda.
                  const isNotFound = msg.toLowerCase().includes('not found') || msg.includes('404');

                  if (!isNotFound && retryCount < maxRetries) {
                      retryCount++;
                      setTimeout(setupWebhook, 2000 * retryCount); // Backoff: 2s, 4s, 6s
                  } else {
                     const msg = (err as any)?.message ? String((err as any).message) : '';
                      const suffix = msg.includes('502') ? ' (VPS retornou 502)' : isNotFound ? ' (endpoint não encontrado na VPS)' : '';
                      showError({ title: 'Webhook', description: `Não foi possível configurar o webhook automaticamente${suffix}. Você ainda pode usar o atendimento (polling).` });
                 }
             }
        };

        setupWebhook();

        // Realtime Subscription unificado
        setRealtimeStatus('connecting');
        console.log("[WebChat] Subscribing to channel:", `instance-${instanceName}`);
        const channel = supabase.channel(`instance-${instanceName}`)
            .on('broadcast', { event: 'whatsapp_event' }, (payload) => {
                console.log("[WebChat] EVENT [whatsapp_event]:", payload);
                handleRealtimeEvent(payload.payload);
            })
            .on('broadcast', { event: 'new_message' }, (payload) => {
                console.log("[WebChat] EVENT [new_message]:", payload);
                handleNewMessage(payload.payload);
            })
            .on('broadcast', { event: 'whatsapp_presence' }, (payload) => {
                console.log("[WebChat] EVENT [presence]:", payload);
                handlePresenceEvent(payload.payload);
            })
            .on('broadcast', { event: 'test_webhook' }, (payload) => {
                console.log("[WebChat] TEST EVENT RECEIVED! Webhook path is working:", payload);
                showSuccess({ title: 'Teste de Webhook OK!', description: 'O sinal chegou ao seu navegador com sucesso.' });
            })
            .subscribe((status) => {
                console.log("[WebChat] Channel Subscription Status:", status);
                if (status === 'SUBSCRIBED') {
                    setRealtimeStatus('connected');
                    console.log("[WebChat] Realtime channel is READY and LISTENING.");
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    console.error("[WebChat] Realtime channel FAILED:", status);
                    setRealtimeStatus('disconnected');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, instanceName]);

    const handlePresenceEvent = (payload: any) => {
        // payload esperado (varia por provider): { jid, presence } ou { id, presences }
        const jidRaw: unknown = payload?.jid || payload?.id || payload?.remoteJid;
        const presenceRaw = payload?.presence || payload?.lastKnownPresence || payload?.type || payload?.status;

        if (typeof jidRaw !== 'string' || !jidRaw) return;
        const jid = jidRaw;

        const jidKey = jid.includes('@') ? jid.split('@')[0] : jid;
        const normalized: string | undefined =
            typeof presenceRaw === 'string'
                ? presenceRaw
                : (presenceRaw?.lastKnownPresence || presenceRaw?.type || presenceRaw?.status);

        if (!normalized) return;

        // TS safety: garantir que a key é string
        const key = String(jidKey);

        setPresenceMap((prev) => ({
            ...prev,
            [key]: normalized,
        }));
    };

    const handleRealtimeEvent = (payload: any) => {
        console.log("[WebChat] Payload raw:", payload);
        const event = payload?.event;
        const data = payload?.data;

        if (event === "MESSAGES_UPSERT" || event === "messages.upsert") {
            const message = payload?.message ?? data?.message ?? data ?? payload;
            console.log("[WebChat] Processing message:", message);
            handleNewMessage(message);
        } else if (
            event === "CHATS_UPSERT" ||
            event === "CHATS_UPDATE" ||
            event === "CONTACTS_UPSERT" ||
            event === "CONTACTS_UPDATE"
        ) {
            console.log("[WebChat] Contact or Chat updated, refreshing list...");
            loadChats();
        } else if (event === 'PRESENCE_UPDATE' || event === 'presence.update' || event === 'whatsapp_presence') {
            handlePresenceEvent(data ?? payload);
        }
    };

    useEffect(() => {
        if (activeChatId) {
            setMessageLimit(50);
            loadMessages(activeChatId);
        } else {
            setMessages([]);
        }
    }, [activeChatId]);

    // Sound Effect
    const playNotificationSound = () => {
        try {
            const sound = new Audio("https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3");
            sound.volume = 0.5;
            sound.play().catch(e => console.log("Audio play blocked", e));
        } catch (e) {
            console.error("Audio error", e);
        }
    };

    const handleNewMessage = (msgData: any) => {
        // Se for array, processa cada mensagem individualmente
        if (Array.isArray(msgData)) {
            msgData.forEach(m => handleNewMessage(m));
            return;
        }

        const candidate =
            msgData?.key ? msgData :
            msgData?.message?.key ? msgData.message :
            msgData?.data?.key ? msgData.data :
            msgData?.data?.message?.key ? msgData.data.message :
            msgData;

        if (!candidate?.key) {
            console.log("[WebChat] Realtime message ignored (no key)", msgData);
            return;
        }

        const newMessage = candidate;
        // Normalizar JID para comparação (remover sufixo @s.whatsapp.net ou @g.us)
        const normalizeJid = (j: string) => j ? j.split('@')[0] : '';
        
        const remoteJid = newMessage.key.remoteJid;
        const currentChatId = activeChatIdRef.current; // Usar ref para garantir valor atual

        console.log(`[WebChat] New Msg: ${normalizeJid(remoteJid)} vs Active: ${normalizeJid(currentChatId || '')}`);

        if (!newMessage.key.fromMe) {
            playNotificationSound();
        }

        // Atualiza a lista de chats (barra lateral) sempre
        setChats(prev => {
            const existing = prev.find(c => normalizeJid(c.id) === normalizeJid(remoteJid));
            const content = newMessage.message?.conversation || 
                            newMessage.message?.extendedTextMessage?.text || 
                            newMessage.message?.imageMessage?.caption ||
                            (newMessage.message?.imageMessage ? "📷 Imagem" : "Nova mensagem");
            
            const updatedChat: Chat = existing ? {
                ...existing,
                lastMessage: content,
                lastMessageDate: Number(newMessage.messageTimestamp) || Math.floor(Date.now() / 1000),
                unreadCount: (currentChatId && normalizeJid(currentChatId) === normalizeJid(remoteJid)) ? 0 : (existing.unreadCount || 0) + 1
            } : {
                id: remoteJid,
                name: newMessage.pushName || remoteJid.split('@')[0],
                lastMessage: content,
                lastMessageDate: Number(newMessage.messageTimestamp) || Math.floor(Date.now() / 1000),
                unreadCount: 1,
                image: ""
            };

            const others = prev.filter(c => normalizeJid(c.id) !== normalizeJid(remoteJid));
            return [updatedChat, ...others];
        });

        // Se a mensagem for para o chat aberto, atualiza as mensagens
        if (currentChatId && normalizeJid(currentChatId) === normalizeJid(remoteJid)) {
            // 1. Atualização Otimista (Local)
            setMessages(prev => {
                // EVITAR DUPLICATAS: Verifica se o ID já existe na lista
                if (prev.find(m => m.key.id === newMessage.key.id)) {
                    console.log("[WebChat] Duplicate message ignored:", newMessage.key.id);
                    return prev;
                }
                
                // Helper para normalizar timestamp
                const getTs = (msg: any) => {
                    let t = Number(msg.messageTimestamp) || 0;
                    if (t > 2000000000) t = Math.floor(t / 1000);
                    return t;
                };

                // IMPORTANTE: Adiciona a nova mensagem e REORDENA
                const updated = [...prev, newMessage];
                updated.sort((a, b) => getTs(a) - getTs(b));
                
                // Mantém as últimas N (paginado)
                return updated.slice(-messageLimit);
            });

            // Feedback Visual imediato
            if (!newMessage.key.fromMe) {
                showSuccess({ title: 'Nova mensagem!', description: newMessage.pushName || 'Recebida agora' });
            }
        }
    };

    const loadChats = async () => {
        setLoadingChats(true);
        try {
            console.log("[WebChat] Loading chats for:", instanceName);
            const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
                body: { action: 'get_chats', payload: { instanceName } }
            });
            
            if (error) {
                console.error("[WebChat] Function error:", error);
                showError({ title: 'Erro na API', description: 'Não foi possível buscar as conversas. Verifique o deploy da função.' });
                return;
            }
            
            // Evolution v2 pode retornar array direto ou dentro de chats/data/instances
            const rawData = data?.chats || data?.data || data?.instances || data;
            const rawArray = Array.isArray(rawData) ? rawData : [];
            
            console.log("[WebChat] Raw array length:", rawArray.length);

            const formattedChats = rawArray.map((c: any) => {
                // Tenta extrair JID de qualquer lugar
                const jid = c.remoteJid || c.id || c.jid || c.key?.remoteJid || c.instance?.instanceId;
                
                // Tenta extrair nome de qualquer lugar (Ordem de prioridade: Nome real > Nome verificado > Nome de push)
                let name = c.name || c.verifiedName || c.pushName || c.pushname || c.contact?.name || c.instance?.instanceName;
                
                if (!name && jid) {
                    const cleanJid = jid.split('@')[0];
                    if (cleanJid.includes('-')) {
                        name = "Grupo do WhatsApp";
                    } else {
                        // Formatar número se não tiver nome
                        name = cleanJid.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4');
                    }
                }

                // Extração recursiva de mensagem para v2
                const getMsgContent = (m: any): string => {
                    if (!m) return "...";
                    if (typeof m === 'string') return m;
                    const msg = m.message || m;
                    // Procura em várias propriedades comuns do objeto de mensagem do Baileys
                    return msg.conversation || 
                           msg.extendedTextMessage?.text || 
                           msg.text ||
                           msg.imageMessage?.caption || 
                           msg.videoMessage?.caption || 
                           (msg.imageMessage ? "📷 Imagem" : 
                            msg.videoMessage ? "🎥 Vídeo" : 
                            msg.audioMessage ? "🎵 Áudio" : 
                            msg.stickerMessage ? "🃏 Figurinha" : "Mensagem");
                };

                const lastMsg = getMsgContent(c.lastMessage || c.message);

                return {
                    id: jid,
                    name: name || 'Desconhecido',
                    image: c.profilePicUrl || c.profilePictureUrl || c.profilePic || c.imgUrl || c.contact?.profilePicUrl || "",
                    lastMessage: lastMsg,
                    lastMessageDate: c.messageTimestamp || c.lastMessage?.messageTimestamp || (c.updatedAt ? Math.floor(new Date(c.updatedAt).getTime() / 1000) : undefined),
                    unreadCount: c.unreadCount || c.unread_count || 0
                };
            }).filter(chat => chat.id && (chat.id.includes('@s.whatsapp.net') || chat.id.includes('@g.us')));
            
            setChats(formattedChats);
        } catch (err: any) {
            console.error("[WebChat] Fatal error:", err);
            showError({ title: 'Erro Fatal', description: err.message || 'Erro ao processar dados do WhatsApp' });
        } finally {
            setLoadingChats(false);
        }
    };

    // Fallback de Polling: só quando realtime NÃO estiver conectado (economia e evita duplicar tráfego)
    useEffect(() => {
        if (!activeChatId) return;
        if (realtimeStatus === 'connected') return;

        console.log("[WebChat] Starting polling for chat:", activeChatId);
        
        // Função de polling isolada para ser resiliente
        const runPoll = async () => {
            // Só faz polling se NÃO estiver enviando mensagem ou sincronizando manualmente
            // E garante que o componente ainda está montado com o mesmo chat
            if (!isSyncing && !loadingMessages && activeChatIdRef.current === activeChatId) {
                try {
                    await loadMessages(activeChatId, false, true);
                } catch (e) {
                    console.warn("[WebChat] Poll failed", e);
                }
            }
        };

        const intervalId = setInterval(runPoll, 2500);

        return () => clearInterval(intervalId);
    }, [activeChatId, realtimeStatus]);

    const loadMessages = async (chatId: string, forceSync: boolean = false, silent: boolean = false) => {
        if (!chatId) return;
        if (forceSync) setIsSyncing(true);
        if (!silent) setLoadingMessages(true);
        
        try {
            if (!silent) console.log("[WebChat] Loading messages for:", chatId, "forceSync:", forceSync);
            
            // Garantir que o JID está no formato correto
            let cleanJid = chatId;
            if (!cleanJid.includes('@')) {
                cleanJid = cleanJid.includes('-') ? `${cleanJid}@g.us` : `${cleanJid}@s.whatsapp.net`;
            }

            const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
                body: { 
                    action: 'get_messages',
                    payload: { remoteJid: cleanJid, instanceName },
                    _ts: Date.now() // Cache busting
                }
            });
            
            if (error) throw error;
            
            if (!silent) {
                console.log("[WebChat] Messages raw response:", data);
            }
            
            if (data?.error) {
                throw new Error(data.error);
            }

            // Evolution v2 pode retornar as mensagens em múltiplos lugares
            const rawMessageData = data?.messages?.records || data?.messages || data?.data || data?.records || (Array.isArray(data) ? data : null);
            
            if (!silent) console.log("[WebChat] Raw message data received:", rawMessageData);

            if (!rawMessageData || (Array.isArray(rawMessageData) && rawMessageData.length === 0)) {
                if (!silent) console.warn("[WebChat] No message array found or array is empty");
                if (!silent && messages.length === 0) setMessages([]); // Só limpa se não for polling silencioso
                return;
            }

            const messageList = Array.isArray(rawMessageData) ? rawMessageData : [];
            
            // Normalizar estrutura de mensagens Baileys/v2 - ULTRA PERMISSIVO
            const normalizedMessages = messageList.map((m: any) => {
                // Tenta encontrar o objeto da mensagem e a chave em qualquer lugar (mesmo aninhado)
                const msg = m.message || m.data?.message || m.records?.[0]?.message || m;
                const key = m.key || m.data?.key || m.records?.[0]?.key;
                
                // Se tiver chave, nós mostramos, mesmo que o conteúdo seja estranho
                if (key) {
                    return { ...m, message: msg, key };
                }
                return null;
            }).filter(m => m !== null);

            // De-duplicar mensagens pelo ID único da key
            const uniqueFetchedMessages = normalizedMessages.reduce((acc: any[], current: any) => {
                const x = acc.find(item => item.key.id === current.key.id);
                return !x ? acc.concat([current]) : acc;
            }, []);

            setMessages(prev => {
                // Se a lista anterior estiver vazia (primeira carga), apenas retorna o fetch
                if (prev.length === 0) return uniqueFetchedMessages.slice(-messageLimit);

                // Helper para normalizar timestamp para Segundos
                const getTs = (msg: any) => {
                    let t = Number(msg.messageTimestamp) || 0;
                    if (t > 2000000000) t = Math.floor(t / 1000); // Converte ms para s se necessário
                    return t;
                };

                // SMART MERGE: Combinar mensagens buscadas com mensagens locais mais recentes
                // 2. Encontrar mensagens locais que NÃO vieram na busca (preservação agressiva)
                const missingLocals = prev.filter(localMsg => {
                    const existsInFetched = uniqueFetchedMessages.some((m: any) => m.key.id === localMsg.key.id);
                    
                    const localTime = getTs(localMsg);
                    const now = Math.floor(Date.now() / 1000);
                    // Janela de 5 minutos
                    const isRecent = (localTime > (now - 300)); 
                    
                    return !existsInFetched && isRecent;
                });

                // 3. Combinar tudo
                const combined = [...uniqueFetchedMessages, ...missingLocals];

                // 4. Ordenar
                combined.sort((a, b) => {
                    return getTs(a) - getTs(b);
                });

                // 5. Limitar (mas garantindo que as novas fiquem)
                return combined.slice(-messageLimit);
            });

            if (forceSync && uniqueFetchedMessages.length > 0) {
                showSuccess({ title: 'Mensagens Sincronizadas!' });
            }
        } catch (err: any) {
            console.error("[WebChat] Error loading messages:", err);
            if (!silent) showError({ title: 'Erro ao carregar mensagens', description: err.message });
        } finally {
            if (!silent) setLoadingMessages(false);
            setIsSyncing(false);
        }
    };

    const saveNote = async (text: string) => {
        if (!activeChatId || !user) return;

        const noteId = 'note-' + Date.now();
        const noteTimestamp = Date.now() / 1000;

        // Optimistic add
        const noteMsg: Message = {
            id: noteId,
            key: { remoteJid: activeChatId, fromMe: true, id: noteId },
            message: { conversation: text },
            messageTimestamp: noteTimestamp,
            isNote: true,
        };
        setMessages(prev => [...prev, noteMsg]);

        // Persist to Supabase: find conversation_id by phone_number
        try {
            const phone = activeChatId.split('@')[0];
            const { data: conv } = await supabase
                .from('whatsapp_conversations')
                .select('id')
                .eq('owner_id', user.id)
                .eq('phone_number', phone)
                .maybeSingle();

            if (conv?.id) {
                await supabase.from('whatsapp_messages').insert({
                    owner_id: user.id,
                    conversation_id: conv.id,
                    direction: 'note',
                    content: text,
                } as any);
            }
        } catch (err) {
            console.warn('[WebChat] Failed to persist note:', err);
        }
    };

    const sendMessage = async (text: string) => {
        if (!activeChatId) return;

        if (text === "#sync") {
            loadMessages(activeChatId, true);
            return;
        }

        const tempMsg: Message = {
            id: 'temp-' + Date.now(),
            key: { remoteJid: activeChatId, fromMe: true, id: 'temp-' + Date.now() },
            message: { conversation: text },
            messageTimestamp: Date.now() / 1000
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const { error } = await supabase.functions.invoke('whatsapp-proxy', {
                body: { 
                    action: 'send_message',
                    payload: { to: activeChatId, text, instanceName }
                }
            });
            if (error) throw error;
        } catch (err) {
            showError({ title: 'Erro', description: 'Falha ao enviar mensagem' });
            setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        }
    };

     const checkAiStatus = async () => {
        // Temporário: Drippy SEMPRE ativa no WhatsApp
        await supabase.functions.invoke('whatsapp-proxy', {
          body: { action: 'set_ai_config', payload: { enabled: true, ai_mode: 'drippy', ai_agent_id: null, instanceName } }
        });
    };

    const handleLogout = async () => {
        if (!confirm("Tem certeza que deseja desconectar?")) return;
        try {
            await supabase.functions.invoke('whatsapp-proxy', {
                body: { action: 'logout_instance', payload: { instanceName } }
            });
            onBack();
        } catch (err) {
            showError({ title: 'Erro', description: 'Falha ao desconectar' });
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] max-w-6xl mx-auto w-full">
            <div className="flex items-center justify-between p-3 mb-4 bg-card/50 backdrop-blur-sm border rounded-xl shadow-sm">
                <Button variant="ghost" size="sm" onClick={onBack} className="hover:bg-accent/50 rounded-lg">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para Instâncias
                </Button>
                <div className="flex items-center gap-4">
                     <div className="flex flex-col items-end mr-2">
                        <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Status</span>
                        <div className="flex items-center gap-1.5">
                            <div className={cn("w-2 h-2 rounded-full", 
                                realtimeStatus === 'connected' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : 
                                realtimeStatus === 'connecting' ? "bg-yellow-500" : "bg-red-500"
                            )} />
                            <span className="text-xs font-mono text-muted-foreground">
                                {realtimeStatus === 'connected' ? 'Sincronizado' : realtimeStatus === 'connecting' ? 'Conectando...' : 'Desconectado'}
                            </span>
                        </div>
                    </div>
                    <div className="h-8 w-[1px] bg-border" />
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Instância Ativa</span>
                        <span className="text-xs font-mono bg-background px-2 py-0.5 rounded border border-primary/20 text-primary">{instanceName}</span>
                    </div>
                    <div className="h-8 w-[1px] bg-border" />
                    <div className="flex items-center space-x-3">
                        <div className="flex flex-col items-end">
                            <Label htmlFor="ai-mode" className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                                <Bot className="h-4 w-4 text-primary" />
                                IA
                            </Label>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Drippy</span> (sempre ativa)
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-1 border rounded-2xl overflow-hidden bg-background shadow-2xl mb-4">
                {/* Sidebar */}
                <div className="w-[400px] border-r border-white/5 flex flex-col bg-[#111b21]">
                    <div className="h-[60px] px-4 bg-[#202c33] flex items-center justify-between z-10">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-[#6a7175] text-white">
                                    <User className="h-6 w-6" />
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => loadChats()} 
                                disabled={loadingChats}
                                title="Atualizar"
                                className="text-[#aebac1] hover:text-white rounded-full h-10 w-10"
                            >
                                <RefreshCw className={cn("h-5 w-5", loadingChats && "animate-spin")} />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-[#aebac1] hover:text-white rounded-full h-10 w-10">
                                <Plus className="h-5 w-5" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={handleLogout} 
                                title="Desconectar"
                                className="text-[#aebac1] hover:text-white rounded-full h-10 w-10"
                            >
                                <LogOut className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Search / Filter bar */}
                    <div className="p-2 bg-[#111b21] flex items-center gap-2 border-b border-white/5">
                        <div className="flex-1 bg-[#202c33] flex items-center gap-3 px-3 py-1.5 rounded-lg">
                            <Search className="h-4 w-4 text-[#8696a0]" />
                            <input
                                type="text"
                                placeholder="Pesquisar ou começar uma nova conversa"
                                className="bg-transparent border-none text-[14px] text-white focus:ring-0 w-full placeholder:text-[#8696a0]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-[#111b21] p-2 gap-2 border-b border-white/5">
                        <button 
                            onClick={() => setActiveTab('contacts')}
                            className={cn(
                                "px-4 py-1.5 text-[14px] font-medium rounded-full transition-all",
                                activeTab === 'contacts' ? "bg-[#00a884] text-[#111b21]" : "bg-[#202c33] text-[#aebac1] hover:bg-[#2a3942]"
                            )}
                        >
                            Contatos
                        </button>
                        <button 
                            onClick={() => setActiveTab('groups')}
                            className={cn(
                                "px-4 py-1.5 text-[14px] font-medium rounded-full transition-all",
                                activeTab === 'groups' ? "bg-[#00a884] text-[#111b21]" : "bg-[#202c33] text-[#aebac1] hover:bg-[#2a3942]"
                            )}
                        >
                            Grupos
                        </button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <ChatList 
                            chats={filteredChats} 
                            activeChat={activeChatId} 
                            onSelectChat={setActiveChatId}
                            isLoading={loadingChats}
                            presenceMap={presenceMap}
                        />
                    </div>
                </div>

                {/* Main Window */}
                <div className="flex-1 flex flex-col min-w-0 bg-muted/5">
                    <ChatWindow
                        activeChat={activeChatId}
                        activeChatName={chats.find((c) => c.id === activeChatId)?.name ?? null}
                        messages={messages}
                        onSendMessage={sendMessage}
                        onSaveNote={saveNote}
                        isLoading={loadingMessages}
                        isSyncing={isSyncing}
                        presenceStatus={activeChatId ? presenceMap[(activeChatId.split('@')[0] ?? activeChatId)] : undefined}
                        canLoadMore={messages.length >= messageLimit}
                        onLoadMore={() => {
                            const newLimit = messageLimit + 50;
                            setMessageLimit(newLimit);
                            if (activeChatId) loadMessages(activeChatId);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
