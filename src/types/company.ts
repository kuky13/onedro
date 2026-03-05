/**
 * Tipos centralizados para empresa/branding
 */

export interface CompanyInfo {
  id: string;
  name: string;
  logo_url?: string | null;
  address?: string | null;
  whatsapp_phone?: string | null;
  email?: string | null;
  cnpj?: string | null;
  business_hours?: string | null;
  description?: string | null;
  warranty_cancellation_terms?: string | null;
  warranty_legal_reminders?: string | null;
  additional_images?: string[];
  website?: string | null;
}

export interface CompanyData {
  name: string;
  logo_url: string | null;
  address: string | null;
  whatsapp_phone: string | null;
  description: string | null;
  email: string | null;
  website: string | null;
  cnpj?: string | null;
  warranty_cancellation_terms?: string | null;
  warranty_legal_reminders?: string | null;
}

export interface CompanyFormData {
  name: string;
  logo_url: string;
  whatsapp_phone: string;
  description: string;
  cnpj: string;
  email: string;
  address: string;
  warranty_cancellation_terms: string;
  warranty_legal_reminders: string;
}
