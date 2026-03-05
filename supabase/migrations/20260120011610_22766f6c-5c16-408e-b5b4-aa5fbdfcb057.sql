-- Atualizar modelo padrão para deepseek-chat
ALTER TABLE public.whatsapp_agents 
ALTER COLUMN model SET DEFAULT 'deepseek-chat';

-- Atualizar agentes existentes que ainda usam outro modelo
UPDATE public.whatsapp_agents 
SET model = 'deepseek-chat' 
WHERE model != 'deepseek-chat';