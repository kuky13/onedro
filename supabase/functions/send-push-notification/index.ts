import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { generateVAPIDHeaders, validateVAPIDKeys } from './vapid.ts'

// VAPID configuration
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@onedrip.com'

// Types
interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh_key: string
  auth_key: string
  is_active: boolean
}

interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: Record<string, any>
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  click_action?: string
  require_interaction?: boolean
  silent?: boolean
  vibrate?: number[]
  tag?: string
  renotify?: boolean
  timestamp?: number
}

interface SendNotificationRequest {
  target_type: 'all' | 'user' | 'role'
  target_user_id?: string
  target_role?: string
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  data?: Record<string, any>
  silent?: boolean
}

// Helper function to convert base64 URL to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Validate VAPID configuration on startup
if (!validateVAPIDKeys(VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)) {
  console.error('❌ Invalid VAPID configuration')
}

// Function to send push notification to a single subscription
async function sendPushToSubscription(
  subscription: PushSubscription,
  payload: PushNotificationPayload,
  notificationId: string,
  supabase: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const pushPayload = JSON.stringify(payload)
    
    console.log(`📤 Preparing to send push to: ${subscription.endpoint}`)
    console.log(`🔐 VAPID keys for this request:`, {
      hasPublicKey: !!VAPID_PUBLIC_KEY,
      hasPrivateKey: !!VAPID_PRIVATE_KEY,
      hasSubject: !!VAPID_SUBJECT,
      publicKeyPreview: VAPID_PUBLIC_KEY?.substring(0, 20) + '...',
      privateKeyPreview: VAPID_PRIVATE_KEY?.substring(0, 20) + '...'
    })
    
    // Generate VAPID headers using the robust implementation
    const vapidHeaders = await generateVAPIDHeaders(
      subscription.endpoint,
      {
        publicKey: VAPID_PUBLIC_KEY!,
        privateKey: VAPID_PRIVATE_KEY!,
        subject: VAPID_SUBJECT
      }
    )
    
    console.log(`📤 Sending push to: ${subscription.endpoint}`)
    console.log(`🔐 VAPID headers generated successfully:`, Object.keys(vapidHeaders))
    
    // Prepare the request
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Length': pushPayload.length.toString(),
        'Content-Type': 'application/json',
        'TTL': '86400',
        ...vapidHeaders
      },
      body: pushPayload
    })

    const responseText = await response.text()
    console.log(`📨 Push response: ${response.status} - ${responseText}`)

    // Log the attempt
    const logData = {
      notification_id: notificationId,
      subscription_id: subscription.id,
      user_id: subscription.user_id,
      status: response.ok ? 'sent' : 'failed',
      error_message: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`,
      response_data: {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      }
    }

    await supabase
      .from('push_notification_logs')
      .insert(logData)

    if (response.ok) {
      return { success: true }
    } else {
      // Handle specific error cases
      if (response.status === 410 || response.status === 404) {
        // Subscription is no longer valid, deactivate it
        await supabase
          .from('user_push_subscriptions')
          .update({ is_active: false })
          .eq('id', subscription.id)
        
        console.log(`🗑️ Deactivated invalid subscription: ${subscription.id}`)
      }
      
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${response.statusText}` 
      }
    }
  } catch (error) {
    console.error(`❌ Push error for subscription ${subscription.id}:`, error)
    
    // Log the error
    await supabase
      .from('push_notification_logs')
      .insert({
        notification_id: notificationId,
        subscription_id: subscription.id,
        user_id: subscription.user_id,
        status: 'failed',
        error_message: error.message,
        response_data: { error: error.toString() }
      })

    return { success: false, error: error.message }
  }
}

