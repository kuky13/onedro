-- Corrigir a função assign_sequential_number_trigger para remover referência ao campo updated_by
CREATE OR REPLACE FUNCTION public.assign_sequential_number_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Atribuir número sequencial apenas para novos registros
  IF NEW.sequential_number IS NULL THEN
    NEW.sequential_number := generate_sequential_number();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover o trigger duplicado assign_sequential_number (manter apenas um)
DROP TRIGGER IF EXISTS assign_sequential_number ON public.service_orders;

-- Criar função para gerar número sequencial se não existir
CREATE OR REPLACE FUNCTION public.generate_sequential_number()
RETURNS INTEGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Obter próximo número da sequência
  SELECT COALESCE(MAX(sequential_number), 0) + 1 
  INTO next_number 
  FROM public.service_orders 
  WHERE deleted_at IS NULL;
  
  RETURN next_number;
END;
$$ LANGUAGE plpgsql;