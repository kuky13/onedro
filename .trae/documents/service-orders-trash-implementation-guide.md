# Guia de Implementação - Sistema de Lixeira para Ordens de Serviço

## Análise do Sistema Atual

### Estado Atual Identificado:

✅ **Já Implementado:**

* Função `soft_delete_service_order()` - exclusão suave

* Função `get_deleted_service_orders()` - buscar ordens excluídas

* Função `hard_delete_service_order()` - exclusão permanente

* Função `restore_service_order()` - restaurar ordem

* Função `empty_service_orders_trash()` - esvaziar lixeira

* Componente `ServiceOrderTrash.tsx` - interface da lixeira

* Campos `deleted_at` e `deleted_by` na tabela `service_orders`

🔄 **Precisa ser Implementado:**

* Rota `/service-orders/trash` no React Router

* Sistema de limpeza automática após 30 dias

* Integração da lixeira na página principal

* Logs de auditoria para limpeza automática

## Passos de Implementação

### Passo 1: Adicionar Rota da Lixeira

**Arquivo:** **`src/App.tsx`**

Adicionar a nova rota após a rota `/service-orders/settings`:

```typescript
// Adicionar após a linha ~220
<Route 
  path="/service-orders/trash" 
  element={
    <UnifiedProtectionGuard>
      <ServiceOrderTrash />
    </UnifiedProtectionGuard>
  } 
/>
```

**Importação necessária no topo do arquivo:**

```typescript
import { ServiceOrderTrash } from "./components/ServiceOrderTrash";
```

### Passo 2: Adicionar Link para Lixeira na Página Principal

**Arquivo:** **`src/pages/ServiceOrdersPageSimple.tsx`**

Adicionar botão de acesso à lixeira no cabeçalho da página:

```typescript
// Adicionar no cabeçalho, próximo aos outros botões
<Button
  variant="outline"
  onClick={() => navigate('/service-orders/trash')}
  className="gap-2"
>
  <Trash2 className="h-4 w-4" />
  Lixeira
</Button>
```

### Passo 3: Criar Migração para Limpeza Automática

**Arquivo:** **`supabase/migrations/[timestamp]_add_cleanup_automation.sql`**

```sql
-- Criar tabela de logs de limpeza
CREATE TABLE IF NOT EXISTS cleanup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deleted_count INTEGER NOT NULL DEFAULT 0,
    cleanup_date TIMESTAMPTZ DEFAULT NOW(),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_cleanup_date 
ON cleanup_logs(cleanup_date DESC);

CREATE INDEX IF NOT EXISTS idx_service_orders_deleted_at_old
ON service_orders(deleted_at) 
WHERE deleted_at IS NOT NULL AND deleted_at < (NOW() - INTERVAL '30 days');

-- Função de limpeza automática
CREATE OR REPLACE FUNCTION cleanup_old_deleted_service_orders()
RETURNS TABLE(deleted_count INTEGER, cleanup_date TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
    v_cleanup_date TIMESTAMPTZ;
    v_order_ids UUID[];
    v_threshold_date TIMESTAMPTZ;
BEGIN
    v_cleanup_date := NOW();
    v_threshold_date := NOW() - INTERVAL '30 days';
    
    -- Buscar IDs das ordens para excluir (> 30 dias na lixeira)
    SELECT array_agg(id) INTO v_order_ids
    FROM service_orders 
    WHERE deleted_at IS NOT NULL 
    AND deleted_at < v_threshold_date;
    
    -- Se não há ordens para excluir
    IF v_order_ids IS NULL OR array_length(v_order_ids, 1) = 0 THEN
        v_deleted_count := 0;
    ELSE
        -- Excluir eventos relacionados primeiro
        DELETE FROM service_order_events 
        WHERE service_order_id = ANY(v_order_ids);
        
        -- Excluir itens relacionados
        DELETE FROM service_order_items 
        WHERE service_order_id = ANY(v_order_ids);
        
        -- Excluir anexos relacionados
        DELETE FROM service_order_attachments 
        WHERE service_order_id = ANY(v_order_ids);
        
        -- Excluir as ordens permanentemente
        DELETE FROM service_orders 
        WHERE id = ANY(v_order_ids);
        
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    END IF;
    
    -- Registrar log de limpeza
    INSERT INTO cleanup_logs (deleted_count, cleanup_date, details)
    VALUES (
        v_deleted_count, 
        v_cleanup_date,
        jsonb_build_object(
            'order_ids', COALESCE(v_order_ids, ARRAY[]::UUID[]),
            'threshold_date', v_threshold_date,
            'total_orders_checked', (
                SELECT COUNT(*) FROM service_orders 
                WHERE deleted_at IS NOT NULL
            )
        )
    );
    
    RETURN QUERY SELECT v_deleted_count, v_cleanup_date;
END;
$$;

-- Permissões
GRANT SELECT ON cleanup_logs TO authenticated;
GRANT ALL PRIVILEGES ON cleanup_logs TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_deleted_service_orders() TO service_role;

-- Comentários
COMMENT ON TABLE cleanup_logs IS 'Logs de auditoria para limpeza automática da lixeira de ordens de serviço';
COMMENT ON FUNCTION cleanup_old_deleted_service_orders IS 'Função para limpeza automática de ordens excluídas há mais de 30 dias';
```

### Passo 4: Criar Edge Function para Automação

