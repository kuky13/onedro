import { apiGet } from './apiClient';

export const clientsApi = {
  list: () => apiGet<any[]>('/api/clients'),
};
