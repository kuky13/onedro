import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

export const clientsApi = {
  list: () => apiGet<any[]>('/clients'),

  getById: (id: string) =>
    apiGet<any>(`/clients/${id}`),

  create: (data: Record<string, unknown>) =>
    apiPost<any>('/clients', data),

  update: (id: string, data: Record<string, unknown>) =>
    apiPut<any>(`/clients/${id}`, data),

  delete: (id: string) =>
    apiDelete(`/clients/${id}`),
};
