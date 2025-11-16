import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Audit system configuration
const AUDIT_CONFIG = {
  // Event types to track
  EVENT_TYPES: {
    LICENSE_VALIDATION: 'license_validation',
    LICENSE_ACTIVATION: 'license_activation',
    LICENSE_DEACTIVATION: 'license_deactivation',
    USER_LOGIN: 'user_login',
    USER_LOGOUT: 'user_logout',
    PASSWORD_RESET: 'password_reset',
    PROFILE_UPDATE: 'profile_update',
    ADMIN_ACTION: 'admin_action',
    SECURITY_VIOLATION: 'security_violation',
    RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
    DATA_EXPORT: 'data_export',
    BULK_OPERATION: 'bulk_operation'
  },
  
  // Severity levels
  SEVERITY_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  },
  
  // Data retention (in days)
  RETENTION_DAYS: {
    AUDIT_LOGS: 365,
    SECURITY_EVENTS: 730,
    ADMIN_ACTIONS: 2555 // 7 years
  },
  
  // Rate limiting for audit queries
  RATE_LIMITS: {
    QUERY_PER_MINUTE: 60,
    EXPORT_PER_HOUR: 5
  },
  
  // Sensitive fields to exclude from logging
  SENSITIVE_FIELDS: [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie'
  ]
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
};

const ERROR_MESSAGES = {
  INVALID_REQUEST: 'Invalid request format',
  UNAUTHORIZED_ACCESS: 'Unauthorized access',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  AUDIT_FAILED: 'Failed to create audit log',
  QUERY_FAILED: 'Failed to query audit logs',
  EXPORT_FAILED: 'Failed to export audit data'
};

const SUCCESS_MESSAGES = {
  AUDIT_CREATED: 'Audit log created successfully',
  QUERY_SUCCESS: 'Audit query completed successfully',
  EXPORT_SUCCESS: 'Audit data exported successfully'
};

// Rate limiting store (in-memory for Edge Functions)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Utility functions
function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = { ...data };
  
  for (const field of AUDIT_CONFIG.SENSITIVE_FIELDS) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }
  
  return sanitized;
}

function checkRateLimit(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const key = `${identifier}_${Math.floor(now / windowMs)}`;
  
  const current = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };
  
  if (now > current.resetTime) {
    current.count = 0;
    current.resetTime = now + windowMs;
  }
  
  current.count++;
  rateLimitStore.set(key, current);
  
  return current.count <= limit;
}

function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         request.headers.get('cf-connecting-ip') ||
         'unknown';
}

