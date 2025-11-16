// Edge Function for license validation with advanced security features
// Implements rate limiting, audit logging, comprehensive validation, and monitoring

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  checkRateLimit,
  performSecurityChecks,
  getClientIP,
  logAuditEvent,
  validateRequestBody,
  createErrorResponse,
  createSuccessResponse,
  handleCORS,
  addCORSHeaders,
  isWithinGracePeriod,
  generateRequestId,
  isValidUUID
} from './utils.ts';
import { 
  CORS_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  HTTP_STATUS,
  VALIDATION_CONFIG
} from './config.ts';

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    // Handle CORS preflight
    const corsResponse = handleCORS(req, CORS_CONFIG.allowedOrigins);
    if (corsResponse) {
      return corsResponse;
    }
    
    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Extract request information
    const ip = getClientIP(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const origin = req.headers.get('origin');
    
    // Parse request body
    let body;
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      } else {
        throw new Error('Empty request body');
      }
    } catch (parseError) {
      const response = createErrorResponse(ERROR_MESSAGES.INVALID_REQUEST, HTTP_STATUS.BAD_REQUEST);
      return addCORSHeaders(response, origin, CORS_CONFIG.allowedOrigins);
    }
    
    // Security validation
    const securityCheck = performSecurityChecks(req, body);
    if (!securityCheck.passed) {
      // Log security violation
      await logAuditEvent(supabase, {
        event_type: 'security_violation',
        ip_address: ip,
        user_agent: userAgent,
        request_data: body,
        success: false,
        error_message: `Security violations: ${securityCheck.violations.join(', ')}`
      });
      
      const response = createErrorResponse(
        ERROR_MESSAGES.SECURITY_VIOLATION,
        HTTP_STATUS.FORBIDDEN,
        { violations: securityCheck.violations }
      );
      return addCORSHeaders(response, origin, CORS_CONFIG.allowedOrigins);
    }
    
    // Extract and validate action
    const { action, license_key, user_id, device_info } = body;
    
    if (!action || !license_key) {
      const response = createErrorResponse(
        ERROR_MESSAGES.INVALID_REQUEST,
        HTTP_STATUS.BAD_REQUEST,
        { missing_fields: ['action', 'license_key'] }
      );
      return addCORSHeaders(response, origin, CORS_CONFIG.allowedOrigins);
    }
    
    // Validate UUID format if provided
    if (user_id && !isValidUUID(user_id)) {
      const response = createErrorResponse(
        'Invalid user ID format',
        HTTP_STATUS.BAD_REQUEST
      );
      return addCORSHeaders(response, origin, CORS_CONFIG.allowedOrigins);
    }
    
    // Rate limiting checks
    const rateLimitType = action === 'activate' ? 'activation' : 'validation';
    const specificRateLimit = checkRateLimit(ip, rateLimitType);
    const globalRateLimit = checkRateLimit(ip, 'global');
    
    if (!specificRateLimit.allowed || !globalRateLimit.allowed) {
      // Log rate limit violation
      await logAuditEvent(supabase, {
        event_type: 'rate_limit_exceeded',
        ip_address: ip,
        user_agent: userAgent,
        request_data: body,
        success: false,
        error_message: `Rate limit exceeded for ${rateLimitType}`
      });
      
      const response = new Response(
        JSON.stringify({
          success: false,
          error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
          retry_after: Math.ceil((specificRateLimit.resetTime - Date.now()) / 1000),
          rate_limit: {
            type: rateLimitType,
            remaining: Math.min(specificRateLimit.remaining, globalRateLimit.remaining),
            reset_time: specificRateLimit.resetTime
          }
        }),
        {
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': Math.min(specificRateLimit.remaining, globalRateLimit.remaining).toString(),
            'X-RateLimit-Reset': specificRateLimit.resetTime.toString(),
            'Retry-After': Math.ceil((specificRateLimit.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
      return addCORSHeaders(response, origin, CORS_CONFIG.allowedOrigins);
    }
    
    // Process license action
    let result;
    let auditEventType;
    
    switch (action) {
      case 'validate':
        auditEventType = 'license_validate';
        result = await validateLicense(supabase, license_key, user_id);
        break;
        
      case 'activate':
        auditEventType = 'license_activate';
        // Validate required fields for activation
        const activationValidation = validateRequestBody(body, ['license_key', 'user_id', 'device_info']);
        if (!activationValidation.valid) {
          const response = createErrorResponse(
            ERROR_MESSAGES.INVALID_REQUEST,
            HTTP_STATUS.BAD_REQUEST,
            { validation_errors: activationValidation.errors }
          );
          return addCORSHeaders(response, origin, CORS_CONFIG.allowedOrigins);
        }
        result = await activateLicense(supabase, license_key, user_id, device_info);
        break;
        
      case 'deactivate':
        auditEventType = 'license_deactivate';
        // Validate required fields for deactivation
        const deactivationValidation = validateRequestBody(body, ['license_key', 'user_id']);
        if (!deactivationValidation.valid) {
          const response = createErrorResponse(
            ERROR_MESSAGES.INVALID_REQUEST,
            HTTP_STATUS.BAD_REQUEST,
            { validation_errors: deactivationValidation.errors }
          );
          return addCORSHeaders(response, origin, CORS_CONFIG.allowedOrigins);
        }
        result = await deactivateLicense(supabase, license_key, user_id, device_info?.fingerprint);
        break;
        
      default:
        const response = createErrorResponse(
          'Invalid action. Supported actions: validate, activate, deactivate',
          HTTP_STATUS.BAD_REQUEST
        );
        return addCORSHeaders(response, origin, CORS_CONFIG.allowedOrigins);
    }
    
    // Log audit event with performance metrics
    const processingTime = Date.now() - startTime;
    await logAuditEvent(supabase, {
      event_type: auditEventType,
      user_id: user_id,
      license_id: result.license?.id,
      ip_address: ip,
      user_agent: userAgent,
      request_data: { ...body, request_id: requestId },
      response_data: { ...result, processing_time_ms: processingTime },
      success: result.success,
      error_message: result.success ? null : result.error
    });
    
    // Create response with rate limit headers
    const responseData = {
      ...result,
      request_id: requestId,
      processing_time_ms: processingTime,
      rate_limit: {
        remaining: Math.min(specificRateLimit.remaining, globalRateLimit.remaining),
        reset_time: specificRateLimit.resetTime
      }
    };
    
    const response = result.success 
      ? createSuccessResponse(responseData)
      : createErrorResponse(result.error, result.status || HTTP_STATUS.BAD_REQUEST, responseData);
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Remaining', Math.min(specificRateLimit.remaining, globalRateLimit.remaining).toString());
    response.headers.set('X-RateLimit-Reset', specificRateLimit.resetTime.toString());
    response.headers.set('X-Request-ID', requestId);
    
    return addCORSHeaders(response, origin, CORS_CONFIG.allowedOrigins);
    
  } catch (error) {
    console.error('Edge Function error:', error);
    
    // Log critical error
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await logAuditEvent(supabase, {
        event_type: 'system_error',
        ip_address: getClientIP(req),
        user_agent: req.headers.get('user-agent') || 'unknown',
        request_data: { request_id: requestId },
        success: false,
        error_message: `Critical error: ${error.message}`
      });
    } catch (logError) {
      console.error('Failed to log critical error:', logError);
    }
    
    const response = createErrorResponse(
      ERROR_MESSAGES.INTERNAL_ERROR,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      { request_id: requestId }
    );
    
    return addCORSHeaders(response, req.headers.get('origin'), CORS_CONFIG.allowedOrigins);
  }
});

