import { useState, useRef, useEffect } from 'react';
import { Message } from './types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Send, Bot, CheckCheck, Search, MoreVertical, Plus, RefreshCw, Zap, NotebookPen } from 'lucide-react';
import { HumanHandoffBar } from './HumanHandoffBar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

interface ChatWindowProps {
    activeChat: string | null;
    activeChatName?: string | null;
    messages: Message[];
    onSendMessage: (text: string) => Promise<void>;
    onSaveNote?: (text: string) => Promise<void>;
    isLoading: boolean;
    isSyncing?: boolean;
    presenceStatus?: string | undefined;
    canLoadMore?: boolean;
    onLoadMore?: () => void;
    debugData?: any;
}

export function ChatWindow({ activeChat, activeChatName, messages, onSendMessage, onSaveNote, isLoading, isSyncing, presenceStatus, canLoadMore, onLoadMore }: ChatWindowProps) {
    const { user } = useAuth();
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [isNoteMode, setIsNoteMode] = useState(false);
    const [templateOpen, setTemplateOpen] = useState(false);
    const [templateSearch, setTemplateSearch] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const { data: templates = [] } = useQuery({
        queryKey: ['whatsapp-message-templates', user?.id],
        enabled: Boolean(user?.id),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('whatsapp_message_templates')
                .select('id, template_name, message_template, is_default')
                .eq('user_id', user!.id)
                .order('is_default', { ascending: false })
                .order('template_name');
            if (error) throw error;
            return data ?? [];
        },
    });

    const filteredTemplates = templates.filter(t =>
        !templateSearch.trim() ||
        t.template_name.toLowerCase().includes(templateSearch.toLowerCase())
    );

    useEffect(() => {
        // Scroll imediato
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }

        // Scroll retardado para garantir que imagens/conteúdo renderizaram
        const timeout = setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 100);

        return () => clearTimeout(timeout);
    }, [messages, activeChat]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || sending) return;

        setSending(true);
        try {
            if (isNoteMode && onSaveNote) {
                await onSaveNote(text);
            } else {
                await onSendMessage(text);
            }
            setText('');
        } finally {
            setSending(false);
        }
    };

    const handleSelectTemplate = (messageTemplate: string) => {
        setText(messageTemplate);
        setTemplateOpen(false);
        setTemplateSearch('');
    };

    if (!activeChat) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-muted/5 text-muted-foreground p-12 text-center">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
                    <Bot className="h-24 w-24 text-primary/20 relative" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">WhatsApp Web + IA</h3>
                <p className="max-w-md text-sm leading-relaxed">
                    Selecione uma conversa ao lado para visualizar as mensagens ou iniciar um novo atendimento com auxílio da Inteligência Artificial.
                </p>
                <div className="mt-8 flex gap-4 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/50">
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Criptografado</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Triagem Ativa</span>
                </div>
            </div>
        );
    }

    if (isLoading && messages.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0b141a] relative overflow-hidden">
            {/* Human Handoff Bar */}
            {activeChat && (
              <HumanHandoffBar phone={activeChat.split('@')[0] ?? ''} />
            )}
            {/* Header */}
            <div className="h-[60px] px-4 bg-[#202c33] flex items-center justify-between z-10 border-l border-white/5">
                <div className="flex items-center gap-3 cursor-pointer">
                    <Avatar className="h-10 w-10 border-none shadow-sm">
                        <AvatarFallback className="bg-[#6a7175] text-white font-bold">
                            {(activeChatName || activeChat || '').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <p className="text-[16px] font-medium leading-tight text-[#e9edef]">
                            {activeChatName || activeChat?.split('@')[0]}
                        </p>
                        {presenceStatus ? (
                          <p className="text-[11px] text-[#00a884] font-medium leading-tight">{presenceStatus}</p>
                        ) : null}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="text-[#aebac1] hover:text-white rounded-full h-10 w-10">
                        <Search className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-[#aebac1] hover:text-white rounded-full h-10 w-10">
                        <MoreVertical className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-[#0b141a]" ref={scrollRef}>
                {canLoadMore && messages.length > 0 && (
                    <div className="flex justify-center pb-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onLoadMore}
                            disabled={isLoading}
                            className="text-[#8696a0] hover:text-white hover:bg-[#2a3942] rounded-full text-xs"
                        >
                            {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Carregar mensagens anteriores
                        </Button>
                    </div>
                )}
                {messages.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-white/20 p-8 text-center">
                        <Bot className="h-16 w-16 mb-4 opacity-50" />
                        <p className="text-sm font-medium mb-4">Nenhuma mensagem encontrada localmente</p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSendMessage("#sync")}
                            disabled={isSyncing}
                            className="bg-[#202c33] border-white/10 text-[#00a884] hover:bg-[#2a3942] hover:text-[#06cf9c]"
                        >
                            <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
                            {isSyncing ? "Sincronizando..." : "Sincronizar Mensagens"}
                        </Button>
                        <p className="text-[10px] mt-4 max-w-[200px] opacity-50">
                            Isso forçará a busca de mensagens diretamente do seu WhatsApp.
                        </p>
                    </div>
                )}

                {messages.map((msg) => {
                    if (msg.isNote) {
                        let time = Number(msg.messageTimestamp) || 0;
                        if (time < 2000000000) time = time * 1000;
                        if (time === 0) time = Date.now();
                        const content = (msg.message as any)?.conversation ?? '';
                        return (
                            <div key={msg.key.id} className="flex w-full justify-center animate-in fade-in duration-200">
                                <div className="max-w-[85%] rounded-xl px-3 py-2 shadow-sm bg-amber-500/15 border border-amber-500/30 text-amber-200">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <NotebookPen className="h-3 w-3 text-amber-400 shrink-0" />
                                        <span className="text-[9px] uppercase tracking-wider font-bold text-amber-400">Nota interna</span>
                                    </div>
                                    <p className="text-[13px] whitespace-pre-wrap leading-tight">{content}</p>
                                    <span className="text-[9px] text-amber-400/60 font-medium mt-1 block text-right">{format(new Date(time), 'HH:mm')}</span>
                                </div>
                            </div>
                        );
                    }

                    const isMe = msg.key.fromMe;
                    const msgCore = msg.message || msg;
                    const content = msgCore.conversation ||
                                    msgCore.extendedTextMessage?.text ||
                                    msgCore.text ||
                                    msgCore.imageMessage?.caption ||
                                    (msgCore.imageMessage ? "📷 Imagem" :
                                     msgCore.videoMessage ? "🎥 Vídeo" :
                                     msgCore.audioMessage ? "🎵 Áudio" :
                                     msgCore.protocolMessage ? "⚙️ Sistema" :
                                     "Mensagem");

                    let time = Number(msg.messageTimestamp) || 0;
                    if (time < 2000000000) time = time * 1000; // Converte segundos para ms se necessário
                    if (time === 0) time = Date.now();

                    return (
                        <div key={msg.key.id} className={cn("flex w-full animate-in fade-in slide-in-from-bottom-1 duration-200", isMe ? "justify-end" : "justify-start")}>
                            <div className={cn(
                                "max-w-[80%] rounded-xl px-3 py-2 shadow-sm relative",
                                isMe
                                    ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none"
                                    : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
                            )}>
                                <p className="text-[14.2px] whitespace-pre-wrap leading-tight">{content}</p>
                                <div className="flex items-center justify-end gap-1 mt-1">
                                    <span className="text-[9px] text-white/50 font-medium">{format(new Date(time), 'HH:mm')}</span>
                                    {isMe && <CheckCheck className="h-3 w-3 text-[#53bdeb]" />}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {isLoading && (
                    <div className="flex justify-center p-4">
                        <div className="bg-[#202c33] border border-white/5 px-4 py-2 rounded-full flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin text-[#00a884]" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Carregando...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className={cn("p-3 flex items-center gap-2", isNoteMode ? "bg-amber-950/40 border-t border-amber-500/20" : "bg-[#202c33]")}>
                {isNoteMode ? (
                    <div className="flex items-center gap-1.5 shrink-0 bg-amber-500/20 border border-amber-500/30 rounded-full px-2 py-1">
                        <NotebookPen className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-[9px] uppercase tracking-wider font-bold text-amber-400">Nota</span>
                    </div>
                ) : (
                    <Button variant="ghost" size="icon" className="text-white/70 hover:text-white rounded-full h-10 w-10">
                        <Plus className="h-6 w-6" />
                    </Button>
                )}

                {/* Templates Popover */}
                {templates.length > 0 && (
                    <Popover open={templateOpen} onOpenChange={setTemplateOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                title="Modelos de mensagem"
                                className="text-[#aebac1] hover:text-[#00a884] rounded-full h-10 w-10 shrink-0"
                            >
                                <Zap className="h-5 w-5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            side="top"
                            align="start"
                            className="w-80 p-0 bg-[#202c33] border-white/10 text-[#e9edef]"
                        >
                            <div className="p-2 border-b border-white/10">
                                <div className="flex items-center gap-2 bg-[#2a3942] rounded-lg px-3 py-1.5">
                                    <Search className="h-3.5 w-3.5 text-[#8696a0] shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Buscar modelo..."
                                        value={templateSearch}
                                        onChange={(e) => setTemplateSearch(e.target.value)}
                                        className="bg-transparent border-none text-sm text-white focus:ring-0 w-full placeholder:text-[#8696a0]"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {filteredTemplates.length === 0 ? (
                                    <p className="text-[#8696a0] text-xs text-center py-6">Nenhum modelo encontrado</p>
                                ) : (
                                    filteredTemplates.map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => handleSelectTemplate(t.message_template)}
                                            className="w-full text-left px-3 py-2.5 hover:bg-[#2a3942] transition-colors border-b border-white/5 last:border-0"
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-medium text-[#e9edef] truncate">{t.template_name}</span>
                                                {t.is_default && (
                                                    <span className="text-[9px] uppercase tracking-wider bg-[#00a884]/20 text-[#00a884] px-1.5 py-0.5 rounded shrink-0">padrão</span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-[#8696a0] line-clamp-2 leading-relaxed">{t.message_template}</p>
                                        </button>
                                    ))
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                )}

                {onSaveNote && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => { setIsNoteMode(v => !v); setText(''); }}
                        title={isNoteMode ? "Cancelar nota" : "Nota interna"}
                        className={cn("rounded-full h-10 w-10 shrink-0", isNoteMode ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" : "text-[#aebac1] hover:text-amber-400 hover:bg-amber-500/10")}
                    >
                        <NotebookPen className="h-5 w-5" />
                    </Button>
                )}

                <form onSubmit={handleSend} className="flex-1 flex gap-2">
                    <Input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={isNoteMode ? "Escrever nota interna (visível só para agentes)..." : "Enviar mensagem..."}
                        disabled={sending}
                        className={cn("border-none focus-visible:ring-0 h-10 px-4 rounded-lg", isNoteMode ? "bg-amber-500/10 text-amber-100 placeholder:text-amber-400/50" : "bg-[#2a3942] text-white placeholder:text-white/30")}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!text.trim() || sending}
                        className={cn("h-10 w-10 rounded-full shadow-none transition-all", isNoteMode ? "bg-amber-500 hover:bg-amber-400 text-black" : "bg-[#00a884] hover:bg-[#06cf9c] text-black")}
                    >
                        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : isNoteMode ? <NotebookPen className="h-5 w-5" /> : <Send className="h-5 w-5" />}
                    </Button>
                </form>
            </div>
        </div>
    );
}
