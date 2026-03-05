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
    part_type?: string;
    quantity?: number;
    price?: number;
    cash_price?: number;
    installment_price?: number;
    installments?: number;
    installment_count?: number;
    installments_count?: number;
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
  type BudgetPartTemplate = NonNullable<BudgetData['parts']>[number];

  // Map Worm budget_parts → parts when necessário
  const wormParts: any[] = (budgetData as any).budget_parts
  if (!budgetData.parts && Array.isArray(wormParts) && wormParts.length > 0) {
    budgetData.parts = wormParts.map((bp: any) => {
      const installments = bp.installments_count ?? bp.installments;

      return {
        name: bp.name || bp.part_type || bp.quality || 'Peça',
        part_type: bp.part_type ?? bp.quality,
        quantity: bp.quantity || 1,
        price: bp.price ?? bp.cash_price ?? 0,
        cash_price: bp.cash_price ?? bp.price ?? 0,
        installment_price: bp.installment_price ?? bp.price ?? 0,
        warranty_months: bp.warranty_months ?? 0,
        ...(installments != null ? { installments } : {}),
      } satisfies BudgetPartTemplate
    })
  }

  // CRITICAL: Se ainda não tiver partes (ex: orçamento simples sem itens), criar uma peça virtual
  // baseada nos dados globais para que o bloco de preço/garantia renderize
  if (!budgetData.parts || budgetData.parts.length === 0) {
    const globalQuality = budgetData.part_quality || budgetData.part_type || 'Serviço Padrão';
    const globalPrice = budgetData.total_price || budgetData.cash_price || 0;

    // Só cria peça virtual se houver algum descritivo ou preço relevante
    if (globalQuality || globalPrice > 0) {
      const installments = budgetData.installments;

      budgetData.parts = [
        {
          name: globalQuality,
          part_type: budgetData.part_type ?? budgetData.part_quality ?? 'Serviço',
          quantity: 1,
          price: globalPrice,
          cash_price: budgetData.cash_price || globalPrice,
          installment_price: budgetData.installment_price || globalPrice,
          warranty_months: budgetData.warranty_months || 0,
          ...(installments != null ? { installments } : {}),
        } satisfies BudgetPartTemplate,
      ];
    }
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

  // Dados do serviço - PRIORIZAR defeito/problema relatado (issue) como Nome do Reparo
  const serviceName = budgetData.issue || budgetData.part_quality || budgetData.part_type || 'Serviço';
  // Pegar qualidade da primeira peça se disponível, senão usar campos globais
  const qualityPiece = budgetData.parts?.[0]?.name || budgetData.parts?.[0]?.part_type || budgetData.part_quality || budgetData.part_type || 'Peça padrão';

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

          // Validação: verificar se installmentCount é numérico e maior que zero
          const validInstallments = installmentCount > 0 ? installmentCount : 1;

          // Cálculo correto do valor total e parcela mensal
          const totalInstallment = ip > cp ? ip : ip * validInstallments;

          // CORREÇÃO: Dividir o valor total pelo número de parcelas
          const monthlyValue = totalInstallment / validInstallments;

          partsText += `💰 À vista ${formatSmart(price)} | no cartão (crédito) ${formatSmart(totalInstallment)} ${validInstallments}x de ${formatSmartWithRef(monthlyValue, totalInstallment)}\n`;
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

  for (const pattern of blockPatterns) {
    const startIdx = message.indexOf(pattern.start);
    const endIdx = message.indexOf(pattern.end);
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const before = message.slice(0, startIdx);
      const middle = message.slice(startIdx + pattern.start.length, endIdx);
      const after = message.slice(endIdx + pattern.end.length);

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

          // Validações: installmentCount deve ser numérico, positivo e maior que zero
          const validInstallmentCount = installmentCount > 0 ? installmentCount : 0;

          // Cálculo correto: sempre dividir o valor total pelo número de parcelas
          let totalInstallment: number;
          let monthlyValue: number;

          if (validInstallmentCount > 0) {
            // Se ip > base, ip é o valor total parcelado
            // Se ip <= base, ip * installmentCount é o valor total parcelado
            totalInstallment = ip > base ? ip : ip * validInstallmentCount;

            // CORREÇÃO: Sempre dividir o valor total pelo número de parcelas
            monthlyValue = totalInstallment / validInstallmentCount;
          } else {
            // Sem parcelamento
            totalInstallment = ip;
            monthlyValue = ip;
          }

          // Placeholders específicos para cada peça no bloco
          const partReplacements: Record<string, string> = {
            '{qualidade_nome}': partName || 'Peça',
            '{peca_nome}': partName || 'Peça',
            '{qualidade_tipo}': partName || 'Peça',
            '{peca_quantidade}': quantity.toString(),
            '{peca_preco_vista}': (formatSmart(price) || replacements['{preco_vista}']) || 'R$ 0,00',
            '{peca_preco_parcelado}': (formatSmart(totalInstallment) || replacements['{preco_parcelado}']) || 'R$ 0,00',
            '{peca_parcelas}': ((installmentCount > 0 ? installmentCount.toString() : '') || replacements['{num_parcelas}']) || '',
            '{peca_valor_parcela}': (formatSmartWithRef(monthlyValue, totalInstallment) || replacements['{valor_parcela}']) || 'R$ 0,00',
            '{peca_garantia}': warranty > 0 ? `${warranty} meses` : 'Sem garantia',
            '{peca_garantia_meses}': warranty.toString(),
          };

          Object.entries(partReplacements).forEach(([key, value]) => {
            partText = partText.split(key).join(value);
          });

          processedParts += partText;
        });
      }

      message = `${before}${processedParts}${after}`;
      break;
    }
  }

  // Substituições globais (aplicadas fora dos blocos)
  Object.entries(replacements).forEach(([key, value]) => {
    message = message.split(key).join(value);
  });

  // Sistema inteligente de normalização de preços
  message = message.replace(
    /💰\s*À vista\s*(.+?)\s*(?:\||ou)\s*(?:no cartão \(crédito\))?\s*(.+?)\s*no cartão\s*(?:em\s+até\s+)?(\d+)x\s*de\s*(.+?)/g,
    '💰 À vista $1 ou $2 no cartão em até $3x de $4'
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
