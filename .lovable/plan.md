
## Problema encontrado

O erro não é mais de secret nem de SSL. O backend está chamando a URL errada para a API da Evolution GO.

Pelos logs da edge function:
```text
POST https://go.kuky.help/manager/group/fetchAllGroups/cookie1 -> 404
POST https://go.kuky.help/manager/chat/findChats/cookie1 -> 404
```

E pela documentação pública do seu servidor:
```text
Painel: https://go.kuky.help/manager
API/Swagger: https://go.kuky.help/swagger/index.html
```

Na Swagger da Evolution GO, os endpoints disponíveis são diferentes do padrão Evolution v2. Exemplo:
```text
GET /group/list
GET /group/myall
GET /instance/status
GET /instance/qr
POST /send/text
```

Ou seja: `/manager` é a interface web, não a base da API REST.

## O que precisa ser implementado

### 1. Corrigir a resolução da base URL da Evolution
Atualizar a camada compartilhada/config para normalizar a URL informada:
- se vier `https://go.kuky.help/manager`, usar `https://go.kuky.help`
- remover barra final
- evitar montar requests em cima do painel admin

### 2. Adaptar `whatsapp-proxy` para Evolution GO real
Hoje a função usa endpoints no estilo Evolution v2:
```text
group/fetchAllGroups/{instance}
chat/findChats/{instance}
message/sendText/{instance}
instance/connectionState/{instance}
```

Precisará ganhar suporte ao modo Evolution GO com fallback por endpoint:
- grupos: tentar `GET /group/myall` e depois `GET /group/list`
- status: tentar `GET /instance/status` no formato esperado pela GO
- QR/conexão: alinhar com `POST /instance/connect` e `GET /instance/qr`
- envio de mensagem: suportar `POST /send/text` além do endpoint antigo
- manter fallback legado para instalações Evolution v2

### 3. Normalizar respostas da Evolution GO
Os retornos da GO provavelmente não têm o mesmo shape do código atual. Vou ajustar os normalizadores para converter qualquer resposta de grupos/chats em:
```ts
{ id, name, groupId }
```
assim a UI `/supadmin/whatsapp` continua funcionando sem grande refactor.

### 4. Melhorar logs de diagnóstico
Adicionar logs mais claros mostrando:
- URL base efetiva usada
- endpoint tentado
- status HTTP
- trecho curto da resposta
- qual fallback foi escolhido

Isso acelera muito se algum endpoint da sua GO estiver ligeiramente diferente.

### 5. Ajustar também `whatsapp-qr-connect`
Essa função hoje também assume rotas do padrão antigo (`instance/connect/{name}`, `instance/connectionState/{name}`).
Vou alinhar a função ao mesmo resolvedor/fallback da Evolution GO para evitar outro ponto quebrado depois.

## Impacto esperado

Depois disso, `/supadmin/whatsapp` deve:
- deixar de mostrar “Nenhum grupo encontrado” por erro silencioso de 404
- buscar grupos pelos endpoints corretos da Evolution GO
- continuar compatível com setups antigos quando possível

## O que você não precisa fazer no painel
Você não precisa criar grupos manualmente “de um jeito especial” no painel.
O principal ajuste é no código, porque hoje ele está consumindo o painel `/manager` como se fosse API.

## Detalhes técnicos
Arquivos a ajustar:
- `supabase/functions/_shared/evolution-config.ts`
- `supabase/functions/whatsapp-proxy/index.ts`
- `supabase/functions/whatsapp-qr-connect/index.ts`

Estratégia:
```text
KUKY_EVO_URL = https://go.kuky.help/manager
          ↓ normalizar
baseApiUrl = https://go.kuky.help

grupos:
  GET /group/myall
  fallback GET /group/list
  fallback legado /group/fetchAllGroups/{instance}

mensagens/status/envio:
  tentar GO primeiro
  fallback legado depois
```

## Validação após implementar
1. Abrir `/supadmin/whatsapp`
2. Informar a instância `cookie` ou `cookie1` conforme a instância real
3. Testar listagem de grupos
4. Testar status/QR
5. Conferir logs da edge function para ver qual endpoint respondeu com sucesso
