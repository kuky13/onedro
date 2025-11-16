import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Send, Link as LinkIcon, Bot, MessageSquare, Share2, Plus, Copy, Phone, Settings, Trash2, RefreshCw, X } from 'lucide-react'
import { deepseekChat, deepseekStream } from '@/services/deepseekService'
import { useToast } from '@/hooks/useToast'
import { loadMessages, saveMessage, clearMessages } from '@/services/chatMemoryService'
import { 
  getUserBudgets, 
  searchBudgets,
  getBudgetById, 
  sendBudgetViaWhatsApp, 
  parseBudgetCommand,
  createBudgetFromChat,
  getUserDefaultTemplate,
  BudgetData
} from '@/services/budgetChatIntegration'
import { useWormBudgets } from '@/hooks/worm/useWormBudgets'
import { 
  searchWormBudgets, 
  formatBudgetResultsForAI, 
  formatBudgetDetailsForAI 
} from '@/services/wormChatIntegration'
import { useShopProfile } from '@/hooks/useShopProfile'

function MarkdownLite({ text }: { text: string }) {
  const formatInline = (s: string) => {
    const parts = s.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
      if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>
      return <span key={i}>{part}</span>
    })
  }
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '---') {
      elements.push(<hr key={`hr-${i}`} className="my-2 border-border/50" />)
      i++
      continue
    }
    if (line.startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc pl-5 space-y-1">
          {items.map((it, idx) => (
            <li key={idx} className="text-sm">{formatInline(it)}</li>
          ))}
        </ul>
      )
      continue
    }
    if (line.trim().length === 0) {
      elements.push(<div key={`sp-${i}`} className="h-2" />)
      i++
      continue
    }
    elements.push(
      <p key={`p-${i}`} className="text-sm whitespace-pre-wrap">{formatInline(line)}</p>
    )
    i++
  }
  return <div className="space-y-1">{elements}</div>
}

type Role = 'user' | 'assistant'

interface ChatMessage {
  id: string
  role: Role
  content: string
  actions?: { label: string; path: string; onClick?: () => void }[]
}

const initialAssistantMessage = (name?: string) =>
  `Oi${name ? `, ${name}` : ''}! Eu sou a Drippy ✨ sua assistente da OneDrip.
Posso te ajudar com planos, licença, dashboard, orçamentos, suporte e muito mais.

💡 **NOVO!** Agora posso buscar orçamentos em tempo real do sistema Worm! Tente:
• "Me fale o orçamento da troca de tela do A12" - Busco orçamentos reais no sistema
• "Mostrar meus orçamentos recentes" - Veja seus últimos orçamentos
• "Buscar orçamento 38" - Encontre por número do orçamento
• "Enviar orçamento #123 via WhatsApp" - Compartilhe diretamente
• "Criar novo orçamento para iPhone 11" - Crie um orçamento via chat

🔍 **Busca inteligente:** Posso encontrar por:
- Modelo: "A12", "iPhone 13", "Galaxy S23", "Xiaomi Redmi"
- Serviço: "troca de tela", "bateria", "câmera", "carregador"
- Cliente: "João", "Maria", "cliente da semana passada"
- Número: "38", "123" (busca direta por número do orçamento)

⚡ **Exemplos que funcionam:**
- "Qual o orçamento do iPhone 11?"
- "Me mostre orçamentos do Galaxy S21"
- "Tem orçamento para trocar bateria do Motorola?"
- "Busque orçamento 45"

O que você precisa agora?`

const badWords = ['palavrão', 'ofensa']

const detectOffensive = (text: string) => {
  const t = text.toLowerCase()
  return badWords.some(w => t.includes(w))
}

const buildActions = (text: string, isAdmin: boolean) => {
  const t = text.toLowerCase()
  const actions: { label: string; path: string; onClick?: () => void }[] = []
  if (/(plano|planos|preço|preco|assinatura)/.test(t)) actions.push({ label: 'Abrir Planos', path: '/plans' })
  if (/(licen|ativação|ativacao)/.test(t)) actions.push({ label: 'Abrir Licença', path: '/licenca' })
  if (/(dashboard|painel)/.test(t)) actions.push({ label: 'Abrir Dashboard', path: '/dashboard' })
  if (/(ajuda|suporte|central)/.test(t)) actions.push({ label: 'Abrir Central de Ajuda', path: '/central-de-ajuda' })
  if (/(orçamento|orcamento|worm)/.test(t)) actions.push({ label: 'Abrir Orçamentos', path: '/worm' })
  if (/(sistema)/.test(t)) actions.push({ label: 'Abrir Sistema', path: '/sistema' })
  if (/(notifica|mensagem|msg)/.test(t)) actions.push({ label: 'Abrir Mensagens', path: '/msg' })
  if (isAdmin && /(admin|super)/.test(t)) actions.push({ label: 'Abrir Super Admin', path: '/supadmin' })
  return actions
}

