# Especificações Técnicas - Sistema Service Orders Reestruturado

## 1. Arquitetura Técnica

### 1.1 Diagrama da Arquitetura Atualizada

```mermaid
graph TD
    A[Cliente] --> B[/share/service-order/:token]
    C[Técnico/Admin] --> D[/service-orders - Gestão de Links]
    
    B --> E[ServiceOrderPublicShare Component]
    D --> F[ServiceOrdersPageSimple Component]
    
    E --> G[Real-time Updates via Supabase]
    F --> H[Share Link Management]
    
    G --> I[service_orders Table]
    H --> I
    G --> J[service_order_events Table]
    H --> J
    
    I --> K[service_order_shares Table]
    
    subgraph "Real-time Layer"
        G
        L[WebSocket/Polling]
        M[Event Triggers]
    end
    
    subgraph "Data Layer"
        I
        J
        K
        N[clients Table]
    end
```

### 1.2 Tecnologias Utilizadas

- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Real-time)
- **Estado:** TanStack Query + Zustand
- **UI Components:** Radix UI + Shadcn/ui
- **Real-time:** Supabase Realtime + Polling híbrido

## 2. Estrutura de Dados Detalhada

### 2.1 Modificações na Tabela `service_orders`

```sql
-- Adicionar novos campos
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending' 
  CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
ADD COLUMN IF NOT EXISTS estimated_completion DATE,
ADD COLUMN IF NOT EXISTS actual_completion DATE,
ADD COLUMN IF NOT EXISTS customer_notes TEXT,
ADD COLUMN IF NOT EXISTS technician_notes TEXT,
ADD COLUMN IF NOT EXISTS last_customer_update TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS customer_visible BOOLEAN DEFAULT true;

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_service_orders_payment_status 
  ON service_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_service_orders_estimated_completion 
  ON service_orders(estimated_completion);
CREATE INDEX IF NOT EXISTS idx_service_orders_customer_visible 
  ON service_orders(customer_visible);
```

### 2.2 Novos Tipos de Eventos

```sql
-- Atualizar enum de tipos de eventos
ALTER TYPE service_order_event_type ADD VALUE IF NOT EXISTS 'payment_status_changed';
ALTER TYPE service_order_event_type ADD VALUE IF NOT EXISTS 'customer_notification_sent';
ALTER TYPE service_order_event_type ADD VALUE IF NOT EXISTS 'estimated_completion_updated';
ALTER TYPE service_order_event_type ADD VALUE IF NOT EXISTS 'customer_feedback_received';
ALTER TYPE service_order_event_type ADD VALUE IF NOT EXISTS 'technician_note_added';
ALTER TYPE service_order_event_type ADD VALUE IF NOT EXISTS 'customer_note_added';
ALTER TYPE service_order_event_type ADD VALUE IF NOT EXISTS 'share_link_accessed';
```

### 2.3 Função para Logging Automático de Atualizações

```sql
CREATE OR REPLACE FUNCTION log_customer_relevant_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log mudanças relevantes para o cliente
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO service_order_events (service_order_id, event_type, payload)
        VALUES (
            NEW.id,
            'status_changed',
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'customer_visible', true,
                'changed_at', NOW()
            )
        );
        
        -- Atualizar timestamp de última atualização para cliente
        NEW.last_customer_update = NOW();
    END IF;
    
    -- Log mudanças no status de pagamento
    IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
        INSERT INTO service_order_events (service_order_id, event_type, payload)
        VALUES (
            NEW.id,
            'payment_status_changed',
            jsonb_build_object(
                'old_payment_status', OLD.payment_status,
                'new_payment_status', NEW.payment_status,
                'customer_visible', true,
                'changed_at', NOW()
            )
        );
        
        NEW.last_customer_update = NOW();
    END IF;
    
    -- Log mudanças na estimativa de conclusão
    IF OLD.estimated_completion IS DISTINCT FROM NEW.estimated_completion THEN
        INSERT INTO service_order_events (service_order_id, event_type, payload)
        VALUES (
            NEW.id,
            'estimated_completion_updated',
            jsonb_build_object(
                'old_estimated_completion', OLD.estimated_completion,
                'new_estimated_completion', NEW.estimated_completion,
                'customer_visible', true,
                'changed_at', NOW()
            )
        );
        
        NEW.last_customer_update = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
CREATE TRIGGER log_customer_relevant_changes_trigger
    BEFORE UPDATE ON service_orders
    FOR EACH ROW
    EXECUTE FUNCTION log_customer_relevant_changes();
```

