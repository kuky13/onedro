

# Corrigir notificações WhatsApp após compra aprovada

## Problema identificado

Existem **3 falhas** que impedem as notificações WhatsApp de funcionar após uma compra aprovada:

### 1. Secrets WAHA não configurados
Os edge functions `abacatepay-webhook` e `check-abacatepay-payment` dependem de `WAHA_BASE_URL` e `WAHA_API_KEY` como env vars, mas esses secrets **não estão cadastrados** no projeto. A função `sendWhatsAppNotification` retorna silenciosamente (`if (!wahaApiKey) return;`).

### 2. Webhook não lê configurações do banco
A tabela `whatsapp_zapi_settings` tem campos perfeitos para isso:
- `admin_notification_phone` -- telefone do admin para receber notificação
- `purchase_approved_template` -- template da mensagem para o admin
- `buyer_notification_template` -- template da mensagem para o comprador
- `waha_session` -- sessão WAHA configurada

Porém o `abacatepay-webhook` ignora tudo isso e usa apenas env vars hardcoded.

### 3. `check-abacatepay-payment` não envia WhatsApp
A função de self-healing (polling) gera a licença mas **não envia nenhuma notificação WhatsApp** -- nem para o comprador, nem para o admin.

## Solução

### 1. Adicionar secrets WAHA
Antes de implementar, será necessário que o usuário informe os valores de `WAHA_BASE_URL`, `WAHA_API_KEY`, e opcionalmente `WAHA_SESSION`.

### 2. Atualizar `supabase/functions/abacatepay-webhook/index.ts`
- Refatorar `sendWhatsAppNotification` para buscar configurações de `whatsapp_zapi_settings` do banco (admin phone, templates, waha_session)
- Enviar mensagem ao **admin** usando `admin_notification_phone` + `purchase_approved_template`
- Enviar mensagem ao **comprador** usando `buyer_notification_template`
- Fallback para env vars se as configurações do banco não existirem

### 3. Atualizar `supabase/functions/check-abacatepay-payment/index.ts`
- Adicionar a mesma lógica de notificação WhatsApp após o self-healing gerar a licença
- Buscar `whatsapp_zapi_settings` para obter phone do admin e templates
- Enviar notificação ao comprador e ao admin

### Mudanças por arquivo

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/abacatepay-webhook/index.ts` | Buscar `whatsapp_zapi_settings` do BD, enviar WhatsApp ao admin e buyer usando templates e `waha_session` do BD |
| `supabase/functions/check-abacatepay-payment/index.ts` | Adicionar envio de WhatsApp ao admin e buyer após self-healing gerar licença |

### Fluxo corrigido
```text
Pagamento PAID
  ├── webhook OU check-payment detecta
  ├── Gera/renova licença
  ├── SELECT whatsapp_zapi_settings (is_active=true)
  ├── Envia WhatsApp ao COMPRADOR (buyer_notification_template)
  └── Envia WhatsApp ao ADMIN (admin_notification_phone + purchase_approved_template)
```

