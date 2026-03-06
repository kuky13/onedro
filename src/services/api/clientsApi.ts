import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

export const clientsApi = {
  list: () => apiGet<any[]>('/api/clients'),

  getById: (id: string) =>
    apiGet<any>(`/api/clients/${id}`),

  create: (data: Record<string, unknown>) =>
    apiPost<any>('/api/clients', data),

  update: (id: string, data: Record<string, unknown>) =>
    apiPut<any>(`/api/clients/${id}`, data),

  delete: (id: string) =>
    apiDelete(`/api/clients/${id}`),
};
