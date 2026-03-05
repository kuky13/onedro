-- Enable RLS and add minimal-safe policies for internal/admin tables

-- 1) cleanup_logs: only admins can read; system/service_role can insert
ALTER TABLE public.cleanup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cleanup logs"
  ON public.cleanup_logs
  FOR SELECT
  USING (is_current_user_admin());

CREATE POLICY "System can insert cleanup logs"
  ON public.cleanup_logs
  FOR INSERT
  WITH CHECK (true);


-- 2) license_activation_log: users see own rows, admins see all, system inserts
ALTER TABLE public.license_activation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own license activation logs"
  ON public.license_activation_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all license activation logs"
  ON public.license_activation_log
  FOR SELECT
  USING (is_current_user_admin());

CREATE POLICY "System can insert license activation logs"
  ON public.license_activation_log
  FOR INSERT
  WITH CHECK (true);


-- 3) license_cleanup_logs: only admins read; system inserts
ALTER TABLE public.license_cleanup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view license cleanup logs"
  ON public.license_cleanup_logs
  FOR SELECT
  USING (is_current_user_admin());

CREATE POLICY "System can insert license cleanup logs"
  ON public.license_cleanup_logs
  FOR INSERT
  WITH CHECK (true);


-- 4) peliculas_compatíveis: open read, only admins can change
ALTER TABLE public."peliculas_compatíveis" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read peliculas compatibility"
  ON public."peliculas_compatíveis"
  FOR SELECT
  USING (true);

CREATE POLICY "Admins manage peliculas compatibility"
  ON public."peliculas_compatíveis"
  FOR ALL
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());


-- 5) chronic_problems: if only admins use today, keep simple admin-only access
ALTER TABLE public.chronic_problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage chronic problems"
  ON public.chronic_problems
  FOR ALL
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());