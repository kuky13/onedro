import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-LICENSE-EMAIL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Função iniciada");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      logStep("RESEND_API_KEY não configurada - email não será enviado");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "RESEND_API_KEY não configurada. Configure em Settings > Edge Functions > Secrets" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const resend = new Resend(resendApiKey);

    const requestBody = await req.json();
    const { email, name, licenseCode, planType } = requestBody;

    if (!email || !name || !licenseCode) {
      throw new Error("email, name e licenseCode são obrigatórios");
    }

    logStep("Dados recebidos", { email, name, hasLicenseCode: !!licenseCode, planType });

    const planTypeText = planType === "yearly" ? "Anual" : "Mensal";
    const daysContracted = planType === "yearly" ? 365 : 30;
    const siteUrl = Deno.env.get("SITE_URL") || "https://onedrip.com.br";
    const supportUrl = `${siteUrl}/suporte`;

    // Template HTML do email
    const emailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chave de Acesso ao Suporte OneDrip</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">🎉 Pagamento Aprovado!</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Olá, <strong>${name}</strong>!</p>
    
    <p style="font-size: 16px;">Seu pagamento foi aprovado com sucesso! Seu acesso ao suporte do <strong>OneDrip</strong> está pronto para ser ativado.</p>
    
    <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Sua chave de acesso ao suporte:</p>
      <p style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #667eea; font-family: monospace;">${licenseCode}</p>
      <p style="margin: 15px 0 0 0; font-size: 14px; color: #666;">Válida por <strong>${daysContracted} dias</strong></p>
    </div>
    
    <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #721c24;">
        <strong>🔒 CONFIDENCIAL - NÃO COMPARTILHE!</strong>
      </p>
      <p style="margin: 10px 0 0 0; font-size: 13px; color: #721c24;">
        Esta chave é pessoal e intransferível. <strong>NUNCA compartilhe</strong> com outras pessoas. 
        Cada chave pode ser ativada apenas <strong>1 vez</strong>. Se você compartilhar, outra pessoa poderá usar sua chave e você perderá o acesso ao suporte.
      </p>
    </div>
    
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>⚠️ Importante:</strong> Guarde este email com segurança! Você precisará da chave para ativar seu acesso ao suporte.
      </p>
    </div>
    
    <div style="background: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #0c5460;">
        <strong>📋 Próximos Passos:</strong>
      </p>
      <ol style="margin: 0; padding-left: 20px; color: #0c5460; font-size: 14px;">
        <li>Crie uma conta no OneDrip (se ainda não tiver)</li>
        <li>Use esta chave para ativar seu acesso ao suporte</li>
        <li>Comece a usar a plataforma imediatamente!</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${siteUrl}/auth" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Criar Conta e Ativar Acesso ao Suporte
      </a>
    </div>
    
    <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
      <p style="font-size: 14px; color: #666; margin: 0 0 10px 0;">
        <strong>Perdeu a chave ou precisa de ajuda?</strong>
      </p>
      <p style="font-size: 14px; color: #666; margin: 0;">
        Entre em contato conosco através do nosso <a href="${supportUrl}" style="color: #667eea;">centro de suporte</a>.
      </p>
    </div>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
      <p style="font-size: 12px; color: #999; margin: 0;">
        Plano: <strong>${planTypeText}</strong> (${daysContracted} dias)<br>
        Email: ${email}
      </p>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px; padding: 20px; color: #999; font-size: 12px;">
    <p style="margin: 0;">© ${new Date().getFullYear()} OneDrip. Todos os direitos reservados.</p>
    <p style="margin: 5px 0 0 0; font-size: 11px;">Este email contém informações confidenciais. Não encaminhe para terceiros.</p>
  </div>
</body>
</html>
    `;

    // Enviar email via Resend
    const subject = `🎉 Sua chave de acesso ao suporte OneDrip - ${licenseCode}`;
    
    logStep("Enviando email via Resend", { to: email });
    
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "OneDrip <onboarding@resend.dev>";
    
    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: subject,
      html: emailHtml,
    });

    logStep("Email enviado com sucesso", { response: emailResponse });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: (emailResponse as any).data?.id || (emailResponse as any).id || 'sent'
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO na função", { message: errorMessage });

    return new Response(
      JSON.stringify({ 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
