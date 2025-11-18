// WhatsApp utility functions
const isIOS = (): boolean => {
  try {
    const ua = navigator.userAgent || '';
    const platform = (navigator as any).platform || '';
    const maxTP = (navigator as any).maxTouchPoints || 0;
    return /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && maxTP > 1);
  } catch {
    return false;
  }
};

const buildWhatsAppUrl = (phone?: string, message?: string): string => {
  const hasPhone = Boolean(phone && phone.replace(/\D/g, ''));
  const cleanPhone = hasPhone ? String(phone).replace(/\D/g, '') : undefined;
  const encodedText = message ? encodeURIComponent(message) : undefined;
  // iOS Safari is more reliable with api.whatsapp.com
  if (isIOS()) {
    if (hasPhone) {
      return `https://api.whatsapp.com/send?phone=${cleanPhone}${encodedText ? `&text=${encodedText}` : ''}`;
    }
    return `https://api.whatsapp.com/send${encodedText ? `?text=${encodedText}` : ''}`;
  }
  // Generic cross-platform
  if (hasPhone) {
    return `https://wa.me/${cleanPhone}${encodedText ? `?text=${encodedText}` : ''}`;
  }
  return `https://wa.me/${encodedText ? `?text=${encodedText}` : ''}`;
};
interface Budget {
  title?: string;
  description?: string;
  total?: number;
  [key: string]: unknown;
}

// Função para gerar mensagem de serviço com múltiplas opções
export const generateServiceWhatsAppMessage = (
  budgets: Budget[],
  companyName: string = "Nossa Loja"
): string => {
  if (!budgets || budgets.length === 0) return '';

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const firstBudget = budgets[0] || {} as any;
  const deviceModel = (firstBudget as any)?.device_model || 'Dispositivo';
  const serviceName = (firstBudget as any)?.part_quality || (firstBudget as any)?.issue || (firstBudget as any)?.part_type || 'Serviço';

  let message = `📱${companyName}\n`;
  message += `*Aparelho:* ${deviceModel}\n`;
  message += `*Serviço:* ${serviceName}\n\n`;

  // Listar cada opção de serviço/qualidade selecionada
  budgets.forEach((budget: any) => {
    const optionName = budget.issue || budget.part_quality || budget.part_type || 'Opção';
    const warranty = budget.warranty_months || 0;
    const cashPrice = budget.cash_price ? budget.cash_price / 100 : 0;
    const installmentPrice = budget.installment_price ? budget.installment_price / 100 : cashPrice;
    const installments = (budget as any).installments_count || budget.installments || 0;
    const totalInstallment = installmentPrice > cashPrice ? installmentPrice : installmentPrice * installments;
    const monthlyValue = installments > 0 ? (installmentPrice > cashPrice ? installmentPrice / installments : installmentPrice) : installmentPrice;

    // Nome da peça/qualidade com garantia
    message += `*${optionName}*${warranty > 0 ? ` – ${warranty} meses de garantia` : ''}\n`;

    // Preços formatados
    if (installmentPrice && installments > 0 && installmentPrice !== cashPrice) {
      message += `💰 À vista ${formatCurrency(cashPrice)} ou ${formatCurrency(totalInstallment)} no cartão em ${installments}x de ${formatCurrency(monthlyValue)}\n\n`;
    } else {
      message += `💰 À vista ${formatCurrency(cashPrice)}\n\n`;
    }
  });

  // Serviços inclusos
  const additionalServices: string[] = [];
  if ((firstBudget as any)?.includes_delivery) additionalServices.push('Buscamos e entregamos o seu aparelho');
  if ((firstBudget as any)?.includes_screen_protector) additionalServices.push('Película 3D de brinde');

  if ((firstBudget as any)?.custom_services) {
    const customText = String((firstBudget as any).custom_services).trim();
    if (customText) {
      const lines = customText.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        const cleanLine = line.replace(/^[•\-*]\s*/, '').trim();
        if (cleanLine) additionalServices.push(cleanLine);
      });
    }
  }

  if (additionalServices.length > 0) {
    message += `*📦 Serviços Inclusos:*\n`;
    additionalServices.forEach(s => { message += `• ${s}\n`; });
    message += `\n`;
  }

  // Exclusões de garantia
  message += `🚫 Não cobre danos por água ou molhado\n\n`;

  // Observações (somente se houver conteúdo)
  const notesTextMulti = String((firstBudget as any)?.notes ?? '').trim();
  if (notesTextMulti) {
    message += `📝 *Observações:*\n`;
    message += `${notesTextMulti}\n\n`;
  }

  // Validade
  if ((firstBudget as any)?.valid_until) {
    const validDate = new Date((firstBudget as any).valid_until).toLocaleDateString('pt-BR');
    message += `📅 Válido até: ${validDate}`;
  }

  return message.trim();
};

