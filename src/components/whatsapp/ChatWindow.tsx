import { useState, useRef, useEffect } from 'react';
import { Message } from './types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Bot, CheckCheck, Search, MoreVertical, Plus, RefreshCw } from 'lucide-react';
import { HumanHandoffBar } from './HumanHandoffBar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
    activeChat: string | null;
    activeChatName?: string | null;
    messages: Message[];
    onSendMessage: (text: string) => Promise<void>;
    isLoading: boolean;
    isSyncing?: boolean;
    presenceStatus?: string | undefined;
    debugData?: any;
}

export function ChatWindow({ activeChat, activeChatName, messages, onSendMessage, isLoading, isSyncing, presenceStatus }: ChatWindowProps) {
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

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
            await onSendMessage(text);
            setText('');
        } finally {
            setSending(false);
        }
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
            <div className="p-3 bg-[#202c33] flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-white/70 hover:text-white rounded-full h-10 w-10">
                    <Plus className="h-6 w-6" />
                </Button>
                <form onSubmit={handleSend} className="flex-1 flex gap-2">
                    <Input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Enviar mensagem..."
                        disabled={sending}
                        className="bg-[#2a3942] border-none text-white focus-visible:ring-0 h-10 px-4 rounded-lg placeholder:text-white/30"
                    />
                    <Button 
                        type="submit" 
                        size="icon" 
                        disabled={!text.trim() || sending}
                        className="h-10 w-10 rounded-full bg-[#00a884] hover:bg-[#06cf9c] text-black shadow-none transition-all"
                    >
                        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </Button>
                </form>
            </div>
        </div>
    );
}
