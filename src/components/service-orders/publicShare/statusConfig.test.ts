import { describe, it, expect } from 'vitest';
import { statusConfig, getStatusInfo, getPaymentStatusInfo, isFormattedId } from './statusConfig';

describe('statusConfig', () => {
  it('contém todos os status esperados', () => {
    const expectedStatuses = [
      'opened', 'pending_approval', 'in_progress', 'waiting_parts',
      'waiting_client', 'under_warranty', 'ready_for_pickup', 'completed',
      'delivered', 'cancelled', 'archived',
    ];
    expectedStatuses.forEach((status) => {
      expect(statusConfig).toHaveProperty(status);
    });
  });

  it('cada status tem propriedades obrigatórias', () => {
    Object.values(statusConfig).forEach((config) => {
      expect(config).toHaveProperty('label');
      expect(config).toHaveProperty('color');
      expect(config).toHaveProperty('icon');
      expect(config).toHaveProperty('description');
      expect(config).toHaveProperty('step');
    });
  });
});

describe('getStatusInfo', () => {
  it('retorna config correta para status conhecido', () => {
    const info = getStatusInfo('completed');
    expect(info.label).toBe('Concluído');
    expect(info.step).toBe(3);
  });

  it('retorna fallback para status desconhecido', () => {
    const info = getStatusInfo('status_inexistente');
    expect(info.label).toBe('status_inexistente');
    expect(info.step).toBe(0);
    expect(info.color).toBe('#6B7280');
  });

  it('retorna config correta para cancelled', () => {
    const info = getStatusInfo('cancelled');
    expect(info.step).toBe(0);
  });

  it('retorna config correta para delivered', () => {
    const info = getStatusInfo('delivered');
    expect(info.step).toBe(4);
    expect(info.color).toBe('#fec832');
  });
});

describe('getPaymentStatusInfo', () => {
  it('retorna "Pago" quando isPaid=true', () => {
    const info = getPaymentStatusInfo(true);
    expect(info.label).toBe('Pago');
    expect(info.color).toBe('#10B981');
  });

  it('retorna "Pendente" quando isPaid=false', () => {
    const info = getPaymentStatusInfo(false);
    expect(info.label).toBe('Pendente');
    expect(info.color).toBe('#F59E0B');
  });
});

describe('isFormattedId', () => {
  it('reconhece IDs formatados como OS0001', () => {
    expect(isFormattedId('OS0001')).toBe(true);
    expect(isFormattedId('OS1234')).toBe(true);
    expect(isFormattedId('os001')).toBe(true); // case insensitive
  });

  it('rejeita tokens que não são IDs formatados', () => {
    expect(isFormattedId('abc123def456')).toBe(false);
    expect(isFormattedId('share-token-uuid')).toBe(false);
    expect(isFormattedId('')).toBe(false);
    expect(isFormattedId('OS')).toBe(false);
  });
});