export const generateWhatsAppMessage = (budget: Budget, budgetWarningDays?: number): string => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  let message = '';
  
  // Nome da loja no topo
  message += `📱${budget.shop_name || 'Nossa Loja'}\n`;

  // Informações principais do orçamento
  message += `*Aparelho:* ${budget.device_model || 'Não especificado'}\n`;
  
  // Serviço principal - usar o Nome do Reparo (part_quality)
  message += `*Serviço:* ${budget.part_quality || budget.part_type || 'Serviço'}\n\n`;

  // Seções de qualidade/preço com garantia
  if (budget.parts && budget.parts.length > 0) {
    budget.parts.forEach((part: any) => {
      const partName = part.name || part.part_type || 'Peça';
      const cashPrice = part.cash_price || part.price || 0;
      const installmentPrice = part.installment_price || cashPrice;
      const warrantyMonths = part.warranty_months || budget.warranty_months || 0;
      
      // Nome da peça/qualidade com garantia
      message += `*${partName}*${warrantyMonths > 0 ? ` – ${warrantyMonths} meses de garantia` : ''}\n`;
      
      // Preços (formato mais limpo)
      if (cashPrice !== installmentPrice) {
        const installmentCount = (budget as any).installments_count || (budget as any).installments || 0;
        const ip = installmentPrice;
        const cp = cashPrice;
        const totalInstallment = ip > cp ? ip : ip * installmentCount;
        const monthlyValue = ip > cp ? ip / installmentCount : ip;
        if (installmentCount > 0) {
          message += `💰 À vista ${formatCurrency(cashPrice)} ou ${formatCurrency(totalInstallment)} no cartão em ${installmentCount}x de ${formatCurrency(monthlyValue)}`;
        } else {
          message += `💰 À vista ${formatCurrency(cashPrice)}`;
        }
      } else {
        message += `💰 À vista ${formatCurrency(cashPrice)}`;
      }
      message += '\n\n';
    });
  }

  // Serviços Adicionais - incluir entrega, película e serviços personalizados
  const additionalServices = [];
  if (budget.includes_delivery) additionalServices.push('Buscamos e entregamos o seu aparelho');
  if (budget.includes_screen_protector) additionalServices.push('Película 3D de brinde');
  
  // Adicionar serviços personalizados
  if (budget.custom_services) {
    const customServicesText = budget.custom_services.trim();
    if (customServicesText) {
      // Se já tiver bullets ou quebras de linha, processar
      const lines = customServicesText.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        const cleanLine = line.replace(/^[•\-*]\s*/, '').trim();
        if (cleanLine) additionalServices.push(cleanLine);
      });
    }
  }
  
  if (additionalServices.length > 0) {
    message += `*Serviços Adicionais:*\n`;
    additionalServices.forEach(service => {
      message += `• ${service}\n`;
    });
    message += '\n';
  }

  // Garantia até - pegar o maior valor de garantia das peças
  let maxWarranty = 0;
  if (budget.parts && budget.parts.length > 0) {
    budget.parts.forEach((part: any) => {
      if (part.warranty_months && part.warranty_months > maxWarranty) {
        maxWarranty = part.warranty_months;
      }
    });
  }
  
  // Exclusões de garantia
  message += `🚫 Não cobre danos por água ou molhado\n\n`;

  // Observações (somente se houver conteúdo)
  const notesTextSingle = String(budget.notes ?? '').trim();
  if (notesTextSingle) {
    message += `*📝 Observações:*\n`;
    message += `${notesTextSingle}\n\n`;
  }

  // Validade
  if (budget.valid_until) {
    const validDate = new Date(budget.valid_until).toLocaleDateString('pt-BR');
    message += `📅 Válido até: ${validDate}`;
  } else if (budgetWarningDays) {
    // Usar os dias configurados pelo usuário se não houver validade específica
    const validDate = new Date(Date.now() + budgetWarningDays * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');
    message += `📅 Válido até: ${validDate}`;
  }

  // Normalização universal não é necessária no novo formato sem "| no cartão (crédito)"
  
  return message.trim();
};

export const shareViaWhatsApp = (message: string): void => {
  const whatsappUrl = buildWhatsAppUrl(undefined, message);
  try {
    if (isIOS()) {
      window.location.href = whatsappUrl;
    } else {
      const w = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      if (!w) window.location.href = whatsappUrl;
    }
  } catch {
    window.location.href = whatsappUrl;
  }
};

export const openWhatsApp = (phone?: string, message?: string): void => {
  const whatsappUrl = buildWhatsAppUrl(phone, message);
  try {
    if (isIOS()) {
      window.location.href = whatsappUrl;
    } else {
      const w = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      if (!w) window.location.href = whatsappUrl;
    }
  } catch {
    window.location.href = whatsappUrl;
  }
};

export const copyTextToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.padding = '0';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = 'none';
    textarea.style.background = 'transparent';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
};