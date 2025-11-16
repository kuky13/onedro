-- Sistema de Status Houston - Migração Principal
-- Criar tabela system_status
CREATE TABLE system_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(20) NOT NULL CHECK (status IN ('maintenance', 'error')),
    message TEXT NOT NULL,
    estimated_resolution TIMESTAMP WITH TIME ZONE,
    maintenance_mode_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Criar índices
CREATE INDEX idx_system_status_updated_at ON system_status(updated_at DESC);
CREATE INDEX idx_system_status_status ON system_status(status);

-- Políticas RLS
ALTER TABLE system_status ENABLE ROW LEVEL SECURITY;

-- Permitir leitura para todos (anon e authenticated)
CREATE POLICY "Allow read access to system status" ON system_status
    FOR SELECT USING (true);

-- Permitir escrita apenas para admins
CREATE POLICY "Allow admin write access to system status" ON system_status
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_status_updated_at 
    BEFORE UPDATE ON system_status 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir acesso à função
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Função para verificar modo de manutenção
CREATE OR REPLACE FUNCTION is_maintenance_mode_active()
RETURNS BOOLEAN AS $$
DECLARE
    maintenance_active BOOLEAN;
BEGIN
    SELECT maintenance_mode_active INTO maintenance_active
    FROM system_status
    ORDER BY updated_at DESC
    LIMIT 1;
    
    RETURN COALESCE(maintenance_active, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir acesso à função
GRANT EXECUTE ON FUNCTION is_maintenance_mode_active() TO anon;
GRANT EXECUTE ON FUNCTION is_maintenance_mode_active() TO authenticated;

-- Função para ativar/desativar modo de manutenção (apenas admins)
CREATE OR REPLACE FUNCTION toggle_maintenance_mode(active BOOLEAN)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verificar se o usuário é admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar o modo de manutenção';
    END IF;
    
    -- Atualizar o modo de manutenção
    UPDATE system_status 
    SET maintenance_mode_active = active,
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE id = (
        SELECT id FROM system_status 
        ORDER BY updated_at DESC 
        LIMIT 1
    );
    
    RETURN active;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir acesso à função apenas para usuários autenticados
GRANT EXECUTE ON FUNCTION toggle_maintenance_mode(BOOLEAN) TO authenticated;

-- Dados iniciais
INSERT INTO system_status (status, message, estimated_resolution, maintenance_mode_active) 
VALUES (
    'maintenance',
    'Sistema temporariamente indisponível para manutenção. Nossa equipe está trabalhando para normalizar o serviço o mais rápido possível.',
    NOW() + INTERVAL '2 hours',
    FALSE
);

-- Garantir permissões para roles anon e authenticated
GRANT SELECT ON system_status TO anon;
GRANT ALL PRIVILEGES ON system_status TO authenticated;