import { supabase } from '@/integrations/supabase/client'
import { generateWhatsAppMessageFromTemplate } from '@/utils/whatsappTemplateUtils'
import { formatCurrency } from '@/utils/currency'
import { BudgetData } from './budgetChatIntegration'

/**
 * Calculate remaining days for a budget
 */
function calculateRemainingDays(createdAt: string): number {
  const createdDate = new Date(createdAt)
  const currentDate = new Date()
  const diffTime = currentDate.getTime() - createdDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, 30 - diffDays) // Assuming 30-day validity
}

interface WormSearchFilters {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

/**
 * Search budgets using the same logic as WormBudgetList - for AI chat integration
 */
export async function searchWormBudgets(userId: string, filters: WormSearchFilters = {}) {
  try {
    if (!userId) return { budgets: [], error: null }
    return await searchWormBudgetsFallback(userId, filters)
  } catch (error) {
    console.error('Exception searching Worm budgets:', error)
    return { budgets: [], error }
  }
}

/**
 * Fallback search using the same logic as WormBudgetList
 */
async function searchWormBudgetsFallback(userId: string, filters: WormSearchFilters = {}) {
  try {
    const numericSearch = (filters.search || '').trim()
    const searchNum = numericSearch && /^\d+$/.test(numericSearch) ? parseInt(numericSearch, 10) : null
    
    let query = supabase
      .from('budgets')
      .select('*')
      .eq('owner_id', userId)
      .neq('workflow_status', 'template')
      .neq('client_name', 'TEMPLATE')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (filters.search) {
      const baseOr = `client_name.ilike.%${filters.search}%,device_model.ilike.%${filters.search}%,device_type.ilike.%${filters.search}%`
      query = searchNum != null
        ? query.or(`${baseOr},sequential_number.eq.${searchNum}`)
        : query.or(baseOr)
    }

    if (filters.status) {
      query = query.eq('workflow_status', filters.status)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error } = await query
    if (error) throw error
    
    return { budgets: data || [], error: null }
  } catch (error) {
    console.error('Exception in Worm fallback search:', error)
    return { budgets: [], error }
  }
}

/**
 * Format budget results for AI chat response using actual templates
 */
export async function formatBudgetResultsForAI(budgets: BudgetData[], searchTerm: string, userId?: string, companyName?: string): Promise<string> {
  if (!budgets || budgets.length === 0) {
    return `🔍 **Nenhum orçamento encontrado para "${searchTerm}"**\n\n` +
           `💡 **Dicas de busca:**\n` +
           `• Tente buscar por modelo: "A12", "iPhone 13"\n` +
           `• Tente buscar por serviço: "troca de tela", "bateria"\n` +
           `• Tente buscar por cliente: "João", "Maria"\n` +
           `• Tente buscar por número: "38", "123"`
  }

  // Helper: ensure budget_parts are hydrated for template expansion
  const ensureParts = async (budget: BudgetData) => {
    if (!budget.budget_parts || budget.budget_parts.length === 0) {
      try {
        const { supabase } = await import('@/integrations/supabase/client')
        const { data } = await supabase
          .from('budget_parts')
          .select('*')
          .eq('budget_id', budget.id)
        if (Array.isArray(data) && data.length > 0) {
          budget.budget_parts = data as any
        }
      } catch {}
    }
    return budget
  }

  // For single budget, return EXACT WhatsApp template message only
  if (budgets.length === 1) {
    let budget = budgets[0]
    budget = await ensureParts(budget)
    const remainingDays = calculateRemainingDays(budget.created_at)
    const isValid = remainingDays > 0
    
    // Get the actual WhatsApp template from the user
    let template = null
    let whatsappMessage = ''
    
    if (userId) {
      const { template: userTemplate } = await getUserDefaultTemplate(userId)
      template = userTemplate
      
      if (template && template.message_template) {
        // Generate the actual WhatsApp message using the template
        whatsappMessage = generateWhatsAppMessageFromTemplate(
          template.message_template,
          budget,
          companyName || 'OneDrip',
          30 // Default warning days
        )
      }
    }
    
    // If no template found, use the default WhatsApp template format exactly
    if (!whatsappMessage) {
      whatsappMessage = generateWhatsAppMessageFromTemplate(
        `📱 *{nome_empresa}* 

*Aparelho:* {modelo_dispositivo} 
*Serviço:* {nome_reparo} 

{qualidades_inicio}*{qualidade_nome}* – {peca_garantia_meses} meses de garantia 
💰 À vista {peca_preco_vista} ou {peca_preco_parcelado} no cartão em até {peca_parcelas}x de {peca_valor_parcela} 

{qualidades_fim} 
*📦 Serviços Inclusos:* 
{servicos_inclusos} 

🚫 Não cobre danos por água ou molhado 

📝 *Observações* 
{observacoes} 

📅 Válido até: {data_validade}`,
        budget,
        companyName || 'OneDrip',
        30
      )
    }

    return whatsappMessage
  }

  // For multiple budgets, return ONLY the template messages joined by separators
  let messages: string[] = []
  // Get user template if available (only once for efficiency)
  let userTemplate = null
  if (userId) {
    const { template } = await getUserDefaultTemplate(userId)
    userTemplate = template
  }
  
  for (let budget of budgets) {
    budget = await ensureParts(budget)
    let whatsappMessage = ''
    if (userTemplate && userTemplate.message_template) {
      whatsappMessage = generateWhatsAppMessageFromTemplate(
        userTemplate.message_template,
        budget,
        companyName || 'OneDrip',
        30
      )
    }
    if (!whatsappMessage) {
      whatsappMessage = generateWhatsAppMessageFromTemplate(
        `📱 *{nome_empresa}* 

*Aparelho:* {modelo_dispositivo} 
*Serviço:* {nome_reparo} 

{qualidades_inicio}*{qualidade_nome}* – {peca_garantia_meses} meses de garantia 
💰 À vista {peca_preco_vista} ou {peca_preco_parcelado} no cartão em até {peca_parcelas}x de {peca_valor_parcela} 

{qualidades_fim} 
*📦 Serviços Inclusos:* 
{servicos_inclusos} 

🚫 Não cobre danos por água ou molhado 

📝 *Observações* 
{observacoes} 

📅 Válido até: {data_validade}`,
        budget,
        companyName || 'OneDrip',
        30
      )
    }
    messages.push(whatsappMessage)
  }
  
  return messages.join('\n\n---\n\n')
}

/**
 * Format single budget with detailed header and WhatsApp template
 */
function formatSingleBudgetDetailed(budget: BudgetData): string {
  const remainingDays = calculateRemainingDays(budget.created_at)
  const createdDate = new Date(budget.created_at).toLocaleDateString('pt-BR')
  
  // Header section
  let result = `[🔍 Orçamento OR: ${budget.sequential_number.toString().padStart(4, '0')}]\n`
  result += `📅 Data de criação: ${createdDate}\n`
  result += `⏳ Restam ${remainingDays} dias\n\n`
  
  // Generate WhatsApp template
  const whatsappMessage = generateWhatsAppMessage(budget, 'OneDrip', '(11) 99999-9999')
  
  // WhatsApp template section
  result += `📱 **Template WhatsApp:**\n`
  result += `${whatsappMessage}\n\n`
  
  // Action buttons
  result += `🔧 **Ações disponíveis:**\n`
  result += `• Compartilhar via WhatsApp\n`
  result += `• Copiar conteúdo completo\n\n`
  
  result += `💡 **Dica:** Use os botões acima para compartilhar este orçamento!`
  
  return result
}

/**
 * Enhanced beautiful format for budget messages using actual WhatsApp templates with perfect precision
 */
export async function formatSingleBudgetBeautiful(budget: BudgetData, userId?: string, companyName?: string): Promise<string> {
  const remainingDays = calculateRemainingDays(budget.created_at)
  const createdDate = new Date(budget.created_at).toLocaleDateString('pt-BR')
  
  // Get the actual WhatsApp template from the user with enhanced error handling
  let template = null
  let templateError = null
  
  if (userId) {
    try {
      const { template: userTemplate, error } = await getUserDefaultTemplate(userId)
      template = userTemplate
      templateError = error
    } catch (error) {
      console.error('Error fetching user template:', error)
      templateError = error
    }
  }
  
  // Enhanced template processing with fallback options
  let whatsappMessage = ''
  
  if (template && template.message_template) {
    try {
      // Use the proper template processing with placeholders and enhanced data
      whatsappMessage = generateWhatsAppMessageFromTemplate(
        template.message_template,
        budget,
        companyName || 'OneDrip',
        30 // Default warning days
      )
    } catch (error) {
      console.error('Error generating template message:', error)
      // Fallback to default template if user template fails
      template = null
    }
  }
  
  // If no template or template failed, use enhanced default template
  if (!whatsappMessage) {
    try {
      whatsappMessage = generateWhatsAppMessageFromTemplate(
        `📱 *{nome_empresa}* 

*💎 Orçamento Exclusivo #{numero_orcamento}*

*👤 Cliente:* {nome_cliente} 
*📱 Aparelho:* {modelo_dispositivo} ({tipo_dispositivo})
*🔧 Serviço:* {nome_reparo}

{qualidades_inicio}✨ *{qualidade_nome}* 
💰 À vista: {peca_preco_vista} 
💳 Parcelado: {peca_preco_parcelado} em {peca_parcelas}x de {peca_valor_parcela}
🛡️ Garantia: {peca_garantia_meses} meses
{qualidades_fim}

*📦 Serviços Inclusos:* 
{servicos_inclusos}

⚠️ *Importante:* 
• Não cobre danos por água ou molhado
• Válido por 30 dias

📝 *Observações:* 
{observacoes}

📅 *Validade:* {data_validade}

💡 *Dúvidas?* Estamos aqui para ajudar!`,
        budget,
        companyName || 'OneDrip',
        30
      )
    } catch (error) {
      console.error('Error generating default template message:', error)
      // Ultimate fallback to simple format
      whatsappMessage = `📱 *${companyName || 'OneDrip'}*

*Orçamento #${budget.sequential_number}*
👤 *Cliente:* ${budget.client_name}
📱 *Aparelho:* ${budget.device_model}
🔧 *Serviço:* ${budget.issue || 'Serviço não especificado'}
💰 *À vista:* ${formatCurrency(budget.cash_price)}
📅 *Validade:* ${remainingDays} dias`
    }
  }
  
  // Professional header with enhanced formatting
  let result = `✨ **ORÇAMENTO EXCLUSIVO** ✨\n\n`
  result += `🎯 **Número:** #${budget.sequential_number.toString().padStart(4, '0')}\n`
  result += `📊 **Status:** ${remainingDays > 0 ? '✅ Válido' : '⚠️ Expirado'} (${remainingDays} dias restantes)\n`
  result += `📅 **Emitido em:** ${createdDate}\n\n`
  
  // Enhanced client section with complete information
  result += `👑 **CLIENTE ESPECIAL**\n`
  result += `└─ 🧑‍💼 **Nome:** ${budget.client_name}\n`
  if (budget.client_phone) {
    result += `└─ 📱 **Contato:** ${budget.client_phone}\n`
  }
  if (parsedCommand.clientName && parsedCommand.clientName !== budget.client_name) {
    result += `└─ 🔍 **Buscado como:** ${parsedCommand.clientName}\n`
  }
  result += `\n`
  
  // Enhanced device section with detailed information
  result += `📱 **DISPOSITIVO**\n`
  result += `└─ 🏷️ **Tipo:** ${budget.device_type}\n`
  result += `└─ 📲 **Modelo:** ${budget.device_model}\n`
  result += `└─ 🔧 **Serviço/Sintoma:** ${budget.part_quality || budget.part_type || budget.issue || 'Serviço não especificado'}\n`
  if (parsedCommand.deviceModel) {
    result += `└─ 🔍 **Buscado como:** ${parsedCommand.deviceModel}\n`
  }
  if (parsedCommand.serviceType) {
    result += `└─ 🎯 **Tipo de serviço:** ${parsedCommand.serviceType}\n`
  }
  result += `\n`
  
  // Enhanced financial section with detailed calculations
  const partsTotal = budget.budget_parts?.reduce((sum, part) => sum + part.cash_price, 0) || 0
  const totalValue = budget.cash_price + partsTotal
  
  result += `💰 **INVESTIMENTO**\n`
  result += `└─ 💵 **À Vista:** ${formatCurrency(budget.cash_price)}\n`
  if (budget.installment_price > 0) {
    result += `└─ 📈 **Parcelado:** ${formatCurrency(budget.installment_price)}\n`
  }
  if (partsTotal > 0) {
    result += `└─ 🔧 **Peças:** ${formatCurrency(partsTotal)}\n`
  }
  if (budget.budget_parts && budget.budget_parts.length > 0) {
    result += `└─ 📋 **Detalhes das Peças:**\n`
    budget.budget_parts.forEach((part, index) => {
      const connector = index === budget.budget_parts!.length - 1 ? '   └─' : '   ├─'
      result += `${connector} ${part.name}: ${formatCurrency(part.cash_price)} (${part.warranty_months} meses garantia)\n`
    })
  }
  result += `└─ 💎 **Total:** ${formatCurrency(totalValue)}\n\n`
  
  // Enhanced additional services with real data
  const additionalServices = []
  if (budget.includes_delivery) additionalServices.push('🚚 Entrega Inclusa')
  if (budget.includes_screen_protector) additionalServices.push('📱 Película Protetora de Brinde')
  if (budget.warranty_months > 0) additionalServices.push(`🛡️ Garantia ${budget.warranty_months} meses`)
  
  if (additionalServices.length > 0) {
    result += `🎁 **SERVIÇOS ESPECIAIS INCLUSOS**\n`
    additionalServices.forEach((service, index) => {
      const connector = index === additionalServices.length - 1 ? '└─' : '├─'
      result += `${connector} ${service}\n`
    })
    result += `\n`
  }
  
  // Enhanced notes section with professional formatting
  if (budget.notes) {
    result += `📝 **OBSERVAÇÕES IMPORTANTES**\n`
    result += `└─ ${budget.notes}\n\n`
  }
  
  // Template section with professional WhatsApp formatting
  result += `📲 **MENSAGEM PRONTA PARA WHATSAPP**\n`
  result += `${whatsappMessage}\n\n`
  
  // Enhanced action suggestions
  result += `🔧 **AÇÕES DISPONÍVEIS:**\n`
  result += `• "Enviar orçamento #${budget.sequential_number} via WhatsApp"\n`
  result += `• "Editar orçamento #${budget.sequential_number}"\n`
  result += `• "Duplicar orçamento #${budget.sequential_number}"\n`
  result += `• "Excluir orçamento #${budget.sequential_number}"\n\n`
  
  // Professional closing with company branding
  result += `✨ **AGRADECEMOS A CONFIANÇA!** ✨\n`
  result += `💡 *${companyName || 'OneDrip'} - Sua melhor escolha em assistência técnica*\n`
  result += `📞 *Dúvidas? Estamos sempre à disposição!*`
  
  return result
}

/**
 * Get user default template for WhatsApp messages
 */
async function getUserDefaultTemplate(userId: string) {
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('default_template_id')
      .eq('id', userId)
      .single()

    if (userError || !userData?.default_template_id) {
      return { template: null, error: userError }
    }

    const { data: template, error: templateError } = await supabase
      .from('whatsapp_message_templates')
      .select('*')
      .eq('id', userData.default_template_id)
      .single()

    return { template, error: templateError }
  } catch (error) {
    console.error('Error getting user default template:', error)
    return { template: null, error }
  }
}

