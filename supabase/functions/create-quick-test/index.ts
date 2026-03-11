
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Get user from Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { name, url } = await req.json()

    if (!name || !url) {
      throw new Error('Name and URL are required')
    }

    // Initialize admin client to bypass RLS for atomic operations if needed
    // But here we can use the user client as policies allow
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Check current count of active tests for this user
    const { count, error: countError } = await supabaseAdmin
      .from('quick_tests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) throw countError

    // 3. Logic for limit of 5
    if (count !== null && count >= 5) {
      // Find the oldest test (closest to expire or just created_at asc)
      // Actually, requirement says "closest to expire" which usually aligns with oldest created
      // if expiration is fixed 7 days.
      const { data: oldestTests, error: fetchError } = await supabaseAdmin
        .from('quick_tests')
        .select('id')
        .eq('user_id', user.id)
        .order('expires_at', { ascending: true }) // Expiring soonest first
        .limit(1)

      if (fetchError) throw fetchError

      if (oldestTests && oldestTests.length > 0) {
        const testToDelete = oldestTests[0]
        // Delete atomic
        const { error: deleteError } = await supabaseAdmin
          .from('quick_tests')
          .delete()
          .eq('id', testToDelete.id)

        if (deleteError) throw deleteError
      }
    }

    // 4. Create new test
    const { data: newTest, error: insertError } = await supabaseAdmin
      .from('quick_tests')
      .insert([
        {
          user_id: user.id,
          name,
          url,
          // expires_at is default 7 days in DB, but we can be explicit if needed
          // expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() 
        }
      ])
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation if we had unique name constraint
        throw new Error('Test name already exists')
      }
      throw insertError
    }

    return new Response(
      JSON.stringify(newTest),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
