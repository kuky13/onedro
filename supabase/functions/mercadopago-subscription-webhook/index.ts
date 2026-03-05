import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resendApiKey = Deno.env.get('RESEND_API_KEY');
const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'OneDrip <no-reply@onedrip.com.br>';
const resend = resendApiKey ? new Resend(resendApiKey) : null;

async function sendSubscriptionCancellationEmail(
  supabaseAdmin: any,
  subscription: any,
  preapprovalId: string,
  status: string,
  source: 'user' | 'system',
) {
  if (!resend) {
    console.log('[MP-SUB-WEBHOOK] RESEND_API_KEY não configurado - pulando envio de email de assinatura');
    return;
  }

  try {
    // Tentar encontrar o último pagamento vinculado a essa assinatura
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('mercadopago_preapproval_id', preapprovalId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let customerName: string | null = null;
    let customerEmail: string | null = null;

    if (!paymentError && payment) {
      const pay: any = payment;
      const { data: purchaseReg } = await supabaseAdmin
        .from('purchase_registrations')
        .select('customer_name, customer_email')
        .eq('payment_id', pay.id)
        .maybeSingle();

      if (purchaseReg) {
        const pr: any = purchaseReg;
        customerName = pr.customer_name ?? null;
        customerEmail = (pr.customer_email as string | null) ?? null;
      }
    }

    // Fallback: tentar pegar email do usuário autenticado no auth
    if (!customerEmail && subscription?.user_id) {
      try {
        const authAdmin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );
        const { data: userData } = await authAdmin.auth.admin.getUserById(subscription.user_id);
        customerEmail = userData?.user?.email ?? null;
      } catch (authError) {
        console.log('[MP-SUB-WEBHOOK] Erro ao buscar usuário para email de assinatura', authError);
      }
    }

    if (!customerEmail) {
      console.log('[MP-SUB-WEBHOOK] Nenhum email encontrado para assinatura, não será enviado email');
      return;
    }

    const name = customerName || 'cliente';

    let subject: string;
    let description: string;

    if (source === 'user') {
      subject = 'Você cancelou sua assinatura OneDrip';
      description =
        'Conforme solicitado, sua assinatura recorrente da OneDrip foi cancelada. Você manterá o acesso até o fim do período já pago, se ainda houver tempo restante.';
    } else {
      subject = 'Sua assinatura OneDrip foi encerrada';
      description =
        'Sua assinatura recorrente da OneDrip foi encerrada por inatividade de pagamento, expiração ou alteração no status do Mercado Pago.';
    }

    await resend.emails.send({
      from: resendFromEmail,
      to: [customerEmail],
      subject,
      html: `
        <h1>Olá, ${name}!</h1>
        <p>${description}</p>
        <p>
          Caso queira reativar seu acesso, você pode contratar novamente um plano pelo painel da OneDrip.
        </p>
        <p style="margin-top:16px;font-size:12px;color:#666;">
          ID da assinatura Mercado Pago: <strong>${preapprovalId}</strong> | Status atual: <strong>${status}</strong>
        </p>
      `,
    });

    console.log('[MP-SUB-WEBHOOK] Email de cancelamento de assinatura enviado com sucesso', {
      preapprovalId,
      status,
      source,
    });
  } catch (error) {
    console.log('[MP-SUB-WEBHOOK] Erro ao enviar email de cancelamento de assinatura', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    console.log('Mercado Pago subscription webhook received:', JSON.stringify(body, null, 2));

    const { type, data } = body;

    if (!data || !data.id) {
      console.log('Invalid webhook data, ignoring');
      return new Response(
        JSON.stringify({ received: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    // Fetch preapproval/subscription details from Mercado Pago
    let preapprovalId = data.id;

    // If this is a payment notification, fetch the preapproval_id from the payment
    if (type === 'payment') {
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: {
          Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        },
      });
      const paymentData = await paymentResponse.json();
      console.log('Payment data:', paymentData);

      if (paymentData.preapproval_id) {
        preapprovalId = paymentData.preapproval_id;
      } else {
        console.log('No preapproval_id in payment, skipping');
        return new Response(
          JSON.stringify({ received: true }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        );
      }
    }

    // Fetch subscription from database
    const { data: subscription, error: subError } = await supabase
      .from('mercadopago_subscriptions')
      .select('*')
      .eq('mercadopago_preapproval_id', preapprovalId)
      .single();

    if (subError || !subscription) {
      console.error('Subscription not found:', preapprovalId);
      return new Response(
        JSON.stringify({ received: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    // Log event
    await supabase.from('mercadopago_subscription_events').insert({
      subscription_id: subscription.id,
      event_type: type,
      payload: body,
    });

    // Fetch latest preapproval data
    const preapprovalResponse = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: {
        Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
      },
    });
    const preapprovalData = await preapprovalResponse.json();
    console.log('Preapproval data:', preapprovalData);

    // Update subscription status
    const { error: updateError } = await supabase
      .from('mercadopago_subscriptions')
      .update({
        status: preapprovalData.status,
        latest_payment_status: type === 'payment' ? 'approved' : subscription.latest_payment_status,
        next_billing_date: preapprovalData.next_payment_date,
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
    }

    // Handle license updates based on subscription status
    if (preapprovalData.status === 'authorized' || (type === 'payment' && preapprovalData.status === 'authorized')) {
      console.log('Subscription active, updating license');

      // Calcular data de expiração baseada no plano configurado
      let daysToAdd = 0;
      try {
        const { data: dbPlan } = await supabase
          .from('subscription_plans')
          .select('days')
          .eq('plan_type', subscription.plan_type)
          .maybeSingle();

        if (dbPlan?.days && dbPlan.days > 0) {
          daysToAdd = dbPlan.days;
        } else {
          daysToAdd = subscription.billing_interval === 'year' ? 365 : 30;
        }
      } catch (planError) {
        console.log('[MP-SUB-WEBHOOK] Erro ao buscar subscription_plans, usando padrão', planError);
        daysToAdd = subscription.billing_interval === 'year' ? 365 : 30;
      }

      const now = new Date();
      
      // Smart Sum logic
      let remainingDays = 0;
      
      // Buscar licença existente para calcular dias restantes
      const { data: currentLicense } = await supabase
        .from('licenses')
        .select('expires_at')
        .eq('user_id', subscription.user_id)
        .eq('is_active', true)
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (currentLicense?.expires_at) {
        const currentExpiresAt = new Date(currentLicense.expires_at);
        const diffMs = currentExpiresAt.getTime() - now.getTime();
        if (diffMs > 0) {
          remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        }
      }

      const totalDays = remainingDays + daysToAdd;
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + totalDays);

      // Find or create license
      const { data: existingLicense } = await supabase
        .from('licenses')
        .select('*')
        .eq('user_id', subscription.user_id)
        .eq('mercadopago_subscription_id', subscription.id)
        .single();

      if (existingLicense) {
        // Renew existing license
        await supabase
          .from('licenses')
          .update({
            expires_at: expiresAt.toISOString(),
            is_active: true,
            last_validation: new Date().toISOString(),
          })
          .eq('id', existingLicense.id);

        console.log('License renewed:', existingLicense.id);
      } else {
        // Create new license
        const { data: newLicense, error: licenseError } = await supabase
          .from('licenses')
          .insert({
            user_id: subscription.user_id,
            code: `SUB-${subscription.mercadopago_preapproval_id.substring(0, 8).toUpperCase()}`,
            license_type: subscription.plan_type,
            expires_at: expiresAt.toISOString(),
            is_active: true,
            mercadopago_subscription_id: subscription.id,
            activated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (licenseError) {
          console.error('Error creating license:', licenseError);
        } else {
          console.log('License created:', newLicense.id);
        }
      }
    } else if (['cancelled', 'paused', 'expired'].includes(preapprovalData.status)) {
      console.log('Subscription inactive, updating license');

      // Mark license as inactive
      await supabase
        .from('licenses')
        .update({ is_active: false })
        .eq('mercadopago_subscription_id', subscription.id);

      // Enviar email informando que a assinatura foi cancelada/encerrada pelo sistema (não pelo botão do usuário)
      try {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );
        await sendSubscriptionCancellationEmail(
          supabaseAdmin,
          subscription,
          preapprovalId,
          preapprovalData.status,
          'system',
        );
      } catch (emailError) {
        console.log('[MP-SUB-WEBHOOK] Erro ao acionar envio de email de assinatura inativa', emailError);
      }
    }

    return new Response(
      JSON.stringify({ received: true, status: preapprovalData.status }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in mercadopago-subscription-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({
        error: errorMessage,
        received: true,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  }
});
