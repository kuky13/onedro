

# Adicionar CNPJ nos rodapés e na página /kukysolutions

## Resumo
Adicionar o CNPJ **64.797.431/0001-03** nos rodapés de todas as páginas públicas e na página `/kukysolutions`, para informar melhor o usuário sobre a empresa.

## Arquivos a modificar

### 1. `src/pages/KukySolutions.tsx`
- Adicionar `cnpj: "64.797.431/0001-03"` no objeto `COMPANY_INFO`
- Exibir o CNPJ na seção de contato (junto com email, telefone, localização)
- Adicionar CNPJ no footer da página

### 2. `src/pages/Index.tsx` (landing page)
- Adicionar CNPJ no footer: `CNPJ: 64.797.431/0001-03` abaixo do copyright

### 3. `src/pages/SuportePage.tsx`
- Adicionar CNPJ no footer junto ao copyright

### 4. `src/pages/TermsPage.tsx`
- Adicionar CNPJ no rodapé junto ao copyright existente

### 5. `src/pages/PrivacyPage.tsx`
- Adicionar CNPJ no rodapé junto ao copyright existente

### 6. `src/pages/CookiesPage.tsx`
- Adicionar CNPJ no rodapé junto ao copyright existente

### 7. `src/pages/ConsentimentoPage.tsx`
- Adicionar CNPJ no footer junto ao copyright existente

### 8. `src/pages/HoustonPage.tsx`
- Adicionar CNPJ abaixo do copyright

### 9. `src/components/ServiceOrdersSettingsHub.tsx`
- Adicionar CNPJ no footer das configurações

## Correção de build errors pendentes
- Remover imports e variáveis não utilizadas em `src/components/service-orders/DeviceChecklist.tsx`
- Corrigir `supabaseClient` em `supabase/functions/whatsapp-zapi-orcamentos/index.ts`

