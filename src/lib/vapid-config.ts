/**
 * VAPID Configuration
 * This file manages the VAPID public key for push notifications
 */

// Get VAPID public key from environment
export const getVapidPublicKey = (): string => {
  // Check if running in browser
  if (typeof window === 'undefined') {
    return '';
  }

  // For now, return empty string until secrets are configured
  // This will be updated after VAPID keys are added to Supabase secrets
  return import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
};

// Validate VAPID key format
export const validateVapidKey = (key: string): boolean => {
  // VAPID keys should be base64url strings (~87 characters for public keys)
  const base64urlPattern = /^[A-Za-z0-9_-]+$/;
  return base64urlPattern.test(key) && key.length >= 80 && key.length <= 100;
};

// Check if VAPID is properly configured
export const isVapidConfigured = (): boolean => {
  const key = getVapidPublicKey();
  return key.length > 0 && validateVapidKey(key);
};
