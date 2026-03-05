import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: 'Serviço indisponível' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)
    const token = authHeader.replace('Bearer ', '')

    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token)
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { data: isAdmin, error: adminCheckError } = await supabaseAuth.rpc('is_current_user_admin')
    if (adminCheckError || !isAdmin) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { userId, newPassword } = await req.json()

    if (typeof userId !== 'string' || typeof newPassword !== 'string') {
      return new Response(JSON.stringify({ error: 'Dados inválidos' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const normalizedPassword = newPassword.trim()
    if (!userId.trim() || normalizedPassword.length < 8) {
      return new Response(JSON.stringify({ error: 'Dados inválidos' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const { data: validation, error: validationError } = await supabaseAdmin.rpc('validate_admin_password_reset', {
      p_user_id: userId,
      p_new_password: normalizedPassword,
    })

    if (validationError || !validation?.success) {
      return new Response(JSON.stringify({ error: 'Solicitação inválida' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: normalizedPassword,
    })

    if (error) {
      console.error('Erro ao atualizar senha do usuário:', error)
      return new Response(JSON.stringify({ error: 'Não foi possível atualizar a senha' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    await supabaseAdmin.rpc('log_admin_action', {
      p_target_user_id: userId,
      p_action: 'password_reset_by_admin',
      p_details: {
        reset_method: 'admin_edge_function',
        success: true,
        actor_user_id: claimsData.claims.sub,
      },
    })

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Erro na função admin-reset-password:', error)
    return new Response(JSON.stringify({ error: 'Erro ao processar solicitação' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})