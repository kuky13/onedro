

## Corrigir lista de conversas vazia no WebChat

### Causa raiz
A resposta da Evolution GO usa campos com letra maiuscula:
```json
{ "Jid": "5564...@s.whatsapp.net", "FullName": "Manin BR", "PushName": "", "BusinessName": "" }
```

Mas o codigo so verifica versoes em minuscula:
```js
const jid = c.remoteJid || c.id || c.jid || ...  // nunca testa c.Jid
let name = c.name || c.pushName || ...            // nunca testa c.FullName
```

Resultado: todos os 595 contatos retornados tem `jid = undefined`, sao filtrados pelo `.filter(chat => chat.id && ...)`, e a lista fica vazia.

### Solucao

**Arquivo: `src/components/whatsapp/WebChat.tsx`** (funcao `loadChats`, ~linha 279-282)

Adicionar os campos capitalizados da Evolution GO na cadeia de fallback:

```
jid:  c.Jid || c.remoteJid || c.id || c.jid || ...
name: c.FullName || c.name || c.PushName || c.pushName || c.BusinessName || ...
```

Isso faz os 595 contatos serem reconhecidos e exibidos corretamente.

### Resultado esperado
Ao abrir o atendimento no `/whatsapp-crm`, a lista lateral mostra todas as conversas com nomes corretos em vez de "Nenhuma conversa".

