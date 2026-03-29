import { useState, useRef, useEffect } from 'react';
import { Message } from './types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Bot, CheckCheck, ArrowLeft } from 'lucide-react';
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
    onMobileBack?: (() => void) | undefined;
}

export function ChatWindow({ activeChat, activeChatName, messages, onSendMessage, isLoading, presenceStatus, onMobileBack }: ChatWindowProps) {
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        const timeout = setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
            <div className="flex-1 flex flex-col items-center justify-center bg-[#0b141a] text-[#8696a0] p-12 text-center">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-[#00a884]/10 blur-3xl rounded-full" />
                    <Bot className="h-24 w-24 text-[#00a884]/20 relative" />
                </div>
                <h3 className="text-2xl font-bold text-[#e9edef] mb-2">WhatsApp Web</h3>
                <p className="max-w-md text-sm leading-relaxed text-[#8696a0]">
                    Selecione uma conversa ao lado para visualizar as mensagens ou iniciar um novo atendimento.
                </p>
                <div className="mt-8 flex gap-4 text-[10px] uppercase tracking-widest font-bold text-[#8696a0]/50">
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Criptografado</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Tempo Real</span>
                </div>
            </div>
        );
    }

    if (isLoading && messages.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#0b141a]">
                <Loader2 className="h-8 w-8 animate-spin text-[#00a884]" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0b141a] relative overflow-hidden">
            {activeChat && <HumanHandoffBar phone={activeChat.split('@')[0] ?? ''} />}
            
            {/* Header */}
            <div className="h-[60px] px-4 bg-[#202c33] flex items-center justify-between z-10 border-l border-white/5">
                <div className="flex items-center gap-3 cursor-pointer">
                    {onMobileBack && (
                        <Button variant="ghost" size="icon" onClick={onMobileBack} className="text-[#aebac1] hover:text-white rounded-full h-9 w-9 -ml-1">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    )}
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
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-2" ref={scrollRef} style={{ background: '#0b141a' }}>
                {messages.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-[#8696a0]/50 p-8 text-center">
                        <Bot className="h-12 w-12 mb-3 opacity-40" />
                        <p className="text-sm font-medium mb-1">Inicie uma conversa</p>
                        <p className="text-[11px] max-w-[220px] opacity-60">
                            Envie uma mensagem para começar a conversar.
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
                    if (time < 2000000000) time = time * 1000;
                    if (time === 0) time = Date.now();

                    return (
                        <div key={msg.key.id} className={cn("flex w-full animate-in fade-in slide-in-from-bottom-1 duration-200", isMe ? "justify-end" : "justify-start")}>
                            <div className={cn(
                                "max-w-[85%] md:max-w-[65%] rounded-lg px-3 py-1.5 shadow-sm relative",
                                isMe 
                                    ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none" 
                                    : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
                            )}>
                                <p className="text-[14.2px] whitespace-pre-wrap leading-[19px]">{content}</p>
                                <div className="flex items-center justify-end gap-1 mt-0.5">
                                    <span className="text-[10px] text-white/40">{format(new Date(time), 'HH:mm')}</span>
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
