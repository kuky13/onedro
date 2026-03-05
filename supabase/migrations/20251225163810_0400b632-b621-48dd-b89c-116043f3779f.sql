-- Adicionar políticas de gerenciamento para admins na tabela subscription_plans
CREATE POLICY "Admins can manage subscription plans" 
ON public.subscription_plans 
FOR ALL 
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());