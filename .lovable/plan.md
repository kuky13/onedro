

## Corrigir erro de webhook no atendimento WhatsApp CRM

### Problema
O `WebChat.tsx` tenta configurar webhook via `POST /webhook/set/{instance}` ao abrir o atendimento. Esse endpoint **nao existe** na Evolution GO (confirmado pelos 404s). O webhook ja e configurado corretamente durante a criacao da instancia no `whatsapp-qr-connect` (via campo `webhookUrl` no payload de `/instance/connect`). Portanto essa tentativa separada e desnecessaria e so gera erro visual.

### Solucao

**Arquivo: `src/components/whatsapp/WebChat.tsx`**

Remover a chamada `set_webhook` do `useEffect` de setup do WebChat. Como o webhook ja foi configurado na conexao da instancia, nao precisa tentar novamente. Isso elimina:
- O toast de erro "Nao foi possivel configurar o webhook automaticamente"
- Os 404s no console
- As 6 tentativas desnecessarias ao servidor

Substituir o bloco inteiro do `setupWebhook` (linhas ~60-95) por um simples log informativo, mantendo o resto do fluxo (canal Realtime, polling) intacto.

### Resultado
- Nenhum erro/toast ao abrir o atendimento
- O atendimento continua funcionando via Realtime channel + polling (ja implementado)
- Webhooks continuam sendo configurados durante a conexao inicial da instancia

