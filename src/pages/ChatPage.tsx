import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Send, Link as LinkIcon, Settings, Trash2, RefreshCw, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import { loadMessages, saveMessage, clearMessages, resetMood } from '@/services/chatMemoryService';
import drippyAvatar from '@/assets/drippy-avatar.png';
import { Progress } from '@/components/ui/progress';
import {
  getUserBudgets,
  sendBudgetViaWhatsApp,
  parseBudgetCommand,
  getUserDefaultTemplate,
  BudgetData } from
'@/services/budgetChatIntegration';
import { searchWormBudgets, formatBudgetResultsForAI } from '@/services/wormChatIntegration';
import { useShopProfile } from '@/hooks/useShopProfile';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { MobileHamburgerButton } from '@/components/mobile/MobileHamburgerButton';
import { useMobileMenuContext } from '@/components/mobile/MobileMenuProvider';
import { searchHelpArticles, formatHelpSuggestions, isHelpRelatedQuery } from '@/services/helpCenterIntegration';
import { motion, AnimatePresence } from 'framer-motion';

type Role = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  actions?: {label: string;path: string;onClick?: () => void;}[];
}

const initialAssistantMessage = (name?: string) =>
`Oi${name ? `, ${name}` : ''}! Eu sou a Drippy ✨ sua assistente inteligente da OneDrip.

Como posso te ajudar hoje? 💖`;

const badWords = ['palavrão', 'ofensa'];

const detectOffensive = (text: string) => {
  const t = text.toLowerCase();
  return badWords.some((w) => t.includes(w));
};

const buildActions = (text: string, isAdmin: boolean) => {
  const t = text.toLowerCase();
  const actions: {label: string;path: string;onClick?: () => void;}[] = [];
  if (/(plano|planos|preço|preco|assinatura)/.test(t)) actions.push({ label: 'Abrir Planos', path: '/plans' });
  if (/(licen|ativação|ativacao)/.test(t)) actions.push({ label: 'Abrir Licença', path: '/licenca' });
  if (/(dashboard|painel)/.test(t)) actions.push({ label: 'Abrir Dashboard', path: '/dashboard' });
  if (/(ajuda|suporte|central)/.test(t)) actions.push({ label: 'Abrir Central de Ajuda', path: '/central-de-ajuda' });
  if (/(orçamento|orcamento|worm)/.test(t)) actions.push({ label: 'Abrir Orçamentos', path: '/worm' });
  if (/(sistema)/.test(t)) actions.push({ label: 'Abrir Sistema', path: '/sistema' });
  if (/(notifica|mensagem|msg)/.test(t)) actions.push({ label: 'Abrir Mensagens', path: '/msg' });
  if (/(loja|store)/.test(t)) actions.push({ label: 'Abrir Minha Loja', path: '/store' });
  if (isAdmin && /(admin|super)/.test(t)) actions.push({ label: 'Abrir Super Admin', path: '/supadmin' });
  return actions;
};

// Quick suggestion chips
const QUICK_SUGGESTIONS = [
{ label: '📋 Meus orçamentos', text: 'mostre meus orçamentos' },
{ label: '🔧 Minhas OS', text: 'mostre minhas ordens de serviço' },
{ label: '👥 Meus clientes', text: 'mostre meus clientes' },
{ label: '📊 Estatísticas', text: 'mostre minhas estatísticas de orçamentos' }];


