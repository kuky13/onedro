-- Corrigir clientes órfãos (sem user_id) que podem estar causando os erros de RLS

-- 1. Verificar se existem clientes sem user_id
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count 
    FROM public.clients 
    WHERE user_id IS NULL;
    
    RAISE NOTICE 'Encontrados % clientes órfãos (sem user_id)', orphan_count;
END $$;

-- 2. Para clientes órfãos, vamos associá-los ao primeiro usuário disponível
-- ou removê-los se não houver usuários
UPDATE public.clients 
SET user_id = (
    SELECT id 
    FROM auth.users 
    WHERE deleted_at IS NULL 
    ORDER BY created_at ASC 
    LIMIT 1
)
WHERE user_id IS NULL
AND EXISTS (SELECT 1 FROM auth.users WHERE deleted_at IS NULL);

-- 3. Remover clientes órfãos se não houver usuários válidos
DELETE FROM public.clients 
WHERE user_id IS NULL;

-- 4. Garantir que todos os clientes tenham user_id não nulo
ALTER TABLE public.clients 
ALTER COLUMN user_id SET NOT NULL;

-- 5. Verificar resultado
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count 
    FROM public.clients;
    
    RAISE NOTICE 'Total de clientes após limpeza: %', remaining_count;
END $$;