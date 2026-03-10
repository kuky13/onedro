import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AbacatePayCheckoutParams {
  amount: number; // In cents
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerTaxId?: string; // CPF/CNPJ
  paymentMethod?: "PIX" | "CARD";
  frequency?: "ONE_TIME" | "MULTIPLE_PAYMENTS";
  returnUrl?: string;
  completionUrl?: string;
  purchaseRegistrationId?: string; // For internal tracking
}

export interface AbacatePayPixData {
  qr_code: string;
  qr_code_base64: string;
  payment_id: string;
  expires_at?: string | null;
}

export interface AbacatePayBillingData {
  url: string;
  payment_id: string;
}

export async function createAbacatePayBilling(params: AbacatePayCheckoutParams): Promise<AbacatePayBillingData> {
  console.log("🥑 Iniciando processo de cobrança AbacatePay...", params);
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const { data, error } = await supabase.functions.invoke("create-abacatepay-checkout", {
      body: {
        ...params,
        type: "billing", // Specify intent
        isAuthenticated: !!session,
      },
    });

    if (error) {
      console.error("❌ Erro na Edge Function:", error);
      throw new Error(`Erro ao processar cobrança: ${error.message}`);
    }
    
    if (data?.error) {
      throw new Error(data.error);
    }

    if (!data?.data?.url) {
      throw new Error("URL de checkout não foi retornada");
    }

    console.log("✅ Cobrança criada com sucesso!");
    return {
      url: data.data.url,
      payment_id: data.data.id
    };
    
  } catch (error) {
    console.error("❌ Erro ao criar cobrança:", error);
    toast.error("Erro ao processar pagamento", { 
      description: error instanceof Error ? error.message : "Tente novamente mais tarde" 
    });
    throw error;
  }
}

export async function createAbacatePayPix(params: AbacatePayCheckoutParams): Promise<AbacatePayPixData> {
  console.log("🥑 Iniciando processo de PIX AbacatePay...", params);
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const { data, error } = await supabase.functions.invoke("create-abacatepay-checkout", {
      body: {
        ...params,
        type: "pix", // Specify intent
        isAuthenticated: !!session,
      },
    });

    if (error) {
      console.error("❌ Erro na Edge Function:", error);
      throw new Error(`Erro ao chamar função: ${error.message}`);
    }

    if (data?.error) {
      throw new Error(data.error);
    }
    
    const pixData = data?.data;
    
    if (!pixData?.brCode) {
      throw new Error("Dados do PIX não foram retornados corretamente");
    }

    console.log("✅ PIX criado com sucesso!");
    return {
      qr_code: pixData.brCode,
      qr_code_base64: pixData.brCodeBase64,
      payment_id: pixData.id,
      expires_at: pixData.expiresAt,
    };

  } catch (error) {
    console.error("❌ Erro ao criar PIX:", error);
    toast.error("Erro ao gerar PIX", { 
      description: error instanceof Error ? error.message : "Tente novamente mais tarde" 
    });
    throw error;
  }
}

export async function checkAbacatePayStatus(paymentId: string): Promise<{
  status: string;
  paid: boolean;
  license_code?: string;
  customer_data?: { name: string; email: string };
}> {
  try {
    const { data, error } = await supabase.functions.invoke("check-abacatepay-payment", {
      body: { paymentId },
    });

    if (error) {
      throw new Error(`Erro ao verificar pagamento: ${error.message}`);
    }

    return {
      status: data?.data?.status || "PENDING",
      paid: data?.data?.status === "PAID",
      license_code: data?.data?.license_code,
      customer_data: data?.data?.customer_data
    };
  } catch (error) {
    console.error("❌ Erro ao verificar status:", error);
    return { status: "error", paid: false };
  }
}
