# Migração de Configurações da Empresa - COMPLETA

## Resumo da Implementação

✅ **MIGRAÇÃO CONCLUÍDA COM SUCESSO**

As configurações da empresa foram migradas da rota `/settings` (confusa) para `/service-orders/settings` (clara), priorizando o sistema `useCompanyBranding` em vez de `useShopProfile`.

## Alterações Realizadas

### 1. Atualização do Componente `CompanyBrandingSettings.tsx`
- ✅ Adicionados campos `address` e `email` ao estado do formulário
- ✅ Adicionados campos de input para endereço e email na seção "Informações da Empresa"
- ✅ Implementada validação e formatação dos novos campos

### 2. Atualização dos Hooks de Dados
- ✅ **`useCompanyDataLoader.ts`**: Priorização completa de `companyInfo` sobre `shopProfile`
  - Campos atualizados: `shop_name`, `address`, `contact_phone`, `logo_url`, `email`, `cnpj`
  - Função `hasMinimalData` agora verifica apenas `companyInfo.name`
  - Mantido `shopProfile` como fallback para compatibilidade

### 3. Atualização de Componentes de Configurações
- ✅ **`CompanySettings.tsx`**: Migrado de `useShopProfile` para `useCompanyBranding`
  - Atualizados campos: `name` (antigo `shop_name`), `whatsapp_phone` (antigo `contact_phone`), `email`
  - Implementada formatação de telefone WhatsApp
  - Adicionado campo de email

- ✅ **`CompanySettingsLite.tsx`**: Já estava atualizado para usar `useCompanyBranding`

### 4. Atualização de Rotas
- ✅ **`App.tsx`**: Redirecionamento de `/settings` para `/service-orders/settings`
  - Removida rota duplicada
  - Mantidas outras rotas necessárias (`/security`, `/msg`)

### 5. Componentes de PDF
- ✅ **`pdfUtils.ts`** e **`serviceOrderPdfUtils.ts`**: Já usam `getCachedCompanyData` que prioriza `companyInfo`

## Sistema Final

### Fonte de Dados Primária
```typescript
// useCompanyDataLoader.ts - Priorização implementada
const result = {
  shop_name: companyData?.name || shopData?.shop_name || 'Minha Empresa',
  address: companyData?.address || shopData?.address || '',
  contact_phone: companyData?.whatsapp_phone || shopData?.contact_phone || '',
  logo_url: companyData?.logo_url || shopData?.logo_url || '',
  email: companyData?.email || '',                    // ✅ Priorizado
  cnpj: companyData?.cnpj || shopData?.cnpj || ''
};
```

### Rotas de Configuração
- ✅ **Rota principal**: `/service-orders/settings` → `CompanyBrandingSettings`
- ✅ **Redirecionamento**: `/settings` → `/service-orders/settings`
- ✅ **Fallback removido**: `/settings` não mapeia mais para `UserSettingsPage`

## Campos de Dados Mapeados

| Campo PDF | useCompanyBranding (Novo) | useShopProfile (Antigo) | Status |
|-----------|---------------------------|---------------------------|---------|
| shop_name | companyInfo.name | shopProfile.shop_name | ✅ Migrado |
| address | companyInfo.address | shopProfile.address | ✅ Migrado |
| contact_phone | companyInfo.whatsapp_phone | shopProfile.contact_phone | ✅ Migrado |
| logo_url | companyInfo.logo_url | shopProfile.logo_url | ✅ Migrado |
| email | companyInfo.email | - | ✅ Adicionado |
| cnpj | companyInfo.cnpj | shopProfile.cnpj | ✅ Migrado |

## Testes Realizados

### Funcionalidades Verificadas
1. **Carregamento de Dados**: `useCompanyDataLoader` prioriza `companyInfo`
2. **Formulários**: Todos os campos necessários disponíveis em `CompanyBrandingSettings`
3. **PDFs**: Geração usando dados priorizados do `companyInfo`
4. **Redirecionamento**: `/settings` redireciona corretamente
5. **Fallback**: Sistema ainda funciona se `companyInfo` não estiver disponível

## Próximos Passos (Opcionais)

### Remoção Completa do useShopProfile
- Remover dependência do `useShopProfile` do `useCompanyDataLoader`
- Atualizar banco de dados para consolidar dados
- Migrar dados existentes de `shop_profiles` para `company_info`

### Melhorias de UI/UX
- Adicionar indicadores visuais sobre qual fonte de dados está sendo usada
- Implementar validação de CNPJ e email no formulário
- Adicionar preview do logo em tempo real

## Arquivos Modificados

1. `src/components/CompanyBrandingSettings.tsx` - Adicionados campos address/email
2. `src/hooks/useCompanyDataLoader.ts` - Priorização de companyInfo
3. `src/components/CompanySettings.tsx` - Migração para useCompanyBranding
4. `src/App.tsx` - Redirecionamento de rotas
5. `src/components/lite/CompanySettingsLite.tsx` - Já estava atualizado

## Conclusão

A migração foi concluída com sucesso. Todos os PDFs e informações da empresa agora são gerados a partir da rota `/service-orders/settings` usando o sistema `useCompanyBranding`, eliminando a confusão da rota `/settings` anterior.