// Tipos para o gerenciamento de usuários no painel administrativo

export interface UserWithLicense {
  id: string;
  email: string;
  name: string;
  created_at: string;
  license_id?: string;
  license_code?: string;
  license_expires_at?: string;
  license_is_active?: boolean;
}

export interface AvailableLicense {
  id: string;
  code: string;
  expires_at: string;
  is_active: boolean;
}

export type UserManagementPanelProps = Record<string, never>;

export interface UserAssignLicenseModalProps {
  user: UserWithLicense;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export interface UserRemoveLicenseModalProps {
  user: UserWithLicense;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export interface UserFilters {
  search: string;
  licenseStatus: 'all' | 'with_license' | 'without_license' | 'expired';
  sortBy: 'name' | 'email' | 'created_at' | 'license_expires_at';
  sortOrder: 'asc' | 'desc';
}

export type LicenseStatus = 'active' | 'expired' | 'none';