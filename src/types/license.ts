// License validation types for the improved RPC system
// Based on the technical specification from the improvement plan

export interface LicenseValidationResult {
  has_license: boolean;
  is_valid: boolean;
  license_code?: string;
  expires_at?: string;
  activated_at?: string;
  days_remaining?: number;
  message: string;
  requires_activation?: boolean;
  requires_renewal?: boolean;
  expired_at?: string;
  timestamp: string;
  is_active?: boolean;
  status?: 'ativa' | 'inativa' | 'expirada';
}

export interface LicenseVerificationConfig {
  cacheTTL: number;
  retryAttempts: number;
  retryDelay: number;
  enableWebSocket: boolean;
  enablePolling: boolean;
  pollingInterval: number;
}

export interface LicenseData {
  has_license: boolean;
  is_valid: boolean;
  license_code?: string;
  expires_at?: string;
  activated_at?: string;
  days_remaining?: number;
  message?: string;
  requires_activation?: boolean;
  requires_renewal?: boolean;
}

export interface LicenseVerificationState {
  data: LicenseData | null;
  isLoading: boolean;
  error: string | null;
  lastValidated: Date | null;
  cacheExpiry: Date | null;
}

export interface LicenseVerificationActions {
  validateLicense: () => Promise<LicenseData>;
  invalidateCache: () => void;
  revalidate: () => Promise<void>;
  setPolling: (enabled: boolean) => void;
}

export type LicenseVerificationHook = LicenseVerificationState & LicenseVerificationActions;

// Rate limiting types
export interface RateLimitConfig {
  requests: number;
  window: number; // in milliseconds
}

export interface RateLimitState {
  count: number;
  resetTime: number;
  isLimited: boolean;
}

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheConfig {
  ttl: number;
  sync: boolean;
}

// Audit types
export interface LicenseValidationAudit {
  id: string;
  user_id: string;
  license_id?: string;
  validation_result: LicenseValidationResult;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}