-- Inserir uma atualização de teste para verificar o popup
INSERT INTO public.updates (
  title,
  content,
  link_text,
  link_url,
  is_active
) VALUES (
  'Nova Funcionalidade Disponível!',
  'Agora você pode visualizar senhas de dispositivos nas ordens de serviço compartilhadas. Esta funcionalidade melhora a experiência de técnicos e clientes.',
  'Ver Detalhes',
  'https://onedrip.com.br/updates',
  true
) ON CONFLICT DO NOTHING;