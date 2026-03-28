

## Problema

Quando o usuário conecta o WhatsApp (escaneia o QR), o status nunca atualiza em tempo real. Duas causas raiz:

### 1. Webhook nunca é configurado
O `setupWebhookAndIa` tenta `POST /webhook/set` que **nao existe** na Evolution GO. O Swagger confirma: nao ha nenhum endpoint de webhook separado. Na Evolution GO, o webhook e configurado no `POST /instance/connect` via o campo `webhookUrl` do `ConnectStruct`.

### 2. Sem fallback de polling de status
Quando o webhook nao funciona, nao ha mecanismo no frontend para verificar ativamente se a instancia conectou apos o scan do QR.

## Solucao

### Passo 1 -- Passar webhookUrl no `/instance/connect`
No `whatsapp-qr-connect`, ao chamar `POST /instance/connect`, incluir:
```json
{
  "immediate": true,
  "webhookUrl": "https://oghjlypdnmqecaavekyr.supabase.co/functions/v1/whatsapp-webhook",
  "subscribe": ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"]
}
```
Isso faz a Evolution GO enviar eventos para nosso webhook automaticamente.

### Passo 2 -- Remover `setupWebhookAndIa` (a parte do webhook)
A chamada a `POST /webhook/set` e inutill na Evolution GO. Remover para evitar erros 404.

### Passo 3 -- Adicionar polling de status no frontend
No `WhatsAppConnector`, enquanto o QR estiver visivel, fazer polling a cada 3s chamando uma edge function leve (ou reutilizando `whatsapp-proxy` com `GET /instance/status`) para verificar se a instancia ficou `open`. Quando detectar conexao, atualizar o banco e invalidar a query de status.

Alternativa mais simples: usar o polling que ja existe (`pollMs: qrCode ? 3000 : false` no `useWhatsAppConnectionStatus`), mas garantir que o banco e atualizado. Para isso, criar um novo endpoint ou ajustar o `whatsapp-qr-connect` para aceitar uma action `check_status` que consulta `GET /instance/status` na Evolution GO e atualiza o banco se conectou.

### Passo 4 -- Frontend: chamar check_status enquanto QR visivel
No `WhatsAppConnector`, apos exibir o QR, iniciar um `setInterval` que chama `whatsapp-qr-connect` com `{ action: "check_status", instance_name: "..." }` a cada 4s. Quando retornar `connected: true`, invalidar queries e mostrar status conectado.

## Arquivos a alterar
- `supabase/functions/whatsapp-qr-connect/index.ts` -- passar webhookUrl no connect, adicionar action check_status, remover setupWebhookAndIa webhook part
- `src/components/whatsapp-crm/WhatsAppConnector.tsx` -- polling de check_status enquanto QR visivel

## Resultado esperado
Apos escanear o QR, o status muda para "WhatsApp conectado" em ate 4-8 segundos automaticamente.

