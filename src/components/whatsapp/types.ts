export interface Chat {
    id: string; // remoteJid
    name: string;
    image?: string;
    lastMessage?: string;
    lastMessageDate?: number;
    unreadCount?: number;
}

export interface Message {
    id: string;
    key: {
        remoteJid: string;
        fromMe: boolean;
        id: string;
    };
    message: {
        conversation?: string;
        text?: string;
        extendedTextMessage?: {
            text: string;
        };
        imageMessage?: {
            caption?: string;
            url?: string; // might be base64 or url
        };
        videoMessage?: {
            caption?: string;
            url?: string;
        };
        audioMessage?: {
            url?: string;
        };
        stickerMessage?: Record<string, unknown>;
        protocolMessage?: Record<string, unknown>;
    };
    pushName?: string;
    messageTimestamp: number | string;
    isNote?: boolean; // internal note — not sent to WhatsApp
}
