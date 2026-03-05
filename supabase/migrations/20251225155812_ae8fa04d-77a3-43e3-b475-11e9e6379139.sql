-- Tabela de cupons de desconto (se não existir)
CREATE TABLE IF NOT EXISTS public.discount_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL,
  max_uses integer,
  current_uses integer DEFAULT 0,
  min_purchase_amount numeric DEFAULT 0,
  valid_from timestamp with time zone DEFAULT now(),
  valid_until timestamp with time zone,
  applicable_plans text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabela de uso de cupons (se não existir)
CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES public.discount_coupons(id) ON DELETE CASCADE,
  user_id uuid,
  order_id uuid,
  discount_applied numeric NOT NULL,
  used_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

-- Políticas para discount_coupons
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.discount_coupons;
CREATE POLICY "Admins can manage coupons" ON public.discount_coupons
  FOR ALL USING (is_current_user_admin());

DROP POLICY IF EXISTS "Users can validate coupons" ON public.discount_coupons;
CREATE POLICY "Users can validate coupons" ON public.discount_coupons
  FOR SELECT USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

-- Políticas para coupon_usage
DROP POLICY IF EXISTS "Admins can view all usage" ON public.coupon_usage;
CREATE POLICY "Admins can view all usage" ON public.coupon_usage
  FOR SELECT USING (is_current_user_admin());

DROP POLICY IF EXISTS "Users can view own usage" ON public.coupon_usage;
CREATE POLICY "Users can view own usage" ON public.coupon_usage
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert usage" ON public.coupon_usage;
CREATE POLICY "System can insert usage" ON public.coupon_usage
  FOR INSERT WITH CHECK (true);