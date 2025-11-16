-- Corrigir constraint de foreign key em service_orders.client_id para permitir exclusão de clientes
-- Problema: A constraint atual não especifica ON DELETE, usando o padrão RESTRICT que impede exclusão de clientes
-- Solução: Alterar para ON DELETE SET NULL para preservar ordens de serviço quando cliente é excluído

-- 1. Primeiro, verificar se existe uma constraint nomeada para client_id
-- Se não existir nome específico, o PostgreSQL cria um nome automático

-- 2. Remover a constraint existente de foreign key
-- Usar IF EXISTS para evitar erro caso a constraint já tenha sido modificada
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Buscar o nome da constraint de foreign key para client_id
    SELECT conname INTO constraint_name
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND t.relname = 'service_orders'
    AND c.contype = 'f'
    AND c.confkey[1] = (
        SELECT attnum FROM pg_attribute 
        WHERE attrelid = t.oid AND attname = 'client_id'
    );
    
    -- Se encontrou a constraint, removê-la
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.service_orders DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Constraint % removida com sucesso', constraint_name;
    ELSE
        RAISE NOTICE 'Nenhuma constraint de foreign key encontrada para client_id';
    END IF;
END $$;

-- 3. Adicionar nova constraint com ON DELETE SET NULL
ALTER TABLE public.service_orders 
ADD CONSTRAINT fk_service_orders_client_id 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE SET NULL;

-- 4. Adicionar comentário explicativo
COMMENT ON CONSTRAINT fk_service_orders_client_id ON public.service_orders IS 
'Foreign key para clients com ON DELETE SET NULL - permite exclusão de clientes preservando ordens de serviço';

-- 5. Verificar se a alteração foi aplicada corretamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND t.relname = 'service_orders'
        AND c.conname = 'fk_service_orders_client_id'
        AND c.confdeltype = 's' -- 's' significa SET NULL
    ) THEN
        RAISE NOTICE 'Constraint fk_service_orders_client_id criada com sucesso com ON DELETE SET NULL';
    ELSE
        RAISE EXCEPTION 'Falha ao criar a constraint com ON DELETE SET NULL';
    END IF;
END $$;