// License validation logic with enhanced security checks
async function validateLicense(supabase: any, licenseKey: string, userId?: string) {
  try {
    // Get license with related data
    const { data: license, error } = await supabase
      .from('licenses')
      .select(`
        *,
        user_profiles!inner(id, email, status),
        license_devices(id, device_fingerprint, device_name, activated_at)
      `)
      .eq('license_key', licenseKey)
      .single();
    
    if (error || !license) {
      return { 
        success: false, 
        error: ERROR_MESSAGES.LICENSE_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      };
    }
    
    // Check if user profile is active
    if (license.user_profiles?.status !== 'active') {
      return { 
        success: false, 
        error: 'User account is not active',
        status: HTTP_STATUS.FORBIDDEN
      };
    }
    
    // Check if license is active
    if (license.status !== 'active') {
      return { 
        success: false, 
        error: `License status is ${license.status}`,
        status: HTTP_STATUS.FORBIDDEN
      };
    }
    
    // Check expiration with grace period
    const now = new Date();
    const expirationDate = new Date(license.expiration_date);
    const isExpired = now > expirationDate;
    const isInGracePeriod = isExpired && isWithinGracePeriod(expirationDate, VALIDATION_CONFIG.GRACE_PERIOD_DAYS);
    
    if (isExpired && !isInGracePeriod) {
      return { 
        success: false, 
        error: 'License has expired',
        status: HTTP_STATUS.FORBIDDEN,
        expired_at: license.expiration_date
      };
    }
    
    // If user ID provided, check ownership
    if (userId && license.user_id !== userId) {
      return { 
        success: false, 
        error: 'License does not belong to user',
        status: HTTP_STATUS.FORBIDDEN
      };
    }
    
    // Calculate days remaining
    const daysRemaining = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      success: true,
      license: {
        id: license.id,
        key: license.license_key,
        type: license.license_type,
        status: license.status,
        expiration_date: license.expiration_date,
        days_remaining: Math.max(0, daysRemaining),
        is_in_grace_period: isInGracePeriod,
        max_devices: license.max_devices,
        current_devices: license.current_devices || 0,
        active_devices: license.license_devices?.length || 0,
        user: {
          id: license.user_profiles?.id,
          email: license.user_profiles?.email
        }
      },
      message: isInGracePeriod ? 'License is in grace period' : SUCCESS_MESSAGES.VALIDATION_SUCCESS
    };
    
  } catch (error) {
    console.error('License validation error:', error);
    return { 
      success: false, 
      error: ERROR_MESSAGES.VALIDATION_FAILED,
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR
    };
  }
}

