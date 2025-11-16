-- Migração para corrigir URL dinâmica na função de compartilhamento
-- Remove URL hardcoded e permite URL dinâmica baseada no ambiente

-- Atualizar função para gerar token de compartilhamento com URL dinâmica
CREATE OR REPLACE FUNCTION generate_service_order_share_token(
    p_service_order_id UUID,
    p_base_url TEXT DEFAULT NULL
)
RETURNS TABLE (
    share_token TEXT,
    share_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
AS $$
DECLARE
    v_token TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_base_url TEXT;
BEGIN
    -- Usar URL fornecida ou padrão
    v_base_url := COALESCE(p_base_url, 'https://onedrip.com.br');
    
    -- Verificar se o usuário tem acesso à OS
    IF NOT EXISTS (
        SELECT 1 FROM service_orders 
        WHERE id = p_service_order_id 
        AND owner_id = auth.uid()
        AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Ordem de serviço não encontrada ou sem permissão';
    END IF;
    
    -- Desativar tokens existentes
    UPDATE service_order_shares 
    SET is_active = false 
    WHERE service_order_id = p_service_order_id;
    
    -- Criar novo token
    INSERT INTO service_order_shares (service_order_id)
    VALUES (p_service_order_id)
    RETURNING service_order_shares.share_token, service_order_shares.expires_at INTO v_token, v_expires_at;
    
    RETURN QUERY SELECT 
        v_token,
        v_base_url || '/share/service-order/' || v_token,
        v_expires_at;
END;
$$ LANGUAGE plpgsql;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.generate_service_order_share_token(UUID, TEXT) TO authenticated;

-- Comentário para documentação
COMMENT ON FUNCTION public.generate_service_order_share_token(UUID, TEXT) IS 
'Gera token de compartilhamento para ordem de serviço com URL dinâmica baseada no ambiente';