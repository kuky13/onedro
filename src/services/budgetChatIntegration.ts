import { supabase } from '@/integrations/supabase/client'
import { generateWhatsAppMessage, shareViaWhatsApp } from '@/utils/whatsappUtils'
import { generateWhatsAppMessageFromTemplate } from '@/utils/whatsappTemplateUtils'
import { useWhatsAppMessageTemplates } from '@/hooks/worm/useWhatsAppMessageTemplates'

/**
 * Generate semantic search terms for better matching
 */
function generateSemanticSearchTerms(searchTerm: string): string[] {
  const terms = [searchTerm]
  
  // Device model synonyms - EXPANDIDO
  const deviceSynonyms: { [key: string]: string[] } = {
    // Samsung Galaxy A
    'a12': ['galaxy a12', 'samsung a12', 'a 12'],
    'a13': ['galaxy a13', 'samsung a13', 'a 13'],
    'a22': ['galaxy a22', 'samsung a22', 'a 22'],
    'a23': ['galaxy a23', 'samsung a23', 'a 23'],
    'a32': ['galaxy a32', 'samsung a32', 'a 32'],
    'a33': ['galaxy a33', 'samsung a33', 'a 33'],
    'a52': ['galaxy a52', 'samsung a52', 'a 52'],
    'a53': ['galaxy a53', 'samsung a53', 'a 53'],
    'a72': ['galaxy a72', 'samsung a72', 'a 72'],
    'a73': ['galaxy a73', 'samsung a73', 'a 73'],
    // Samsung Galaxy S
    's10': ['galaxy s10', 'samsung s10', 's 10'],
    's20': ['galaxy s20', 'samsung s20', 's 20'],
    's21': ['galaxy s21', 'samsung s21', 's 21'],
    's22': ['galaxy s22', 'samsung s22', 's 22'],
    's23': ['galaxy s23', 'samsung s23', 's 23'],
    's24': ['galaxy s24', 'samsung s24', 's 24'],
    // Samsung Note
    'note10': ['galaxy note 10', 'note 10', 'note10'],
    'note20': ['galaxy note 20', 'note 20', 'note20'],
    // iPhone
    'iphone11': ['iphone 11', '11', 'ip11'],
    'iphone12': ['iphone 12', '12', 'ip12'],
    'iphone13': ['iphone 13', '13', 'ip13'],
    'iphone14': ['iphone 14', '14', 'ip14'],
    'iphone15': ['iphone 15', '15', 'ip15'],
    'iphonese': ['iphone se', 'se', 'ipse'],
    // Xiaomi Redmi
    'redmi9': ['redmi 9', 'xiaomi redmi 9'],
    'redmi10': ['redmi 10', 'xiaomi redmi 10'],
    'redmi11': ['redmi 11', 'xiaomi redmi 11'],
    'redmi12': ['redmi 12', 'xiaomi redmi 12'],
    'redminote': ['redmi note', 'note'],
    // Xiaomi Mi/Poco
    'mi11': ['mi 11', 'xiaomi mi 11'],
    'mi12': ['mi 12', 'xiaomi mi 12'],
    'mi13': ['mi 13', 'xiaomi mi 13'],
    'poco': ['poco', 'pocophone'],
    // Motorola
    'moto': ['moto', 'motorola'],
    'motog': ['moto g', 'motog'],
    'motoe': ['moto e', 'motoe'],
    'edge': ['edge', 'moto edge'],
    // Outros
    'realme': ['realme'],
    'oneplus': ['oneplus', 'one plus'],
    'nothing': ['nothing', 'nothing phone']
  }
  
  // Service synonyms - EXPANDIDO
  const serviceSynonyms: { [key: string]: string[] } = {
    'tela': ['display', 'lcd', 'monitor', 'vidro', 'frontal', 'touch', 'visor', 'digitalizador'],
    'bateria': ['bateria', 'baterias', 'pilha', 'energia', 'autonomia', 'carga'],
    'camera': ['camera', 'cameras', 'câmera', 'lente', 'fotografia', 'traseira', 'selfie', 'frontal'],
    'carregador': ['carregador', 'carregadores', 'cabo', 'conector', 'porta', 'usb', 'entrada', 'carga'],
    'sistema': ['sistema', 'software', 'android', 'ios', 'atualização', 'atualizacao', 'restauração', 'restauracao'],
    'altofalante': ['alto-falante', 'altofalante', 'audio', 'som', 'speaker'],
    'microfone': ['microfone', 'mic', 'audio'],
    'placa': ['placa', 'módulo', 'ci', 'chip', 'placa-mãe'],
    'traseira': ['traseira', 'tampa', 'capa', 'back', 'parte de trás']
  }
  
  // Check for device model synonyms
  Object.keys(deviceSynonyms).forEach(key => {
    if (searchTerm.includes(key)) {
      terms.push(...deviceSynonyms[key])
    }
  })
  
  // Check for service synonyms
  Object.keys(serviceSynonyms).forEach(key => {
    if (searchTerm.includes(key)) {
      terms.push(...serviceSynonyms[key])
    }
  })
  
  // Remove duplicates and return
  return [...new Set(terms)]
}

