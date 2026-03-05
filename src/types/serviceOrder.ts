/**
 * Tipos centralizados para ordens de serviço
 */

export type DevicePasswordType = 'pin' | 'pattern' | 'password' | 'biometric' | 'none' | 'abc';

export interface ServiceOrderData {
  id: string;
  formatted_id: string;
  device_type: string;
  device_model: string;
  imei_serial?: string | null;
  reported_issue: string;
  status: string;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
  entry_date: string | null;
  exit_date: string | null;
  delivery_date?: string | null;
  sequential_number?: number;
  total_price?: number;
  payment_status?: string;
  estimated_completion?: string | null;
  actual_completion?: string | null;
  customer_notes?: string;
  last_customer_update?: string;
  warranty_months?: number;
  device_password_type?: DevicePasswordType | null;
  device_password_value?: string | null;
  device_password_metadata?: any | null;
  device_checklist?: any | null;
}
