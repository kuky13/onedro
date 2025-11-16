# Sistema de Licenças de 13 Dígitos - Análise e Melhorias

## 1. Análise do Sistema Atual

### 1.1 Estrutura da Tabela de Licenças

```sql
CREATE TABLE public.licenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  activated_at TIMESTAMP WITH TIME ZONE,
  last_validation TIMESTAMP WITH TIME ZONE
);
```

### 1.2 Funcionamento Atual

#### Geração de Códigos
- **Função**: `generate_license_code()`
- **Formato**: 13 caracteres alfanuméricos (A-Z, 0-9)
- **Algoritmo**: Geração aleatória com verificação de unicidade
- **Problema**: Não há relação entre o código e a duração da licença

#### Ativação de Licenças
- **Função**: `activate_license(license_code, user_id)`
- **Problema Crítico**: Atribui automaticamente 30 dias independente da licença
```sql
-- Linha problemática na função atual
expires_at = COALESCE(expires_at, NOW() + INTERVAL '30 days')
```

#### Criação de Licenças
- **Função**: `admin_create_license(p_expires_at)`
- **Limitação**: Apenas administradores podem criar licenças
- **Problema**: Não há sistema automático de licenças de teste

### 1.3 Problemas Identificados

1. **Atribuição Fixa de 30 Dias**: Sistema ignora a duração específica da licença
2. **Ausência de Licenças de Teste**: Novos usuários não recebem período de avaliação
3. **Falta de Codificação de Duração**: Códigos não contêm informação sobre validade
4. **Ausência de Limpeza Automática**: Licenças expiradas não são removidas automaticamente

## 2. Melhorias Propostas

### 2.1 Sistema de Codificação de Duração

#### Novo Formato de Código (13 dígitos)
```
DDDDDDXXXXXXX
│     │
│     └─ 7 dígitos aleatórios (identificação única)
└─ 6 dígitos codificados (duração em dias)
```

#### Algoritmo de Codificação
```sql
-- Codificar dias em 6 dígitos
-- Exemplo: 30 dias = 000030, 365 dias = 000365, 7 dias = 000007
```

### 2.2 Sistema de Licenças de Teste

#### Características
- **Duração**: 7 dias automáticos
- **Ativação**: Automática no registro
- **Código**: Formato especial `TRIAL-XXXXXXX`
- **Limpeza**: Automática após expiração

### 2.3 Correção do Sistema de Ativação

#### Nova Lógica
1. Decodificar duração do código da licença
2. Aplicar exatamente os dias especificados
3. Eliminar atribuição fixa de 30 dias

## 3. Implementação Técnica

### 3.1 Nova Função de Geração de Códigos

```sql
CREATE OR REPLACE FUNCTION public.generate_license_code_with_days(p_days INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  days_encoded TEXT;
  random_part TEXT;
  full_code TEXT;
  characters TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i INTEGER;
BEGIN
  -- Codificar dias em 6 dígitos
  days_encoded := LPAD(p_days::TEXT, 6, '0');
  
  -- Gerar 7 caracteres aleatórios
  random_part := '';
  FOR i IN 1..7 LOOP
    random_part := random_part || substr(characters, floor(random() * length(characters) + 1)::integer, 1);
  END LOOP;
  
  -- Formar código completo
  full_code := days_encoded || random_part;
  
  -- Verificar unicidade
  WHILE EXISTS (SELECT 1 FROM public.licenses WHERE code = full_code) LOOP
    random_part := '';
    FOR i IN 1..7 LOOP
      random_part := random_part || substr(characters, floor(random() * length(characters) + 1)::integer, 1);
    END LOOP;
    full_code := days_encoded || random_part;
  END LOOP;
  
  RETURN full_code;
END;
$$;
```

### 3.2 Função de Decodificação

```sql
CREATE OR REPLACE FUNCTION public.decode_license_days(p_license_code TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Extrair primeiros 6 dígitos e converter para inteiro
  RETURN SUBSTRING(p_license_code, 1, 6)::INTEGER;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL; -- Código inválido
END;
$$;
```

### 3.3 Nova Função de Ativação Corrigida

