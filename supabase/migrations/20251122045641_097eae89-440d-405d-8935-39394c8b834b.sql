-- Criar tabela de configurações da Drippy
CREATE TABLE IF NOT EXISTS drippy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Configuração do modelo
  active_provider text NOT NULL DEFAULT 'lovable',
  active_model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  
  -- Configurações de temperatura e tokens
  temperature numeric DEFAULT 0.7,
  max_tokens integer DEFAULT 2000,
  
  -- Auditoria
  updated_by uuid REFERENCES auth.users(id)
);

-- Inserir configuração padrão (apenas se não existir)
INSERT INTO drippy_settings (active_provider, active_model)
SELECT 'lovable', 'google/gemini-2.5-flash'
WHERE NOT EXISTS (SELECT 1 FROM drippy_settings LIMIT 1);

-- Habilitar RLS
ALTER TABLE drippy_settings ENABLE ROW LEVEL SECURITY;

-- Policy para leitura (apenas admins)
CREATE POLICY "Apenas admins podem ler configurações da Drippy"
  ON drippy_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Policy para atualização (apenas admins)
CREATE POLICY "Apenas admins podem atualizar configurações da Drippy"
  ON drippy_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_drippy_settings_provider ON drippy_settings(active_provider);
CREATE INDEX IF NOT EXISTS idx_drippy_settings_updated_at ON drippy_settings(updated_at DESC);