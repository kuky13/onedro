

## Problema raiz

**Evolution GO nao tem endpoint de historico de mensagens.** O Swagger confirma: nao existe `chat/findMessages`, `chat/fetchMessages`, nem nenhum endpoint para buscar mensagens antigas. Por isso o proxy sempre retorna 404 e o frontend mostra "Nenhuma mensagem encontrada localmente".

As mensagens ja estao sendo salvas no banco (`whatsapp_messages`) pelo `whatsapp-context` quando chegam via webhook. Porem o frontend ignora o banco e tenta buscar da API (que nao existe).

## Plano

### 1. Backend: `get_messages` deve ler do banco de dados

**Arquivo: `supabase/functions/whatsapp-proxy/index.ts`** (case `get_messages`)

Substituir a logica atual (que chama endpoints 404) por:
1. Buscar o `phone_number` a partir do JID (ex: `556499394191` de `556499394191@s.whatsapp.net`)
2. Encontrar a `whatsapp_conversation` do usuario com esse telefone
3. Buscar as ultimas 50 mensagens da tabela `whatsapp_messages` ordenadas por `created_at`
4. Converter para o formato que o frontend espera (com `key`, `message`, `messageTimestamp`)
5. Como fallback, ainda tentar a API da Evolution para mensagens nao persistidas, mas sem bloquear se der 404

```text
Fluxo:
remoteJid = "556499394191@s.whatsapp.net"
→ phone = "556499394191"
→ SELECT * FROM whatsapp_conversations WHERE owner_id = user.id AND phone_number LIKE '%556499394191%'
→ SELECT * FROM whatsapp_messages WHERE conversation_id = X ORDER BY created_at DESC LIMIT 50
→ Converter para formato Message { key, message, messageTimestamp }
→ Retornar ao frontend
```

### 2. Backend: `get_chats` deve incluir conversas do banco

**Arquivo: `supabase/functions/whatsapp-proxy/index.ts`** (case `get_chats`)

Alem dos contatos da Evolution GO (`GET /user/contacts`), tambem buscar `whatsapp_conversations` do banco para enriquecer a lista com:
- Ultima mensagem real (de `whatsapp_messages`)
- Contagem de nao lidas
- Garantir que conversas com historico aparecam mesmo se nao estiverem nos contatos

### 3. Frontend: tratar resposta do banco corretamente

**Arquivo: `src/components/whatsapp/WebChat.tsx`** (funcao `loadMessages`)

A normalizacao de mensagens precisa aceitar o novo formato vindo do banco:
```json
{
  "key": { "remoteJid": "556499394191@s.whatsapp.net", "fromMe": false, "id": "uuid" },
  "message": { "conversation": "Ola!" },
  "messageTimestamp": 1774791584
}
```
Isso ja e compativel com a normalizacao atual, entao mudancas minimas no frontend.

### 4. Webhook: garantir persistencia de mensagens enviadas

**Arquivo: `supabase/functions/whatsapp-proxy/index.ts`** (case `send_message`)

Apos enviar a mensagem com sucesso, inserir na `whatsapp_messages` com `direction = 'outbound'` para que apareca no historico quando recarregar.

## Arquivos a alterar
- `supabase/functions/whatsapp-proxy/index.ts` — reescrever `get_messages` para ler do banco, enriquecer `get_chats`, persistir `send_message`
- `src/components/whatsapp/WebChat.tsx` — ajustes minimos na normalizacao

## Resultado esperado
- Ao clicar num contato, as mensagens trocadas (recebidas via webhook) aparecem imediatamente
- Ao enviar mensagem, ela fica salva e aparece ao reabrir a conversa
- Lista de conversas mostra ultimas mensagens reais do banco
- Grupos continuam aparecendo via `GET /group/list` + `GET /group/myall`