```sql
CREATE OR REPLACE FUNCTION public.activate_license_fixed(p_license_code TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  license_record RECORD;
  license_days INTEGER;
  calculated_expiration TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Buscar a licença pelo código
  SELECT * INTO license_record
  FROM public.licenses
  WHERE code = p_license_code;
  
  -- Verificar se a licença existe
  IF license_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código de licença inválido');
  END IF;
  
  -- Verificar se a licença já está ativa
  IF license_record.is_active = TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta licença já está sendo utilizada');
  END IF;
  
  -- Decodificar dias da licença
  license_days := public.decode_license_days(p_license_code);
  
  -- Se não conseguir decodificar, usar expires_at existente ou erro
  IF license_days IS NULL THEN
    IF license_record.expires_at IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Licença com formato inválido');
    END IF;
    calculated_expiration := license_record.expires_at;
  ELSE
    -- Calcular expiração baseada nos dias decodificados
    calculated_expiration := NOW() + (license_days || ' days')::INTERVAL;
  END IF;
  
  -- Verificar se a licença está expirada
  IF calculated_expiration < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta licença está expirada');
  END IF;
  
  -- Desativar outras licenças do usuário
  UPDATE public.licenses
  SET is_active = FALSE
  WHERE user_id = p_user_id AND is_active = TRUE;
  
  -- Ativar a licença com duração correta
  UPDATE public.licenses
  SET 
    user_id = p_user_id,
    is_active = TRUE,
    expires_at = calculated_expiration,
    activated_at = NOW(),
    last_validation = NOW()
  WHERE code = p_license_code;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Licença ativada com sucesso! Válida por ' || license_days || ' dias.',
    'expires_at', calculated_expiration,
    'days_granted', license_days
  );
END;
$$;
```

### 3.4 Sistema de Licenças de Teste

#### Função para Criar Licença de Teste

```sql
CREATE OR REPLACE FUNCTION public.create_trial_license(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trial_code TEXT;
  license_id UUID;
  expiration_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Verificar se usuário já tem licença de teste
  IF EXISTS (
    SELECT 1 FROM public.licenses 
    WHERE user_id = p_user_id 
    AND code LIKE 'TRIAL%'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário já possui licença de teste');
  END IF;
  
  -- Gerar código de teste único
  trial_code := 'TRIAL' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 9, '0');
  
  -- Verificar unicidade
  WHILE EXISTS (SELECT 1 FROM public.licenses WHERE code = trial_code) LOOP
    trial_code := 'TRIAL' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 9, '0');
  END LOOP;
  
  -- Calcular expiração (7 dias)
  expiration_date := NOW() + INTERVAL '7 days';
  
  -- Criar e ativar licença de teste
  INSERT INTO public.licenses (
    code, 
    user_id, 
    expires_at, 
    is_active,
    activated_at,
    last_validation
  )
  VALUES (
    trial_code, 
    p_user_id, 
    expiration_date, 
    TRUE,
    NOW(),
    NOW()
  )
  RETURNING id INTO license_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'license_id', license_id,
    'code', trial_code,
    'expires_at', expiration_date,
    'message', 'Licença de teste de 7 dias criada e ativada automaticamente'
  );
END;
$$;
```

#### Trigger para Criação Automática

```sql
CREATE OR REPLACE FUNCTION public.auto_create_trial_license()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Criar licença de teste para novo usuário
  PERFORM public.create_trial_license(NEW.id);
  RETURN NEW;
END;
$$;

-- Criar trigger para novos perfis de usuário
CREATE TRIGGER trigger_auto_trial_license
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_trial_license();
```

### 3.5 Sistema de Limpeza Automática

#### Função de Limpeza

```sql
CREATE OR REPLACE FUNCTION public.cleanup_expired_trial_licenses()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Remover licenças de teste expiradas
  DELETE FROM public.licenses
  WHERE code LIKE 'TRIAL%'
  AND expires_at < NOW()
  AND is_active = FALSE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Desativar licenças de teste expiradas que ainda estão ativas
  UPDATE public.licenses
  SET is_active = FALSE
  WHERE code LIKE 'TRIAL%'
  AND expires_at < NOW()
  AND is_active = TRUE;
  
  RETURN deleted_count;
END;
$$;
```

#### Agendamento Automático (via pg_cron se disponível)

```sql
-- Executar limpeza diariamente às 02:00
SELECT cron.schedule('cleanup-expired-trials', '0 2 * * *', 'SELECT public.cleanup_expired_trial_licenses();');
```

### 3.6 Nova Função de Criação de Licenças com Dias

```sql
CREATE OR REPLACE FUNCTION public.admin_create_license_with_days(
  p_days INTEGER,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_codes TEXT[] := '{}';
  new_code TEXT;
  license_id UUID;
  i INTEGER;
BEGIN
  -- Verificar se é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem criar licenças';
  END IF;
  
  -- Validar parâmetros
  IF p_days <= 0 OR p_days > 3650 THEN
    RAISE EXCEPTION 'Dias deve estar entre 1 e 3650';
  END IF;
  
  IF p_quantity <= 0 OR p_quantity > 100 THEN
    RAISE EXCEPTION 'Quantidade deve estar entre 1 e 100';
  END IF;
  
  -- Criar licenças
  FOR i IN 1..p_quantity LOOP
    -- Gerar código com dias codificados
    new_code := public.generate_license_code_with_days(p_days);
    
    -- Inserir licença inativa (será ativada quando usuário usar)
    INSERT INTO public.licenses (code, is_active)
    VALUES (new_code, FALSE)
    RETURNING id INTO license_id;
    
    new_codes := array_append(new_codes, new_code);
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'codes', new_codes,
    'quantity', p_quantity,
    'days_per_license', p_days,
    'message', 'Licenças criadas com sucesso'
  );
END;
$$;
```