function generateAuditId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Main audit logging function
async function createAuditLog(
  supabase: any,
  eventType: string,
  userId: string | null,
  details: any,
  severity: string = AUDIT_CONFIG.SEVERITY_LEVELS.LOW,
  ipAddress: string,
  userAgent: string
) {
  try {
    const auditData = {
      id: generateAuditId(),
      event_type: eventType,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      event_details: sanitizeData(details),
      severity,
      created_at: new Date().toISOString(),
      session_id: details.session_id || null,
      resource_type: details.resource_type || null,
      resource_id: details.resource_id || null,
      success: details.success !== false,
      error_message: details.error_message || null
    };
    
    const { error } = await supabase
      .from('audit_logs')
      .insert([auditData]);
    
    if (error) {
      console.error('Failed to create audit log:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, audit_id: auditData.id };
    
  } catch (error) {
    console.error('Audit logging error:', error);
    return { success: false, error: 'Internal audit error' };
  }
}

// Query audit logs with filtering and pagination
async function queryAuditLogs(
  supabase: any,
  filters: any,
  pagination: { page: number; limit: number }
) {
  try {
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user_profiles(id, email, full_name)
      `);
    
    // Apply filters
    if (filters.event_type) {
      query = query.eq('event_type', filters.event_type);
    }
    
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    
    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }
    
    if (filters.success !== undefined) {
      query = query.eq('success', filters.success);
    }
    
    if (filters.ip_address) {
      query = query.eq('ip_address', filters.ip_address);
    }
    
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }
    
    if (filters.resource_type) {
      query = query.eq('resource_type', filters.resource_type);
    }
    
    if (filters.resource_id) {
      query = query.eq('resource_id', filters.resource_id);
    }
    
    // Apply pagination
    const offset = (pagination.page - 1) * pagination.limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + pagination.limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Audit query error:', error);
      return { success: false, error: error.message };
    }
    
    return {
      success: true,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / pagination.limit)
      }
    };
    
  } catch (error) {
    console.error('Audit query error:', error);
    return { success: false, error: 'Query failed' };
  }
}

// Get audit statistics
async function getAuditStatistics(supabase: any, timeframe: string = '24h') {
  try {
    const timeframes = {
      '1h': 1,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30
    };
    
    const hours = timeframes[timeframe] || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    // Get event counts by type
    const { data: eventCounts, error: eventError } = await supabase
      .from('audit_logs')
      .select('event_type')
      .gte('created_at', since);
    
    if (eventError) {
      throw eventError;
    }
    
    // Get severity distribution
    const { data: severityCounts, error: severityError } = await supabase
      .from('audit_logs')
      .select('severity')
      .gte('created_at', since);
    
    if (severityError) {
      throw severityError;
    }
    
    // Get success/failure rates
    const { data: successCounts, error: successError } = await supabase
      .from('audit_logs')
      .select('success')
      .gte('created_at', since);
    
    if (successError) {
      throw successError;
    }
    
    // Get top IP addresses
    const { data: ipCounts, error: ipError } = await supabase
      .from('audit_logs')
      .select('ip_address')
      .gte('created_at', since)
      .not('ip_address', 'eq', 'unknown')
      .limit(10);
    
    if (ipError) {
      throw ipError;
    }
    
    // Process statistics
    const eventStats = eventCounts.reduce((acc, log) => {
      acc[log.event_type] = (acc[log.event_type] || 0) + 1;
      return acc;
    }, {});
    
    const severityStats = severityCounts.reduce((acc, log) => {
      acc[log.severity] = (acc[log.severity] || 0) + 1;
      return acc;
    }, {});
    
    const successStats = successCounts.reduce((acc, log) => {
      const key = log.success ? 'success' : 'failure';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, { success: 0, failure: 0 });
    
    const ipStats = ipCounts.reduce((acc, log) => {
      acc[log.ip_address] = (acc[log.ip_address] || 0) + 1;
      return acc;
    }, {});
    
    return {
      success: true,
      statistics: {
        timeframe,
        total_events: eventCounts.length,
        events_by_type: eventStats,
        events_by_severity: severityStats,
        success_rate: {
          ...successStats,
          percentage: successCounts.length > 0 
            ? Math.round((successStats.success / successCounts.length) * 100)
            : 0
        },
        top_ip_addresses: Object.entries(ipStats)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([ip, count]) => ({ ip, count }))
      }
    };
    
  } catch (error) {
    console.error('Statistics error:', error);
    return { success: false, error: 'Failed to get statistics' };
  }
}

// Main handler
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const url = new URL(req.url);
    const method = req.method;
    const clientIP = getClientIP(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    // Rate limiting check
    if (!checkRateLimit(clientIP, AUDIT_CONFIG.RATE_LIMITS.QUERY_PER_MINUTE, 60000)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED 
        }),
        { 
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Get user from JWT token
    const authHeader = req.headers.get('authorization');
    let currentUser = null;
    
    if (authHeader) {
      const { data: { user }, error } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      
      if (!error && user) {
        currentUser = user;
      }
    }
    
    // Route handling
    if (method === 'POST' && url.pathname.endsWith('/create')) {
      // Create audit log
      const body = await req.json();
      
      if (!body.event_type || !body.details) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: ERROR_MESSAGES.INVALID_REQUEST 
          }),
          { 
            status: HTTP_STATUS.BAD_REQUEST,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      const result = await createAuditLog(
        supabase,
        body.event_type,
        body.user_id || currentUser?.id || null,
        body.details,
        body.severity || AUDIT_CONFIG.SEVERITY_LEVELS.LOW,
        clientIP,
        userAgent
      );
      
      return new Response(
        JSON.stringify({
          success: result.success,
          message: result.success ? SUCCESS_MESSAGES.AUDIT_CREATED : result.error,
          audit_id: result.audit_id
        }),
        {
          status: result.success ? HTTP_STATUS.CREATED : HTTP_STATUS.INTERNAL_SERVER_ERROR,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
      
    } else if (method === 'GET' && url.pathname.endsWith('/query')) {
      // Query audit logs (requires authentication)
      if (!currentUser) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: ERROR_MESSAGES.UNAUTHORIZED_ACCESS 
          }),
          { 
            status: HTTP_STATUS.UNAUTHORIZED,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Check if user has admin role
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();
      
      if (!userProfile || userProfile.role !== 'admin') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: ERROR_MESSAGES.UNAUTHORIZED_ACCESS 
          }),
          { 
            status: HTTP_STATUS.FORBIDDEN,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      const searchParams = url.searchParams;
      const filters = {
        event_type: searchParams.get('event_type'),
        user_id: searchParams.get('user_id'),
        severity: searchParams.get('severity'),
        success: searchParams.get('success') ? searchParams.get('success') === 'true' : undefined,
        ip_address: searchParams.get('ip_address'),
        date_from: searchParams.get('date_from'),
        date_to: searchParams.get('date_to'),
        resource_type: searchParams.get('resource_type'),
        resource_id: searchParams.get('resource_id')
      };
      
      const pagination = {
        page: parseInt(searchParams.get('page') || '1'),
        limit: Math.min(parseInt(searchParams.get('limit') || '50'), 100)
      };
      
      const result = await queryAuditLogs(supabase, filters, pagination);
      
      return new Response(
        JSON.stringify({
          success: result.success,
          message: result.success ? SUCCESS_MESSAGES.QUERY_SUCCESS : result.error,
          data: result.data,
          pagination: result.pagination
        }),
        {
          status: result.success ? HTTP_STATUS.OK : HTTP_STATUS.INTERNAL_SERVER_ERROR,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
      
    } else if (method === 'GET' && url.pathname.endsWith('/statistics')) {
      // Get audit statistics (requires authentication)
      if (!currentUser) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: ERROR_MESSAGES.UNAUTHORIZED_ACCESS 
          }),
          { 
            status: HTTP_STATUS.UNAUTHORIZED,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      const timeframe = url.searchParams.get('timeframe') || '24h';
      const result = await getAuditStatistics(supabase, timeframe);
      
      return new Response(
        JSON.stringify({
          success: result.success,
          message: result.success ? SUCCESS_MESSAGES.QUERY_SUCCESS : result.error,
          statistics: result.statistics
        }),
        {
          status: result.success ? HTTP_STATUS.OK : HTTP_STATUS.INTERNAL_SERVER_ERROR,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
      
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Endpoint not found' 
        }),
        { 
          status: HTTP_STATUS.NOT_FOUND,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
  } catch (error) {
    console.error('Audit system error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});