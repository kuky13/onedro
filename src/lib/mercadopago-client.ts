import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CheckoutParams {
  planId: string;
  planType: "monthly" | "yearly";
  paymentMethod?: "pix" | "redirect";
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  purchaseRegistrationId?: string;
  isAuthenticated?: boolean;
}

export interface PixPaymentData {
  qr_code: string;
  qr_code_base64: string;
  payment_id: string;
  ticket_url?: string;
  // opcional: timestamp de expiração em ISO ou null
  expires_at?: string | null;
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
        paymentMethod: params.paymentMethod || "redirect",
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        customerPhone: params.customerPhone,
        purchaseRegistrationId: params.purchaseRegistrationId,
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

export async function createPixPayment(params: CheckoutParams): Promise<PixPaymentData> {
  console.log("💳 Iniciando processo de pagamento PIX...", params);
  
  try {
    // Verificar se usuário está logado (opcional)
    const { data: { session } } = await supabase.auth.getSession();
    
    console.log("🔧 Chamando Edge Function create-mercadopago-checkout para PIX...");
    
    let response;
    try {
      response = await supabase.functions.invoke("create-mercadopago-checkout", {
        body: {
          ...params,
          isAuthenticated: !!session,
          paymentMethod: "pix",
          customerName: params.customerName,
          customerEmail: params.customerEmail,
          customerPhone: params.customerPhone,
          purchaseRegistrationId: params.purchaseRegistrationId,
        },
      });
    } catch (invokeError) {
      console.error("❌ Erro ao invocar função:", invokeError);
      const errorMsg = invokeError instanceof Error ? invokeError.message : String(invokeError);
      throw new Error(`Erro ao chamar função: ${errorMsg}`);
    }

    const { data, error } = response;

    // Se houver erro do Supabase (erro HTTP, rede, etc.)
    if (error) {
      console.error("❌ Erro na Edge Function:", error);
      console.error("❌ Detalhes completos do erro:", JSON.stringify(error, null, 2));
      
      // Tentar extrair mensagem de erro mais detalhada
      let errorDetails = error.message || JSON.stringify(error);
      
      // Se o erro contém contexto, tentar extrair
      if (error.context) {
        try {
          const contextData = typeof error.context === 'string' ? JSON.parse(error.context) : error.context;
          if (contextData?.body?.error) {
            errorDetails = contextData.body.error;
          } else if (contextData?.message) {
            errorDetails = contextData.message;
          }
        } catch (e) {
          // Ignorar erro de parse
        }
      }
      
      throw new Error(`Erro ao processar pagamento PIX: ${errorDetails}`);
    }
    
    // Verificar se há erro na resposta (mesmo com status 200)
    if (data?.error) {
      console.error("❌ Erro retornado pela função:", data);
      console.error("❌ Tipo do erro:", data.errorType);
      console.error("❌ Stack trace:", data.stack);
      console.error("❌ Detalhes:", data.details);
      
      // Construir mensagem de erro mais detalhada
      let errorMessage = data.error || "Erro desconhecido ao processar pagamento PIX";
      if (data.details) {
        errorMessage += ` - ${data.details}`;
      }
      if (data.errorType) {
        errorMessage += ` (Tipo: ${data.errorType})`;
      }
      
      throw new Error(errorMessage);
    }
    
    if (!data?.qr_code || !data?.payment_id) {
      console.error("❌ Dados incompletos retornados:", data);
      throw new Error("Dados do pagamento PIX não foram retornados corretamente");
    }

    console.log("✅ Pagamento PIX criado com sucesso!");
    return {
      qr_code: data.qr_code,
      qr_code_base64: data.qr_code_base64 || "",
      payment_id: data.payment_id,
      ticket_url: data.ticket_url,
      expires_at: data.expires_at || null,
    };

  } catch (error) {
    console.error("❌ Erro ao criar pagamento PIX:", error);
    
    // Mensagens de erro mais específicas para o usuário
    let userMessage = "Erro ao processar pagamento PIX";
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

export async function checkPaymentStatus(paymentId: string): Promise<{
  status: string;
  approved: boolean;
  license_code?: string;
  customer_data?: { name: string; email: string };
}> {
  try {
    const { data, error } = await supabase.functions.invoke("check-mercadopago-payment", {
      body: { payment_id: paymentId },
    });

    if (error) {
      throw new Error(`Erro ao verificar pagamento: ${error.message}`);
    }

    return {
      status: data?.status || "pending",
      approved: data?.status === "approved" || data?.status === "completed",
      license_code: data?.license_code,
      customer_data: data?.customer_data,
    };
  } catch (error) {
    console.error("❌ Erro ao verificar status do pagamento:", error);
    return { status: "error", approved: false };
  }
}

export async function cancelPixPayment(
  paymentId: string,
  cancelReason: 'user' | 'timer',
): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke(
      'cancel-mercadopago-payment',
      {
        body: { payment_id: paymentId, cancel_reason: cancelReason },
      }
    );

    if (error) {
      console.error('❌ Erro ao cancelar pagamento PIX:', error);
      throw new Error(error.message);
    }

    if (data?.error) {
      console.error('❌ Erro retornado ao cancelar PIX:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('❌ Erro ao cancelar pagamento PIX:', error);
    throw error;
  }
}

export function redirectToCheckout(url: string) {
  window.open(url, "_blank");
}
