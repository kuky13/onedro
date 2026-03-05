import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-PAYMENT-RECEIPT] ${step}${detailsStr}`);
};

interface ReceiptEmailRequest {
  email: string;
  name: string;
  licenseCode?: string | null;
  planType: "monthly" | "yearly" | string;
  isRenewal: boolean;
  amount: number;
  currency: string;
  paymentMethod: "pix" | "card" | string;
  paymentId: string;
  status: string;
  paidAt: string;
  receiptCode: string;
  // Contato do comprador
  customerPhone?: string | null;
  // Dados administrativos (IP, device, etc)
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  // Dados de login do usuário na hora da compra
  loginUserId?: string | null;
  loginEmail?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Função iniciada");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      logStep("RESEND_API_KEY não configurada - recibo não será enviado");
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "RESEND_API_KEY não configurada. Configure em Settings > Edge Functions > Secrets",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const resend = new Resend(resendApiKey);

    const body = (await req.json()) as ReceiptEmailRequest;
    const {
      email,
      name,
      licenseCode,
      planType,
      isRenewal,
      amount,
      currency,
      paymentMethod,
      paymentId,
      status,
      paidAt,
      receiptCode,
      customerPhone,
      ipAddress,
      userAgent,
      deviceInfo,
      loginUserId,
      loginEmail,
    } = body;

    if (!email || !name || !amount || !currency || !paymentMethod || !paymentId || !planType || !receiptCode) {
      throw new Error(
        "Campos obrigatórios ausentes: email, name, amount, currency, paymentMethod, paymentId, planType, receiptCode"
      );
    }

    const planTypeText = planType === "yearly" ? "Anual" : "Mensal";
    const daysContracted = planType === "yearly" ? 365 : 30;
    const siteUrl = Deno.env.get("SITE_URL") || "https://onedrip.com.br";
    const supportUrl = `${siteUrl}/suporte`;

    const paidAtDate = paidAt ? new Date(paidAt) : new Date();
    const paidAtFormatted = paidAtDate.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const paymentMethodLabel =
      paymentMethod === "pix"
        ? "PIX"
        : paymentMethod === "card"
        ? "Cartão (Mercado Pago)"
        : paymentMethod;

    const statusLabel =
      status === "approved" || status === "completed"
        ? "Pagamento Aprovado"
        : `Status: ${status}`;

    const licenseBlock = licenseCode
      ? `<p style="margin: 4px 0; font-size: 14px; color: #333;">
           <strong>Código da licença:</strong> <span style="font-family: monospace;">${licenseCode}</span>
         </p>
         <p style="margin: 4px 0; font-size: 13px; color: #666;">
           ${isRenewal ? "Renovação da sua licença atual" : "Nova licença gerada para sua conta"}
         </p>`
      : `<p style="margin: 4px 0; font-size: 14px; color: #333;">
           <strong>Licença:</strong> Será vinculada/gerada automaticamente na sua conta após o processamento.
         </p>`;

    const emailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recibo de Pagamento - OneDrip</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 640px; margin: 0 auto; padding: 24px; background-color: #f4f4f4;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%); padding: 24px 20px; text-align: center; border-radius: 12px 12px 0 0; color: #fff;">
    <h1 style="margin: 0 0 8px 0; font-size: 22px;">Recibo de Pagamento</h1>
    <p style="margin: 0; font-size: 14px; opacity: 0.9;">OneDrip - Sistema para Técnicos de Celular</p>
  </div>

  <div style="background-color: #ffffff; padding: 24px 20px 28px 20px; border-radius: 0 0 12px 12px; box-shadow: 0 8px 20px rgba(15,23,42,0.15);">
    <p style="font-size: 15px; margin: 0 0 12px 0;">Olá, <strong>${name}</strong>!</p>
    <p style="font-size: 14px; margin: 0 0 16px 0;">Recebemos o seu pagamento e aqui está o comprovante completo da sua compra.</p>

    <div style="background-color: #ecfdf5; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px;">
      <p style="margin: 0 0 4px 0; font-size: 14px; color: #166534;"><strong>${statusLabel}</strong></p>
      <p style="margin: 0; font-size: 13px; color: #166534;">Código do recibo: <strong style="font-family: monospace; letter-spacing: 1px;">${receiptCode}</strong></p>
    </div>

    <h2 style="font-size: 16px; margin: 0 0 8px 0; color: #111827;">Dados do Pagamento</h2>
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 12px 14px; margin-bottom: 18px; border: 1px solid #e5e7eb;">
      <p style="margin: 4px 0; font-size: 14px;">
        <strong>Valor:</strong> ${currency} ${amount.toFixed(2).replace(".", ",")} 
      </p>
      <p style="margin: 4px 0; font-size: 14px;"><strong>Método:</strong> ${paymentMethodLabel}</p>
      <p style="margin: 4px 0; font-size: 14px;"><strong>Data e hora:</strong> ${paidAtFormatted}</p>
      <p style="margin: 4px 0; font-size: 13px; color: #6b7280;"><strong>ID do pagamento (Mercado Pago):</strong> ${paymentId}</p>
    </div>

    <h2 style="font-size: 16px; margin: 0 0 8px 0; color: #111827;">Dados da Licença</h2>
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 12px 14px; margin-bottom: 18px; border: 1px solid #e5e7eb;">
      <p style="margin: 4px 0; font-size: 14px;"><strong>Plano:</strong> ${planTypeText} (${daysContracted} dias)</p>
      ${licenseBlock}
    </div>

    <h2 style="font-size: 16px; margin: 0 0 8px 0; color: #111827;">Dados do Cliente</h2>
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 12px 14px; margin-bottom: 18px; border: 1px solid #e5e7eb;">
      <p style="margin: 4px 0; font-size: 14px;"><strong>Nome:</strong> ${name}</p>
      <p style="margin: 4px 0; font-size: 14px;"><strong>Email:</strong> ${email}</p>
    </div>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px 12px; border-radius: 6px; margin: 18px 0 10px 0;">
      <p style="margin: 0; font-size: 13px; color: #92400e;">
        <strong>Guarde este recibo.</strong> Recomendamos salvar este email, pois ele contém todas as informações da sua compra.
      </p>
    </div>

    <div style="text-align: center; margin-top: 22px;">
      <a href="${siteUrl}/auth" style="background-color: #10b981; color: #ffffff; padding: 11px 26px; border-radius: 999px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
        Acessar minha conta OneDrip
      </a>
    </div>

    <div style="border-top: 1px solid #e5e7eb; margin-top: 24px; padding-top: 14px; font-size: 12px; color: #6b7280;">
      <p style="margin: 0 0 4px 0;">
        Se precisar de ajuda ou tiver qualquer dúvida sobre este pagamento, acesse nosso <a href="${supportUrl}" style="color: #10b981; text-decoration: none;">centro de suporte</a>.
      </p>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #9ca3af;">
        Este email serve como comprovante de pagamento e pode ser apresentado como recibo fiscal simplificado.
      </p>
    </div>
  </div>

  <div style="text-align: center; margin-top: 14px; font-size: 11px; color: #9ca3af;">
    <p style="margin: 0;">© ${new Date().getFullYear()} OneDrip. Todos os direitos reservados.</p>
  </div>
</body>
</html>
`;

    const subject = `Recibo de pagamento OneDrip - ${currency} ${amount
      .toFixed(2)
      .replace(".", ",")} (${receiptCode})`;

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "OneDrip <onboarding@resend.dev>";
    const adminEmail = Deno.env.get("RESEND_ADMIN_EMAIL");

    // 1. Enviar recibo para o cliente
    logStep("Enviando recibo para o cliente", { to: email, receiptCode });

    const clientEmailResponse = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject,
      html: emailHtml,
    });

    logStep("Recibo do cliente enviado", { response: clientEmailResponse });

    // 2. Se admin configurado, enviar email administrativo separado com dados sensíveis
    if (adminEmail) {
      logStep("Enviando notificação administrativa", { to: adminEmail });

      const adminSubject = `[ADMIN] Nova compra - ${name} - ${currency} ${amount.toFixed(2)} (${receiptCode})`;
      
      const adminEmailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Notificação Administrativa - Nova Compra</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 640px; margin: 0 auto; padding: 24px; background-color: #f4f4f4;">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 24px 20px; text-align: center; border-radius: 12px 12px 0 0; color: #fff;">
    <h1 style="margin: 0 0 8px 0; font-size: 22px;">🔔 Nova Compra Realizada</h1>
    <p style="margin: 0; font-size: 14px; opacity: 0.9;">Notificação Administrativa - OneDrip</p>
  </div>

  <div style="background-color: #ffffff; padding: 24px 20px 28px 20px; border-radius: 0 0 12px 12px; box-shadow: 0 8px 20px rgba(15,23,42,0.15);">
    <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px;">
      <p style="margin: 0 0 4px 0; font-size: 14px; color: #92400e;"><strong>⚠️ DADOS ADMINISTRATIVOS - CONFIDENCIAL</strong></p>
      <p style="margin: 0; font-size: 13px; color: #92400e;">Este email contém informações sensíveis do comprador.</p>
    </div>

    <h2 style="font-size: 16px; margin: 0 0 8px 0; color: #111827;">Dados do Cliente</h2>
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 12px 14px; margin-bottom: 18px; border: 1px solid #e5e7eb;">
      <p style="margin: 4px 0; font-size: 14px;"><strong>Nome:</strong> ${name}</p>
      <p style="margin: 4px 0; font-size: 14px;"><strong>Email:</strong> ${email}</p>
      ${customerPhone ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Telefone:</strong> ${customerPhone}</p>` : ''}
      ${loginUserId ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Usuário logado (ID):</strong> ${loginUserId}</p>` : ''}
      ${loginEmail ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Email de login:</strong> ${loginEmail}</p>` : ''}
      ${ipAddress ? `<p style="margin: 4px 0; font-size: 14px;"><strong>IP:</strong> ${ipAddress}</p>` : ''}
      ${deviceInfo ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Dispositivo:</strong> ${deviceInfo}</p>` : ''}
      ${userAgent ? `<p style="margin: 4px 0; font-size: 13px; color: #6b7280;"><strong>User Agent:</strong> ${userAgent}</p>` : ''}
    </div>

    <h2 style="font-size: 16px; margin: 0 0 8px 0; color: #111827;">Dados do Pagamento</h2>
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 12px 14px; margin-bottom: 18px; border: 1px solid #e5e7eb;">
      <p style="margin: 4px 0; font-size: 14px;">
        <strong>Valor:</strong> ${currency} ${amount.toFixed(2).replace(".", ",")} 
      </p>
      <p style="margin: 4px 0; font-size: 14px;"><strong>Método:</strong> ${paymentMethodLabel}</p>
      <p style="margin: 4px 0; font-size: 14px;"><strong>Status:</strong> ${statusLabel}</p>
      <p style="margin: 4px 0; font-size: 14px;"><strong>Data e hora:</strong> ${paidAtFormatted}</p>
      <p style="margin: 4px 0; font-size: 13px; color: #6b7280;"><strong>ID Mercado Pago:</strong> ${paymentId}</p>
      <p style="margin: 4px 0; font-size: 13px; color: #6b7280;"><strong>Código do recibo:</strong> ${receiptCode}</p>
    </div>

    <h2 style="font-size: 16px; margin: 0 0 8px 0; color: #111827;">Dados da Licença</h2>
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 12px 14px; margin-bottom: 18px; border: 1px solid #e5e7eb;">
      <p style="margin: 4px 0; font-size: 14px;"><strong>Plano:</strong> ${planTypeText} (${daysContracted} dias)</p>
      ${licenseCode 
        ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Código:</strong> <span style="font-family: monospace;">${licenseCode}</span></p>
           <p style="margin: 4px 0; font-size: 13px; color: #666;">${isRenewal ? "Renovação" : "Nova licença"}</p>` 
        : `<p style="margin: 4px 0; font-size: 14px;"><strong>Licença:</strong> Será vinculada automaticamente</p>`
      }
    </div>

    <div style="border-top: 1px solid #e5e7eb; margin-top: 24px; padding-top: 14px; font-size: 12px; color: #6b7280;">
      <p style="margin: 0 0 4px 0;">
        Email enviado automaticamente pelo sistema OneDrip.
      </p>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #9ca3af;">
        Este email contém informações confidenciais e deve ser tratado com sigilo.
      </p>
    </div>
  </div>

  <div style="text-align: center; margin-top: 14px; font-size: 11px; color: #9ca3af;">
    <p style="margin: 0;">© ${new Date().getFullYear()} OneDrip. Painel Administrativo.</p>
  </div>
</body>
</html>
      `;

      const adminEmailResponse = await resend.emails.send({
        from: fromEmail,
        to: [adminEmail],
        subject: adminSubject,
        html: adminEmailHtml,
      });

      logStep("Notificação administrativa enviada", { response: adminEmailResponse });
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId:
          (clientEmailResponse as any).data?.id || (clientEmailResponse as any).id || "sent",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO na função de recibo", { message: errorMessage });

    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
