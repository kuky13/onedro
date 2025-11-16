-- ============================================
-- SISTEMA DE ATUALIZAÇÕES ADMINISTRATIVAS
-- OneDrip - Criação de tabelas e políticas RLS
-- ============================================

-- Criar tabela de atualizações
CREATE TABLE updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    link_text VARCHAR(100) DEFAULT 'Para mais detalhes',
    link_url VARCHAR(500) DEFAULT 'https://onedrip.com.br',
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Criar índices para otimização
CREATE INDEX idx_updates_is_active ON updates(is_active);
CREATE INDEX idx_updates_created_at ON updates(created_at DESC);
CREATE INDEX idx_updates_created_by ON updates(created_by);

-- Criar tabela de preferências do usuário
CREATE TABLE user_update_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    update_id UUID NOT NULL REFERENCES updates(id) ON DELETE CASCADE,
    dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, update_id)
);

-- Criar índices para otimização
CREATE INDEX idx_user_update_preferences_user_id ON user_update_preferences(user_id);
CREATE INDEX idx_user_update_preferences_update_id ON user_update_preferences(update_id);
CREATE INDEX idx_user_update_preferences_dismissed ON user_update_preferences(dismissed);

-- Habilitar RLS nas tabelas
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_update_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tabela updates
-- Admins podem fazer tudo
CREATE POLICY "Admins can manage updates" ON updates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- Usuários autenticados podem ler atualizações ativas
CREATE POLICY "Users can read active updates" ON updates
    FOR SELECT USING (is_active = true AND auth.role() = 'authenticated');

-- Políticas RLS para tabela user_update_preferences
-- Usuários podem gerenciar suas próprias preferências
CREATE POLICY "Users can manage own preferences" ON user_update_preferences
    FOR ALL USING (user_id = auth.uid());

-- Admins podem ver todas as preferências
CREATE POLICY "Admins can view all preferences" ON user_update_preferences
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- Função para marcar atualização como fechada
CREATE OR REPLACE FUNCTION dismiss_update(update_uuid UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_update_preferences (user_id, update_id, dismissed, dismissed_at)
    VALUES (auth.uid(), update_uuid, true, NOW())
    ON CONFLICT (user_id, update_id) 
    DO UPDATE SET 
        dismissed = true,
        dismissed_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION dismiss_update(UUID) TO authenticated;

-- Função para verificar se usuário já fechou uma atualização
CREATE OR REPLACE FUNCTION user_dismissed_update(update_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_update_preferences 
        WHERE user_id = auth.uid() 
        AND update_id = update_uuid 
        AND dismissed = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION user_dismissed_update(UUID) TO authenticated;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_updates_updated_at 
    BEFORE UPDATE ON updates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados iniciais
INSERT INTO updates (title, content, link_text, link_url, is_active, created_by)
VALUES (
    'Atualização 2.7',
    E'- Adicionado sistema de geração de PDF para ordens de serviço\n- Melhorias na gestão de termos de garantia\n- Outras otimizações',
    'Para mais detalhes',
    'https://onedrip.com.br',
    false,
    (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1)
);

-- Comentários para documentação
COMMENT ON TABLE updates IS 'Tabela para gerenciar atualizações do sistema que serão exibidas em popups';
COMMENT ON TABLE user_update_preferences IS 'Tabela para rastrear preferências dos usuários sobre atualizações (fechadas permanentemente)';
COMMENT ON FUNCTION dismiss_update(UUID) IS 'Função para marcar uma atualização como fechada pelo usuário';
COMMENT ON FUNCTION user_dismissed_update(UUID) IS 'Função para verificar se o usuário já fechou uma atualização específica';