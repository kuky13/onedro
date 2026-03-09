import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

export type BudgetsListParams = {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

export const budgetsApi = {
  list: (params?: BudgetsListParams) =>
    apiGet<any[]>('/budgets', {
      params: params as unknown as Record<string, string | number | boolean | undefined | null>,
    }),

  getById: (id: string) =>
    apiGet<any>(`/budgets/${id}`),

  create: (data: Record<string, unknown>) =>
    apiPost<any>('/budgets', data),

  update: (id: string, data: Record<string, unknown>) =>
    apiPut<any>(`/budgets/${id}`, data),

  delete: (id: string) =>
    apiDelete(`/budgets/${id}`),
};
