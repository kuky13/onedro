import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { subscription_id } = await req.json();

    console.log('Canceling subscription:', { subscription_id, userId: user.id });

    // Get subscription
    const { data: subscription, error: subError } = await supabase
      .from('mercadopago_subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      throw new Error('Subscription not found or unauthorized');
    }

    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error('Mercado Pago access token not configured');
    }

    // Cancel subscription in Mercado Pago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/preapproval/${subscription.mercadopago_preapproval_id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      }
    );

    const mpResult = await mpResponse.json();
    
    if (!mpResponse.ok) {
      console.error('Mercado Pago API error:', mpResult);
      throw new Error(`Mercado Pago error: ${JSON.stringify(mpResult)}`);
    }

    console.log('Mercado Pago cancellation response:', mpResult);

    // Update subscription in database
    const { error: updateError } = await supabase
      .from('mercadopago_subscriptions')
      .update({
        status: 'cancelled',
        cancel_at: new Date().toISOString(),
      })
      .eq('id', subscription_id);

    if (updateError) {
      throw updateError;
    }

    // Mark license as inactive
    await supabase
      .from('licenses')
      .update({ is_active: false })
      .eq('mercadopago_subscription_id', subscription_id);

    // Log event
    await supabase.from('mercadopago_subscription_events').insert({
      subscription_id: subscription_id,
      event_type: 'subscription_cancelled_by_user',
      payload: mpResult,
    });

    console.log('Subscription cancelled successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in cancel-mercadopago-subscription:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});