export interface BudgetData {
  id: string
  client_name: string
  client_phone: string
  device_type: string
  device_model: string
  issue: string
  cash_price: number
  installment_price: number
  warranty_months: number
  includes_delivery: boolean
  includes_screen_protector: boolean
  custom_services: string
  notes: string
  sequential_number: number
  created_at: string
  budget_parts?: BudgetPart[]
}

export interface BudgetPart {
  name: string
  price: number
  cash_price: number
  installment_price: number
  warranty_months: number
}

export interface WhatsAppTemplate {
  id: string
  name: string
  message_template: string
  is_default: boolean
}

/**
 * Get user's recent budgets
 */
export async function getUserBudgets(userId: string, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('budgets')
      .select(`
        *,
        budget_parts(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching budgets:', error)
      return { budgets: [], error }
    }

    return { budgets: data || [], error: null }
  } catch (error) {
    console.error('Exception fetching budgets:', error)
    return { budgets: [], error }
  }
}

/**
 * Search budgets by device model or service type with semantic matching - Worm-style
 */
export async function searchBudgets(userId: string, searchTerm: string, limit = 10) {
  try {
    const lowerSearchTerm = searchTerm.toLowerCase().trim()
    
    // Check if search is numeric (for sequential number search like WormBudgetList)
    const numericSearch = lowerSearchTerm
    const searchNum = numericSearch && /^\d+$/.test(numericSearch) ? parseInt(numericSearch, 10) : null
    
    // Create semantic search terms
    const semanticTerms = generateSemanticSearchTerms(lowerSearchTerm)
    
    // Build dynamic OR conditions for semantic search (same as WormBudgetList)
    const baseOr = `device_model.ilike.%${lowerSearchTerm}%,device_type.ilike.%${lowerSearchTerm}%,issue.ilike.%${lowerSearchTerm}%,client_name.ilike.%${lowerSearchTerm}%`
    
    // Add semantic terms
    let orConditions = baseOr
    semanticTerms.forEach(term => {
      if (term !== lowerSearchTerm) {
        orConditions += `,device_model.ilike.%${term}%,device_type.ilike.%${term}%,issue.ilike.%${term}%`
      }
    })
    
    // Add sequential number search (like WormBudgetList)
    if (searchNum !== null) {
      orConditions += `,sequential_number.eq.${searchNum}`
    }
    
    // Search in device_model, device_type, issue, client_name and sequential_number
    const { data, error } = await supabase
      .from('budgets')
      .select(`
        *,
        budget_parts(*)
      `)
      .eq('user_id', userId)
      .or(orConditions)
      .neq('workflow_status', 'template')
      .neq('client_name', 'TEMPLATE')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error searching budgets:', error)
      return { budgets: [], error }
    }

    return { budgets: data || [], error: null }
  } catch (error) {
    console.error('Exception searching budgets:', error)
    return { budgets: [], error }
  }
}

/**
 * Get a specific budget by ID
 */
export async function getBudgetById(budgetId: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from('budgets')
      .select(`
        *,
        budget_parts(*)
      `)
      .eq('id', budgetId)
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching budget:', error)
      return { budget: null, error }
    }

    return { budget: data, error: null }
  } catch (error) {
    console.error('Exception fetching budget:', error)
    return { budget: null, error }
  }
}

/**
 * Generate WhatsApp message for a budget
 */
export async function generateBudgetWhatsAppMessage(budget: BudgetData, shopName: string, shopPhone: string, template?: WhatsAppTemplate) {
  try {
    // If template is provided, use template generation
    if (template) {
      const message = generateWhatsAppMessageFromTemplate(template.message_template, budget, shopName)
      return { message, error: null }
    }

    // Otherwise use default generation
    const message = generateWhatsAppMessage(budget, shopName, shopPhone)
    return { message, error: null }
  } catch (error) {
    console.error('Exception generating WhatsApp message:', error)
    return { message: '', error }
  }
}

/**
 * Get user's default WhatsApp template
 */
export async function getUserDefaultTemplate(userId: string) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_message_templates')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching template:', error)
      return { template: null, error }
    }

    return { template: data || null, error: null }
  } catch (error) {
    console.error('Exception fetching template:', error)
    return { template: null, error }
  }
}

/**
 * Create a budget from chat parameters
 */
export async function createBudgetFromChat(userId: string, budgetData: Partial<BudgetData>) {
  try {
    const { data, error } = await supabase
      .from('budgets')
      .insert({
        user_id: userId,
        client_name: budgetData.client_name || 'Cliente',
        client_phone: budgetData.client_phone || '',
        device_type: budgetData.device_type || 'Celular',
        device_model: budgetData.device_model || '',
        issue: budgetData.issue || '',
        cash_price: budgetData.cash_price || 0,
        installment_price: budgetData.installment_price || 0,
        warranty_months: budgetData.warranty_months || 3,
        includes_delivery: budgetData.includes_delivery || false,
        includes_screen_protector: budgetData.includes_screen_protector || false,
        custom_services: budgetData.custom_services || '',
        notes: budgetData.notes || 'Criado via chat',
        workflow_status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating budget:', error)
      return { budget: null, error }
    }

    return { budget: data, error: null }
  } catch (error) {
    console.error('Exception creating budget:', error)
    return { budget: null, error }
  }
}

/**
 * Send budget via WhatsApp
 */
export async function sendBudgetViaWhatsApp(budget: BudgetData, shopName: string, shopPhone: string, template?: WhatsAppTemplate) {
  try {
    const { message, error: messageError } = await generateBudgetWhatsAppMessage(budget, shopName, shopPhone, template)
    
    if (messageError) {
      return { success: false, error: messageError }
    }

    if (!budget.client_phone) {
      return { success: false, error: 'Telefone do cliente não informado' }
    }

    // Open WhatsApp with the message
    shareViaWhatsApp(budget.client_phone, message)
    
    return { success: true, error: null }
  } catch (error) {
    console.error('Exception sending budget via WhatsApp:', error)
    return { success: false, error }
  }
}

/**
 * Parse chat commands for budget operations with enhanced device and service recognition
 */
export function parseBudgetCommand(text: string) {
  const lowerText = text.toLowerCase()
  
  // Common device models and brands - enhanced patterns
  const devicePatterns = [
    /iphone\s*(\d+(?:\s*(?:pro|max|mini|plus))?)/i,
    /samsung\s*(galaxy\s*[a-z]?\d+(?:\s*(?:plus|ultra|lite|fe))?)/i,
    /xiaomi\s*(redmi\s*\w+|mi\s*\w+|poco\s*\w+)/i,
    /motorola\s*(moto\s*\w+|edge\s*\w+|g\s*\d+)/i,
    /lg\s*(\w+)/i,
    /asus\s*(zenfone\s*\d+)/i,
    /(a\d{2}|m\d{2}|s\d{2}|j\d{2}|note\s*\d+|galaxy\s*\w+)/i,  // Generic Samsung models
    /(iphone\s*[a-z]?\d*)/i,  // Generic iPhone
    /(redmi\s*\w+|mi\s*\w+)/i,  // Generic Xiaomi
    /(moto\s*\w+|edge\s*\w+)/i,  // Generic Motorola
    /(zenfone\s*\d+)/i  // Generic Asus
  ]
  
  // Service types and issues - enhanced patterns
  const servicePatterns = [
    /troca?\s*de?\s*tela/i,
    /troca?\s*de?\s*display/i,
    /troca?\s*de?\s*lcd/i,
    /tela\s*quebrada/i,
    /tela\s*rachada/i,
    /tela\s*trincada/i,
    /tela\s*estourada/i,
    /tela\s*queimada/i,
    /tela\s*travada/i,
    /tela\s*preta/i,
    /bateria/i,
    /troca?\s*de?\s*bateria/i,
    /bateria\s*fraca/i,
    /bateria\s*viciada/i,
    /bateria\s*estourada/i,
    /carregador/i,
    /porta\s*de?\s*carregador/i,
    /conector\s*de?\s*carga/i,
    /entrada\s*de?\s*carregador/i,
    /camera/i,
    /troca?\s*de?\s*camera/i,
    /camera\s*traseira/i,
    /camera\s*frontal/i,
    /camera\s*quebrada/i,
    /vibrador/i,
    /alto\s*falante/i,
    /alto\s*falantes/i,
    /caixa\s*de?\s*som/i,
    /microfone/i,
    /microfone\s*quebrado/i,
    /sistema/i,
    /atualização/i,
    /atualizacao/i,
    /software/i,
    /restauração/i,
    /restauracao/i,
    /formatar/i,
    /travando/i,
    /lento/i,
    /memoria\s*cheia/i,
    /virus/i,
    /vírus/i
  ]
  
  // Enhanced intent recognition with more natural language patterns
  const intents = {
    listBudgets: /(lista|liste|mostrar|ver|meus|buscar|encontrar|quais|quantos)?.*?(orçamentos|orcamentos|budgets)/i.test(lowerText),
    searchBudget: /(qual\s*o|me\s*fale|fale|sobre|do|da|de|preco\s*do|preço\s*do|valor\s*do|quanto\s*custa|quanto\s*é|quanto\s*e|buscar|procurar)?.*?(orçamento|orcamento).*?(?:para|do|da|de|do\s*meu|da\s*minha|número|numero)?/i.test(lowerText),
    createBudget: /(criar|novo|novo orçamento|fazer orçamento|gerar orçamento|montar orçamento|preciso\s*de\s*um\s*orçamento)/i.test(lowerText),
    sendWhatsApp: /(enviar|mandar|whatsapp|zap|compartilhar|enviar\s*por|mandar\s*por).*?(orçamento|orcamento)/i.test(lowerText),
    budgetNumber: lowerText.match(/orçamento.*?(?:#|nº|número|numero|n\s*º)?\s*(\d+)/i) || 
                  lowerText.match(/^(\d+)$/i), // Pure number search like WormBudgetList
    clientPhone: lowerText.match(/(?:telefone|fone|whatsapp|zap|tel|contato).*?(\d{10,11})/i),
    priceInfo: lowerText.match(/(?:preço|preco|valor|R\$|reais|R\$).*?(\d+(?:[.,]\d{1,2})?)/i),
    urgent: /(urgente|rápido|rapido|imediatamente|hoje|agora)/i.test(lowerText),
    specificDate: lowerText.match(/(?:dia|data|quando|até|ate)\s+(\d{1,2}\/\d{1,2}|\d{1,2}\s+de\s+[a-zç]+)/i)
  }
  
  // Find device model with better matching
  let deviceModel = null
  let deviceBrand = null
  for (const pattern of devicePatterns) {
    const match = text.match(pattern)
    if (match) {
      deviceModel = match[1] || match[0]
      // Clean up the model name
      deviceModel = deviceModel.replace(/^\s+|\s+$/g, '')
      
      if (match[0].toLowerCase().includes('iphone')) deviceBrand = 'iPhone'
      else if (match[0].toLowerCase().includes('samsung') || match[0].toLowerCase().includes('galaxy')) deviceBrand = 'Samsung'
      else if (match[0].toLowerCase().includes('xiaomi')) deviceBrand = 'Xiaomi'
      else if (match[0].toLowerCase().includes('motorola')) deviceBrand = 'Motorola'
      else if (match[0].toLowerCase().includes('lg')) deviceBrand = 'LG'
      else if (match[0].toLowerCase().includes('asus')) deviceBrand = 'Asus'
      break
    }
  }
  
  // Find service type with better matching
  let serviceType = null
  let servicePriority = 'normal'
  for (const pattern of servicePatterns) {
    if (pattern.test(lowerText)) {
      const match = lowerText.match(pattern)
      if (match) {
        serviceType = match[0]
        // Determine priority based on keywords
        if (intents.urgent) servicePriority = 'urgent'
        break
      }
    }
  }
  
  // Extract more specific information with better patterns
  const clientNameMatch = lowerText.match(/(?:cliente|para|para o|para a|nome\s*é|nome\s*e)\s+([a-zA-ZçÇãÃõÕáÁéÉíÍóÓúÚâÂêÊîÎôÔûÛ\s]+?)(?:com|de|para|com\s*o|com\s*a|$)/i)
  const clientName = clientNameMatch ? clientNameMatch[1].trim() : null
  
  // Extract additional details
  const additionalDetails = {
    hasWarranty: /(garantia|garantir|garanto)/i.test(lowerText),
    wantsDelivery: /(entrega|entregar|delivery|entregar\s*em|casa)/i.test(lowerText),
    wantsScreenProtector: /(película|pelicula|proteção|protecao|vidro\s*temperado)/i.test(lowerText),
    paymentMethod: lowerText.match(/(?:pagamento|pagar|pago|em\s*|à\s*vista|a\s*vista|parcelado|cartão|cartao|dinheiro|pix)/i)?.[0]
  }
  
  return {
    intent: intents.listBudgets ? 'list' : 
            intents.searchBudget ? 'search' :
            intents.createBudget ? 'create' : 
            intents.sendWhatsApp ? 'send_whatsapp' : 'unknown',
    budgetNumber: intents.budgetNumber ? parseInt(intents.budgetNumber[1]) : null,
    clientPhone: intents.clientPhone ? intents.clientPhone[1] : null,
    clientName: clientName,
    deviceModel: deviceModel,
    deviceBrand: deviceBrand,
    serviceType: serviceType,
    servicePriority: servicePriority,
    price: intents.priceInfo ? parseFloat(intents.priceInfo[1].replace(',', '.')) : null,
    urgent: intents.urgent,
    specificDate: intents.specificDate ? intents.specificDate[1] : null,
    additionalDetails: additionalDetails,
    originalText: text,
    isNumericSearch: /^\d+$/.test(lowerText) // Indicates if user typed just a number (like Worm search)
  }
}