export default function ChatPage() {
  const { profile } = useAuth();
  const { shopProfile } = useShopProfile();
  const { isOpen, toggleMenu } = useMobileMenuContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [userBudgets, setUserBudgets] = useState<BudgetData[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [moodLevel, setMoodLevel] = useState(100);
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const { showError, showSuccess } = useToast();
  const conversationId = 'drippy';

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    endRef.current?.scrollIntoView({ behavior, block: 'end' });
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior });
  };

  // Load mood level
  const loadMoodLevel = async () => {
    if (profile?.id) {
      const { data } = await supabase.
      from('chat_mood').
      select('mood_level').
      eq('user_id', profile.id).
      eq('conversation_id', conversationId).
      maybeSingle();

      if (data) {
        setMoodLevel(data.mood_level);
      }
    }
  };

  const getMoodEmoji = (level: number) => {
    if (level >= 80) return '😊';
    if (level >= 60) return '😐';
    if (level >= 40) return '😕';
    if (level >= 20) return '😠';
    return '😡';
  };

  const getMoodText = (level: number) => {
    if (level >= 80) return 'Amigável';
    if (level >= 60) return 'Normal';
    if (level >= 40) return 'Chateada';
    if (level >= 20) return 'Irritada';
    return 'Muito Irritada';
  };

  const toChatBudget = (b: any): BudgetData => ({
    id: b.id,
    client_name: b.client_name ?? 'Cliente',
    client_phone: b.client_phone ?? '',
    device_type: b.device_type ?? '',
    device_model: b.device_model ?? '',
    issue: b.issue ?? '',
    cash_price: b.cash_price ?? 0,
    installment_price: b.installment_price ?? 0,
    warranty_months: b.warranty_months ?? 0,
    includes_delivery: b.includes_delivery ?? false,
    includes_screen_protector: b.includes_screen_protector ?? false,
    custom_services: b.custom_services ?? '',
    notes: b.notes ?? '',
    sequential_number: b.sequential_number ?? 0,
    created_at: b.created_at ?? new Date().toISOString(),
    budget_parts: b.budget_parts ?? b.budget_parts ?? []
  });

  const loadUserBudgets = async () => {
    if (profile?.id) {
      const { budgets, error } = await getUserBudgets(profile.id, 5);
      if (error) {
        console.error('Error loading budgets:', error);
      } else {
        setUserBudgets((budgets as any[]).map(toChatBudget));
      }
    }
  };

  const handleClearHistory = async () => {
    if (!profile?.id) return;

    setIsClearing(true);
    try {
      const { error } = await clearMessages(profile.id, conversationId);
      if (error) {
        showError({ title: 'Erro', description: 'Não foi possível limpar o histórico' });
        return;
      }

      await resetMood(profile.id, conversationId);
      showSuccess({ title: 'Sucesso', description: 'Histórico e humor resetados! ✨' });
      setMoodLevel(100);

      const name = profile?.name;
      const first: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: initialAssistantMessage(name) };
      setMessages([first]);
    } catch (error) {
      showError({ title: 'Erro', description: 'Erro ao limpar histórico' });
    } finally {
      setIsClearing(false);
      setShowSettings(false);
    }
  };

  const handleResetChat = () => {
    const name = profile?.name;
    const first: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: initialAssistantMessage(name) };
    setMessages([first]);
    setShowSettings(false);
    showSuccess({ title: 'Chat Resetado', description: 'Conversa reiniciada!' });
  };

  useEffect(() => {
    const name = profile?.name;
    const init = async () => {
      if (profile?.id) {
        const { messages: stored, error } = await loadMessages(profile.id, conversationId, 100);
        if (error) {
          console.error('Failed to load chat history:', error);
        } else if (stored.length > 0) {
          const restored: ChatMessage[] = stored.map((m) => ({ id: crypto.randomUUID(), role: m.role, content: m.content }));
          setMessages(restored);
          await loadMoodLevel();
          return;
        }

        await loadUserBudgets();
        await loadMoodLevel();
      }
      const first: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: initialAssistantMessage(name) };
      setMessages([first]);
    };
    init();
  }, [profile?.id, profile?.name]);

  useEffect(() => {
    if (messages.length > 0 && profile?.id) {
      loadMoodLevel();
    }
  }, [messages.length]);

  useEffect(() => {
    requestAnimationFrame(() => scrollToBottom('auto'));
    const t1 = setTimeout(() => scrollToBottom('smooth'), 200);
    const t2 = setTimeout(() => scrollToBottom('auto'), 700);
    return () => {clearTimeout(t1);clearTimeout(t2);};
  }, [messages, sending]);

  const handleBudgetActions = async (command: string, parsedCommand: any) => {
    if (!profile?.id || !shopProfile) return;

    switch (parsedCommand.intent) {
      case 'list':{
          if (userBudgets.length === 0) {
            return 'Você não tem orçamentos recentes.';
          }

          let budgetList = '📋 **Seus Orçamentos Recentes:**\n\n';
          for (const budget of userBudgets) {
            budgetList += `**Orçamento #${budget.sequential_number}**\n`;
            budgetList += `👤 ${budget.client_name}\n`;
            budgetList += `📱 ${budget.device_type} ${budget.device_model}\n`;
            budgetList += `💰 R$ ${budget.cash_price.toFixed(2)}\n\n`;
          }
          return budgetList;
        }

      case 'search':{
          if (parsedCommand.deviceModel || parsedCommand.budgetNumber) {
            const searchTerm = parsedCommand.deviceModel || parsedCommand.budgetNumber?.toString() || command;

            const searchFilters: any = {
              search: searchTerm,
              limit: 10
            };

            const { budgets: searchResults, error } = await searchWormBudgets(profile.id, searchFilters);

            if (error || !searchResults || searchResults.length === 0) {
              return `🔍 Nenhum orçamento encontrado para "${searchTerm}"`;
            }

            const normalized = (searchResults as any[]).map(toChatBudget);

            const formattedResults = await formatBudgetResultsForAI(
              normalized,
              searchTerm,
              profile.id,
              shopProfile?.shop_name
            );

            return formattedResults;
          }
          return null;
        }

      case 'send_whatsapp':{
          if (!parsedCommand.budgetNumber) {
            return 'Especifique o número do orçamento.';
          }

          const { budgets: results, error } = await searchWormBudgets(profile.id, {
            search: parsedCommand.budgetNumber.toString(),
            limit: 1
          });

          if (error || !results || results.length === 0) {
            return `Orçamento #${parsedCommand.budgetNumber} não encontrado.`;
          }

          const budget = toChatBudget((results as any[])[0]);

          try {
            const { template } = await getUserDefaultTemplate(profile.id);
            const templateForSend = template ?
            {
              ...template,
              name: (template as any).name ?? (template as any).template_name ?? 'Template'
            } as any :
            undefined;

            const { success, error } = await sendBudgetViaWhatsApp(
              budget,
              shopProfile.shop_name,
              shopProfile.contact_phone,
              templateForSend
            );

            if (success) {
              return `✅ Orçamento #${budget.sequential_number} enviado!`;
            } else {
              return `❌ Erro: ${error}`;
            }
          } catch {
            return `❌ Erro ao processar envio`;
          }
        }

      case 'create':
        return null;

      default:
        return null;
    }
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text) return;
    setSending(true);
    if (!overrideText) setInput('');

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    if (profile?.id) {
      const { error } = await saveMessage({ user_id: profile.id, conversation_id: conversationId, role: 'user', content: text });
      if (error) {
        console.error('Failed to save user message:', error);
      }
    }

    if (detectOffensive(text)) {
      const warn: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Vamos manter a conversa respeitosa.'
      };
      setMessages((prev) => [...prev, warn]);
      setSending(false);
      return;
    }

    const parsedCommand = parseBudgetCommand(text);
    let budgetResponse = null;

    if (parsedCommand.intent !== 'unknown') {
      budgetResponse = await handleBudgetActions(text, parsedCommand);
    }

    try {
      const isAdmin = profile?.role === 'admin';
      const actions = buildActions(text, isAdmin);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Você precisa estar autenticado');
      }

      const messageHistory = messages.map((m) => ({
        role: m.role,
        content: m.content
      }));
      messageHistory.push({
        role: 'user',
        content: text
      });

      const { data, error: invokeError } = await supabase.functions.invoke('chat-ai', {
        body: {
          message: text,
          conversationId,
          messageHistory: messageHistory.slice(-11)
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      let aiResponse = data?.reply || 'Desculpe, não consegui processar isso.';

      if (isHelpRelatedQuery(text) && !budgetResponse) {
        const helpSuggestions = searchHelpArticles(text, 3);
        if (helpSuggestions.length > 0) {
          const suggestionsText = formatHelpSuggestions(helpSuggestions);
          aiResponse += '\n\n' + suggestionsText;
        }
      }

      const assistantId = crypto.randomUUID();
      const resp: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: aiResponse,
        ...(actions.length > 0 ? { actions } : {})
      };
      setMessages((prev) => [...prev, resp]);

      if (profile?.id) {
        const { error } = await saveMessage({ user_id: profile.id, conversation_id: conversationId, role: 'assistant', content: aiResponse });
        if (error) {
          console.error('Failed to save assistant message:', error);
        }
      }
    } catch (e: any) {
      showError({ title: 'Falha', description: e?.message || 'Erro desconhecido' });
    } finally {
      setSending(false);
    }
  };

  const showSuggestions = messages.length <= 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-3">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <MobileHamburgerButton
              isOpen={isOpen}
              onClick={toggleMenu} />
            

            <div className="flex-1 flex items-center justify-center">
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-background/40 backdrop-blur-xl border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 p-[2px]">
                    <img
                      src={drippyAvatar}
                      alt="Drippy"
                      className="w-full h-full rounded-full object-cover" />
                    
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 text-xs">
                    {getMoodEmoji(moodLevel)}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-sm font-semibold text-foreground">Drippy</h1>
                    
                  </div>
                  <p className="text-[10px] text-primary/70 font-medium">Online • IA Assistente</p>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              className="h-9 w-9 rounded-full bg-muted/60 hover:bg-muted">
              
              <Settings className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings &&
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden sticky top-[61px] z-10 px-4">
          
            <div className="container mx-auto max-w-3xl py-3">
              <div className="rounded-2xl bg-background/40 backdrop-blur-xl border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.3)] px-4 py-4 space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Humor da Drippy</span>
                  <span className="text-xs text-foreground flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-full">
                    {getMoodEmoji(moodLevel)} {getMoodText(moodLevel)}
                  </span>
                </div>
                <Progress
                  value={moodLevel}
                  className="h-1.5" />
                
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetChat}
                  className="h-8 text-xs rounded-xl">
                  
                  <RefreshCw className="h-3 w-3 mr-1.5" />
                  Reiniciar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearHistory}
                  disabled={isClearing}
                  className="h-8 text-xs rounded-xl">
                  
                  <Trash2 className="h-3 w-3 mr-1.5" />
                  {isClearing ? 'Limpando...' : 'Limpar Tudo'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(false)}
                  className="h-8 w-8 p-0 ml-auto rounded-xl">
                  
                  <X className="h-3 w-3" />
                </Button>
              </div>
              </div>
            </div>
          </motion.div>
        }
      </AnimatePresence>

      {/* Messages */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-5 container mx-auto max-w-3xl">
        
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
              
              <div className={`flex items-end gap-2 max-w-[88%] md:max-w-[75%]`}>

                {/* Assistant Avatar */}
                {!isUser &&
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 p-[1.5px] flex-shrink-0 mb-0.5">
                    <img
                    src={drippyAvatar}
                    alt="Drippy"
                    className="w-full h-full rounded-full object-cover" />
                  
                  </div>
                }

                <div className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Bubble */}
                  <div
                    className={`
                      relative px-4 py-2.5 text-[14px] leading-relaxed
                      ${isUser ?
                    'bg-primary text-primary-foreground rounded-2xl rounded-br-md shadow-md shadow-primary/10' :
                    'bg-card/80 backdrop-blur-sm border border-border/20 text-foreground rounded-2xl rounded-bl-md'}
                    `}>
                    
                    <div className="prose prose-sm dark:prose-invert max-w-none break-words [&>p]:m-0">
                      {isUser ?
                      <p className="whitespace-pre-wrap m-0">{m.content}</p> :

                      <MarkdownRenderer text={m.content} />
                      }
                    </div>
                  </div>

                  {/* Action Cards */}
                  {!isUser && m.actions && m.actions.length > 0 &&
                  <div className="flex flex-wrap gap-1.5 mt-0.5 ml-0.5">
                      {m.actions.map((action, actionIdx) =>
                    <Button
                      key={actionIdx}
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(action.path)}
                      className="h-7 rounded-full px-3 text-[11px] font-medium bg-primary/10 hover:bg-primary/20 border-0 shadow-none transition-all text-foreground/80 hover:text-foreground hover:scale-105">
                      
                          <LinkIcon className="h-3 w-3 mr-1 opacity-60" />
                          {action.label}
                        </Button>
                    )}
                    </div>
                  }
                </div>
              </div>
            </motion.div>);

        })}

        {/* Quick Suggestions (shown only at start) */}
        {showSuggestions && !sending &&
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="flex flex-wrap gap-2 justify-center pt-2">
          
            {QUICK_SUGGESTIONS.map((s, i) =>
          <button
            key={i}
            onClick={() => {
              setInput('');
              handleSend(s.text);
            }}
            className="text-xs px-3.5 py-2 rounded-full border border-border/30 bg-card/60 hover:bg-primary/10 hover:border-primary/30 text-foreground/70 hover:text-foreground transition-all duration-200">
            
                {s.label}
              </button>
          )}
          </motion.div>
        }

        {/* Typing Indicator */}
        {sending &&
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-start w-full">
          
            <div className="flex items-end gap-2 max-w-[88%]">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 p-[1.5px] flex-shrink-0 mb-0.5">
                <img
                src={drippyAvatar}
                alt="Drippy"
                className="w-full h-full rounded-full object-cover" />
              
              </div>
              <div className="bg-card/80 backdrop-blur-sm border border-border/20 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1.5 items-center h-4">
                  <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
                  <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }}></div>
                  <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }}></div>
                </div>
              </div>
            </div>
          </motion.div>
        }
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 mobile-safe pb-4 pt-3 px-4">
        <div className="container mx-auto max-w-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="relative">
            
            <div className="relative flex items-center rounded-2xl bg-background/40 backdrop-blur-xl border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.3)] px-4 py-1.5">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte algo para a Drippy..."
                disabled={sending}
                className="min-h-[40px] border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-0 pr-10 text-[14px] placeholder:text-muted-foreground/50" />
              
              <Button
                type="submit"
                disabled={!input.trim() || sending}
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 disabled:hover:scale-100">
                
                {sending ?
                <div className="loading-spinner w-4 h-4" /> :

                <Send className="h-4 w-4" />
                }
              </Button>
            </div>
          </form>
        </div>
      </div>

      
    </div>);

}