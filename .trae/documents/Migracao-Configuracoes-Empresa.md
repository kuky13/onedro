# Documento Técnico: Migração das Configurações da Empresa

## 1. Análise do Problema Atual

### 1.1 Duplicidade de Rotas e Sistemas

O sistema atual possui **duas rotas distintas** para configuração de informações da empresa, criando confusão e redundância:

#### Rota 1: `/settings` (Confusa e Redundante)
- **Componente**: `CompanySettings.tsx`
- **Hook**: `useShopProfile`
- **Tabela**: `shop_profiles`
- **Caminho**: Acessado através de menu de configurações gerais
- **Problema**: Rota confusa, não intuitiva, duplica funcionalidades

#### Rota 2: `/service-orders/settings` (Correta e Intuitiva)
- **Componente**: `CompanyBrandingSettings.tsx` 
- **Hook**: `useCompanyBranding`
- **Tabela**: `company_info` + `company_share_settings`
- **Caminho**: Acessado através de "Configurações de Ordens de Serviço"
- **Vantagem**: Mais completa, inclui branding, termos de garantia, configurações de compartilhamento

### 1.2 Fragmentação de Dados

O sistema `useCompanyDataLoader` atualmente tenta unir dados de ambos os sistemas:

```typescript
// useCompanyDataLoader.ts - Problema atual
const combinedData = {
  shopProfile,      // De useShopProfile (tabela shop_profiles)
  companyInfo,      // De useCompanyBranding (tabela company_info)
  shareSettings,   // De useCompanyBranding (tabela company_share_settings)
}

// Fallback complexo e confuso
getCompanyDataForPDF(): CompanyDataForPDF {
  const result = {
    shop_name: shopData?.shop_name || companyData?.name || 'Minha Empresa',
    address: shopData?.address || companyData?.address || '',
    contact_phone: shopData?.contact_phone || companyData?.whatsapp_phone || '',
    logo_url: shopData?.logo_url || companyData?.logo_url || '',
    email: companyData?.email || '',
    cnpj: companyData?.cnpj || shopData?.cnpj || ''
  };
}
```

## 2. Solução Proposta: Centralização Única

### 2.1 Objetivo Principal
**Eliminar completamente** o sistema `useShopProfile` e a rota `/settings`, migrando todo o sistema para usar **exclusivamente** `/service-orders/settings` e `useCompanyBranding`.

### 2.2 Benefícios da Migração

1. **Simplicidade**: Uma única fonte de verdade para dados da empresa
2. **Completa**: Todos os campos necessários em um só lugar
3. **Intuitiva**: Rota clara e específica para configurações de OS
4. **Consistente**: Todos os PDFs e documentos usarão os mesmos dados
5. **Manutenível**: Reduz complexidade e duplicação de código

### 2.3 Mapeamento de Campos

| Campo | useShopProfile (antigo) | useCompanyBranding (novo) | Observação |
|-------|-------------------------|----------------------------|------------|
| shop_name | shopProfile.shop_name | companyInfo.name | **Renomear** para name |
| cnpj | shopProfile.cnpj | companyInfo.cnpj | **Mesmo campo** |
| address | shopProfile.address | companyInfo.address | **Adicionar** ao novo sistema |
| contact_phone | shopProfile.contact_phone | companyInfo.whatsapp_phone | **Renomear** campo |
| logo_url | shopProfile.logo_url | companyInfo.logo_url | **Mesmo campo** |
| email | Não tem | companyInfo.email | **Já existe** |
| warranty_terms | Não tem | companyInfo.warranty_* | **Já existe** |
| share_settings | Não tem | shareSettings.* | **Já existe** |

## 3. Implementação Detalhada

### 3.1 Passo 1: Atualizar useCompanyDataLoader

```typescript
// NOVO: useCompanyDataLoader.ts - Simplificado e direto
export const useCompanyDataLoader = () => {
  const { user } = useAuth();
  const { companyInfo, shareSettings, loading: brandingLoading, fetchCompanyBranding } = useCompanyBranding();
  
  // Remover completamente dependência de useShopProfile
  
  const combinedData = useMemo((): CombinedCompanyData => {
    const isLoading = brandingLoading;
    const hasData = !!companyInfo; // Apenas companyInfo agora
    
    return {
      companyInfo,           // Única fonte de dados
      shareSettings,         // Configurações de compartilhamento
      isLoading,
      hasData,
      error
    };
  }, [companyInfo, shareSettings, brandingLoading, error]);

  // Simplificar getCompanyDataForPDF
  const getCompanyDataForPDF = useCallback((): CompanyDataForPDF => {
    const companyData = companyInfo;
    
    const result = {
      shop_name: companyData?.name || 'Minha Empresa', // Simplificado
      address: companyData?.address || '',
      contact_phone: companyData?.whatsapp_phone || '', // Campo correto
      logo_url: companyData?.logo_url || '',
      email: companyData?.email || '',
      cnpj: companyData?.cnpj || ''
    };
    
    return result;
  }, [companyInfo]);
};
```

### 3.2 Passo 2: Adicionar Campos Faltantes ao CompanyBrandingSettings