export default function ChatPage() {
  const { profile } = useAuth()
  const { shopProfile } = useShopProfile()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [userBudgets, setUserBudgets] = useState<BudgetData[]>([])
  const [searchResults, setSearchResults] = useState<BudgetData[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const navigate = useNavigate()
  const listRef = useRef<HTMLDivElement>(null)
  const { showError, showSuccess } = useToast()
  const conversationId = 'drippy'

  // Handle WhatsApp sharing for budget
  const handleBudgetWhatsAppShare = async (budget: BudgetData) => {
    if (!shopProfile) return
    
    try {
      const { template } = await getUserDefaultTemplate(profile.id)
      const { success, error } = await sendBudgetViaWhatsApp(budget, shopProfile.name, shopProfile.contact_phone, template || undefined)
      
      if (success) {
        showSuccess({ title: 'Sucesso', description: `Orçamento #${budget.sequential_number} compartilhado via WhatsApp!` })
      } else {
        showError({ title: 'Erro ao compartilhar', description: error })
      }
    } catch (error) {
      showError({ title: 'Erro', description: 'Erro ao compartilhar orçamento' })
    }
  }

  // Handle copying budget content
  const handleBudgetCopy = async (budget: BudgetData) => {
    try {
      const { template } = await getUserDefaultTemplate(profile.id)
      const { message } = await generateBudgetWhatsAppMessage(budget, shopProfile.name, shopProfile.contact_phone, template || undefined)
      
      // Create comprehensive copy content
      const remainingDays = Math.max(0, 30 - Math.floor((Date.now() - new Date(budget.created_at).getTime()) / (1000 * 60 * 60 * 24)))
      const createdDate = new Date(budget.created_at).toLocaleDateString('pt-BR')
      
      const copyContent = `[🔍 Orçamento OR: ${budget.sequential_number.toString().padStart(4, '0')}]
📅 Data de criação: ${createdDate}
⏳ Restam ${remainingDays} dias

📱 **Template WhatsApp:**
${message}`
      
      await navigator.clipboard.writeText(copyContent)
      showSuccess({ title: 'Copiado!', description: 'Conteúdo do orçamento copiado para área de transferência' })
    } catch (error) {
      showError({ title: 'Erro ao copiar', description: 'Não foi possível copiar o conteúdo' })
    }
  }

  // Load user budgets
  const loadUserBudgets = async () => {
    if (profile?.id) {
      const { budgets, error } = await getUserBudgets(profile.id, 5)
      if (error) {
        console.error('Error loading budgets:', error)
      } else {
        setUserBudgets(budgets)
      }
    }
  }

  // Clear chat history
  const handleClearHistory = async () => {
    if (!profile?.id) return
    
    setIsClearing(true)
    try {
      const { error } = await clearMessages(profile.id, conversationId)
      if (error) {
        showError({ title: 'Erro', description: 'Não foi possível limpar o histórico' })
      } else {
        showSuccess({ title: 'Sucesso', description: 'Histórico de conversas limpo com sucesso!' })
        // Reset messages to just the initial message
        const name = profile?.name
        const first: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: initialAssistantMessage(name) }
        setMessages([first])
      }
    } catch (error) {
      showError({ title: 'Erro', description: 'Erro ao limpar histórico' })
    } finally {
      setIsClearing(false)
      setShowSettings(false)
    }
  }

  // Reset chat completely
  const handleResetChat = () => {
    const name = profile?.name
    const first: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: initialAssistantMessage(name) }
    setMessages([first])
    setShowSettings(false)
    showSuccess({ title: 'Chat Resetado', description: 'Conversa reiniciada com sucesso!' })
  }

  useEffect(() => {
    const name = profile?.name
    const init = async () => {
      if (profile?.id) {
        // Load chat history
        const { messages: stored, error } = await loadMessages(profile.id, conversationId, 100)
        if (error) {
          console.error('Failed to load chat history:', error)
        } else if (stored.length > 0) {
          const restored: ChatMessage[] = stored.map(m => ({ id: crypto.randomUUID(), role: m.role, content: m.content }))
          setMessages(restored)
          return
        }
        
        // Load user budgets
        await loadUserBudgets()
      }
      const first: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: initialAssistantMessage(name) }
      setMessages([first])
    }
    init()
  }, [profile?.id, profile?.name])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleBudgetActions = async (command: string, parsedCommand: any) => {
    if (!profile?.id || !shopProfile) return

    console.log('🔧 handleBudgetActions called with:', parsedCommand.intent, parsedCommand)

    switch (parsedCommand.intent) {
      case 'list':
        if (userBudgets.length === 0) {
          return 'Você não tem orçamentos recentes. Que tal criar um novo orçamento?'
        }
        
        let budgetList = '📋 **Seus Orçamentos Recentes:**\n\n'
        for (const budget of userBudgets) {
          // Get template for each budget if user wants detailed info
          if (budget.id && profile?.id) {
            try {
              const detailedFormat = await formatSingleBudgetBeautiful(budget, profile.id, shopProfile?.name)
              budgetList += detailedFormat + '\n\n---\n\n'
            } catch (error) {
              // Fallback to simple format if template processing fails
              budgetList += `**Orçamento #${budget.sequential_number}**\n`
              budgetList += `👤 ${budget.client_name}\n`
              budgetList += `📱 ${budget.device_type} ${budget.device_model}\n`
              budgetList += `🔧 ${budget.issue || 'Sem descrição'}\n`
              budgetList += `💰 À vista: R$ ${budget.cash_price.toFixed(2)}\n`
              budgetList += `📅 ${new Date(budget.created_at).toLocaleDateString()}\n\n`
            }
          } else {
            // Simple format without template
            budgetList += `**Orçamento #${budget.sequential_number}**\n`
            budgetList += `👤 ${budget.client_name}\n`
            budgetList += `📱 ${budget.device_type} ${budget.device_model}\n`
            budgetList += `🔧 ${budget.issue || 'Sem descrição'}\n`
            budgetList += `💰 À vista: R$ ${budget.cash_price.toFixed(2)}\n`
            budgetList += `📅 ${new Date(budget.created_at).toLocaleDateString()}\n\n`
          }
        }
        budgetList += '💡 **Dica:** Para enviar por WhatsApp, digite: "Enviar orçamento #NÚMERO"'
        return budgetList

      case 'search':
        console.log('🔍 SEARCH case triggered with:', parsedCommand)
        if (parsedCommand.deviceModel || parsedCommand.serviceType || parsedCommand.budgetNumber) {
          const searchTerm = parsedCommand.deviceModel || parsedCommand.serviceType || parsedCommand.budgetNumber?.toString() || command
          console.log('🔍 Searching for term:', searchTerm)
          
          // Use Worm search functionality for real-time results
          const { budgets: searchResults, error } = await searchWormBudgets(profile.id, { 
            search: searchTerm, 
            limit: 10 
          })
          
          console.log('🔍 Search results:', searchResults?.length, 'results, error:', error)
          
          if (error || !searchResults || searchResults.length === 0) {
            return `🔍 **Nenhum orçamento encontrado para "${searchTerm}"**\n\n` +
                   `Que tal criar um novo orçamento ou tentar uma busca diferente?\n\n` +
                   `💡 **Exemplos de busca:**\n` +
                   `• "A12" - busca por modelo\n` +
                   `• "troca de tela" - busca por serviço\n` +
                   `• "João" - busca por cliente\n` +
                   `• "38" - busca por número do orçamento`
          }
          
          // Store search results for potential actions
          setSearchResults(searchResults)
          
          // Format results using Worm integration
          const formattedResults = await formatBudgetResultsForAI(searchResults, searchTerm, profile.id, shopProfile?.name)
          console.log('🔍 Formatted results length:', formattedResults.length)
          return formattedResults
        }
        console.log('🔍 No search criteria found - returning null')
        return null

      case 'send_whatsapp':
        if (!parsedCommand.budgetNumber) {
          return 'Por favor, especifique o número do orçamento. Exemplo: "Enviar orçamento #123"'
        }
        
        // Use Worm search to find the specific budget by number
        const { budgets: searchResults, error } = await searchWormBudgets(profile.id, { 
          search: parsedCommand.budgetNumber.toString(), 
          limit: 1 
        })
        
        if (error || !searchResults || searchResults.length === 0) {
          return `Orçamento #${parsedCommand.budgetNumber} não encontrado. Verifique os orçamentos disponíveis acima.`
        }
        
        const budget = searchResults[0]

        try {
          const { template } = await getUserDefaultTemplate(profile.id)
          const { success, error } = await sendBudgetViaWhatsApp(budget, shopProfile.name, shopProfile.contact_phone, template || undefined)
          
          if (success) {
            return `✅ Orçamento #${budget.sequential_number} enviado para ${budget.client_name} via WhatsApp!`
          } else {
            return `❌ Erro ao enviar: ${error}`
          }
        } catch (error) {
          return `❌ Erro ao processar envio: ${error}`
        }

      case 'create':
        const budgetData: Partial<BudgetData> = {
          client_name: parsedCommand.clientName || (parsedCommand.clientPhone ? `Cliente ${parsedCommand.clientPhone}` : 'Cliente'),
          client_phone: parsedCommand.clientPhone || '',
          device_type: parsedCommand.deviceBrand || 'Celular',
          device_model: parsedCommand.deviceModel || '',
          issue: parsedCommand.serviceType || command,
          cash_price: parsedCommand.price || 0,
          notes: 'Criado via chat com Drippy'
        }

        const { budget: newBudget, error: createError } = await createBudgetFromChat(profile.id, budgetData)
        if (createError) {
          return `❌ Erro ao criar orçamento: ${createError}`
        }
        
        // Reload budgets
        await loadUserBudgets()
        
        return `✅ Orçamento #${newBudget.sequential_number} criado com sucesso!\n\n` +
               `📱 ${newBudget.device_type} ${newBudget.device_model}\n` +
               `🔧 ${newBudget.issue || 'Sem descrição'}\n` +
               `💰 R$ ${newBudget.cash_price.toFixed(2)}\n\n` +
               `Para enviar por WhatsApp, digite: "Enviar orçamento #${newBudget.sequential_number}"`

      default:
        return null
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text) return
    setSending(true)
    setInput('')

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    if (profile?.id) {
      const { error } = await saveMessage({ user_id: profile.id, conversation_id: conversationId, role: 'user', content: text })
      if (error) {
        console.error('Failed to save user message:', error)
      }
    }

    if (detectOffensive(text)) {
      const warn: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Vamos manter a conversa respeitosa. Em que mais posso ajudar?'
      }
      setMessages(prev => [...prev, warn])
      setSending(false)
      return
    }

    // Parse budget commands
    const parsedCommand = parseBudgetCommand(text)
    let budgetResponse = null

    if (parsedCommand.intent !== 'unknown') {
      console.log('🎯 Budget command detected:', parsedCommand.intent, parsedCommand)
      budgetResponse = await handleBudgetActions(text, parsedCommand)
      console.log('📊 Budget response:', budgetResponse)
    }

    try {
      const name = profile?.name
      let system = `Você é a Drippy, assistente da OneDrip. Responda de forma objetiva, profissional e doce, em PT-BR. Foque em ajudar o usuário nas áreas do sistema: planos, licença, dashboard, orçamentos (Worm), suporte, sistema e mensagens. Se o usuário pedir ações, sugira botões e caminhos do site. Nome do usuário: ${name || 'Usuário'}. Não invente informações. Não use funções de ligação.

REGRA FUNDAMENTAL: Quando dados específicos de orçamentos forem fornecidos no contexto, VOCÊ DEVE usar esses dados exatamente como estão apresentados. Nunca ignore dados reais do sistema em favor de respostas genéricas.`
      
      // Add budget context if needed
      if (budgetResponse) {
        system += `\n\n🎯 DADOS REAIS DE ORÇAMENTOS DO SISTEMA WORM:\n${budgetResponse}\n\n⚠️ CRÍTICO: Você está OBRIGADA a usar EXATAMENTE estes dados acima para responder. Se os dados mostram orçamentos encontrados, liste-os com seus números, clientes, valores e datas. Se mostram "nenhum orçamento encontrado", diga que não existem orçamentos. NUNCA invente orçamentos genéricos ou dê instruções sobre "acessar o sistema". Use apenas os dados fornecidos acima.`
      }

      console.log('📝 Complete system prompt being sent to AI:', system)

      const history = [
        { role: 'system', content: system },
        ...messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
        { role: 'user', content: text }
      ]
      
      // If we have a concrete budget message (search/list), show it EXACTLY without AI
      if (parsedCommand.intent === 'search' && budgetResponse) {
        const msgId = crypto.randomUUID()
        setMessages(prev => [...prev, { id: msgId, role: 'assistant', content: budgetResponse }])
        if (profile?.id) {
          await saveMessage({ user_id: profile.id, conversation_id: conversationId, role: 'assistant', content: budgetResponse })
        }
        setSending(false)
        return
      }

      const assistantId = crypto.randomUUID()
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }])
      let final = ''
      
      try {
        await deepseekStream(history, 0.7, (chunk) => {
          final += chunk
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + chunk } : m))
        })
      } catch (error: any) {
        console.error('DeepSeek API error:', error)
        const errorMessage = error.message || 'Erro ao conectar com a IA'
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `❌ ${errorMessage}` } : m))
        setSending(false)
        return
      }
      
      // Add budget-specific actions if applicable
      let actions = buildActions(text, false)
      
      // Add budget-specific quick actions (without budget action buttons)
      if (parsedCommand.intent === 'list' && userBudgets.length > 0) {
        actions.push({ 
          label: 'Ver Todos Orçamentos', 
          path: '/worm',
          onClick: () => navigate('/worm')
        })
      } else if (parsedCommand.intent === 'create') {
        actions.push({ 
          label: 'Criar Orçamento', 
          path: '/worm',
          onClick: () => navigate('/worm')
        })
      }
      
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, actions } : m))
      
      if (profile?.id) {
        const { error } = await saveMessage({ user_id: profile.id, conversation_id: conversationId, role: 'assistant', content: final })
        if (error) {
          console.error('Failed to save assistant message:', error)
        }
      }
    } catch (e: any) {
      showError({ title: 'Falha ao responder', description: e?.message || 'Erro desconhecido' })
    } finally {
      setSending(false)
    }
  }

  const handleAction = (path: string, onClick?: () => void) => {
    if (onClick) {
      onClick()
    } else {
      navigate(path)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg border flex items-center justify-center bg-primary/10 backdrop-blur-sm">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-lg">Drippy</div>
              <div className="text-sm text-muted-foreground">Assistente virtual OneDrip</div>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setShowSettings(!showSettings)}
            className="backdrop-blur-sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </Button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <Card className="mb-4 bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Configurações da IA
                </h3>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setShowSettings(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <div className="space-y-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleClearHistory}
                  disabled={isClearing || messages.length <= 1}
                  className="w-full justify-start"
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  {isClearing ? 'Limpando...' : 'Apagar Histórico'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleResetChat}
                  className="w-full justify-start"
                >
                  <RefreshCw className="w-3 h-3 mr-2" />
                  Resetar Chat
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                💡 Apagar histórico remove todas as mensagens do banco de dados. Resetar chat apenas reinicia a conversa atual.
              </p>
            </CardContent>
          </Card>
        )}

        <div ref={listRef} className="space-y-3 h-[60vh] overflow-y-auto">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <Card className={`max-w-[80%] transition-all duration-300 ${m.role === 'user' 
                ? 'bg-primary text-primary-foreground border-primary/20 shadow-lg' 
                : 'bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-lg hover:-translate-y-0.5'
              }`}>
                <CardContent className="p-4">
                  <div className={`text-sm leading-relaxed ${m.role === 'user' ? 'text-primary-foreground' : 'text-foreground'}`}>
                    {m.role === 'assistant' ? <MarkdownLite text={m.content} /> : m.content}
                  </div>
                  {/* Budget actions removed - messages now show beautiful formatting without buttons */}
                  {m.actions && m.actions.length > 0 && (
                    <div className={`mt-3 flex flex-wrap gap-2 ${m.role === 'user' ? 'opacity-90' : ''}`}>
                      {m.actions.map(a => (
                        <Button key={a.path} size="sm" variant={m.role === 'user' ? 'secondary' : 'outline'} onClick={() => handleAction(a.path, a.onClick)}>
                          <LinkIcon className="w-3 h-3 mr-1" />
                          {a.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder='Pergunte sobre orçamentos, planos, dashboard... (ex: "Me fale o orçamento do A12", "Mostrar meus orçamentos", "Enviar orçamento #123")'
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSend()
                }}
                className="bg-background/50"
              />
              <Button onClick={handleSend} disabled={sending} size="default">
                <Send className="w-4 h-4 mr-2" />
                {sending ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
            <div className="mt-3 text-xs text-muted-foreground text-center">
              💡 Dica: Tente "Me fale o orçamento do A12", "Mostrar meus orçamentos", "Enviar orçamento #123", ou "Criar orçamento iPhone 13"
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}