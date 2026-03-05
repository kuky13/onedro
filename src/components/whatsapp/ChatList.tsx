import { Chat } from './types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Smartphone } from 'lucide-react';

interface ChatListProps {
    chats: Chat[];
    activeChat: string | null;
    onSelectChat: (chatId: string) => void;
    isLoading: boolean;
    presenceMap?: Record<string, string>;
}

export function ChatList({ chats, activeChat, onSelectChat, isLoading, presenceMap = {} }: ChatListProps) {
    if (isLoading) {
        return (
            <div className="flex flex-col gap-2 p-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="h-12 w-12 rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 w-24 bg-muted rounded" />
                            <div className="h-2 w-full bg-muted rounded" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (chats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-3">
                <div className="p-4 bg-muted/50 rounded-full">
                    <Smartphone className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <div className="space-y-1">
                    <p className="font-semibold text-sm">Nenhuma conversa</p>
                    <p className="text-xs text-muted-foreground">
                        Suas conversas do WhatsApp aparecerão aqui assim que você receber ou enviar mensagens.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <ScrollArea className="h-full">
            <div className="flex flex-col">
                {chats.map((chat) => (
                    <button
                        key={chat.id}
                        onClick={() => onSelectChat(chat.id)}
                        className={cn(
                            "flex items-center gap-3 p-4 transition-all duration-200 text-left border-b border-white/5",
                            activeChat === chat.id 
                                ? "bg-[#2a3942]" 
                                : "hover:bg-[#202c33]"
                        )}
                    >
                        <div className="relative flex-shrink-0">
                            <Avatar className="h-12 w-12 border-none shadow-sm">
                                <AvatarImage src={chat.image} className="object-cover" />
                                <AvatarFallback className="bg-[#6a7175] text-white">
                                    {chat.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            {((chat.unreadCount ?? 0) > 0) && activeChat !== chat.id && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#25d366] text-[10px] font-bold text-black border-2 border-[#111b21]">
                                    {chat.unreadCount ?? 0}
                                </span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <span className="font-semibold truncate text-[15px] text-[#e9edef]">
                                    {chat.name || chat.id.split('@')[0]}
                                </span>
                                {chat.lastMessageDate && (
                                    <span className="text-[12px] flex-shrink-0 ml-2 font-normal text-[#8696a0]">
                                        {format(new Date(chat.lastMessageDate * 1000), 'HH:mm')}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {(() => {
                                  const jidKey = chat.id.split('@')[0] ?? chat.id;
                                  const presence = presenceMap[jidKey];
                                  return presence ? (
                                    <p className="text-[13px] truncate pr-2 font-medium text-[#00a884] leading-tight flex-1 animate-pulse">
                                      {presence}
                                    </p>
                                  ) : (
                                    <p className="text-[13px] truncate pr-2 font-normal text-[#8696a0] leading-tight flex-1">
                                      {chat.lastMessage || "..."}
                                    </p>
                                  );
                                })()}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </ScrollArea>
    );
}