## 3. Componentes Frontend Detalhados

### 3.1 Hook para Real-time Updates

```typescript
// hooks/useServiceOrderRealTime.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type ServiceOrder = Tables<'service_orders'>;
type ServiceOrderEvent = Tables<'service_order_events'>;

interface UseServiceOrderRealTimeReturn {
  serviceOrder: ServiceOrder | null;
  events: ServiceOrderEvent[];
  lastUpdate: Date | null;
  isConnected: boolean;
  error: string | null;
}

export function useServiceOrderRealTime(
  serviceOrderId: string
): UseServiceOrderRealTimeReturn {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [events, setEvents] = useState<ServiceOrderEvent[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInitialData = useCallback(async () => {
    try {
      // Buscar dados iniciais da ordem de serviço
      const { data: orderData, error: orderError } = await supabase
        .from('service_orders')
        .select('*')
        .eq('id', serviceOrderId)
        .single();

      if (orderError) throw orderError;
      setServiceOrder(orderData);

      // Buscar eventos iniciais
      const { data: eventsData, error: eventsError } = await supabase
        .from('service_order_events')
        .select('*')
        .eq('service_order_id', serviceOrderId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);
      
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }, [serviceOrderId]);

  useEffect(() => {
    fetchInitialData();

    // Configurar subscription para mudanças em tempo real
    const channel = supabase
      .channel(`service_order_${serviceOrderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_orders',
          filter: `id=eq.${serviceOrderId}`
        },
        (payload) => {
          if (payload.new) {
            setServiceOrder(payload.new as ServiceOrder);
            setLastUpdate(new Date());
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'service_order_events',
          filter: `service_order_id=eq.${serviceOrderId}`
        },
        (payload) => {
          if (payload.new) {
            setEvents(prev => [payload.new as ServiceOrderEvent, ...prev]);
            setLastUpdate(new Date());
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Fallback: polling a cada 30 segundos se não estiver conectado
    const pollInterval = setInterval(() => {
      if (!isConnected) {
        fetchInitialData();
      }
    }, 30000);

    return () => {
      channel.unsubscribe();
      clearInterval(pollInterval);
    };
  }, [serviceOrderId, fetchInitialData, isConnected]);

  return {
    serviceOrder,
    events,
    lastUpdate,
    isConnected,
    error
  };
}
```

### 3.2 Componente de Timeline Aprimorada

```typescript
// components/service-orders/EnhancedTimeline.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Wrench, 
  Clock, 
  CheckCircle, 
  Truck, 
  CreditCard,
  MessageSquare,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tables } from '@/integrations/supabase/types';

type ServiceOrderEvent = Tables<'service_order_events'>;

interface EnhancedTimelineProps {
  events: ServiceOrderEvent[];
  currentStatus: string;
  paymentStatus: string;
  estimatedCompletion?: string;
}

