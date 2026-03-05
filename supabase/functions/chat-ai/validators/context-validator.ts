import { AIContext, ContextMarker, ValidationResult } from "../types.ts";

export function validateDataContext(context: AIContext): ValidationResult {
  const issues: string[] = [];

  // Verifica se o tipo de contexto foi identificado corretamente
  if (!context.contextType) {
    issues.push("Context type not identified");
  }

  // Verifica se há dados quando deveria haver
  if (context.dataFound && !hasAnyData(context.data)) {
    issues.push("dataFound is true but no data is present");
  }

  // Verifica se dataFound está correto
  if (!context.dataFound && hasAnyData(context.data)) {
    issues.push("dataFound is false but data is present");
  }

  return {
    isValid: issues.length === 0,
    issues: issues.length > 0 ? issues : undefined,
  };
}

export function markDataNotFound(contextType: string): ContextMarker {
  return {
    type: contextType,
    message: "NO_DATA_FOUND",
    hasData: false,
  };
}

export function generateNotFoundMessage(
  query: string,
  contextType: string
): string {
  const messages: Record<string, string> = {
    license: `Não encontrei informações sobre licença para: "${query}". Verifique se você possui uma licença ativa.`,
    budgets: `Não encontrei orçamentos relacionados a: "${query}". Tente buscar por cliente, modelo de dispositivo ou número do orçamento.`,
    service_orders: `Não encontrei ordens de serviço relacionadas a: "${query}". Tente buscar por cliente, modelo de dispositivo ou status.`,
    trash: `Não encontrei itens deletados relacionados a: "${query}". A lixeira pode estar vazia ou os itens já foram excluídos permanentemente.`,
    peliculas: `Não encontrei películas compatíveis com: "${query}". Verifique se o modelo do dispositivo está correto.`,
    general: `Não encontrei informações específicas sobre: "${query}". Posso te ajudar com licenças, orçamentos, ordens de serviço, lixeira ou películas compatíveis.`,
  };

  return messages[contextType] || messages.general;
}

function hasAnyData(data: AIContext["data"]): boolean {
  return !!(
    data.license ||
    (data.budgets && data.budgets.length > 0) ||
    (data.serviceOrders && data.serviceOrders.length > 0) ||
    (data.trashedItems && data.trashedItems.length > 0) ||
    (data.peliculas && data.peliculas.length > 0)
  );
}
