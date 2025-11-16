# Configuração e Funcionamento do Supabase

## 1. Visão Geral do Supabase

O projeto utiliza Supabase como Backend-as-a-Service (BaaS), fornecendo:
- **Banco de dados PostgreSQL** com recursos avançados
- **Autenticação** integrada com múltiplos provedores
- **Row Level Security (RLS)** para controle granular de acesso
- **Edge Functions** para lógica de negócio no servidor
- **Real-time subscriptions** para atualizações em tempo real
- **Storage** para arquivos e mídia

## 2. Configuração do Cliente Supabase

### 2.1 Inicialização do Cliente
```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
```

### 2.2 Configuração do Projeto
```toml
# supabase/config.toml
project_id = "projeto-id-unico"
```

## 3. Sistema de Autenticação

### 3.1 Contexto de Autenticação
O sistema utiliza um contexto React (`AuthProvider`) que gerencia:
- **Estado do usuário** (user, session, profile)
- **Funções de autenticação** (signIn, signUp, signOut)
- **Gerenciamento de perfil** e permissões
- **Device fingerprinting** para sessões persistentes

### 3.2 Fluxo de Autenticação
```typescript
// Exemplo de uso do hook useAuth
const { user, signIn, signOut, profile, loading } = useAuth();

// Login
await signIn(email, password);

// Logout
await signOut();

// Verificar permissões
const isAdmin = profile?.role === 'admin';
```

### 3.3 Tipos de Usuário
- **Usuários regulares**: Acesso às próprias ordens de serviço e orçamentos
- **Administradores**: Acesso completo ao sistema
- **Controle de licenças**: Sistema de validação de licenças ativas

## 4. Estrutura do Banco de Dados

### 4.1 Tabelas Principais

#### Service Orders (service_orders)
```sql
CREATE TABLE service_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id),
    client_id UUID REFERENCES clients(id),
    device_type VARCHAR(100),
    device_model VARCHAR(100),
    device_serial VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(10) DEFAULT 'normal',
    parts_cost DECIMAL(10,2) DEFAULT 0,
    labor_cost DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(10,2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'pending',
    delivery_date DATE,
    warranty_months INTEGER DEFAULT 3,
    problem_description TEXT,
    solution_description TEXT,
    internal_notes TEXT,
    sequential_number INTEGER,
    search_vector tsvector,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID
);
```

#### Service Order Items (service_order_items)
```sql
CREATE TABLE service_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_order_id UUID REFERENCES service_orders(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    item_type VARCHAR(10) CHECK (item_type IN ('part', 'labor')),
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    warranty_months INTEGER DEFAULT 3,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID
);
```

#### Budgets (budgets)
```sql
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id),
    client_name VARCHAR(200),
    device_type VARCHAR(100),
    device_model VARCHAR(100),
    sequential_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);
```

#### User Sequence Control (user_sequence_control)
```sql
CREATE TABLE user_sequence_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    current_number INTEGER DEFAULT 0 CHECK (current_number >= 0 AND current_number <= 9999),
    last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);
```

### 4.2 Relacionamentos
- **service_orders** ↔ **service_order_items** (1:N)
- **service_orders** ↔ **clients** (N:1)
- **auth.users** ↔ **service_orders** (1:N)
- **auth.users** ↔ **budgets** (1:N)
- **auth.users** ↔ **user_sequence_control** (1:1)

## 5. Row Level Security (RLS)

### 5.1 Políticas de Segurança
Todas as tabelas principais implementam RLS com políticas específicas:

```sql
-- Exemplo: Política para service_orders
CREATE POLICY "service_orders_select_policy" ON service_orders
    FOR SELECT USING (
        (owner_id = auth.uid() AND deleted_at IS NULL) 
        OR public.is_current_user_admin()
    );

CREATE POLICY "service_orders_insert_policy" ON service_orders
    FOR INSERT WITH CHECK (
        owner_id = auth.uid() 
        OR public.is_current_user_admin()
    );
```

