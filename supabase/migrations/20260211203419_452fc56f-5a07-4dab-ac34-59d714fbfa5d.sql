
-- Configuração personalizada da IA por usuário
CREATE TABLE public.ia_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  ai_name TEXT DEFAULT 'Drippy',
  personality TEXT DEFAULT 'friendly',
  welcome_message TEXT,
  away_message TEXT,
  web_search_enabled BOOLEAN DEFAULT false,
  active_topics JSONB DEFAULT '{"budgets":true,"service_orders":true,"clients":true,"store":true,"company_info":true}'::jsonb,
  custom_knowledge TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(owner_id)
);

-- Enable RLS
ALTER TABLE public.ia_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ia_configs"
  ON public.ia_configs
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Trigger para updated_at
CREATE TRIGGER update_ia_configs_updated_at
  BEFORE UPDATE ON public.ia_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Logs de pesquisa web (controle de custos)
CREATE TABLE public.ia_web_search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  query TEXT NOT NULL,
  provider TEXT DEFAULT 'perplexity',
  tokens_used INT DEFAULT 0,
  cost NUMERIC(10,6) DEFAULT 0,
  results_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ia_web_search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own search logs"
  ON public.ia_web_search_logs
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Edge functions podem inserir (service role)
CREATE POLICY "Service role inserts search logs"
  ON public.ia_web_search_logs
  FOR INSERT
  WITH CHECK (true);
