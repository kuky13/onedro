-- Migração para Notificações Administrativas do Kowalski --

-- 1. Tabela de Números de WhatsApp para Notificações Administrativas
CREATE TABLE IF NOT EXISTS kowalski_admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE, -- Formato: 5511999999999
  admin_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Ativar RLS
ALTER TABLE kowalski_admin_notifications ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acesso (Apenas superadmins podem gerenciar)
CREATE POLICY "Admins can manage notification numbers" ON kowalski_admin_notifications
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
    OR
    (auth.jwt() ->> 'role' = 'service_role')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
    OR
    (auth.jwt() ->> 'role' = 'service_role')
  );

-- Trigger para updated_at
CREATE TRIGGER update_kowalski_admin_notifications_updated_at
  BEFORE UPDATE ON kowalski_admin_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_registrations_updated_at();
