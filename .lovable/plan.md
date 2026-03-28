
## Corrigir conexão do `/whatsapp-crm`

### Problema encontrado
A falha está concentrada na edge function `supabase/functions/whatsapp-qr-connect/index.ts`.

Pelo código atual, ela ainda mistura fluxo de:
- Evolution GO
- Evolution v2/legado

Isso faz a função chamar endpoints certos com payloads errados.

### Causa raiz
Com base no Swagger da Evolution GO (`go.kuky.help/swagger/doc.json`):

- `POST /instance/create` aceita essencialmente `name` e `token`
- `POST /instance/connect` usa um body do tipo `ConnectStruct`
  - `immediate`
  - `phone`
  - `subscribe`
  - `webhookUrl`
- `GET /instance/qr` busca o QR da instância autenticada pelo token da própria instância
- `GET /instance/status` também depende do token da instância

Hoje o código:
- envia campos extras de v2 no `create` (`instanceName`, `integration`, `qrcode`, `webhook`)
- tenta `POST /instance/connect` com `{ name, instanceName }`
- tenta fallbacks de v2 como `/instance/connect/{name}` e `/instance/connectionState/{name}`
- extrai QR só de formatos antigos

Isso explica o `qr_code_missing`.

## O que vou ajustar

### 1. Reescrever o fluxo do `whatsapp-qr-connect` para Evolution GO de verdade
Vou simplificar o fluxo para:

```text
resolver config
→ reaproveitar ou criar nome da instância
→ criar instância com { name, token } se não existir
→ se já existir, resolver token via /instance/all
→ chamar POST /instance/connect com payload compatível com GO
→ fazer polling em GET /instance/qr usando o token da instância
→ retornar qr_code
```

### 2. Remover dependência dos endpoints legados no CRM
No fluxo de conexão do CRM, vou parar de depender de:
- `/instance/connect/{instanceName}`
- `/instance/connectionState/{instanceName}`

Esses fallbacks podem continuar só onde fizer sentido legado, mas não no fluxo principal do CRM.

### 3. Corrigir payload de connect
Vou montar o `connect` com o formato esperado pela Evolution GO, por exemplo:
- `webhookUrl`
- `subscribe`
- `immediate`

Sem mandar `name`/`instanceName` no body se o GO identifica a instância pelo token no header.

### 4. Melhorar leitura do QR
Vou ampliar a leitura do QR para aceitar respostas em formatos como:
- `data.qrcode`
- `data.code`
- `qrcode`
- `qrcode.base64`
- `code`
- `base64`

E registrar melhor qual endpoint respondeu e com qual shape.

### 5. Ajustar checagem de status da instância existente
Quando já houver instância salva:
- resolver token da instância via `/instance/all`
- consultar `/instance/status` com esse token
- se não estiver conectada, executar o fluxo GO de connect + qr
- só marcar como conectada se o status realmente vier `open/connected`

### 6. Preservar sincronização com Supabase
Vou manter a atualização de:
- `whatsapp_settings`
- `whatsapp_instances`

Mas sem marcar `is_active` cedo demais. Só após confirmação real de conexão.

## Arquivos a ajustar
- `supabase/functions/whatsapp-qr-connect/index.ts`
- possivelmente `supabase/functions/whatsapp-instance-manage/index.ts` apenas se eu encontrar o mesmo problema de endpoint GO vs legado
- não espero mudança grande no `src/components/whatsapp-crm/WhatsAppConnector.tsx`, porque o erro principal está no backend

## Resultado esperado
Depois da correção, ao clicar em “Conectar meu WhatsApp” no `/whatsapp-crm`, o sistema deve:

1. usar a URL normalizada da Evolution (`/manager` removido)
2. resolver/criar a instância corretamente
3. conectar usando o token correto da instância
4. buscar o QR em `GET /instance/qr`
5. exibir o QR sem retornar `qr_code_missing`

## Detalhes técnicos
```text
Fluxo atual:
create -> payload misto (GO + v2)
connect -> body errado / fallback legado
qr -> nem sempre chega porque connect não iniciou corretamente

Fluxo corrigido:
create(name, token)
→ connect(immediate/webhookUrl/subscribe) com token da instância
→ poll GET /instance/qr com token da instância
→ retornar QR
```

## Validação após implementar
1. Abrir `/whatsapp-crm`
2. Confirmar URL + chave da Evolution do usuário
3. Clicar em “Conectar meu WhatsApp”
4. Ver se o QR aparece
5. Escanear o QR
6. Conferir se o status muda para conectado e se a instância fica sincronizada no Supabase
