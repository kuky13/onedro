// Global type fixes

// Extend interfaces to fix property errors
interface BudgetData {
  device_model?: string;
  total_price?: number;
  id?: string;
  [key: string]: any;
}

interface DeletedServiceOrder {
  formatted_id?: string;
  id: string;
  [key: string]: any;
}

interface LicenseStatusMonitorProps {
  userId?: string;
  onLicenseStatusChange?: (status: "active" | "inactive") => void;
}

interface ProtectionState {
  isLoading: boolean;
  canAccess: boolean;
  redirectTo?: string;
  reason?: string;
}

// Window extensions
declare global {
  interface Window {
    [key: string]: any;
  }
}

// Environment variables
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_VAPID_PUBLIC_KEY: string;
  readonly VAPID_PRIVATE_KEY: string;
  readonly VAPID_EMAIL: string;
  readonly NODE_ENV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};