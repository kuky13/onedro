-- Adicionar campo updated_by à tabela user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Criar ou substituir função para atualizar updated_at e updated_by na tabela user_profiles
CREATE OR REPLACE FUNCTION public.update_user_profiles_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at e updated_by (recriar se existir)
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON public.user_profiles 
    FOR EACH ROW EXECUTE FUNCTION public.update_user_profiles_updated_at_column();

-- Comentário explicativo
COMMENT ON COLUMN public.user_profiles.updated_by IS 'ID do usuário que fez a última atualização do perfil';