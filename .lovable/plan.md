

## Migrar /supadmin/whatsapp de WAHA para Evolution GO

### Situacao Atual

A pagina `/supadmin/whatsapp` (`WhatsAppManagement.tsx`) usa duas edge functions exclusivas do WAHA:
- **`waha-proxy`** — lista chats, busca mensagens, envia mensagens (usa secrets `WAHA_BASE_URL`, `WAHA_API_KEY`, `WAHA_SESSION`)
- **`waha-list-groups`** — lista grupos WhatsApp (mesmas secrets WAHA)

Porem, ja existe a edge function **`whatsapp-proxy`** que suporta Evolution API v2 e usa `resolveEvolutionConfig()` (tabelas `user_evolution_config` e `evolution_config` + secrets `KUKY_EVO_URL`/`KUKY_EVO_KEY`). Essa funcao ja tem actions para: `list_instances`, `create_instance`, `connect_instance`, `get_chats`, `get_messages`, `send_message`, `set_webhook`, etc.

A Evolution GO usa endpoints compativeis com a Evolution API v2 (mesmos paths como `/instance/all`, `/message/sendText/{instance}`, etc.), entao `whatsapp-proxy` ja funciona para Evolution GO sem mudancas nos endpoints.

### Plano

#### 1. Atualizar WhatsAppManagement.tsx para usar whatsapp-proxy

Trocar todas as chamadas de `waha-proxy` e `waha-list-groups` por `whatsapp-proxy`:

- **Lista de chats** — action `get_chats` com `payload.instanceName` (em vez de `session`)
- **Mensagens** — action `get_messages` com `payload.instanceName` + `payload.remoteJid`
- **Enviar mensagem** — action `send_message` com `payload.instanceName` + `payload.to` + `payload.text`
- **Lista de grupos** — nova action `get_groups` no `whatsapp-proxy` (ou usar `get_chats` filtrando `@g.us`)

#### 2. Adicionar action get_groups no whatsapp-proxy

Adicionar um case `get_groups` na edge function `whatsapp-proxy` que chama `group/fetchAllGroups/{instanceName}` na Evolution API, com fallback para filtrar chats com `@g.us`.

#### 3. Atualizar a UI e labels

- Trocar "WAHA" / "Sessao do WAHA" por "Evolution GO" / "Nome da Instancia"
- Trocar referencia a secrets `WAHA_*` por "Configure sua Evolution API URL e chave em /whats ou na tabela evolution_config"
- O campo `evolutionInstanceName` passa a representar o `instanceName` da Evolution GO

#### 4. Atualizar a mutacao de save

- Mudar `provider: 'waha'` para `provider: 'evolution-go'`
- Manter compatibilidade: gravar tanto `waha_session` quanto `evolution_instance_name` para nao quebrar flows existentes (webhook, orcamentos)

#### 5. Atualizar whatsapp-zapi-orcamentos (envio de teste)

A funcao de envio de teste ja usa `whatsapp-zapi-orcamentos` que internamente resolve a config da Evolution. Verificar se o `instance_name` do payload esta sendo passado corretamente para a Evolution GO.

### Arquivos Alterados

| Arquivo | Mudanca |
|---------|---------|
| `src/components/super-admin/WhatsAppManagement.tsx` | Trocar `waha-proxy` / `waha-list-groups` por `whatsapp-proxy`, atualizar payloads, labels |
| `supabase/functions/whatsapp-proxy/index.ts` | Adicionar action `get_groups` |
| Nenhuma migracao de banco necessaria | Tabelas existentes ja suportam os campos |

### Detalhes Tecnicos

**Evolution GO API (endpoints confirmados):**
```text
GET  /instance/all                    — apikey header
POST /instance/create                 — { instanceName, integration }
POST /instance/connect                — { immediate, phone, webhookUrl }
GET  /instance/{name}/qrcode          — QR code
POST /message/sendText/{instance}     — { number, text }
POST /chat/findChats/{instance}       — lista chats
POST /group/fetchAllGroups/{instance} — lista grupos
```

Esses endpoints sao os mesmos da Evolution API v2, entao `callEvo()` no `whatsapp-proxy` ja os suporta nativamente. A unica adicao real de codigo e o case `get_groups` e a atualizacao do frontend.

