

# Corrigir loop "Confirmando licença" e build errors

## Problema principal: loop infinito "Confirmando licença"

O fluxo atual tem uma falha crítica:

1. `CheckoutPage` gera o PIX com `purchaseRegistrationId: undefined` (linha 166) -- nenhum registro de compra é criado no banco
2. Após o pagamento, o polling chama `check-abacatepay-payment` que procura um `purchase_registrations` com o `paymentId`
3. Como nenhum registro existe, o retorno é `{ status: "PAID", license_code: null }`
4. O frontend entra em loop mostrando "Confirmando licença..." até atingir MAX_RETRIES (60 tentativas)

## Solução

### 1. `src/plans/components/CheckoutPage.tsx` - Criar purchase_registration antes do PIX
- Antes de chamar `createAbacatePayPix`, inserir um registro em `purchase_registrations` com os dados do cliente e plano
- Passar o ID desse registro como `purchaseRegistrationId`
- Após receber o `paymentId` do AbacatePay, atualizar o registro com `mercadopago_payment_id = paymentId`
- Remover import não usado de `supabase` (já vai ser usado agora) e `mercadoPagoPlan`

### 2. `src/lib/abacatepay-client.ts` - Tornar `purchaseRegistrationId` opcional
- Mudar o tipo de `purchaseRegistrationId` para `string | undefined` (já é opcional na interface, mas o TS reclama ao passar `undefined` explicitamente)

### 3. Build errors nas edge functions
- **`create-abacatepay-checkout/index.ts`**: Extrair `frequency` do `req.json()` (está sendo usado na linha 91 mas nunca declarado). Tipar `error` como `Error` no catch.
- **`check-abacatepay-payment/index.ts`**: Tipar `error` como `Error` no catch (linha 230).
- **`abacatepay-webhook/index.ts`**: Tipar `error` como `Error` no catch (linha 365).

## Resumo das mudanças

| Arquivo | Mudança |
|---------|---------|
| `src/plans/components/CheckoutPage.tsx` | Criar `purchase_registration` antes do PIX, atualizar com `paymentId` depois, remover unused |
| `src/lib/abacatepay-client.ts` | Nenhuma (tipo já é opcional) |
| `supabase/functions/create-abacatepay-checkout/index.ts` | Adicionar `frequency` no destructuring do body + tipar error |
| `supabase/functions/check-abacatepay-payment/index.ts` | Tipar error no catch |
| `supabase/functions/abacatepay-webhook/index.ts` | Tipar error no catch |

