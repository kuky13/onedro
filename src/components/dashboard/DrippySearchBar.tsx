import { useState, useEffect, useRef } from "react";
import { Search, Send, ExternalLink, X, Settings, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/useToast";
import { loadMessages, saveMessage, clearMessages } from "@/services/chatMemoryService";
import drippyAvatar from "@/assets/drippy-avatar.png";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const placeholders = [
"Pesquisar com a Drippy",
"Falar com a Drippy",
"Pesquise orçamentos com a Drippy",
"Seja gentil com a Drippy",
"Pergunte qualquer coisa para a Drippy",
"Amanhã há de ser outro dia",
"Eu prefiro ser essa metamorfose ambulante",
"Quem é de verdade sabe quem é de mentira",
"Não precisa morrer pra ver Deus",
"Dias de luta, dias de glória",
"Pra quem se sente só, o silêncio é um absurdo",
"Se custar a minha paz já custou caro demais",
"Quem me julga de primeira não merece minha segunda instância",
"As flores são pra lembrar que a gente é passageiro",
"As flores são o nosso presente derradeiro",
"Meu lucro é líquido, mas meu esforço é sólido",
"Beba água, não beba álcool",
"Beba água, Dane-se o plastico",
"Faça Bolhas não fumaça",
"Seja feliz, não se preocupe com o passado",
"Seja feliz, não se preocupe com o futuro",
"Seja feliz, não se preocupe com o presente",
"Já bebeu agua hoje?"];


interface DrippySearchBarProps {
  className?: string;
}

export const DrippySearchBar = ({ className = "" }: DrippySearchBarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [shuffledPlaceholders, setShuffledPlaceholders] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showDrippyTip, setShowDrippyTip] = useState(false);

  useEffect(() => {
    setShowDrippyTip(true);
  }, []);

  const handleCloseDrippyTip = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem('has_seen_drippy_tutorial', 'true');
    setShowDrippyTip(false);
  };
  const { profile } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();
  const messagesRef = useRef<HTMLDivElement>(null);
  const conversationId = "drippy";

  // Shuffle array using Fisher-Yates algorithm
  const shuffleArray = (array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp;
    }
    return shuffled;
  };

  // Initialize shuffled placeholders
  useEffect(() => {
    setShuffledPlaceholders(shuffleArray(placeholders));
  }, []);

  // Rotate placeholder with random order and no repetition
  useEffect(() => {
    if (shuffledPlaceholders.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1;
        // When we reach the end, reshuffle and start over
        if (nextIndex >= shuffledPlaceholders.length) {
          setShuffledPlaceholders(shuffleArray(placeholders));
          return 0;
        }
        return nextIndex;
      });
    }, 20000);
    return () => clearInterval(interval);
  }, [shuffledPlaceholders]);

  // Load messages when opening
  useEffect(() => {
    if (isOpen && profile?.id) {
      loadChatHistory();
    }
  }, [isOpen, profile?.id]);

  // Auto-scroll to latest message
  useEffect(() => {
    requestAnimationFrame(() => {
      messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
    });
    const t = setTimeout(() => {
      messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
    }, 200);
    return () => clearTimeout(t);
  }, [messages]);

  const loadChatHistory = async () => {
    if (!profile?.id) return;

    const { messages: stored, error } = await loadMessages(profile.id, conversationId, 50);

    if (error) {
      console.error("Failed to load chat history:", error);
      // Start with welcome message
      const welcomeMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Oi${profile.name ? `, ${profile.name}` : ""}! 👋 Como posso ajudar?`
      };
      setMessages([welcomeMsg]);
    } else if (stored.length > 0) {
      const restored: ChatMessage[] = stored.map((m) => ({
        id: crypto.randomUUID(),
        role: m.role as "user" | "assistant",
        content: m.content
      }));
      setMessages(restored);
    } else {
      // Welcome message
      const welcomeMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Oi${profile.name ? `, ${profile.name}` : ""}! 👋 Como posso ajudar?`
      };
      setMessages([welcomeMsg]);
    }
  };

  const handleClearHistory = async () => {
    if (!profile?.id) return;

    setIsClearing(true);
    try {
      await clearMessages(profile.id, conversationId);

      const welcomeMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Oi${profile.name ? `, ${profile.name}` : ""}! 👋 Como posso ajudar?`
      };
      setMessages([welcomeMsg]);
      showSuccess({ title: "Histórico limpo", description: "Conversa limpa com sucesso!" });
    } catch (error) {
      showError({ title: "Erro", description: "Erro ao limpar histórico" });
    } finally {
      setIsClearing(false);
      setShowSettings(false);
    }
  };

  const handleResetChat = () => {
    const name = profile?.name;
    const welcomeMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `Oi${name ? `, ${name}` : ""}! 👋 Como posso ajudar?`
    };
    setMessages([welcomeMsg]);
    setShowSettings(false);
    showSuccess({ title: "Chat Resetado", description: "Conversa reiniciada!" });
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput("");

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text
    };
    setMessages((prev) => [...prev, userMsg]);

    if (profile?.id) {
      await saveMessage({
        user_id: profile.id,
        conversation_id: conversationId,
        role: "user",
        content: text
      });
    }

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Você precisa estar autenticado");
      }

      const { data, error: invokeError } = await supabase.functions.invoke("chat-ai", {
        body: {
          message: text,
          conversationId,
          messageHistory: [...messages, userMsg].map((msg) => ({
            role: msg.role,
            content: msg.content
          }))
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      const aiResponse = data?.reply || "Desculpe, não consegui processar isso.";
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: aiResponse
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (profile?.id) {
        await saveMessage({
          user_id: profile.id,
          conversation_id: conversationId,
          role: "assistant",
          content: aiResponse
        });
      }
    } catch (e: any) {
      showError({ title: "Erro", description: e?.message || "Erro desconhecido" });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Search Bar */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`relative ${className}`}>
        <button
          onClick={() => navigate('/chat')}
          className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 hover:from-primary/10 hover:via-primary/15 hover:to-primary/10 border border-border/50 hover:border-primary/30 transition-all duration-300 p-4 text-left">

          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">

                  {shuffledPlaceholders.length > 0 ? shuffledPlaceholders[currentIndex] : placeholders[0]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </button>

        {showDrippyTip &&
        <div className="absolute left-1/2 top-full z-50 mt-2 w-52 -translate-x-1/2">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="origin-top animate-in">
              <div className="relative rounded-lg bg-primary px-3 py-2 text-primary-foreground shadow-md">
                <div className="absolute left-1/2 -top-1.5 h-3 w-3 -translate-x-1/2 rotate-45 bg-primary" />
                <div className="relative z-10 flex items-center gap-2">
                  <p className="flex-1 text-[11px] leading-snug">
                    Pesquise orçamentos e tire dúvidas com IA!
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-5 shrink-0 rounded-md px-2 text-[10px] font-semibold text-primary"
                    onClick={handleCloseDrippyTip}>
                    OK
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        }
      </motion.div>

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl h-[600px] p-0 flex flex-col gap-0">
          {/* Header */}
          <DialogHeader className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={drippyAvatar}
                  alt="Drippy"
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-border/20" />

                <DialogTitle className="text-base font-semibold">Drippy</DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate("/chat")} className="h-8 text-xs">
                  <ExternalLink className="h-3 w-3 mr-1.5" />
                  Abrir Chat
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)} className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Settings Panel */}
          {showSettings &&
          <div className="border-b border-border/10 bg-muted/30 px-4 py-3">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleResetChat} className="h-8 text-xs flex-1">
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                    Resetar
                  </Button>
                  <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearHistory}
                  disabled={isClearing}
                  className="h-8 text-xs flex-1">

                    <Trash2 className="h-3 w-3 mr-1.5" />
                    {isClearing ? "Limpando..." : "Limpar"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)} className="h-8 w-8 p-0">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          }

          {/* Messages */}
          <div ref={messagesRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((m) =>
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" &&
              <div className="flex items-start gap-2 max-w-[85%]">
                    <img
                  src={drippyAvatar}
                  alt="Drippy"
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-border/10 flex-shrink-0 mt-1" />

                    <div className="bg-muted/50 rounded-2xl rounded-tl-md px-3 py-2 border border-border/10">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <MarkdownRenderer text={m.content} />
                      </div>
                    </div>
                  </div>
              }

                {m.role === "user" &&
              <div className="bg-primary/10 rounded-2xl rounded-tr-md px-3 py-2 max-w-[85%] border border-primary/20">
                    <p className="text-sm text-foreground">{m.content}</p>
                  </div>
              }
              </div>
            )}

            {sending &&
            <div className="flex justify-start">
                <div className="flex items-start gap-2 max-w-[85%]">
                  <img
                  src={drippyAvatar}
                  alt="Drippy"
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-border/10 flex-shrink-0 mt-1" />

                  <div className="bg-muted/50 rounded-2xl rounded-tl-md px-3 py-2 border border-border/10">
                    <div className="flex gap-1">
                      <span
                      className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                      style={{ animationDelay: "0ms" }} />

                      <span
                      className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                      style={{ animationDelay: "150ms" }} />

                      <span
                      className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                      style={{ animationDelay: "300ms" }} />

                    </div>
                  </div>
                </div>
              </div>
            }
          </div>

          {/* Input */}
          <div className="border-t border-border/50 p-4">
            <div className="flex items-end gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Mensagem..."
                disabled={sending}
                className="flex-1 resize-none min-h-[40px] max-h-[120px]" />

              <Button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                size="icon"
                className="h-10 w-10 flex-shrink-0">

                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>);

};