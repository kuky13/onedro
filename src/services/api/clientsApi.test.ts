import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

import { clientsApi } from './clientsApi';
import * as apiClient from './apiClient';

const mockGet = vi.mocked(apiClient.apiGet);
const mockPost = vi.mocked(apiClient.apiPost);
const mockPut = vi.mocked(apiClient.apiPut);
const mockDelete = vi.mocked(apiClient.apiDelete);

describe('clientsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list() chama apiGet com /clients', async () => {
    const fakeClients = [{ id: '1', name: 'Maria' }];
    mockGet.mockResolvedValueOnce(fakeClients);

    const result = await clientsApi.list();

    expect(mockGet).toHaveBeenCalledWith('/clients');
    expect(result).toEqual(fakeClients);
  });

  it('getById() chama apiGet com id correto', async () => {
    const fakeClient = { id: 'client-1', name: 'Pedro', phone: '11999999999' };
    mockGet.mockResolvedValueOnce(fakeClient);

    const result = await clientsApi.getById('client-1');

    expect(mockGet).toHaveBeenCalledWith('/clients/client-1');
    expect(result).toEqual(fakeClient);
  });

  it('create() chama apiPost com dados do cliente', async () => {
    const newClient = { name: 'Ana', phone: '21988888888' };
    const created = { id: 'new-client', ...newClient };
    mockPost.mockResolvedValueOnce(created);

    const result = await clientsApi.create(newClient);

    expect(mockPost).toHaveBeenCalledWith('/clients', newClient);
    expect(result).toEqual(created);
  });

  it('update() chama apiPut com id e novos dados', async () => {
    const updates = { phone: '21977777777' };
    const updated = { id: 'client-1', name: 'Ana', phone: '21977777777' };
    mockPut.mockResolvedValueOnce(updated);

    const result = await clientsApi.update('client-1', updates);

    expect(mockPut).toHaveBeenCalledWith('/clients/client-1', updates);
    expect(result).toEqual(updated);
  });

  it('delete() chama apiDelete com id correto', async () => {
    mockDelete.mockResolvedValueOnce(undefined);

    await clientsApi.delete('client-1');

    expect(mockDelete).toHaveBeenCalledWith('/clients/client-1');
  });
});
