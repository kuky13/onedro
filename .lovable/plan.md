## Problema Real Identificado

Analisei o Swagger completo da Evolution GO (`go.kuky.help/swagger/doc.json`) e descobri a causa raiz:

**Na Evolution GO, a instancia e identificada pelo token (API key), nao pelo nome na URL ou query param.**

Os endpoints `GET /group/list`, `GET /group/myall`, `GET /user/contacts`, `GET /instance/status` nao aceitam nenhum parametro -- a instancia e determinada exclusivamente pelo `apikey` no header. O `KUKY_EVO_KEY` que esta configurado provavelmente e a **Global API Key** (chave de admin), nao o **token da instancia "cookie"**.

Por isso retorna vazio: a API nao sabe qual instancia consultar.

## Solucao

### 1. Resolver o token da instancia pelo nome

Antes de chamar qualquer endpoint, o `whatsapp-proxy` precisa:

1. Chamar `GET /instance/all` com a Global API Key
2. Encontrar a instancia cujo `name` bate com o `instanceName` enviado pelo usuario (ex: "cookie1")
3. Extrair o `token` dessa instancia
4. Usar esse token como `apikey` nas chamadas subsequentes (grupo, chat, envio, etc.)

### 2. Alterar `callEvo` para aceitar token override

Hoje `callEvo` usa `evoKeys` (lista fixa de chaves). Precisa aceitar um parametro opcional de token para usar o token especifico da instancia.

### 3. Implementar cache simples por request

Para nao chamar `/instance/all` toda vez, guardar o token resolvido em uma variavel local durante o request.

## Arquivos a alterar

### `supabase/functions/whatsapp-proxy/index.ts`

- Adicionar funcao `resolveInstanceToken(instanceName)`:
  - `GET /instance/all` com a global key
  - Procura instancia pelo nome
  - Retorna o token da instancia
- Nos cases `get_groups`, `get_chats`, `get_messages`, `send_message`, `get_status`, `connect_instance`:
  - Resolver o token primeiro
  - Usar o token da instancia nas chamadas ao inves da global key
- Alterar `callEvo` para aceitar `overrideKey?: string`

### `supabase/functions/whatsapp-qr-connect/index.ts`

- Mesma logica de resolver token por nome antes de chamar endpoints

## Detalhes Tecnicos

```text
Fluxo atual (quebrado):
  Frontend: instanceName="cookie1"
  → callEvo("group/myall", GET) com Global API Key
  → Evolution GO nao sabe qual instancia → retorna vazio

Fluxo corrigido:
  Frontend: instanceName="cookie"
  → GET /instance/all com Global API Key → lista de instancias
  → Encontra instancia com name="cookie" → token="abc123..."
  → callEvo("group/myall", GET) com apikey="abc123..."
  → Evolution GO identifica instancia → retorna grupos
```

A `CreateStruct` da Evolution GO confirma:

```json
{ "name": "string", "token": "string" }
```

Cada instancia tem seu proprio token. E esse token que deve ser usado como `apikey` nas chamadas de dados.

## Resultado esperado

Apos implementar, ao digitar "cookie" em Nome da Instancia e clicar Listar Grupos, o sistema vai:

1. Buscar todas as instancias
2. Encontrar "cookie1" e pegar seu token
3. Listar os grupos usando o token correto