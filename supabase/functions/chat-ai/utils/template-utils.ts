import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Busca o template padrão do usuário
 */
export async function getUserDefaultTemplate(
  supabase: SupabaseClient,
  userId: string
) {
  try {
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("default_template_id")
      .eq("id", userId)
      .single();

    if (userError || !userData?.default_template_id) {
      return { template: null, error: userError };
    }

    const { data: template, error: templateError } = await supabase
      .from("whatsapp_message_templates")
      .select("*")
      .eq("id", userData.default_template_id)
      .single();

    return { template, error: templateError };
  } catch (error) {
    console.error("Error getting user default template:", error);
    return { template: null, error };
  }
}

/**
 * Busca nome da empresa do usuário
 */
export async function getUserCompanyName(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("company_info")
      .select("name")
      .eq("owner_id", userId)
      .single();

    if (error || !data?.name) {
      return "OneDrip";
    }

    return data.name;
  } catch {
    return "OneDrip";
  }
}

/**
 * Formata valores monetários (centavos para reais)
 */
function formatCurrency(cents: number): string {
  if (cents === null || cents === undefined || isNaN(cents)) return "R$ 0,00";
  const reais = cents / 100;
  return `R$ ${reais.toFixed(2).replace(".", ",")}`;
}

/**
 * Formata valores já em reais
 */
function formatCurrencyFromReais(reais: number): string {
  if (reais === null || reais === undefined || isNaN(reais)) return "R$ 0,00";
  return `R$ ${reais.toFixed(2).replace(".", ",")}`;
}

/**
 * Formato inteligente - detecta se é centavos ou reais
 */
function formatSmart(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return "R$ 0,00";
  // Se >= 10000, assume que está em centavos e converte para reais
  return value >= 10000 ? formatCurrency(value) : formatCurrencyFromReais(value);
}

/**
 * Valida e normaliza dados do orçamento
 */
function validarDadosOrcamento(budgetData: any): void {
  // Garantir tipos numéricos
  if (budgetData.cash_price) {
    budgetData.cash_price = Number(budgetData.cash_price) || 0;
  }
  if (budgetData.installment_price) {
    budgetData.installment_price = Number(budgetData.installment_price) || 0;
  }
  if (budgetData.installments) {
    budgetData.installments = Number(budgetData.installments) || 0;
  }
  
  // Validar peças
  if (budgetData.parts && Array.isArray(budgetData.parts)) {
    budgetData.parts.forEach((part: any) => {
      part.cash_price = Number(part.cash_price) || 0;
      part.installment_price = Number(part.installment_price) || 0;
      part.installments = Number(part.installments) || 0;
      part.warranty_months = Number(part.warranty_months) || 0;
    });
  }
}

/**
 * Gera mensagem WhatsApp usando template do usuário
 */
