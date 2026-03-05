-- Migração para atualização das configurações do Kowalski --

-- 1. Adicionar colunas extras na tabela de instâncias
ALTER TABLE kowalski_instances 
ADD COLUMN IF NOT EXISTS system_prompt TEXT,
ADD COLUMN IF NOT EXISTS search_enabled BOOLEAN DEFAULT false;

-- 2. Tabela de Tratamentos Especiais (Limite de 10 por instância será controlado na aplicação)
CREATE TABLE IF NOT EXISTS kowalski_user_treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES kowalski_instances(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL, -- Número do WhatsApp (ex: 5511999999999)
  nickname TEXT NOT NULL,      -- Como o Kowalski deve chamar essa pessoa
  treatment_prompt TEXT,       -- Instrução específica de como tratar essa pessoa
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(instance_id, phone_number)
);

-- Ativar RLS
ALTER TABLE kowalski_user_treatments ENABLE ROW LEVEL SECURITY;

-- Política de acesso
CREATE POLICY "Users can manage their own user treatments" ON kowalski_user_treatments 
FOR ALL USING (EXISTS (SELECT 1 FROM kowalski_instances WHERE id = instance_id AND owner_id = auth.uid()));