**Arquivo:** **`supabase/functions/cleanup-service-orders/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    console.log('Iniciando limpeza automática de ordens de serviço...')
    
    const { data, error } = await supabase
      .rpc('cleanup_old_deleted_service_orders')
    
    if (error) {
      console.error('Erro na limpeza:', error)
      throw error
    }
    
    const result = data?.[0] || { deleted_count: 0, cleanup_date: new Date().toISOString() }
    
    console.log(`Limpeza concluída: ${result.deleted_count} ordens removidas`)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Limpeza automática executada com sucesso`,
        deleted_count: result.deleted_count,
        cleanup_date: result.cleanup_date
      }),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    )
  } catch (error) {
    console.error('Erro na função de limpeza:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    )
  }
})
```

### Passo 5: Configurar Cron Job no Supabase

**Arquivo:** **`supabase/functions/cleanup-service-orders/cron.ts`**

```typescript
// Configuração para execução diária às 2:00 AM
export const cronConfig = {
  schedule: '0 2 * * *', // Diariamente às 2:00 AM
  timezone: 'America/Sao_Paulo'
}
```

### Passo 6: Melhorar o Componente ServiceOrderTrash

**Arquivo:** **`src/components/ServiceOrderTrash.tsx`**

Adicionar indicador de tempo restante antes da exclusão automática:

```typescript
// Adicionar função para calcular dias restantes
const getDaysUntilAutoDelete = (deletedAt: string) => {
  const deletedDate = new Date(deletedAt);
  const thirtyDaysLater = new Date(deletedDate.getTime() + (30 * 24 * 60 * 60 * 1000));
  const now = new Date();
  const daysLeft = Math.ceil((thirtyDaysLater.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(0, daysLeft);
};

// Adicionar no JSX do card, após a data de exclusão:
<div className="flex items-center gap-1 text-xs">
  <Clock className="h-3 w-3" />
  {getDaysUntilAutoDelete(order.deleted_at) > 0 ? (
    <span className="text-yellow-600">
      Exclusão automática em {getDaysUntilAutoDelete(order.deleted_at)} dias
    </span>
  ) : (
    <span className="text-red-600">
      Será excluída automaticamente em breve
    </span>
  )}
</div>
```

### Passo 7: Adicionar Hook para Estatísticas da Lixeira

**Arquivo:** **`src/hooks/useTrashStats.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useTrashStats = () => {
  return useQuery({
    queryKey: ['trashStats'],
    queryFn: async () => {
      const { data: deletedOrders, error } = await supabase
        .rpc('get_deleted_service_orders');
      
      if (error) throw error;
      
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      const stats = {
        total: deletedOrders?.length || 0,
        expiringSoon: deletedOrders?.filter((order: any) => 
          new Date(order.deleted_at) < thirtyDaysAgo
        ).length || 0,
        recentlyDeleted: deletedOrders?.filter((order: any) => 
          new Date(order.deleted_at) > new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))
        ).length || 0
      };
      
      return stats;
    },
    refetchInterval: 5 * 60 * 1000, // Atualizar a cada 5 minutos
  });
};
```

## Comandos de Deploy

### 1. Aplicar Migração

```bash
npx supabase db push
```

### 2. Deploy da Edge Function

```bash
npx supabase functions deploy cleanup-service-orders
```

### 3. Configurar Cron Job (via Dashboard do Supabase)

```sql
-- No SQL Editor do Supabase Dashboard
SELECT cron.schedule(
  'cleanup-service-orders-daily',
  '0 2 * * *',
  'SELECT net.http_post(
    url := ''https://[seu-projeto].supabase.co/functions/v1/cleanup-service-orders'',
    headers := ''{"Authorization": "Bearer [service-role-key]"}''::jsonb
  );'
);
```

## Testes de Validação

### 1. Teste Manual da Rota

* Acessar `/service-orders/trash`

* Verificar se a página carrega corretamente

* Testar restauração de uma ordem

* Testar exclusão permanente

### 2. Teste da Limpeza Automática

```sql
-- Simular ordem antiga para teste
UPDATE service_orders 
SET deleted_at = NOW() - INTERVAL '31 days'
WHERE id = '[id-de-teste]';

-- Executar limpeza manualmente
SELECT * FROM cleanup_old_deleted_service_orders();

-- Verificar se foi removida
SELECT * FROM service_orders WHERE id = '[id-de-teste]';
```

### 3. Teste de Performance

* Verificar tempo de carregamento da lixeira com muitas ordens

* Monitorar performance da função de limpeza

* Validar índices do banco de dados

## Monitoramento e Manutenção

### Logs de Auditoria

```sql
-- Consultar logs de limpeza
SELECT * FROM cleanup_logs 
ORDER BY cleanup_date DESC 
LIMIT 10;

-- Estatísticas de limpeza
SELECT 
  DATE(cleanup_date) as date,
  SUM(deleted_count) as total_cleaned,
  COUNT(*) as cleanup_runs
FROM cleanup_logs 
WHERE cleanup_date > NOW() - INTERVAL '30 days'
GROUP BY DATE(cleanup_date)
ORDER BY date DESC;
```

### Alertas Recomendados

* Falha na execução da limpeza automática

* Número excessivo de ordens na lixeira (> 1000)

* Tempo de execução da limpeza > 5 minutos

