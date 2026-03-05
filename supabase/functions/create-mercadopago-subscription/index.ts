import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateSubscriptionRequest {
  planType: 'monthly' | 'yearly';
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body: CreateSubscriptionRequest = await req.json();
    const { planType, customerName, customerEmail, customerPhone } = body;

    console.log('Creating Mercado Pago subscription:', { planType, customerEmail, userId: user.id });

    // Fetch plan from subscription_plans table
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('plan_type', planType)
      .eq('active', true)
      .single();

    if (planError || !planData) {
      console.error('Error fetching plan:', planError);
      throw new Error('Plan not found');
    }

    console.log('Plan data from database:', planData);

    const planConfig = {
      title: planData.name,
      amount: planData.price,
      frequency: 1,
      frequency_type: planType === 'yearly' ? 'years' : 'months',
    };

    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error('Mercado Pago access token not configured');
    }

    // Create preapproval (subscription) with Mercado Pago
    const preapprovalData = {
      reason: planConfig.title,
      auto_recurring: {
        frequency: planConfig.frequency,
        frequency_type: planConfig.frequency_type,
        transaction_amount: planConfig.amount,
        currency_id: 'BRL',
      },
      back_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-subscription-webhook`,
      payer_email: customerEmail,
      external_reference: user.id,
    };

    console.log('Calling Mercado Pago API with:', JSON.stringify(preapprovalData, null, 2));

    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preapprovalData),
    });

    const mpResult = await mpResponse.json();
    
    if (!mpResponse.ok) {
      console.error('Mercado Pago API error:', mpResult);
      throw new Error(`Mercado Pago error: ${JSON.stringify(mpResult)}`);
    }

    console.log('Mercado Pago response:', mpResult);

    // Create subscription record in database
    const { data: subscription, error: subError } = await supabase
      .from('mercadopago_subscriptions')
      .insert({
        user_id: user.id,
        mercadopago_preapproval_id: mpResult.id,
        plan_type: planType,
        billing_interval: planType === 'yearly' ? 'year' : 'month',
        status: mpResult.status || 'pending_authorization',
        start_date: mpResult.date_created || new Date().toISOString(),
      })
      .select()
      .single();

    if (subError) {
      console.error('Error creating subscription record:', subError);
      throw subError;
    }

    console.log('Subscription created:', subscription);

    // Log event
    await supabase.from('mercadopago_subscription_events').insert({
      subscription_id: subscription.id,
      event_type: 'subscription_created',
      payload: mpResult,
    });

    return new Response(
      JSON.stringify({
        success: true,
        subscription_id: subscription.id,
        redirect_url: mpResult.init_point,
        preapproval_id: mpResult.id,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in create-mercadopago-subscription:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});