## 4. Migração e Compatibilidade

### 4.1 Estratégia de Migração

1. **Fase 1**: Implementar novas funções sem afetar as existentes
2. **Fase 2**: Migrar licenças existentes para novo formato
3. **Fase 3**: Substituir funções antigas pelas novas
4. **Fase 4**: Ativar sistema de licenças de teste

### 4.2 Script de Migração de Licenças Existentes

```sql
-- Migrar licenças existentes para formato compatível
UPDATE public.licenses
SET code = '000030' || SUBSTRING(code, 1, 7)
WHERE LENGTH(code) = 13
AND code NOT LIKE 'TRIAL%'
AND SUBSTRING(code, 1, 6) !~ '^[0-9]{6}$';
```

### 4.3 Função de Compatibilidade

```sql
CREATE OR REPLACE FUNCTION public.is_legacy_license_code(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar se é código antigo (não começa com 6 dígitos)
  RETURN LENGTH(p_code) = 13 
    AND SUBSTRING(p_code, 1, 6) !~ '^[0-9]{6}$'
    AND p_code NOT LIKE 'TRIAL%';
END;
$$;
```

## 5. Testes e Validação

### 5.1 Casos de Teste

#### Teste 1: Criação de Licença com Dias Específicos
```sql
-- Criar licença de 15 dias
SELECT public.admin_create_license_with_days(15, 1);
-- Resultado esperado: código iniciando com "000015"
```

#### Teste 2: Ativação com Duração Correta
```sql
-- Ativar licença e verificar duração
SELECT public.activate_license_fixed('000015XXXXXXX', 'user-uuid');
-- Resultado esperado: expiração em exatamente 15 dias
```

#### Teste 3: Licença de Teste Automática
```sql
-- Simular criação de usuário
INSERT INTO public.user_profiles (id, name) VALUES ('test-uuid', 'Test User');
-- Resultado esperado: licença TRIAL criada automaticamente
```

### 5.2 Validação de Integridade

```sql
-- Verificar se todas as licenças têm formato válido
SELECT code, 
       CASE 
         WHEN code LIKE 'TRIAL%' THEN 'Trial License'
         WHEN SUBSTRING(code, 1, 6) ~ '^[0-9]{6}$' THEN 'Valid Format'
         ELSE 'Legacy Format'
       END as format_type
FROM public.licenses;
```

## 6. Monitoramento e Métricas

### 6.1 Métricas Importantes

- Número de licenças de teste criadas por dia
- Taxa de conversão de teste para licença paga
- Licenças expiradas removidas automaticamente
- Tempo médio de ativação de licenças

### 6.2 Função de Estatísticas

```sql
CREATE OR REPLACE FUNCTION public.get_license_statistics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_licenses', COUNT(*),
    'active_licenses', COUNT(*) FILTER (WHERE is_active = TRUE),
    'trial_licenses', COUNT(*) FILTER (WHERE code LIKE 'TRIAL%'),
    'expired_licenses', COUNT(*) FILTER (WHERE expires_at < NOW()),
    'licenses_by_duration', jsonb_object_agg(
      CASE 
        WHEN code LIKE 'TRIAL%' THEN 'trial'
        ELSE SUBSTRING(code, 1, 6)
      END,
      COUNT(*)
    )
  ) INTO stats
  FROM public.licenses;
  
  RETURN stats;
END;
$$;
```

## 7. Considerações de Segurança

### 7.1 Validações Implementadas

- Verificação de unicidade de códigos
- Validação de formato de licença
- Prevenção de múltiplas licenças de teste por usuário
- Verificação de permissões administrativas

### 7.2 Auditoria

```sql
-- Log de ativações de licença
CREATE TABLE IF NOT EXISTS public.license_activation_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_code TEXT NOT NULL,
  user_id UUID NOT NULL,
  activation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  days_granted INTEGER,
  ip_address INET,
  user_agent TEXT
);
```

## 8. Conclusão

As melhorias propostas resolvem os problemas identificados no sistema atual:

1. ✅ **Correção da Ativação**: Licenças agora concedem exatamente os dias especificados
2. ✅ **Licenças de Teste**: Sistema automático de 7 dias para novos usuários
3. ✅ **Codificação de Duração**: Códigos contêm informação sobre validade
4. ✅ **Limpeza Automática**: Remoção automática de licenças expiradas
5. ✅ **Compatibilidade**: Sistema mantém formato de 13 dígitos
6. ✅ **Migração Segura**: Estratégia de implementação sem quebrar sistema existente

O sistema aprimorado oferece maior flexibilidade, precisão e automação, mantendo a compatibilidade com a infraestrutura existente.