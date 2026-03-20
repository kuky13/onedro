import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do apiClient antes de importar o módulo testado
vi.mock('./apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

import { budgetsApi } from './budgetsApi';
import * as apiClient from './apiClient';

const mockGet = vi.mocked(apiClient.apiGet);
const mockPost = vi.mocked(apiClient.apiPost);
const mockPut = vi.mocked(apiClient.apiPut);
const mockDelete = vi.mocked(apiClient.apiDelete);

describe('budgetsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list() chama apiGet com /budgets', async () => {
    const fakeBudgets = [{ id: '1', total: 100 }];
    mockGet.mockResolvedValueOnce(fakeBudgets);

    const result = await budgetsApi.list();

    expect(mockGet).toHaveBeenCalledWith('/budgets', expect.anything());
    expect(result).toEqual(fakeBudgets);
  });

  it('list() passa parâmetros de filtro', async () => {
    mockGet.mockResolvedValueOnce([]);
    await budgetsApi.list({ search: 'iPhone', status: 'pending', limit: 10, offset: 0 });

    expect(mockGet).toHaveBeenCalledWith('/budgets', {
      params: { search: 'iPhone', status: 'pending', limit: 10, offset: 0 },
    });
  });

  it('getById() chama apiGet com id correto', async () => {
    const fakeBudget = { id: 'abc-123', total: 500 };
    mockGet.mockResolvedValueOnce(fakeBudget);

    const result = await budgetsApi.getById('abc-123');

    expect(mockGet).toHaveBeenCalledWith('/budgets/abc-123');
    expect(result).toEqual(fakeBudget);
  });

  it('create() chama apiPost com dados corretos', async () => {
    const newBudget = { client_name: 'João', total: 200 };
    const created = { id: 'new-1', ...newBudget };
    mockPost.mockResolvedValueOnce(created);

    const result = await budgetsApi.create(newBudget);

    expect(mockPost).toHaveBeenCalledWith('/budgets', newBudget);
    expect(result).toEqual(created);
  });

  it('update() chama apiPut com id e dados corretos', async () => {
    const updates = { status: 'approved' };
    const updated = { id: 'abc-123', status: 'approved' };
    mockPut.mockResolvedValueOnce(updated);

    const result = await budgetsApi.update('abc-123', updates);

    expect(mockPut).toHaveBeenCalledWith('/budgets/abc-123', updates);
    expect(result).toEqual(updated);
  });

  it('delete() chama apiDelete com id correto', async () => {
    mockDelete.mockResolvedValueOnce(undefined);

    await budgetsApi.delete('abc-123');

    expect(mockDelete).toHaveBeenCalledWith('/budgets/abc-123');
  });
});