```typescript
// CompanyBrandingSettings.tsx - Adicionar campos que existiam em useShopProfile
const [companyData, setCompanyData] = useState<CompanyFormData>({
  name: companyInfo?.name || '',
  logo_url: companyInfo?.logo_url || '',
  whatsapp_phone: companyInfo?.whatsapp_phone || '',
  email: companyInfo?.email || '', // Adicionar
  address: companyInfo?.address || '', // Adicionar
  cnpj: companyInfo?.cnpj || '',
  description: companyInfo?.description || '',
  warranty_cancellation_terms: companyInfo?.warranty_cancellation_terms || '',
  warranty_legal_reminders: companyInfo?.warranty_legal_reminders || ''
});
```

### 3.3 Passo 3: Criar Redirecionamento Automático

```typescript
// App.tsx - Redirecionar /settings para /service-orders/settings
<Route 
  path="/settings/company" 
  element={
    <UnifiedProtectionGuard>
      <Navigate to="/service-orders/settings" replace />
    </UnifiedProtectionGuard>
  } 
/>
```

### 3.4 Passo 4: Atualizar Componentes que Geram PDFs

```typescript
// Todos os componentes PDF devem usar apenas companyInfo
// Exemplo em generateBudgetPDF, generateServiceOrderPDF, generateWarrantyPDF

// ANTIGO (com fallback complexo):
const validatedCompanyData = validateCompanyData(companyData);

// NOVO (direto e simples):
const companyInfo = companyData; // Vem direto de useCompanyBranding
```

### 3.5 Passo 5: Remover Dependências Legadas

1. **Remover imports** de `useShopProfile` de todos os componentes
2. **Atualizar** `useCompanyDataLoader` para não usar `useShopProfile`
3. **Desativar** rota `/settings/company` (redirecionar)
4. **Manter** `useShopProfile` apenas se usado por outros módulos (verificar)

## 4. Validação e Testes

### 4.1 Verificar Campos Necessários

Certificar que `company_info` tem todos os campos necessários:
- ✅ `name` (nome da empresa)
- ✅ `logo_url` (logo)
- ✅ `whatsapp_phone` (telefone)
- ✅ `cnpj` (CNPJ)
- ✅ `description` (descrição)
- ✅ `warranty_cancellation_terms` (termos garantia)
- ✅ `warranty_legal_reminders` (lembretes legais)
- ❌ `address` (endereço) - **Adicionar à tabela**
- ❌ `email` (email) - **Adicionar à tabela**

### 4.2 Migration de Banco de Dados

```sql
-- Adicionar campos faltantes à tabela company_info
ALTER TABLE company_info 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Migrar dados existentes de shop_profiles para company_info (se necessário)
-- UPDATE company_info SET address = (SELECT address FROM shop_profiles WHERE user_id = ...)
```

### 4.3 Testes de Funcionalidade

1. **PDF de Orçamento**: Verificar se usa dados corretos
2. **PDF de Ordem de Serviço**: Verificar se usa dados corretos  
3. **PDF de Termos de Garantia**: Verificar se usa dados corretos
4. **Compartilhamento de OS**: Verificar se usa dados corretos
5. **Visualização de OS**: Verificar se usa dados corretos

## 5. Cronograma de Implementação

### Fase 1: Preparação (1-2 horas)
- [ ] Adicionar campos `address` e `email` ao banco
- [ ] Atualizar `useCompanyBranding` para incluir novos campos
- [ ] Atualizar `CompanyBrandingSettings` com novos campos

### Fase 2: Migração Core (2-3 horas)
- [ ] Modificar `useCompanyDataLoader` para priorizar `companyInfo`
- [ ] Atualizar todos os utilitários de PDF
- [ ] Testar geração de PDFs

### Fase 3: Redirecionamento (1 hora)
- [ ] Adicionar redirecionamento de `/settings` para `/service-orders/settings`
- [ ] Atualizar menus de navegação
- [ ] Remover links para rota antiga

### Fase 4: Limpeza (1 hora)
- [ ] Remover imports desnecessários de `useShopProfile`
- [ ] Verificar se `useShopProfile` ainda é usado em outros lugares
- [ ] Documentar mudanças

**Total estimado: 5-7 horas de trabalho**

## 6. Impacto e Benefícios

### 6.1 Benefícios Imediatos
- **Elimina confusão** dos usuários sobre qual rota usar
- **Simplifica manutenção** do código
- **Reduz bugs** por dados inconsistentes
- **Melhora performance** (menos requisições)

### 6.2 Benefícios Futuros
- **Base sólida** para novas funcionalidades
- **Facilita onboarding** de novos usuários
- **Permite expansão** do sistema de branding
- **Reduz custos** de manutenção

## 7. Conclusão

A migração para o sistema único `/service-orders/settings` é **essencial** para:
- Eliminar duplicação e confusão
- Simplificar a experiência do usuário  
- Reduzir complexidade técnica
- Preparar o sistema para crescimento futuro

A implementação deve ser feita **gradualmente** mas com **foco total** em completar a transição, garantindo que **todos os PDFs e documentos** usem a mesma fonte de dados.