/**
 * Get budget details for AI response
 */
export function formatBudgetDetailsForAI(budget: BudgetData): string {
  let response = `📋 **Detalhes do Orçamento #${budget.sequential_number}**\n\n`
  
  response += `👤 **Cliente:** ${budget.client_name}\n`
  if (budget.client_phone) {
    response += `📞 **Telefone:** ${budget.client_phone}\n`
  }
  
  response += `📱 **Dispositivo:** ${budget.device_type} ${budget.device_model}\n`
  response += `🔧 **Problema/Serviço:** ${budget.issue || 'Sem descrição'}\n`
  
  response += `\n💰 **Valores:**\n`
  response += `• À vista: ${formatCurrency(budget.cash_price)}\n`
  if (budget.installment_price > 0) {
    response += `• Parcelado: ${formatCurrency(budget.installment_price)}\n`
  }
  
  if (budget.warranty_months > 0) {
    response += `\n🛡️ **Garantia:** ${budget.warranty_months} meses\n`
  }
  
  if (budget.includes_delivery) {
    response += `🚚 **Inclui entrega:** Sim\n`
  }
  
  if (budget.includes_screen_protector) {
    response += `📱 **Inclui película:** Sim\n`
  }
  
  if (budget.custom_services) {
    response += `\n🔧 **Serviços adicionais:** ${budget.custom_services}\n`
  }
  
  if (budget.notes) {
    response += `\n📝 **Observações:** ${budget.notes}\n`
  }
  
  if (budget.budget_parts && budget.budget_parts.length > 0) {
    response += `\n🔧 **Peças/Componentes:**\n`
    budget.budget_parts.forEach((part, index) => {
      response += `${index + 1}. ${part.name} - ${formatCurrency(part.cash_price)}\n`
    })
  }
  
  response += `\n📅 **Criado em:** ${new Date(budget.created_at).toLocaleDateString()}\n`
  
  response += `\n💡 **Ações disponíveis:**\n`
  response += `• "Enviar orçamento #${budget.sequential_number} via WhatsApp"\n`
  response += `• "Editar orçamento #${budget.sequential_number}"`
  
  return response
}

/**
 * Quick budget search for AI - same as typing in Worm search box
 */
export async function quickBudgetSearch(userId: string, searchTerm: string, limit = 10) {
  return await searchWormBudgets(userId, { search: searchTerm, limit })
}