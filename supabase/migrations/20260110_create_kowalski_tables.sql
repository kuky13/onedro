-- Migração para a IA Kowalski --

-- 1. Tabela Principal: Instâncias do Kowalski
CREATE TABLE IF NOT EXISTS kowalski_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  evolution_instance_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Configurações de comportamento
  mode TEXT DEFAULT 'hybrid', -- 'budget_only', 'chat_only', 'hybrid'
  personality_override JSONB, -- sobrescrever personalidade da Drippy
  response_delay_ms INTEGER DEFAULT 1000, -- delay para simular digitação
  
  -- Rate limiting
  max_messages_per_minute INTEGER DEFAULT 10,
  max_messages_per_hour INTEGER DEFAULT 100,
  
  UNIQUE(owner_id, instance_name)
);

-- 2. Tabela de Grupos Permitidos
CREATE TABLE IF NOT EXISTS kowalski_allowed_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES kowalski_instances(id) ON DELETE CASCADE,
  group_jid TEXT NOT NULL, -- ID do grupo no WhatsApp
  group_name TEXT,
  is_active BOOLEAN DEFAULT true,
  mode TEXT DEFAULT 'inherit', -- 'inherit', 'budget_only', 'chat_only', 'hybrid'
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(instance_id, group_jid)
);

-- 3. Tabela de Histórico de Mensagens
CREATE TABLE IF NOT EXISTS kowalski_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES kowalski_instances(id) ON DELETE CASCADE,
  group_jid TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  sender_name TEXT,
  
  -- Conteúdo
  message_type TEXT NOT NULL, -- 'text', 'audio', 'image', 'document'
  incoming_content TEXT,
  ai_response TEXT,
  
  -- Contexto e processamento
  detected_intent TEXT, -- 'budget_request', 'question', 'greeting', 'other'
  ai_context JSONB, -- contexto usado pela IA
  budget_created_id UUID, -- se criou orçamento
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'failed', 'ignored'
  error_message TEXT,
  processing_time_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela de Rate Limiting
CREATE TABLE IF NOT EXISTS kowalski_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES kowalski_instances(id) ON DELETE CASCADE,
  sender_phone TEXT NOT NULL,
  message_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(instance_id, sender_phone)
);

-- Ativar RLS (Segurança)
ALTER TABLE kowalski_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE kowalski_allowed_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE kowalski_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE kowalski_rate_limits ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso simples (apenas o dono vê seus dados)
CREATE POLICY "Users can view their own Kowalski instances" ON kowalski_instances FOR ALL USING (auth.uid() = owner_id);
-- Para as outras tabelas, precisaremos de políticas baseadas no owner_id da instância
CREATE POLICY "Users can view their own Kowalski groups" ON kowalski_allowed_groups FOR ALL USING (EXISTS (SELECT 1 FROM kowalski_instances WHERE id = instance_id AND owner_id = auth.uid()));
CREATE POLICY "Users can view their own Kowalski messages" ON kowalski_messages FOR ALL USING (EXISTS (SELECT 1 FROM kowalski_instances WHERE id = instance_id AND owner_id = auth.uid()));
CREATE POLICY "Users can view their own Kowalski rate limits" ON kowalski_rate_limits FOR ALL USING (EXISTS (SELECT 1 FROM kowalski_instances WHERE id = instance_id AND owner_id = auth.uid()));
