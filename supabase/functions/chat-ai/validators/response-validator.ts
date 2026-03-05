import { AIContext } from "../types.ts";

export function detectHallucinatedData(
  response: string,
  originalContext: AIContext
): boolean {
  // Detecta se a IA inventou números de orçamento/OS que não existem no contexto
  const budgetNumbers = response.match(/#\d+|Orçamento #\d+/gi) || [];
  const osNumbers = response.match(/OS #\d+|Ordem #\d+/gi) || [];

  // Verifica se os números mencionados existem nos dados originais
  if (budgetNumbers.length > 0 && originalContext.data.budgets) {
    const realBudgetIds = new Set(
      originalContext.data.budgets.map((b: any) => b.sequential_number)
    );
    for (const num of budgetNumbers) {
      const extractedNum = parseInt(num.match(/\d+/)?.[0] || "0");
      if (!realBudgetIds.has(extractedNum)) {
        return true; // Inventou número de orçamento
      }
    }
  }

  if (osNumbers.length > 0 && originalContext.data.serviceOrders) {
    const realOsIds = new Set(
      originalContext.data.serviceOrders.map((os: any) => os.sequential_number)
    );
    for (const num of osNumbers) {
      const extractedNum = parseInt(num.match(/\d+/)?.[0] || "0");
      if (!realOsIds.has(extractedNum)) {
        return true; // Inventou número de OS
      }
    }
  }

  return false;
}

export function validateNumbersIntegrity(
  response: string,
  originalData: any[]
): boolean {
  // Extrai todos os valores monetários da resposta
  const pricesInResponse = response.match(/R\$\s*[\d,.]+/gi) || [];

  if (pricesInResponse.length === 0) return true;

  // Extrai preços dos dados originais
  const realPrices = new Set(
    originalData
      .flatMap((item) => [item.total_price, item.cash_price, item.installment_price])
      .filter((p) => p != null)
      .map((p) => parseFloat(p.toString()))
  );

  // Verifica se cada preço mencionado existe nos dados originais
  for (const priceStr of pricesInResponse) {
    const cleanPrice = priceStr.replace(/[R$\s.]/g, "").replace(",", ".");
    const price = parseFloat(cleanPrice);

    if (!isNaN(price) && !realPrices.has(price)) {
      // Permite diferença de até 0.01 devido a arredondamento
      const hasClose = Array.from(realPrices).some(
        (rp) => Math.abs(rp - price) < 0.02
      );
      if (!hasClose) {
        return false; // Preço inventado
      }
    }
  }

  return true;
}

export function sanitizeResponse(
  response: string,
  context: AIContext
): string {
  // Se não há dados e a resposta menciona dados específicos, substitui por mensagem genérica
  if (!context.dataFound) {
    if (
      response.match(/#\d+|OS #\d+|R\$\s*[\d,.]+/i) &&
      !response.toLowerCase().includes("não encontr")
    ) {
      return `Não encontrei dados específicos sobre sua solicitação. ${
        context.contextType === "budgets"
          ? "Tente buscar por cliente, modelo de dispositivo ou número do orçamento."
          : context.contextType === "service_orders"
          ? "Tente buscar por cliente, modelo de dispositivo ou status da ordem."
          : "Como posso te ajudar de outra forma?"
      }`;
    }
  }

  return response;
}
