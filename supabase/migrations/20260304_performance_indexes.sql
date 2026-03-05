-- Migration para criar índices de performance

-- Índices para Budgets (Orçamentos)
CREATE INDEX IF NOT EXISTS idx_budgets_owner_deleted_created 
ON budgets (owner_id, deleted_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_budgets_status 
ON budgets (status);

-- Índices para Service Orders (Ordens de Serviço)
CREATE INDEX IF NOT EXISTS idx_service_orders_owner_deleted_created 
ON service_orders (owner_id, deleted_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_orders_status 
ON service_orders (status);

CREATE INDEX IF NOT EXISTS idx_service_orders_search 
ON service_orders USING GIN (to_tsvector('portuguese', device_model || ' ' || device_type || ' ' || coalesce(reported_issue, '')));

-- Índices para Clients (Clientes)
CREATE INDEX IF NOT EXISTS idx_clients_owner_name 
ON clients (owner_id, name);

-- Índices para Logs de Segurança (muito acessados por admins)
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at 
ON security_logs (created_at DESC);