// Function to get target subscriptions based on notification criteria
async function getTargetSubscriptions(
  supabase: any,
  targetType: string,
  targetUserId?: string,
  targetRole?: string
): Promise<PushSubscription[]> {
  let query = supabase
    .from('user_push_subscriptions')
    .select(`
      id,
      user_id,
      endpoint,
      p256dh_key,
      auth_key,
      is_active,
      user_profiles!inner(id, role)
    `)
    .eq('is_active', true)

  switch (targetType) {
    case 'user':
      if (!targetUserId) throw new Error('target_user_id is required for user notifications')
      query = query.eq('user_id', targetUserId)
      break
    
    case 'role':
      if (!targetRole) throw new Error('target_role is required for role notifications')
      query = query.eq('user_profiles.role', targetRole)
      break
    
    case 'all':
      // No additional filtering needed
      break
    
    default:
      throw new Error(`Invalid target_type: ${targetType}`)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch subscriptions: ${error.message}`)
  }

  return data || []
}

// Main handler
serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log(`🚀 Push notification request: ${req.method}`)
    console.log(`🔐 VAPID configuration check:`, {
      hasPublicKey: !!VAPID_PUBLIC_KEY,
      hasPrivateKey: !!VAPID_PRIVATE_KEY,
      hasSubject: !!VAPID_SUBJECT,
      publicKeyLength: VAPID_PUBLIC_KEY?.length || 0,
      privateKeyLength: VAPID_PRIVATE_KEY?.length || 0,
      subject: VAPID_SUBJECT
    })
    
    // Verify method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      console.error('❌ No authorization header')
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify user is authenticated and has admin privileges
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`👤 Authenticated user: ${user.id}`)

    // Check if user has admin privileges
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !['admin', 'super_admin'].includes(profile.role)) {
      console.error('❌ Admin check failed:', profileError, profile?.role)
      return new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`✅ Admin verified: ${profile.role}`)

    // Parse request body
    const body: SendNotificationRequest = await req.json()
    console.log('📝 Request body:', JSON.stringify(body, null, 2))
    
    // Validate required fields
    if (!body.target_type || !body.title || !body.body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: target_type, title, body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate notification ID
    const notificationId = crypto.randomUUID()

    // Create notification payload
    const payload: PushNotificationPayload = {
      title: body.title,
      body: body.body,
      icon: body.icon || '/icon-192x192.png',
      badge: body.badge || '/icon-192x192.png',
      data: {
        url: body.url || '/',
        timestamp: Date.now(),
        ...body.data
      },
      silent: body.silent || false,
      require_interaction: true,
      tag: `notification-${notificationId}`
    }

    // Get target subscriptions
    const subscriptions = await getTargetSubscriptions(
      supabase,
      body.target_type,
      body.target_user_id,
      body.target_role
    )

    console.log(`🎯 Found ${subscriptions.length} target subscriptions`)

    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active subscriptions found for target',
          sent_count: 0,
          failed_count: 0,
          total_count: 0
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Store notification record
    await supabase
      .from('push_notifications')
      .insert({
        id: notificationId,
        title: body.title,
        body: body.body,
        target_type: body.target_type,
        target_user_id: body.target_user_id,
        target_role: body.target_role,
        created_by: user.id,
        total_sent: 0,
        total_delivered: 0,
        total_failed: 0
      })

    // Send notifications to all subscriptions
    console.log('📤 Sending push notifications...')
    const results = await Promise.allSettled(
      subscriptions.map(subscription => 
        sendPushToSubscription(subscription, payload, notificationId, supabase)
      )
    )

    // Count successes and failures
    const sent = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length
    
    const failed = results.length - sent

    console.log(`📊 Results: ${sent} sent, ${failed} failed`)

    // Update notification record with results
    await supabase
      .from('push_notifications')
      .update({
        total_sent: sent,
        total_delivered: sent, // Assume delivered = sent for now
        total_failed: failed
      })
      .eq('id', notificationId)

    // Log admin action
    await supabase
      .from('admin_logs')
      .insert({
        admin_user_id: user.id,
        action: 'send_push_notification',
        details: {
          notification_id: notificationId,
          target_type: body.target_type,
          target_user_id: body.target_user_id,
          target_role: body.target_role,
          subscriptions_targeted: subscriptions.length,
          sent,
          failed
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Push notifications sent successfully`,
        sent_count: sent,
        failed_count: failed,
        total_count: subscriptions.length,
        notification_id: notificationId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Push notification error:', error)
    console.error('❌ Error stack:', error.stack)
    console.error('❌ VAPID config check:', {
      hasPublicKey: !!VAPID_PUBLIC_KEY,
      hasPrivateKey: !!VAPID_PRIVATE_KEY,
      hasSubject: !!VAPID_SUBJECT,
      publicKeyLength: VAPID_PUBLIC_KEY?.length,
      privateKeyLength: VAPID_PRIVATE_KEY?.length
    })
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        message: error.message,
        details: error.stack,
        vapid_config: {
          has_public_key: !!VAPID_PUBLIC_KEY,
          has_private_key: !!VAPID_PRIVATE_KEY,
          has_subject: !!VAPID_SUBJECT
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})