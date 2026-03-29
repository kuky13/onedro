import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { Chat, Message } from './types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, ArrowLeft, RefreshCw, Search, User } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useIsMobile } from '@/hooks/use-mobile';
import { subscribePostgresChanges } from '@/integrations/supabase/realtimeRegistry';

interface WebChatProps {
    instanceName: string;
    onBack: () => void;
}

export function WebChat({ instanceName, onBack }: WebChatProps) {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const isMobile = useIsMobile();
    
    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeTab, setActiveTab] = useState<'contacts' | 'groups'>('contacts');
    const [loadingChats, setLoadingChats] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const activeChatIdRef = useRef<string | null>(null);

    const filteredChats = chats
        .filter(chat => {
            const isGroup = chat.id?.includes('@g.us');
            const matchesTab = activeTab === 'groups' ? isGroup : !isGroup;
            if (!matchesTab) return false;
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (chat.name?.toLowerCase().includes(q) || chat.id?.split('@')[0]?.includes(q));
        })
        .sort((a, b) => (b.lastMessageDate || 0) - (a.lastMessageDate || 0));

    useEffect(() => {
        activeChatIdRef.current = activeChatId;
    }, [activeChatId]);

    const [presenceMap, setPresenceMap] = useState<Record<string, string>>({});
    const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

    // Initial Load + Realtime via Postgres Changes
    useEffect(() => {
        loadChats();

        if (!user?.id) return;

        // Subscribe to whatsapp_messages INSERT for this user
        const unsub = subscribePostgresChanges(
            {
                schema: 'public',
                table: 'whatsapp_messages',
                event: 'INSERT',
                filter: `owner_id=eq.${user.id}`,
            },
            (payload) => {
                const row = payload.new as any;
                if (!row) return;
                console.log("[WebChat] Realtime DB message:", row.id);

                const newMessage: Message = {
                    id: row.id,
                    key: {
                        remoteJid: row.phone_number ? `${row.phone_number.replace(/\D/g, '')}@s.whatsapp.net` : '',
                        fromMe: row.direction === 'outbound',
                        id: row.id,
                    },
                    message: { conversation: row.content || '' },
                    messageTimestamp: Math.floor(new Date(row.created_at).getTime() / 1000),
                    pushName: row.sender_name || '',
                };

                handleNewMessage(newMessage);
            }
        );

        setRealtimeStatus('connected');

        // Chat list polling every 15s
        const chatPollInterval = setInterval(() => { loadChats(); }, 15000);

        return () => {
            unsub();
            clearInterval(chatPollInterval);
        };
    }, [user?.id]);

    const handlePresenceEvent = (payload: any) => {
        const jidRaw: unknown = payload?.jid || payload?.id || payload?.remoteJid;
        const presenceRaw = payload?.presence || payload?.lastKnownPresence || payload?.type || payload?.status;
        if (typeof jidRaw !== 'string' || !jidRaw) return;
        const jidKey = jidRaw.includes('@') ? jidRaw.split('@')[0] : jidRaw;
        const normalized: string | undefined =
            typeof presenceRaw === 'string' ? presenceRaw
            : (presenceRaw?.lastKnownPresence || presenceRaw?.type || presenceRaw?.status);
        if (!normalized) return;
        setPresenceMap((prev) => ({ ...prev, [String(jidKey)]: normalized }));
    };

    const playNotificationSound = () => {
        try {
            const sound = new Audio("https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3");
            sound.volume = 0.5;
            sound.play().catch(() => {});
        } catch {}
    };

    const handleNewMessage = (msgData: any) => {
        if (Array.isArray(msgData)) { msgData.forEach(m => handleNewMessage(m)); return; }

        const candidate =
            msgData?.key ? msgData :
            msgData?.message?.key ? msgData.message :
            msgData?.data?.key ? msgData.data :
            msgData?.data?.message?.key ? msgData.data.message :
            msgData;

        if (!candidate?.key) return;

        const newMessage = candidate;
        const normalizeJid = (j: string) => j ? j.split('@')[0] : '';
        const remoteJid = newMessage.key.remoteJid;
        const currentChatId = activeChatIdRef.current;

        if (!newMessage.key.fromMe) playNotificationSound();

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

        if (currentChatId && normalizeJid(currentChatId) === normalizeJid(remoteJid)) {
            setMessages(prev => {
                if (prev.find(m => m.key.id === newMessage.key.id)) return prev;
                const getTs = (msg: any) => { let t = Number(msg.messageTimestamp) || 0; if (t > 2000000000) t = Math.floor(t / 1000); return t; };
                const updated = [...prev, newMessage];
                updated.sort((a, b) => getTs(a) - getTs(b));
                return updated.slice(-50);
            });

            if (!newMessage.key.fromMe) {
                showSuccess({ title: 'Nova mensagem!', description: newMessage.pushName || 'Recebida agora' });
            }
        }
    };

    useEffect(() => {
        if (activeChatId) {
            loadMessages(activeChatId);
        } else {
            setMessages([]);
        }
    }, [activeChatId]);

    // Fallback polling when no realtime
    useEffect(() => {
        if (!activeChatId) return;
        const runPoll = async () => {
            if (!isSyncing && !loadingMessages && activeChatIdRef.current === activeChatId) {
                try { await loadMessages(activeChatId, false, true); } catch {}
            }
        };
        const intervalId = setInterval(runPoll, 3000);
        return () => clearInterval(intervalId);
    }, [activeChatId]);

    const loadChats = async () => {
        setLoadingChats(true);
        try {
            const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
                body: { action: 'get_chats', payload: { instanceName } }
            });
            if (error) { showError({ title: 'Erro na API', description: 'Não foi possível buscar as conversas.' }); return; }
            
            const rawData = data?.chats || data?.data || data?.instances || data;
            const rawArray = Array.isArray(rawData) ? rawData : [];

            const formattedChats = rawArray.map((c: any) => {
                const jid = c.Jid || c.remoteJid || c.id || c.jid || c.key?.remoteJid;
                let name = c.FullName || c.name || c.verifiedName || c.PushName || c.pushName || c.pushname || c.BusinessName || c.contact?.name;
                if (!name && jid) {
                    const cleanJid = jid.split('@')[0];
                    name = cleanJid.includes('-') ? "Grupo do WhatsApp" : cleanJid.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4');
                }

                const getMsgContent = (m: any): string => {
                    if (!m) return "...";
                    if (typeof m === 'string') return m;
                    const msg = m.message || m;
                    return msg.conversation || msg.extendedTextMessage?.text || msg.text ||
                           msg.imageMessage?.caption || msg.videoMessage?.caption || 
                           (msg.imageMessage ? "📷 Imagem" : msg.videoMessage ? "🎥 Vídeo" : 
                            msg.audioMessage ? "🎵 Áudio" : msg.stickerMessage ? "🃏 Figurinha" : "Mensagem");
                };

                const lastMsg = c.lastMessage ? (typeof c.lastMessage === 'string' ? c.lastMessage : getMsgContent(c.lastMessage)) : getMsgContent(c.message);

                return {
                    id: jid,
                    name: name || 'Desconhecido',
                    image: c.profilePicUrl || c.profilePictureUrl || c.profilePic || c.imgUrl || c.contact?.profilePicUrl || "",
                    lastMessage: lastMsg || '...',
                    lastMessageDate: c.lastMessageTimestamp || c.messageTimestamp || c.lastMessage?.messageTimestamp || (c.updatedAt ? Math.floor(new Date(c.updatedAt).getTime() / 1000) : undefined),
                    unreadCount: c.unreadCount || c.unread_count || 0
                };
            }).filter((chat: any) => chat.id && (chat.id.includes('@s.whatsapp.net') || chat.id.includes('@g.us')));
            
            setChats(formattedChats);
        } catch (err: any) {
            console.error("[WebChat] Fatal error:", err);
            showError({ title: 'Erro Fatal', description: err.message || 'Erro ao processar dados do WhatsApp' });
        } finally {
            setLoadingChats(false);
        }
    };

    const loadMessages = async (chatId: string, forceSync: boolean = false, silent: boolean = false) => {
        if (!chatId) return;
        if (forceSync) setIsSyncing(true);
        if (!silent) setLoadingMessages(true);
        
        try {
            let cleanJid = chatId;
            if (!cleanJid.includes('@')) {
                cleanJid = cleanJid.includes('-') ? `${cleanJid}@g.us` : `${cleanJid}@s.whatsapp.net`;
            }

            const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
                body: { action: 'get_messages', payload: { remoteJid: cleanJid, instanceName }, _ts: Date.now() }
            });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            const rawMessageData = data?.messages?.records || data?.messages || data?.data || data?.records || (Array.isArray(data) ? data : null);
            if (!rawMessageData || (Array.isArray(rawMessageData) && rawMessageData.length === 0)) {
                if (!silent && messages.length === 0) setMessages([]);
                return;
            }

            const messageList = Array.isArray(rawMessageData) ? rawMessageData : [];
            const normalizedMessages = messageList.map((m: any) => {
                const msg = m.message || m.data?.message || m;
                const key = m.key || m.data?.key;
                if (key) return { ...m, message: msg, key };
                return null;
            }).filter(Boolean);

            const uniqueFetchedMessages = normalizedMessages.reduce((acc: any[], current: any) => {
                return acc.find((item: any) => item.key.id === current.key.id) ? acc : acc.concat([current]);
            }, []);

            setMessages(prev => {
                if (prev.length === 0) return uniqueFetchedMessages.slice(-50);
                const getTs = (msg: any) => { let t = Number(msg.messageTimestamp) || 0; if (t > 2000000000) t = Math.floor(t / 1000); return t; };
                const missingLocals = prev.filter(localMsg => {
                    const existsInFetched = uniqueFetchedMessages.some((m: any) => m.key.id === localMsg.key.id);
                    const localTime = getTs(localMsg);
                    const now = Math.floor(Date.now() / 1000);
                    return !existsInFetched && (localTime > (now - 300));
                });
                const combined = [...uniqueFetchedMessages, ...missingLocals];
                combined.sort((a, b) => getTs(a) - getTs(b));
                return combined.slice(-50);
            });

            if (forceSync && uniqueFetchedMessages.length > 0) showSuccess({ title: 'Mensagens Sincronizadas!' });
        } catch (err: any) {
            console.error("[WebChat] Error loading messages:", err);
            if (!silent) showError({ title: 'Erro ao carregar mensagens', description: err.message });
        } finally {
            if (!silent) setLoadingMessages(false);
            setIsSyncing(false);
        }
    };

    const sendMessage = async (text: string) => {
        if (!activeChatId) return;
        if (text === "#sync") { loadMessages(activeChatId, true); return; }
        
        const tempMsg: Message = {
            id: 'temp-' + Date.now(),
            key: { remoteJid: activeChatId, fromMe: true, id: 'temp-' + Date.now() },
            message: { conversation: text },
            messageTimestamp: Date.now() / 1000
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const { error } = await supabase.functions.invoke('whatsapp-proxy', {
                body: { action: 'send_message', payload: { to: activeChatId, text, instanceName } }
            });
            if (error) throw error;
        } catch {
            showError({ title: 'Erro', description: 'Falha ao enviar mensagem' });
            setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        }
    };

    const handleLogout = async () => {
        if (!confirm("Tem certeza que deseja desconectar?")) return;
        try {
            await supabase.functions.invoke('whatsapp-proxy', {
                body: { action: 'logout_instance', payload: { instanceName } }
            });
            onBack();
        } catch {
            showError({ title: 'Erro', description: 'Falha ao desconectar' });
        }
    };

    const handleSelectChat = (chatId: string) => {
        setActiveChatId(chatId);
    };

    const handleMobileBack = () => {
        setActiveChatId(null);
    };

    // Mobile: show sidebar or chat, not both
    const showSidebar = !isMobile || !activeChatId;
    const showChat = !isMobile || !!activeChatId;

    return (
        <div className="flex h-[calc(100vh-2rem)] max-w-[1400px] mx-auto w-full p-2">
            <div className="flex flex-1 border rounded-xl overflow-hidden bg-[#111b21] shadow-2xl">
                {/* Sidebar */}
                {showSidebar && (
                    <div className={cn("flex flex-col bg-[#111b21] border-r border-white/5", isMobile ? "w-full" : "w-[380px] min-w-[300px]")}>
                        {/* Sidebar Header */}
                        <div className="h-[60px] px-3 bg-[#202c33] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Avatar className="h-9 w-9">
                                    <AvatarFallback className="bg-[#6a7175] text-white text-sm">
                                        <User className="h-5 w-5" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex items-center gap-1.5">
                                    <div className={cn("w-2 h-2 rounded-full", 
                                        realtimeStatus === 'connected' ? "bg-green-500" : 
                                        realtimeStatus === 'connecting' ? "bg-yellow-500 animate-pulse" : "bg-red-500"
                                    )} />
                                    <span className="text-[11px] text-[#8696a0]">
                                        {realtimeStatus === 'connected' ? 'Online' : realtimeStatus === 'connecting' ? 'Conectando...' : 'Offline'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => loadChats()} disabled={loadingChats}
                                    title="Atualizar contatos" className="text-[#aebac1] hover:text-white hover:bg-white/5 rounded-full h-9 w-9">
                                    <RefreshCw className={cn("h-4 w-4", loadingChats && "animate-spin")} />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={onBack} title="Voltar"
                                    className="text-[#aebac1] hover:text-white hover:bg-white/5 rounded-full h-9 w-9">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleLogout} title="Desconectar"
                                    className="text-[#aebac1] hover:text-red-400 hover:bg-white/5 rounded-full h-9 w-9">
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="p-2 bg-[#111b21] border-b border-white/5">
                            <div className="bg-[#202c33] flex items-center gap-3 px-3 py-1.5 rounded-lg">
                                <Search className="h-4 w-4 text-[#8696a0] flex-shrink-0" />
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Pesquisar ou começar uma nova conversa" 
                                    className="bg-transparent border-none outline-none text-[14px] text-white w-full placeholder:text-[#8696a0]"
                                />
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex bg-[#111b21] p-2 gap-2 border-b border-white/5">
                            <button onClick={() => setActiveTab('contacts')}
                                className={cn("px-4 py-1.5 text-[13px] font-medium rounded-full transition-all",
                                    activeTab === 'contacts' ? "bg-[#00a884] text-[#111b21]" : "bg-[#202c33] text-[#aebac1] hover:bg-[#2a3942]"
                                )}>
                                Contatos
                            </button>
                            <button onClick={() => setActiveTab('groups')}
                                className={cn("px-4 py-1.5 text-[13px] font-medium rounded-full transition-all",
                                    activeTab === 'groups' ? "bg-[#00a884] text-[#111b21]" : "bg-[#202c33] text-[#aebac1] hover:bg-[#2a3942]"
                                )}>
                                Grupos
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden">
                            <ChatList 
                                chats={filteredChats} 
                                activeChat={activeChatId} 
                                onSelectChat={handleSelectChat}
                                isLoading={loadingChats}
                                presenceMap={presenceMap}
                            />
                        </div>
                    </div>
                )}

                {/* Main Chat Window */}
                {showChat && (
                    <div className="flex-1 flex flex-col min-w-0">
                        <ChatWindow 
                            activeChat={activeChatId}
                            activeChatName={chats.find((c) => c.id === activeChatId)?.name ?? null}
                            messages={messages}
                            onSendMessage={sendMessage}
                            isLoading={loadingMessages}
                            isSyncing={isSyncing}
                            presenceStatus={activeChatId ? presenceMap[(activeChatId.split('@')[0] ?? activeChatId)] : undefined}
                            onMobileBack={isMobile ? handleMobileBack : undefined}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
