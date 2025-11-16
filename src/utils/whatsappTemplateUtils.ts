import { formatCurrency, formatCurrencyFromReais } from './currency';
import { generateWhatsAppMessage } from './whatsappUtils';

export interface BudgetData {
  id?: string;
  client_name?: string;
  client_phone?: string;
  device_model?: string;
  device_type?: string;
  issue?: string;
  part_type?: string;
  part_quality?: string;
  cash_price?: number;
  installment_price?: number;
  installments?: number;
  payment_condition?: string;
  total_price?: number;
  warranty_months?: number;
  includes_delivery?: boolean;
  includes_screen_protector?: boolean;
  custom_services?: string;
  delivery_date?: string;
  notes?: string;
  created_at?: string;
  valid_until?: string;
  expires_at?: string;
  shop_name?: string;
  parts?: Array<{
    name?: string;
    quantity?: number;
    price?: number;
    cash_price?: number;
    installment_price?: number;
    warranty_months?: number;
  }>;
  [key: string]: any;
}

const DEFAULT_COMPANY_NAME = 'Nossa Loja';

export function generateWhatsAppMessageFromTemplate(
  template: string,
  budgetData: BudgetData,
  companyName: string = DEFAULT_COMPANY_NAME,
  budgetWarningDays?: number
): string {
  const formatSmart = (v: number): string => {
    if (v === null || v === undefined || isNaN(v as any)) return formatCurrencyFromReais(0)
    return v >= 10000 ? formatCurrency(v) : formatCurrencyFromReais(v)
  }
  const formatSmartWithRef = (v: number, ref: number): string => {
    if (v === null || v === undefined || isNaN(v as any)) return formatCurrencyFromReais(0)
    return ref >= 10000 ? formatCurrency(v) : formatCurrencyFromReais(v)
  }

  const resolveInstallmentsCount = (budget: any, part?: any): number => {
    const raw = (
      part?.installment_count ??
      part?.installments_count ??
      part?.installments ??
      budget?.installments_count ??
      budget?.installments ??
      0
    )
    let count = Number(raw) || 0
    if (count <= 1) {
      const ip = (part?.installment_price ?? budget?.installment_price) || 0
      const cp = (part?.price ?? part?.cash_price ?? budget?.cash_price ?? budget?.total_price) || 0
      if (ip > cp && ip > 0 && cp > 0) count = 0
    }
    if (count <= 1) count = 0
    return count
  }
  // Map Worm budget_parts → parts when necessário
  const wormParts: any[] = (budgetData as any).budget_parts
  if (!budgetData.parts && Array.isArray(wormParts) && wormParts.length > 0) {
    budgetData.parts = wormParts.map((bp: any) => ({
      name: bp.name || bp.part_type || bp.quality || 'Peça',
      quantity: bp.quantity || 1,
      price: bp.price ?? bp.cash_price ?? 0,
      cash_price: bp.cash_price ?? bp.price ?? 0,
      installment_price: bp.installment_price ?? bp.price ?? 0,
      warranty_months: bp.warranty_months ?? 0,
      installments: bp.installments_count ?? bp.installments ?? undefined,
    }))
  }
  // Se o template contém seções antigas indesejadas, usar formato simples
  const legacySections = [
    'DADOS DO CLIENTE',
    'INFORMAÇÕES DO DISPOSITIVO',
    'SERVIÇO',
    'VALORES'
  ];
  if (legacySections.some(section => template.includes(section))) {
    // Construir mensagem no formato simples usando util atual
    return generateWhatsAppMessage({
      ...budgetData,
      shop_name: companyName
    } as any, budgetWarningDays);
  }

  let message = template;

  // Dados do cliente
  const clientName = budgetData.client_name || 'Cliente';
  const clientPhone = budgetData.client_phone || 'Não informado';

  // Dados do dispositivo
  const deviceType = budgetData.device_type || 'N/A';
  const deviceModel = budgetData.device_model || 'Dispositivo não informado';
  const deviceIssue = budgetData.issue || 'N/A';

  // Dados do serviço - usar part_quality como Nome do Reparo
  const serviceName = budgetData.part_quality || budgetData.part_type || 'Serviço';
  // Pegar qualidade da primeira peça se disponível, senão usar campos globais
  const qualityPiece = budgetData.parts?.[0]?.part_type || budgetData.parts?.[0]?.name || budgetData.part_quality || budgetData.part_type || 'Peça padrão';

  // Preços (tratando como centavos do banco)
  const cashPrice = budgetData.cash_price || budgetData.total_price || 0;
  const installmentPrice = budgetData.installment_price || cashPrice;
  const paymentCondition = budgetData.payment_condition || 'Não especificado';
  // Derivar parcelas principais a partir da primeira peça (quando existir)
  const primaryInstallmentsCount = resolveInstallmentsCount(budgetData, budgetData.parts?.[0]);
  let bestInstallmentsCount = primaryInstallmentsCount;
  if (budgetData.parts && budgetData.parts.length > 0) {
    for (const p of budgetData.parts as any[]) {
      const cnt = resolveInstallmentsCount(budgetData, p);
      const ip = (p.installment_price ?? 0) as number;
      const cp = (p.price ?? p.cash_price ?? 0) as number;
      if (cnt > bestInstallmentsCount && ip > cp) bestInstallmentsCount = cnt;
    }
  }
  
  // Usar formatCurrency que espera centavos
  const formattedCashPrice = formatSmart(cashPrice as number);
  const formattedInstallmentPrice = (() => {
    const count = primaryInstallmentsCount;
    const ip = installmentPrice as number;
    const cp = cashPrice as number;
    if (count > 0) {
      if (ip > cp) return formatSmart(ip);
      return formatSmart(ip * count);
    }
    return formatSmart(ip);
  })();
  const computedMonthlyBudgetValue = (() => {
    const count = primaryInstallmentsCount;
    const ip = installmentPrice as number;
    const cp = cashPrice as number;
    if (count > 0) {
      const monthly = ip > cp ? ip / count : ip;
      const totalRef = ip > cp ? ip : ip * count;
      return formatSmartWithRef(monthly, totalRef);
    }
    return formatSmartWithRef(ip as number, ip as number);
  })();
  // Valor da parcela global: usar primeira peça quando possível, caso contrário indicar variação
  const globalInstallmentValue = (() => {
    const firstPart = budgetData.parts?.[0];
    if (firstPart && firstPart.installment_price && primaryInstallmentsCount > 0) {
      const ip = firstPart.installment_price as number;
      const base = firstPart.cash_price ?? firstPart.price ?? 0;
      const monthly = ip > base ? ip / primaryInstallmentsCount : ip;
      const totalRef = ip > base ? ip : ip * primaryInstallmentsCount;
      return formatSmartWithRef(monthly, totalRef);
    }
    return 'Varia por peça';
  })();

  // Serviços Adicionais - incluir entrega, película e serviços personalizados
  const services = [];
  if (budgetData.includes_delivery) services.push('Buscamos e entregamos o seu aparelho');
  if (budgetData.includes_screen_protector) services.push('Película 3D de brinde');
  
  // Adicionar serviços personalizados
  if (budgetData.custom_services) {
    const customServicesText = budgetData.custom_services.trim();
    if (customServicesText) {
      // Se já tiver bullets ou quebras de linha, processar
      const lines = customServicesText.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        const cleanLine = line.replace(/^[•\-*]\s*/, '').trim();
        if (cleanLine) services.push(cleanLine);
      });
    }
  }
  
  // Vamos calcular o texto dos serviços após processar peças/garantia
  let servicesText = '';

  // Processar detalhes das peças se disponíveis
  let partsText = '';
  let maxWarranty = 0;
  
  if (budgetData.parts && Array.isArray(budgetData.parts) && budgetData.parts.length > 0) {
    // Encontrar a maior garantia entre as peças
    budgetData.parts.forEach((part: any) => {
      if (part.warranty_months && part.warranty_months > maxWarranty) {
        maxWarranty = part.warranty_months;
      }
    });
    
    budgetData.parts.forEach((part: any, index: number) => {
      const partName = part.name || part.part_type || `Peça ${index + 1}`;
      const quantity = part.quantity || 1;
      const price = part.price || part.cash_price || 0;
      const installmentPrice = part.installment_price || price;
      const warranty = part.warranty_months || 0;
      const installmentCount = resolveInstallmentsCount(budgetData, part); // prioriza configuração da peça
      
      // Nome da peça/qualidade com garantia (formato limpo)
      partsText += `*${partName}*${warranty > 0 ? ` – ${warranty} meses de garantia` : ''}\n`;
      
      // Preços (formato limpo)
      if (price > 0) {
        if (installmentCount > 0 && installmentPrice && installmentPrice !== price) {
          const ip = installmentPrice as number;
          const cp = price as number;
          const totalInstallment = ip > cp ? ip : ip * installmentCount;
          const monthlyValue = ip > cp ? ip / installmentCount : ip;
          partsText += `💰 À vista ${formatSmart(price)} | no cartão (crédito) ${formatSmart(totalInstallment)} ${installmentCount}x de ${formatSmartWithRef(monthlyValue, totalInstallment)}\n`;
        } else if (price) {
          partsText += `💰 À vista ${formatSmart(price)}\n`;
        }
      }
      
      partsText += '\n'; // Espaço entre peças
    });
  }

  // Observações (somente se houver conteúdo)
  const notes = (budgetData.notes ?? '').trim();

  // Não incluir garantia nos Serviços Inclusos; manter apenas nos placeholders globais

  // Agora, montar o texto final de serviços inclusos
  servicesText = services.length > 0 ? services.map(s => `• ${s}`).join('\n') : '';

  // Data de validade
  const validUntil = budgetData.valid_until || budgetData.expires_at;
  const validDate = validUntil 
    ? new Date(validUntil).toLocaleDateString('pt-BR')
    : new Date(Date.now() + (budgetWarningDays || 15) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');

  // Substituições globais
  const replacements: Record<string, string> = {
    '{loja}': companyName,
    '{nome_empresa}': companyName,
    '{cliente}': clientName,
    '{nome_cliente}': clientName,
    '{telefone}': clientPhone,
    '{telefone_cliente}': clientPhone,
    '{aparelho}': deviceModel,
    '{tipo_aparelho}': deviceType,
    '{tipo_dispositivo}': deviceType,
    '{modelo_dispositivo}': deviceModel,
    '{defeito}': deviceIssue,
    '{nome_reparo}': serviceName,
    '{tipo_peca}': budgetData.part_type || 'N/A',
    '{qualidade_peca}': qualityPiece,
    '{preco_vista}': formattedCashPrice,
    '{preco_parcelado}': formattedInstallmentPrice,
    '{parcelas}': primaryInstallmentsCount.toString(),
    '{num_parcelas}': primaryInstallmentsCount.toString(),
    '{valor_parcela}': globalInstallmentValue,
    '{garantia}': `${maxWarranty} meses`,
    '{garantia_meses}': maxWarranty.toString(),
    '{condicao_pagamento}': paymentCondition,
    '{forma_pagamento}': paymentCondition,
    '{observacoes}': notes,
    '{validade}': validDate,
    '{data_validade}': validDate,
    '{servicos_inclusos}': servicesText,
    '{detalhes_pecas}': partsText,
  };

  // Sistema inteligente de blocos para qualidades/peças
  // Suporta tanto {inicio_pecas}/{fim_pecas} quanto {qualidades_inicio}/{qualidades_fim}
  const blockPatterns = [
    { start: '{qualidades_inicio}', end: '{qualidades_fim}' },
    { start: '{inicio_pecas}', end: '{fim_pecas}' }
  ];

  let blockProcessed = false;
  for (const pattern of blockPatterns) {
    if (message.includes(pattern.start) && message.includes(pattern.end)) {
      const before = message.split(pattern.start)[0];
      const middle = message.split(pattern.start)[1].split(pattern.end)[0];
      const after = message.split(pattern.end)[1] || '';
      
      let processedParts = '';
      
      if (budgetData.parts && Array.isArray(budgetData.parts) && budgetData.parts.length > 0) {
        // Processar cada peça com o template do bloco
        budgetData.parts.forEach((part: any, index: number) => {
          let partText = middle;
          
          const partName = part.name || part.part_type || `Peça ${index + 1}`;
          const quantity = part.quantity || 1;
          const price = part.price || part.cash_price || 0;
          const installmentPrice = part.installment_price || price;
          const warranty = part.warranty_months || 0;
          const installmentCount = (
            part.installment_count ??
            part.installments_count ??
            part.installments ??
            budgetData.installments_count ??
            budgetData.installments ??
            0
          );
          const ip = installmentPrice as number;
          const base = price as number;
          const totalInstallment = installmentCount > 0 ? (ip > base ? ip : ip * installmentCount) : ip;
          const monthlyValue = installmentCount > 0 ? (ip > base ? ip / installmentCount : ip) : ip;
          
          // Placeholders específicos para cada peça no bloco
          const partReplacements: Record<string, string> = {
            '{qualidade_nome}': partName,
            '{peca_nome}': partName,
            '{qualidade_tipo}': partName,
            '{peca_quantidade}': quantity.toString(),
            '{peca_preco_vista}': formatSmart(price),
            '{peca_preco_parcelado}': formatSmart(totalInstallment),
            '{peca_parcelas}': installmentCount > 0 ? installmentCount.toString() : '',
            '{peca_valor_parcela}': formatSmartWithRef(monthlyValue, totalInstallment),
            '{peca_garantia}': warranty > 0 ? `${warranty} meses` : 'Sem garantia',
            '{peca_garantia_meses}': warranty.toString(),
          };
          
          Object.entries(partReplacements).forEach(([key, value]) => {
            partText = partText.replaceAll(key, value);
          });
          
          processedParts += partText;
        });
      }
      
      message = `${before}${processedParts}${after}`;
      blockProcessed = true;
      break;
    }
  }

  // Substituições globais (aplicadas fora dos blocos)
  Object.entries(replacements).forEach(([key, value]) => {
    message = message.replaceAll(key, value);
  });

  // Normalização universal de linhas de preço em templates personalizados
  // Forma com placeholders (antiga): "💰 À vista {preco_vista} | {preco_parcelado} {num_parcelas}x de {valor_parcela} no cartão (crédito)"
  message = message.replace(
    /💰\s*À vista\s*\{preco_vista\}\s*\|\s*\{preco_parcelado\}\s*\{num_parcelas\}x\s*de\s*\{valor_parcela\}\s*no cartão\s*\(crédito\)/g,
    '💰 À vista {preco_vista} | no cartão (crédito) {preco_parcelado} {num_parcelas}x de {valor_parcela}'
  );

  // Forma com valores literais: "💰 À vista R$ XXX | R$ YYY Zx de R$ WWW no cartão (crédito)"
  // Captura minimal para reorganizar a posição de "no cartão (crédito)"
  message = message.replace(
    /💰\s*À vista\s*(.+?)\s*\|\s*(.+?)\s*(\d+)x\s*de\s*(.+?)\s*no cartão\s*\(crédito\)/gm,
    '💰 À vista $1 | no cartão (crédito) $2 $3x de $4'
  );

  message = message.replace(/(\{num_parcelas\}x\s*de\s*)\{preco_parcelado\}/g, '$1{valor_parcela}');
  message = message.replace(/(em\s*até\s*\{num_parcelas\}x\s*de\s*)\{preco_parcelado\}/g, 'em até {num_parcelas}x de {valor_parcela}');
  message = message.replace(/(💰[^\n]*em\s*(?:até\s*)?\d+x\s*de\s*)(R\$\s*[0-9.,]+)/g, `$1${computedMonthlyBudgetValue}`);

  // Remover seções vazias de forma mais inteligente
  // Atenção: removido bloco dinâmico de garantia para evitar inserções automáticas

  if (!servicesText) {
    // Remover blocos completos de serviços (inclui espaços antes/depois)
    message = message.replace(/\n?\s*\*📦 Serviços Inclusos:\*\s*\n?/g, '');
    message = message.replace(/\n?\s*\*Serviços Adicionais:\*\s*\n?/g, '');
    // Remover bullets conhecidos caso tenham sobrado por algum motivo
    message = message.replace(/\n\s*•\s*(Buscamos e entregamos o seu aparelho|Película 3D de brinde)\s*(?=\n|$)/g, '');
  }

  if (!notes) {
    // Remover a seção completa de Observações quando não há conteúdo
    // 1) Cabeçalho + linha de placeholder (suporta com ou sem dois-pontos)
    message = message.replace(/\n?\s*(?:📝\s*\*?OBSERVAÇÕES\*?|\*?📝\s*Observações:?\*?)\s*\n\s*\{observacoes\}\s*\n?/gi, '');
    // 2) Cabeçalhos isolados (caso tenham sido inseridos sem placeholder)
    message = message.replace(/\n?\s*📝\s*\*?OBSERVAÇÕES\*?\s*\n?/gi, '');
    message = message.replace(/\n?\s*\*?📝\s*Observações:?\*?\s*\n?/gi, '');
    // 3) Placeholder sozinho (sem cabeçalho)
    message = message.replace(/\n?\s*\{observacoes\}\s*\n?/g, '');
  }

  // Limpeza final: remover múltiplos espaços/quebras e bordas
  message = message
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s*\n/, '')
    .replace(/\n\s*$/, '');

  // Garantir que a linha de validade comece em nova linha
  // Corrige casos onde "📅 Válido até:" gruda após a linha anterior (ex.: após o aviso de água)
  message = message
    .replace(/([^\n])📅 Válido até:/g, '$1\n📅 Válido até:')
    .replace(/\n{3,}/g, '\n\n');

  // Remover asteriscos residuais nas linhas específicas
  // Remove * em "🚫 Não cobre ..." e em "📅 Válido até: ..."
  message = message
    .replace(/^\s*\*?🚫\s+([^\n]+?)\*?\s*$/gm, '🚫 $1')
    .replace(/^\s*\*?📅\s+Válido até:\s*([^\n]+?)\*?\s*$/gm, '📅 Válido até: $1');

  // Correção conservadora: evitar "em até 1x" quando há parcelamento
  if (bestInstallmentsCount && bestInstallmentsCount > 0) {
    message = message.replace(/em até\s+1x/g, `em até ${bestInstallmentsCount}x`);
  }

  return message;
};

// Função helper para obter nome da empresa das configurações
export const getCompanyName = async (userId: string): Promise<string> => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase
      .from('company_info')
      .select('name')
      .eq('owner_id', userId)
      .maybeSingle();
    
    if (error || !data?.name) {
      return DEFAULT_COMPANY_NAME;
    }
    
    return data.name;
  } catch (error) {
    console.error('Error fetching company name:', error);
    return DEFAULT_COMPANY_NAME;
  }
};