export function generateWhatsAppMessageFromTemplate(
  template: string,
  budgetData: any,
  companyName: string = "OneDrip",
  budgetWarningDays: number = 30
): string {
  // Validar e normalizar dados
  validarDadosOrcamento(budgetData);
  
  // Map budget_parts para parts se necessário
  if (!budgetData.parts && Array.isArray(budgetData.budget_parts)) {
    budgetData.parts = budgetData.budget_parts.map((bp: any) => ({
      name: bp.name || bp.part_type || "Peça",
      part_type: bp.part_type || null,
      quantity: bp.quantity || 1,
      cash_price: bp.cash_price ?? bp.price ?? 0,
      installment_price: bp.installment_price ?? bp.cash_price ?? 0,
      warranty_months: bp.warranty_months ?? 0,
      installments: bp.installment_count ?? 0,
    }));
  }

  // Fallback crítico: quando não há budget_parts, cria opção com a qualidade real do orçamento
  if (!budgetData.parts || budgetData.parts.length === 0) {
    const fallbackQuality = budgetData.part_quality || budgetData.part_type || budgetData.issue;
    if (fallbackQuality) {
      budgetData.parts = [{
        name: fallbackQuality,
        part_type: budgetData.part_type || null,
        quantity: 1,
        cash_price: budgetData.cash_price ?? budgetData.total_price ?? 0,
        installment_price: budgetData.installment_price ?? budgetData.cash_price ?? budgetData.total_price ?? 0,
        warranty_months: budgetData.warranty_months ?? 0,
        installments: budgetData.installments ?? 0,
      }];
    }
  }

  let message = template;

  // Dados básicos
  const clientName = budgetData.client_name || "Cliente";
  const clientPhone = budgetData.client_phone || "";
  const deviceType = budgetData.device_type || "Dispositivo";
  const deviceModel = budgetData.device_model || "Modelo não informado";
  const deviceIssue = budgetData.issue || "Serviço";
  const serviceName = budgetData.issue || budgetData.part_quality || budgetData.part_type || "Serviço";
  const sequentialNumber = budgetData.sequential_number || "S/N";

  // Preços
  const cashPrice = budgetData.cash_price || budgetData.total_price || 0;
  const installmentPrice = budgetData.installment_price || cashPrice;
  const installments = budgetData.installments || 0;

  // Garantia máxima
  let maxWarranty = budgetData.warranty_months || 0;
  if (budgetData.parts && Array.isArray(budgetData.parts)) {
    budgetData.parts.forEach((part: any) => {
      if (part.warranty_months && part.warranty_months > maxWarranty) {
        maxWarranty = part.warranty_months;
      }
    });
  }

  // Serviços inclusos
  const services = [];
  if (budgetData.includes_delivery) services.push("Buscamos e entregamos o seu aparelho");
  if (budgetData.includes_screen_protector) services.push("Película 3D de brinde");
  if (budgetData.custom_services) {
    const lines = budgetData.custom_services.split("\n").filter((l: string) => l.trim());
    lines.forEach((line: string) => {
      const clean = line.replace(/^[•\-*]\s*/, "").trim();
      if (clean) services.push(clean);
    });
  }
  const servicesText = services.length > 0 ? services.map(s => `• ${s}`).join("\n") : "";

  // Data de validade
  const validUntil = budgetData.valid_until || budgetData.expires_at;
  const validDate = validUntil
    ? new Date(validUntil).toLocaleDateString("pt-BR")
    : new Date(Date.now() + budgetWarningDays * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR");

  // Observações
  const notes = (budgetData.notes || "").trim();

  // Processar blocos de peças
  if (message.includes("{qualidades_inicio}") && message.includes("{qualidades_fim}")) {
    const before = message.split("{qualidades_inicio}")[0];
    const middle = message.split("{qualidades_inicio}")[1].split("{qualidades_fim}")[0];
    const after = message.split("{qualidades_fim}")[1] || "";

    let processedParts = "";
    if (budgetData.parts && Array.isArray(budgetData.parts) && budgetData.parts.length > 0) {
      budgetData.parts.forEach((part: any) => {
        let partText = middle;
        const partName = part.name || part.part_type || "Peça";
        const partPrice = part.cash_price || 0;
        const partInstallmentPrice = part.installment_price || partPrice;
        const partWarranty = part.warranty_months || 0;
        const partInstallments = part.installments || installments || 0;

        // Converter valores corretamente (detectar se está em centavos)
        const cashInReais = partPrice >= 10000 ? partPrice / 100 : partPrice;
        const installmentInReais = partInstallmentPrice >= 10000 
          ? partInstallmentPrice / 100 
          : (partInstallmentPrice || cashInReais);
        
        // Calcular valor da parcela
        const monthlyValue = partInstallments > 0 
          ? installmentInReais / partInstallments 
          : installmentInReais;

        const partReplacements: Record<string, string> = {
          "{qualidade_nome}": partName,
          "{peca_nome}": partName,
          "{peca_preco_vista}": formatCurrencyFromReais(cashInReais),
          "{peca_preco_parcelado}": formatCurrencyFromReais(installmentInReais),
          "{peca_garantia}": partWarranty > 0 ? `${partWarranty} meses` : "",
          "{peca_garantia_meses}": partWarranty.toString(),
        };

        Object.entries(partReplacements).forEach(([key, value]) => {
          partText = partText.split(key).join(value);
        });

        processedParts += partText;
      });
    }

    message = `${before}${processedParts}${after}`;
  }

  // Substituições globais
  const replacements: Record<string, string> = {
    "{nome_empresa}": companyName,
    "{loja}": companyName,
    "{numero_orcamento}": sequentialNumber.toString(),
    "{cliente}": clientName,
    "{nome_cliente}": clientName,
    "{telefone}": clientPhone,
    "{telefone_cliente}": clientPhone,
    "{aparelho}": deviceModel,
    "{tipo_aparelho}": deviceType,
    "{tipo_dispositivo}": deviceType,
    "{modelo_dispositivo}": deviceModel,
    "{defeito}": deviceIssue,
    "{nome_reparo}": serviceName,
    "{preco_vista}": formatSmart(cashPrice),
    "{preco_parcelado}": formatSmart(installmentPrice),
    "{garantia}": maxWarranty > 0 ? `${maxWarranty} meses` : "",
    "{garantia_meses}": maxWarranty.toString(),
    "{observacoes}": notes,
    "{validade}": validDate,
    "{data_validade}": validDate,
    "{servicos_inclusos}": servicesText,
  };

  Object.entries(replacements).forEach(([key, value]) => {
    message = message.split(key).join(value);
  });

  // Limpar seções vazias (mas manter a linha de "água ou molhado")
  if (!servicesText) {
    message = message.replace(/\*📦 Serviços Inclusos:\*\s*\n+(?=🚫)/g, "");
  }
  if (!notes) {
    message = message.replace(/📝\s*\*Observações:\*\s*\n+\{observacoes\}\s*\n+/gi, "");
  }

  // Limpeza final
  message = message
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .replace(/^\s*\n/, "")
    .replace(/\n\s*$/, "");

  return message.trim();
}

/**
 * Template padrão caso usuário não tenha configurado
 */
const DEFAULT_TEMPLATE = `📱 *{nome_empresa}* 

*Aparelho:* {modelo_dispositivo} 
*Serviço:* {nome_reparo} 

{qualidades_inicio}*{qualidade_nome}* – {peca_garantia_meses} meses de garantia 
💰 À vista {peca_preco_vista} ou {peca_preco_parcelado} no cartão

{qualidades_fim}
*📦 Serviços Inclusos:* 
{servicos_inclusos} 

🚫 Não cobre danos por água ou molhado 

📝 *Observações:* 
{observacoes} 

📅 Válido até: {data_validade}`;

export { DEFAULT_TEMPLATE };