### 5.2 Funções de Segurança
```sql
-- Verificar se usuário é administrador
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 6. Funções e Triggers

### 6.1 Sistema de Numeração Sequencial
```sql
-- Gerar próximo número sequencial por usuário
CREATE OR REPLACE FUNCTION generate_user_sequential_number(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_new_number INTEGER;
BEGIN
  -- Lock para evitar concorrência
  PERFORM pg_advisory_lock(hashtext(p_user_id::text));
  
  -- Atualizar contador
  UPDATE user_sequence_control 
  SET current_number = current_number + 1
  WHERE user_id = p_user_id
  RETURNING current_number INTO v_new_number;
  
  -- Reset automático após 9999
  IF v_new_number > 9999 THEN
    v_new_number := 1;
    UPDATE user_sequence_control 
    SET current_number = 1, last_reset_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  PERFORM pg_advisory_unlock(hashtext(p_user_id::text));
  RETURN v_new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.2 Atualização Automática de Totais
```sql
-- Trigger para atualizar totais de service orders
CREATE OR REPLACE FUNCTION update_service_order_totals()
RETURNS TRIGGER AS $$
DECLARE
    new_parts_cost DECIMAL(10,2);
    new_labor_cost DECIMAL(10,2);
BEGIN
    -- Calcular novos totais
    SELECT 
        COALESCE(SUM(quantity * unit_price) FILTER (WHERE item_type = 'part'), 0),
        COALESCE(SUM(quantity * unit_price) FILTER (WHERE item_type = 'labor'), 0)
    INTO new_parts_cost, new_labor_cost
    FROM service_order_items
    WHERE service_order_id = NEW.service_order_id
    AND deleted_at IS NULL;
    
    -- Atualizar service order
    UPDATE service_orders
    SET 
        parts_cost = new_parts_cost,
        labor_cost = new_labor_cost,
        total_price = new_parts_cost + new_labor_cost,
        updated_at = NOW()
    WHERE id = NEW.service_order_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 6.3 Busca Full-Text
```sql
-- Trigger para atualizar search_vector
CREATE OR REPLACE FUNCTION update_service_order_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('portuguese', 
        COALESCE(NEW.device_type, '') || ' ' ||
        COALESCE(NEW.device_model, '') || ' ' ||
        COALESCE(NEW.device_serial, '') || ' ' ||
        COALESCE(NEW.problem_description, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 7. Edge Functions

### 7.1 Validação de Licenças
```typescript
// supabase/functions/validate-license/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { action, licenseKey } = await req.json()
  
  // Validação de rate limiting
  const rateLimitResult = await checkRateLimit(req)
  if (!rateLimitResult.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429
    })
  }
  
  // Lógica de validação
  switch (action) {
    case 'validate':
      return await validateLicense(licenseKey)
    case 'activate':
      return await activateLicense(licenseKey)
    case 'deactivate':
      return await deactivateLicense(licenseKey)
    default:
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400
      })
  }
})
```

### 7.2 Sistema de Auditoria
As Edge Functions incluem:
- **Rate limiting** para prevenir abuso
- **Audit logging** para rastreamento
- **Security checks** para validação
- **CORS handling** para requisições cross-origin

## 8. Padrões de Consulta e Manipulação

### 8.1 Hooks Personalizados
```typescript
// Exemplo: useBudgetData
export const useBudgetData = (userId: string) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchBudgets = useCallback(async () => {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('owner_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    setBudgets(data || []);
  }, [userId]);
  
  return { budgets, loading, fetchBudgets };
};
```

### 8.2 Operações CRUD
```typescript
// Criar service order
const createServiceOrder = async (orderData) => {
  const { data, error } = await supabase
    .from('service_orders')
    .insert(orderData)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

// Atualizar service order
const updateServiceOrder = async (id, updates) => {
  const { data, error } = await supabase
    .from('service_orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

// Soft delete
const deleteServiceOrder = async (id) => {
  const { error } = await supabase
    .from('service_orders')
    .update({ 
      deleted_at: new Date().toISOString(),
      deleted_by: user.id 
    })
    .eq('id', id);
    
  if (error) throw error;
};
```

### 8.3 Busca Unificada
```typescript
// RPC para busca por ID sequencial
const searchBySequentialId = async (searchTerm: string) => {
  const { data, error } = await supabase
    .rpc('search_by_sequential_id', {
      p_user_id: user.id,
      p_search_term: searchTerm
    });
    
  if (error) throw error;
  return data;
};
```

## 9. Recursos Avançados

### 9.1 Full-Text Search
- **Índices GIN** para busca eficiente
- **Configuração portuguesa** para stemming
- **Search vectors** atualizados automaticamente

### 9.2 Soft Delete
- **deleted_at** e **deleted_by** em tabelas principais
- **Políticas RLS** que excluem registros deletados
- **Índices parciais** para performance

### 9.3 Auditoria e Logs
- **Timestamps** automáticos (created_at, updated_at)
- **User tracking** para operações
- **Edge Functions** para logs centralizados

### 9.4 Performance
- **Índices estratégicos** para consultas frequentes
- **Advisory locks** para operações concorrentes
- **Triggers otimizados** para atualizações

## 10. Segurança e Boas Práticas

### 10.1 Controle de Acesso
- **RLS habilitado** em todas as tabelas
- **Políticas granulares** por operação
- **Funções SECURITY DEFINER** para operações privilegiadas

### 10.2 Validação de Dados
- **CHECK constraints** no banco
- **Validação TypeScript** no frontend
- **Sanitização** de inputs

### 10.3 Rate Limiting
- **Edge Functions** com controle de taxa
- **Advisory locks** para operações críticas
- **Timeouts** configuráveis

### 10.4 Backup e Recuperação
- **Soft delete** para recuperação de dados
- **Migrações versionadas** para evolução do schema
- **Logs de auditoria** para rastreamento

Este documento fornece uma visão abrangente de como o Supabase está configurado e funciona no projeto, incluindo estrutura de dados, segurança, performance e padrões de uso.