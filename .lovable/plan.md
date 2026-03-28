

## Problema

Quando o usuário clica "Conectar meu WhatsApp" no `/whatsapp-crm`, mesmo que a instância seja criada e o QR escaneado, o status nunca muda para "conectado". Dois problemas separados:

### 1. Nome da instância desalinhado
- O `whatsapp-qr-connect` cria instâncias com nome `onedrip_49e47da50de6`
- Mas o usuário já tem uma instância `cookie1` rodando e conectada na Evolution GO
- O webhook recebe eventos de `cookie1`, mas o CRM procura `onedrip_49e47da50de6` no banco
- Resultado: o CONNECTION_UPDATE de `cookie1` nunca atualiza o registro correto

### 2. Status nunca atualizado após QR scan
- A edge function marca `is_active: false` e status `created` no início
- Depois de retornar o QR, não há mecanismo para atualizar quando o usuário escaneia
- O webhook deveria fazer isso via `CONNECTION_UPDATE`, mas só funciona se o nome da instância bater

## Solução

### Passo 1 — `whatsapp-qr-connect`: detectar instância já conectada
Antes de criar uma nova instância, buscar TODAS as instâncias via `GET /instance/all` e verificar se alguma já está `open/connected`. Se sim:
- Salvar o nome real da instância (ex: `cookie1`) no `whatsapp_settings` e `whatsapp_instances`
- Marcar `is_active: true` e status `open`
- Retornar `already_connected: true` imediatamente

### Passo 2 — `whatsapp-qr-connect`: usar nome real ao criar
Quando criar instância nova, garantir que o nome salvo no banco é exatamente o mesmo que a Evolution GO conhece, para que os webhooks de CONNECTION_UPDATE façam match.

### Passo 3 — `whatsapp-qr-connect`: polling de status após QR
Depois de retornar o QR code com sucesso, adicionar um campo `instance_name` na resposta para que o frontend saiba qual instância monitorar. O frontend já faz polling via `useWhatsAppConnectionStatus` com `pollMs: 3000` quando o QR está visível.

### Passo 4 — Webhook: melhorar matching de instância
No `whatsapp-webhook`, quando receber CONNECTION_UPDATE, também tentar match por `whatsapp_settings.evolution_instance_id` além de `whatsapp_instances.instance_name`.

### Passo 5 — Frontend: usar instância `cookie1` existente
O `WhatsAppConnector` já usa `useWhatsAppConnectionStatus` com polling de 3s quando QR visível. Quando o banco atualizar (via webhook ou via detecção na edge function), o status mudará automaticamente.

## Arquivos a alterar
- `supabase/functions/whatsapp-qr-connect/index.ts` — detectar instância existente conectada, usar nome real
- `supabase/functions/whatsapp-webhook/index.ts` — melhorar resolução de instância no CONNECTION_UPDATE

## Resultado esperado
1. Se `cookie1` já está conectada → CRM mostra "WhatsApp conectado (cookie1)" imediatamente
2. Se criar nova instância → após scan do QR, webhook atualiza status e CRM reflete em ~3s

