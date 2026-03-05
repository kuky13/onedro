export interface AdminLicense {
  id: string;
  code: string;
  user_id: string | null;
  /** E-mail do usuário dono da licença (se disponível via RPC) */
  user_email?: string | null;
  is_active: boolean;
  derived_status: "active" | "expired" | "inactive" | string;
  license_type: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
  /** Nome amigável da licença (armazenado em metadata->'name') */
  license_name?: string | null;
}

export interface AdminUserForAssignment {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
}

export type LicenseStatusFilter = "active" | "expired" | "inactive" | "";
