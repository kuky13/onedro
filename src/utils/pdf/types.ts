export interface BudgetData {
  id: string;
  device_model: string;
  part_quality: string;
  total_price: number;
  installment_price?: number;
  installment_count?: number;
  created_at: string;
  validity_date?: string;
  warranty_months?: number;
  notes?: string;
  includes_delivery?: boolean;
  includes_screen_protector?: boolean;
  custom_services?: string;
  sequential_number?: number;
  parts?: BudgetPartData[];
}

export interface BudgetPartData {
  name: string;
  part_type?: string;
  quantity: number;
  price: number;
  cash_price?: number;
  installment_price?: number;
  installment_count?: number;
  warranty_months?: number;
}

export interface CompanyData {
  shop_name?: string;
  address?: string;
  contact_phone?: string;
  logo_url?: string;
  email?: string;
  cnpj?: string;
}

export type RGB = [number, number, number];