const eventConfig = {
  order_created: {
    icon: Package,
    color: '#3B82F6',
    title: 'Ordem Criada',
    description: 'Equipamento recebido e ordem de serviço criada'
  },
  status_changed: {
    icon: Wrench,
    color: '#F59E0B',
    title: 'Status Atualizado',
    description: 'Status do reparo foi atualizado'
  },
  payment_status_changed: {
    icon: CreditCard,
    color: '#10B981',
    title: 'Pagamento Atualizado',
    description: 'Status do pagamento foi modificado'
  },
  estimated_completion_updated: {
    icon: Calendar,
    color: '#8B5CF6',
    title: 'Prazo Atualizado',
    description: 'Estimativa de conclusão foi atualizada'
  },
  technician_note_added: {
    icon: MessageSquare,
    color: '#6B7280',
    title: 'Nota Técnica',
    description: 'Técnico adicionou uma observação'
  }
};

export function EnhancedTimeline({ 
  events, 
  currentStatus, 
  paymentStatus,
  estimatedCompletion 
}: EnhancedTimelineProps) {
  const getEventConfig = (eventType: string) => {
    return eventConfig[eventType as keyof typeof eventConfig] || {
      icon: MessageSquare,
      color: '#6B7280',
      title: eventType,
      description: 'Evento do sistema'
    };
  };

  const formatEventPayload = (event: ServiceOrderEvent) => {
    const payload = event.payload as any;
    
    switch (event.event_type) {
      case 'status_changed':
        return `Status alterado de "${payload.old_status}" para "${payload.new_status}"`;
      case 'payment_status_changed':
        return `Pagamento alterado de "${payload.old_payment_status}" para "${payload.new_payment_status}"`;
      case 'estimated_completion_updated':
        return `Nova estimativa: ${payload.new_estimated_completion ? 
          format(new Date(payload.new_estimated_completion), 'dd/MM/yyyy', { locale: ptBR }) : 
          'Não definida'}`;
      default:
        return event.event_type;
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Histórico de Atualizações</h3>
        
        {/* Status Atual */}
        <div className="mb-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Status Atual</p>
              <Badge variant="outline" className="mt-1">
                {currentStatus}
              </Badge>
            </div>
            <div>
              <p className="font-medium">Pagamento</p>
              <Badge variant="outline" className="mt-1">
                {paymentStatus}
              </Badge>
            </div>
          </div>
          
          {estimatedCompletion && (
            <div className="mt-3 pt-3 border-t border-primary/20">
              <p className="text-sm text-muted-foreground">
                Previsão de conclusão: {format(new Date(estimatedCompletion), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
          )}
        </div>

        {/* Timeline de Eventos */}
        <div className="space-y-4">
          {events.map((event, index) => {
            const config = getEventConfig(event.event_type);
            const IconComponent = config.icon;
            
            return (
              <div key={event.id} className="flex items-start space-x-3">
                <div 
                  className="flex items-center justify-center w-8 h-8 rounded-full text-white flex-shrink-0"
                  style={{ backgroundColor: config.color }}
                >
                  <IconComponent className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{config.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatEventPayload(event)}
                  </p>
                </div>
                
                {index < events.length - 1 && (
                  <div className="absolute left-4 mt-8 w-px h-4 bg-border" />
                )}
              </div>
            );
          })}
        </div>
        
        {events.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma atualização ainda</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 3.3 Componente de Status de Pagamento

```typescript
// components/service-orders/PaymentStatusCard.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface PaymentStatusCardProps {
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
  lastUpdate?: string;
}

const paymentConfig = {
  pending: {
    icon: Clock,
    color: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    title: 'Pagamento Pendente',
    description: 'Aguardando confirmação do pagamento',
    bgColor: 'bg-yellow-50'
  },
  partial: {
    icon: CreditCard,
    color: 'border-blue-200 bg-blue-50 text-blue-700',
    title: 'Pagamento Parcial',
    description: 'Parte do valor foi pago',
    bgColor: 'bg-blue-50'
  },
  paid: {
    icon: CheckCircle,
    color: 'border-green-200 bg-green-50 text-green-700',
    title: 'Pagamento Confirmado',
    description: 'Pagamento realizado com sucesso',
    bgColor: 'bg-green-50'
  },
  overdue: {
    icon: AlertCircle,
    color: 'border-red-200 bg-red-50 text-red-700',
    title: 'Pagamento em Atraso',
    description: 'Pagamento está em atraso',
    bgColor: 'bg-red-50'
  }
};

export function PaymentStatusCard({ paymentStatus, lastUpdate }: PaymentStatusCardProps) {
  const config = paymentConfig[paymentStatus];
  const IconComponent = config.icon;

  return (
    <Card className={`border-2 ${config.bgColor}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <IconComponent className="h-5 w-5" />
          Status do Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Badge className={config.color} variant="outline">
            {config.title}
          </Badge>
          
          <p className="text-sm text-muted-foreground">
            {config.description}
          </p>
          
          {lastUpdate && (
            <p className="text-xs text-muted-foreground">
              Última atualização: {format(new Date(lastUpdate), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

## 4. APIs e Funções do Banco

### 4.1 RPC para Busca Otimizada de Dados de Compartilhamento

```sql
CREATE OR REPLACE FUNCTION get_service_order_share_data(p_share_token TEXT)
RETURNS TABLE (
    -- Service Order Data
    id UUID,
    formatted_id TEXT,
    device_type VARCHAR(100),
    device_model VARCHAR(100),
    reported_issue TEXT,
    status VARCHAR(20),
    payment_status VARCHAR(20),
    estimated_completion DATE,
    actual_completion DATE,
    customer_notes TEXT,
    warranty_months INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    last_customer_update TIMESTAMP WITH TIME ZONE,
    
    -- Company Data
    company_name TEXT,
    company_logo_url TEXT,
    company_address TEXT,
    company_whatsapp TEXT,
    
    -- Recent Events (JSON)
    recent_events JSONB
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        so.id,
        so.formatted_id,
        so.device_type,
        so.device_model,
        so.reported_issue,
        so.status,
        so.payment_status,
        so.estimated_completion,
        so.actual_completion,
        so.customer_notes,
        so.warranty_months,
        so.created_at,
        so.updated_at,
        so.last_customer_update,
        
        -- Company info
        cb.company_name,
        cb.logo_url,
        cb.address,
        cb.whatsapp_phone,
        
        -- Recent events as JSON
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', e.id,
                    'event_type', e.event_type,
                    'payload', e.payload,
                    'created_at', e.created_at
                ) ORDER BY e.created_at DESC
            )
            FROM service_order_events e
            WHERE e.service_order_id = so.id
            AND (e.payload->>'customer_visible')::boolean = true
            LIMIT 20
        ) as recent_events
        
    FROM service_orders so
    JOIN service_order_shares sos ON sos.service_order_id = so.id
    LEFT JOIN company_branding cb ON cb.owner_id = so.owner_id
    WHERE sos.share_token = p_share_token
    AND sos.expires_at > NOW()
    AND so.deleted_at IS NULL
    AND so.customer_visible = true;
END;
$$ LANGUAGE plpgsql;
```

### 4.2 Função para Logging de Acesso ao Link

```sql
CREATE OR REPLACE FUNCTION log_share_access(p_share_token TEXT)
RETURNS VOID
SECURITY DEFINER
AS $$
DECLARE
    v_service_order_id UUID;
BEGIN
    -- Buscar o service_order_id pelo token
    SELECT service_order_id INTO v_service_order_id
    FROM service_order_shares
    WHERE share_token = p_share_token
    AND expires_at > NOW();
    
    -- Se encontrou, registrar o acesso
    IF v_service_order_id IS NOT NULL THEN
        INSERT INTO service_order_events (service_order_id, event_type, payload)
        VALUES (
            v_service_order_id,
            'share_link_accessed',
            jsonb_build_object(
                'accessed_at', NOW(),
                'share_token', p_share_token,
                'customer_visible', false
            )
        );
    END IF;
END;
$$ LANGUAGE plpgsql;
```

## 5. Configurações de Performance

### 5.1 Índices Adicionais

```sql
-- Índices para otimizar queries de compartilhamento
CREATE INDEX IF NOT EXISTS idx_service_order_shares_token_expires 
    ON service_order_shares(share_token, expires_at) 
    WHERE expires_at > NOW();

CREATE INDEX IF NOT EXISTS idx_service_order_events_customer_visible 
    ON service_order_events(service_order_id, created_at DESC) 
    WHERE (payload->>'customer_visible')::boolean = true;

CREATE INDEX IF NOT EXISTS idx_service_orders_last_customer_update 
    ON service_orders(last_customer_update DESC) 
    WHERE customer_visible = true AND deleted_at IS NULL;
```

### 5.2 Configurações de Cache

```typescript
// utils/cacheConfig.ts
export const CACHE_KEYS = {
  SERVICE_ORDER_SHARE: (token: string) => `service_order_share_${token}`,
  SERVICE_ORDER_EVENTS: (id: string) => `service_order_events_${id}`,
  COMPANY_BRANDING: (ownerId: string) => `company_branding_${ownerId}`
};

export const CACHE_TIMES = {
  SERVICE_ORDER_SHARE: 5 * 60 * 1000, // 5 minutos
  SERVICE_ORDER_EVENTS: 2 * 60 * 1000, // 2 minutos
  COMPANY_BRANDING: 30 * 60 * 1000 // 30 minutos
};
```

## 6. Testes e Validação

### 6.1 Testes de Integração

```typescript
// tests/serviceOrderShare.test.ts
describe('Service Order Share System', () => {
  test('should load service order data via share token', async () => {
    const token = 'test-share-token';
    const { data, error } = await supabase
      .rpc('get_service_order_share_data', { p_share_token: token });
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data[0]).toHaveProperty('id');
    expect(data[0]).toHaveProperty('formatted_id');
  });

  test('should receive real-time updates', async () => {
    const serviceOrderId = 'test-uuid';
    const updates: any[] = [];
    
    const subscription = supabase
      .channel(`service_order_${serviceOrderId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'service_orders',
        filter: `id=eq.${serviceOrderId}`
      }, (payload) => {
        updates.push(payload);
      })
      .subscribe();

    // Simular atualização
    await supabase
      .from('service_orders')
      .update({ status: 'in_progress' })
      .eq('id', serviceOrderId);

    // Aguardar atualização
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    expect(updates.length).toBeGreaterThan(0);
    subscription.unsubscribe();
  });
});
```

### 6.2 Testes de Performance

```typescript
// tests/performance.test.ts
describe('Performance Tests', () => {
  test('share page should load within 2 seconds', async () => {
    const startTime = Date.now();
    
    const response = await fetch('/share/service-order/test-token');
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(2000);
    expect(response.status).toBe(200);
  });

  test('real-time updates should have minimal latency', async () => {
    // Implementar teste de latência para atualizações em tempo real
  });
});
```

## 7. Monitoramento e Métricas

### 7.1 Métricas a Acompanhar

- **Tempo de carregamento** das páginas de compartilhamento
- **Taxa de sucesso** das atualizações em tempo real
- **Frequência de acesso** aos links compartilhados
- **Performance das queries** de busca
- **Uso de cache** e hit rate

### 7.2 Alertas e Logs

```typescript
// utils/monitoring.ts
export function logShareAccess(token: string, loadTime: number) {
  console.log(`Share access: ${token}, Load time: ${loadTime}ms`);
  
  // Enviar para serviço de monitoramento
  if (loadTime > 3000) {
    console.warn(`Slow share page load: ${loadTime}ms for token ${token}`);
  }
}

export function logRealTimeEvent(serviceOrderId: string, eventType: string) {
  console.log(`Real-time event: ${eventType} for order ${serviceOrderId}`);
}
```

Esta especificação técnica fornece todos os detalhes necessários para implementar a reestruturação do sistema de service orders, garantindo performance, usabilidade e manutenibilidade.