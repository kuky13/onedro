import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CheckoutParams {
  planId: string;
  planType: "monthly" | "yearly";
}

// Função para delay entre tentativas
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função para verificar se o erro é temporário
const isTemporaryError = (error: any): boolean => {
  const errorMessage = error?.message?.toLowerCase() || '';
  return (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('failed to send') ||
    errorMessage.includes('fetch') ||
    error?.status >= 500
  );
};

// Função para retry com backoff exponencial
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!isTemporaryError(error) || attempt === maxRetries) {
        throw error;
      }
      
      const delayMs = baseDelay * Math.pow(2, attempt);
      console.warn(`Tentativa ${attempt + 1} falhou, tentando novamente em ${delayMs}ms...`, error);
      await delay(delayMs);
    }
  }
  
  throw lastError;
}

export async function createCheckoutSession(params: CheckoutParams): Promise<string> {
  console.log("💳 Iniciando processo de checkout Mercado Pago...", params);
  
  try {
    // Verificar se usuário está logado (opcional)
    const { data: { session } } = await supabase.auth.getSession();
    
    console.log("🔧 Chamando Edge Function create-mercadopago-checkout...");
    
    const { data, error } = await supabase.functions.invoke("create-mercadopago-checkout", {
      body: {
        ...params,
        isAuthenticated: !!session,
      },
    });

    if (error) {
      console.error("❌ Erro na Edge Function:", error);
      throw new Error(`Erro ao processar pagamento: ${error.message}`);
    }
    
    if (!data?.url) {
      throw new Error("URL de checkout não foi retornada");
    }

    console.log("✅ Checkout criado com sucesso!");
    return data.url;
    
  } catch (error) {
    console.error("❌ Erro ao criar sessão de checkout:", error);
    
    // Mensagens de erro mais específicas para o usuário
    let userMessage = "Erro ao processar pagamento";
    let description = "Tente novamente em alguns instantes";
    
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        userMessage = "Problema de conexão";
        description = "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
      } else if (errorMsg.includes('plan')) {
        userMessage = "Erro de configuração";
        description = "Entre em contato com o suporte técnico.";
      } else {
        description = error.message;
      }
    }
    
    toast.error(userMessage, { description, duration: 6000 });
    throw error;
  }
}

export function redirectToCheckout(url: string) {
  window.open(url, "_blank");
}
