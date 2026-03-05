-- Atualização de Políticas para Dashboard Superadmin do Kowalski --

-- 1. Política para Admins verem todas as compras (purchase_registrations)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'purchase_registrations' AND policyname = 'Admins can view all purchase registrations'
    ) THEN
        CREATE POLICY "Admins can view all purchase registrations" ON purchase_registrations
          FOR SELECT 
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM user_profiles 
              WHERE id = auth.uid() AND role = 'admin'
            )
          );
    END IF;
END $$;

-- 2. Garantir que admins possam ver e gerenciar as notificações
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'kowalski_admin_notifications' AND policyname = 'Admins have full access to notification numbers'
    ) THEN
        CREATE POLICY "Admins have full access to notification numbers" ON kowalski_admin_notifications
          FOR ALL 
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM user_profiles 
              WHERE id = auth.uid() AND role = 'admin'
            )
          );
    END IF;
END $$;
