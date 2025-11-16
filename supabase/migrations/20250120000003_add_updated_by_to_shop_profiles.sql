-- Adicionar campo updated_by à tabela shop_profiles
ALTER TABLE public.shop_profiles 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Criar ou substituir função para atualizar updated_at e updated_by na tabela shop_profiles
CREATE OR REPLACE FUNCTION public.update_shop_profiles_updated_at_and_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo e criar novo trigger para atualizar updated_at e updated_by
DROP TRIGGER IF EXISTS update_shop_profiles_updated_at ON public.shop_profiles;

CREATE TRIGGER update_shop_profiles_updated_at_and_updated_by
  BEFORE UPDATE ON public.shop_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shop_profiles_updated_at_and_updated_by();

-- Adicionar comentário ao campo
COMMENT ON COLUMN public.shop_profiles.updated_by IS 'ID do usuário que fez a última atualização do perfil da loja';

-- Atualizar registros existentes com o user_id como updated_by
UPDATE public.shop_profiles 
SET updated_by = user_id 
WHERE updated_by IS NULL;