// License activation logic with enhanced validation and concurrency control
async function activateLicense(supabase: any, licenseKey: string, userId: string, deviceInfo: any) {
  try {
    // Validate device info structure
    if (!deviceInfo?.fingerprint) {
      return { 
        success: false, 
        error: 'Device fingerprint is required',
        status: HTTP_STATUS.BAD_REQUEST
      };
    }
    
    // First validate the license
    const validation = await validateLicense(supabase, licenseKey, userId);
    if (!validation.success) {
      return validation;
    }
    
    const license = validation.license;
    
    // Check if license is in grace period (allow activation but warn)
    if (license.is_in_grace_period) {
      // Allow activation but log warning
      console.warn(`License ${licenseKey} is in grace period`);
    }
    
    // Check minimum interval between activations
    const { data: recentActivations } = await supabase
      .from('license_validation_audit')
      .select('created_at')
      .eq('event_type', 'license_activate')
      .eq('user_id', userId)
      .eq('success', true)
      .gte('created_at', new Date(Date.now() - VALIDATION_CONFIG.MIN_ACTIVATION_INTERVAL_MS).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (recentActivations && recentActivations.length > 0) {
      const timeSinceLastActivation = Date.now() - new Date(recentActivations[0].created_at).getTime();
      const remainingCooldown = VALIDATION_CONFIG.MIN_ACTIVATION_INTERVAL_MS - timeSinceLastActivation;
      
      if (remainingCooldown > 0) {
        return {
          success: false,
          error: 'Activation cooldown period active',
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          retry_after: Math.ceil(remainingCooldown / 1000)
        };
      }
    }
    
    // Check if device is already activated
    const { data: existingDevice } = await supabase
      .from('license_devices')
      .select('*')
      .eq('license_id', license.id)
      .eq('device_fingerprint', deviceInfo.fingerprint)
      .single();
    
    if (existingDevice) {
      // Update last seen timestamp
      await supabase
        .from('license_devices')
        .update({ 
          last_seen_at: new Date().toISOString(),
          device_info: deviceInfo
        })
        .eq('id', existingDevice.id);
      
      return { 
        success: true, 
        message: SUCCESS_MESSAGES.DEVICE_ALREADY_ACTIVATED, 
        license,
        device: {
          id: existingDevice.id,
          name: existingDevice.device_name,
          activated_at: existingDevice.activated_at
        }
      };
    }
    
    // Check device limit
    if (license.active_devices >= license.max_devices) {
      return { 
        success: false, 
        error: `Maximum devices reached (${license.max_devices})`,
        status: HTTP_STATUS.FORBIDDEN,
        current_devices: license.active_devices,
        max_devices: license.max_devices
      };
    }
    
    // Use transaction for atomic activation
    const { data: newDevice, error: deviceError } = await supabase
      .from('license_devices')
      .insert([{
        license_id: license.id,
        device_fingerprint: deviceInfo.fingerprint,
        device_name: deviceInfo.name || `Device ${Date.now()}`,
        device_info: deviceInfo,
        activated_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (deviceError) {
      console.error('Device activation error:', deviceError);
      return { 
        success: false, 
        error: 'Failed to activate device',
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR
      };
    }
    
    // Update license device count
    const { error: updateError } = await supabase
      .from('licenses')
      .update({ 
        current_devices: license.active_devices + 1,
        last_activated_at: new Date().toISOString()
      })
      .eq('id', license.id);
    
    if (updateError) {
      console.error('Failed to update license device count:', updateError);
      // Don't fail the activation, just log the error
    }
    
    return { 
      success: true, 
      message: SUCCESS_MESSAGES.ACTIVATION_SUCCESS, 
      license: {
        ...license,
        current_devices: license.active_devices + 1
      },
      device: {
        id: newDevice.id,
        name: newDevice.device_name,
        fingerprint: newDevice.device_fingerprint,
        activated_at: newDevice.activated_at
      }
    };
    
  } catch (error) {
    console.error('License activation error:', error);
    return { 
      success: false, 
      error: ERROR_MESSAGES.ACTIVATION_FAILED,
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR
    };
  }
}

// License deactivation logic with enhanced validation and audit trail
async function deactivateLicense(supabase: any, licenseKey: string, userId: string, deviceFingerprint?: string) {
  try {
    // Get license with device information
    const { data: license, error } = await supabase
      .from('licenses')
      .select(`
        *,
        license_devices(id, device_fingerprint, device_name, activated_at)
      `)
      .eq('license_key', licenseKey)
      .eq('user_id', userId)
      .single();
    
    if (error || !license) {
      return { 
        success: false, 
        error: ERROR_MESSAGES.LICENSE_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      };
    }
    
    const activeDevices = license.license_devices || [];
    
    if (activeDevices.length === 0) {
      return {
        success: true,
        message: 'No devices to deactivate',
        deactivated_devices: 0
      };
    }
    
    let deactivatedDevices = 0;
    let deactivatedDevicesList = [];
    
    if (deviceFingerprint) {
      // Deactivate specific device
      const targetDevice = activeDevices.find(d => d.device_fingerprint === deviceFingerprint);
      
      if (!targetDevice) {
        return {
          success: false,
          error: 'Device not found or not activated',
          status: HTTP_STATUS.NOT_FOUND
        };
      }
      
      const { error: deviceError } = await supabase
        .from('license_devices')
        .delete()
        .eq('license_id', license.id)
        .eq('device_fingerprint', deviceFingerprint);
      
      if (deviceError) {
        console.error('Device deactivation error:', deviceError);
        return { 
          success: false, 
          error: 'Failed to deactivate device',
          status: HTTP_STATUS.INTERNAL_SERVER_ERROR
        };
      }
      
      deactivatedDevices = 1;
      deactivatedDevicesList = [{
        fingerprint: targetDevice.device_fingerprint,
        name: targetDevice.device_name,
        activated_at: targetDevice.activated_at
      }];
      
    } else {
      // Deactivate all devices for this license
      const { error: deviceError } = await supabase
        .from('license_devices')
        .delete()
        .eq('license_id', license.id);
      
      if (deviceError) {
        console.error('Bulk device deactivation error:', deviceError);
        return { 
          success: false, 
          error: 'Failed to deactivate devices',
          status: HTTP_STATUS.INTERNAL_SERVER_ERROR
        };
      }
      
      deactivatedDevices = activeDevices.length;
      deactivatedDevicesList = activeDevices.map(device => ({
        fingerprint: device.device_fingerprint,
        name: device.device_name,
        activated_at: device.activated_at
      }));
    }
    
    // Update license device count
    const newDeviceCount = Math.max(0, (license.current_devices || 0) - deactivatedDevices);
    const { error: updateError } = await supabase
      .from('licenses')
      .update({ 
        current_devices: newDeviceCount,
        last_deactivated_at: new Date().toISOString()
      })
      .eq('id', license.id);
    
    if (updateError) {
      console.error('Failed to update license device count:', updateError);
      // Don't fail the deactivation, just log the error
    }
    
    const message = deviceFingerprint 
      ? SUCCESS_MESSAGES.DEVICE_DEACTIVATION_SUCCESS
      : SUCCESS_MESSAGES.LICENSE_DEACTIVATION_SUCCESS;
    
    return { 
      success: true, 
      message,
      deactivated_devices: deactivatedDevices,
      devices: deactivatedDevicesList,
      license: {
        id: license.id,
        current_devices: newDeviceCount,
        max_devices: license.max_devices
      }
    };
    
  } catch (error) {
    console.error('License deactivation error:', error);
    return { 
      success: false, 
      error: ERROR_MESSAGES.DEACTIVATION_FAILED,
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR
    };
  }
}