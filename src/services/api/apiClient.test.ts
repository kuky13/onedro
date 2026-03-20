import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, API_BASE_URL, apiGet, apiDelete } from './apiClient';

// Mock do módulo supabase antes de qualquer importação
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      refreshSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

describe('ApiError', () => {
  it('cria instância com mensagem correta', () => {
    const err = new ApiError('Erro de teste');
    expect(err.message).toBe('Erro de teste');
    expect(err.name).toBe('ApiError');
    expect(err instanceof Error).toBe(true);
  });

  it('armazena status e endpoint quando fornecidos', () => {
    const err = new ApiError('Erro HTTP 404', { status: 404, endpoint: '/budgets/123' });
    expect(err.status).toBe(404);
    expect(err.endpoint).toBe('/budgets/123');
  });

  it('deixa status e endpoint undefined quando não fornecidos', () => {
    const err = new ApiError('Erro sem contexto');
    expect(err.status).toBeUndefined();
    expect(err.endpoint).toBeUndefined();
  });
});

describe('API_BASE_URL', () => {
  it('tem valor padrão quando VITE_API_URL não está definido', () => {
    expect(typeof API_BASE_URL).toBe('string');
    expect(API_BASE_URL.length).toBeGreaterThan(0);
  });
});

describe('apiGet - comportamento com fetch mockado', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('retorna data quando API responde com success=true', async () => {
    const mockData = [{ id: '1', name: 'Test' }];
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockData }),
    });

    const result = await apiGet<typeof mockData>('/test-endpoint');
    expect(result).toEqual(mockData);
  });

  it('lança ApiError quando API responde com success=false', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: false, message: 'Recurso não encontrado' }),
    });

    await expect(apiGet('/test-endpoint')).rejects.toThrow('Recurso não encontrado');
  });

  it('lança ApiError com status 404 em erros HTTP 4xx', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    try {
      await apiGet('/nao-existe');
      expect.fail('deveria ter lançado erro');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    }
  });

  it('retorna undefined em respostas 204 No Content', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    });

    const result = await apiDelete('/test-endpoint');
    expect(result).toBeUndefined();
  });
});
