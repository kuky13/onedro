/**
 * Tipos TypeScript para Sistema de Atualizações
 * OneDrip - Definições de tipos para updates e preferências de usuário
 */

export interface Update {
  id: string;
  title: string;
  content: string;
  link_text: string;
  link_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface UserUpdatePreference {
  id: string;
  user_id: string;
  update_id: string;
  dismissed: boolean | null;
  dismissed_at: string | null;
  created_at: string | null;
  updates?: {
    id: string;
    title: string;
    created_at: string | null;
  };
}

export interface UpdateFormData {
  title: string;
  content: string;
  link_text: string;
  link_url: string;
  is_active: boolean;
}

export interface UpdateStats {
  total_views: number;
  total_dismissals: number;
  active_updates: number;
  last_update: string | null;
}

export interface PopupState {
  isVisible: boolean;
  currentUpdate: Update | null;
  isLoading: boolean;
  error: string | null;
}

export interface UpdateManagementState {
  updates: Update[];
  currentUpdate: Update | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  stats: UpdateStats | null;
}

// Tipos para formulários e validação
export interface CreateUpdateRequest {
  title: string;
  content: string;
  link_text?: string;
  link_url?: string;
  is_active: boolean;
}

export interface UpdateUpdateRequest extends Partial<CreateUpdateRequest> {
  id: string;
}

export interface DismissUpdateRequest {
  update_id: string;
  user_id: string;
}

// Tipos para respostas da API
export interface UpdateResponse {
  data: Update | null;
  error: string | null;
}

export interface UpdatesResponse {
  data: Update[] | null;
  error: string | null;
}

export interface UserPreferenceResponse {
  data: UserUpdatePreference | null;
  error: string | null;
}

export interface StatsResponse {
  data: UpdateStats | null;
  error: string | null;
}

// Enums para status e tipos
export enum UpdateStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft'
}

export enum PreferenceAction {
  DISMISS = 'dismiss',
  RESTORE = 'restore'
}

// Tipos para hooks
export interface UseUpdateManagementReturn {
  updates: Update[];
  currentUpdate: Update | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  stats: UpdateStats | null;
  createUpdate: (data: CreateUpdateRequest) => Promise<void>;
  updateUpdate: (data: UpdateUpdateRequest) => Promise<void>;
  deleteUpdate: (id: string) => Promise<void>;
  toggleUpdateStatus: (id: string) => Promise<void>;
  loadUpdate: (id: string) => Promise<void>;
  loadStats: () => Promise<void>;
  clearError: () => void;
}

export interface UsePopupStateReturn {
  popupState: PopupState;
  dismissPopup: () => Promise<void>;
  hidePopup: () => void;
  showPopup: () => void;
  clearError: () => void;
  refreshPopupState: () => void;
}

export interface UseUserPreferencesReturn {
  preferences: UserUpdatePreference[];
  isLoading: boolean;
  error: string | null;
  hasUserDismissed: (updateId: string) => Promise<boolean>;
  dismissUpdate: (updateId: string) => Promise<void>;
  reactivateUpdate: (updateId: string) => Promise<void>;
  getUserStats: () => Promise<{
    total_dismissed: number;
    total_updates: number;
    dismissal_rate: number;
  } | null>;
  clearAllPreferences: () => Promise<void>;
  clearError: () => void;
  refreshPreferences: () => Promise<void>;
}