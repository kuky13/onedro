import { apiGet } from './apiClient';

export type BudgetsListParams = {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

export const budgetsApi = {
  list: (params?: BudgetsListParams) =>
    apiGet<any[]>('/api/budgets', {
      params: params as unknown as Record<string, string | number | boolean | undefined | null>,
    }),
};
