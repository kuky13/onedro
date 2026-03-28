
Objetivo: fazer o status sair de “Aguardando conexão…” quase na hora do scan e aparecer como conectado de forma confiável.

Diagnóstico encontrado:
- O frontend já está fazendo polling a cada 4s e isso está disparando corretamente.
- O gargalo real está no backend: `check_status` sempre responde `connected: false`.
- Pelos logs, a instância é criada, o QR é obtido, mas o banco nunca muda de `created` para `open`.
- O webhook `whatsapp-webhook` praticamente não está recebendo/processando `CONNECTION_UPDATE` nesse fluxo.
- O `check_status` atual consulta só `GET /instance/all` e tenta inferir status por `status/connectionStatus`. Isso é frágil: na prática, a Evolution GO pode não refletir o “open” ali com rapidez, ou retornar o estado em outro formato.
- Resultado: o frontend fica preso esperando uma confirmação que nunca chega, mesmo após conectar.

Plano de correção

1. Fortalecer o `check_status` no `whatsapp-qr-connect`
- Manter o `GET /instance/all` como fallback.
- Antes disso, consultar explicitamente o estado da instância com endpoints dedicados, usando o token da própria instância:
  - `GET /instance/status`
  - fallback `GET /instance/status?instanceName=...`
  - fallback legado se necessário
- Normalizar várias respostas possíveis (`open`, `connected`, `online`, `isOpen`, `connected: true`, etc.).
- Se detectar conexão, atualizar imediatamente:
  - `whatsapp_settings.is_active = true`
  - `whatsapp_settings.evolution_instance_id = instanceName`
  - `whatsapp_instances.status = open`
  - `whatsapp_instances.connected_at`
  - `whatsapp_instances.connected_phone` quando disponível

2. Resolver corretamente o token da instância no polling
- No `check_status`, se chegar `instance_name`, buscar em `/instance/all` e resolver o token exato da instância.
- Não depender apenas da chave global para inferir status.
- Isso deixa a verificação alinhada com o padrão já usado no `whatsapp-proxy`.

3. Melhorar a leitura de status da Evolution GO
- Criar um helper de normalização de status.
- Aceitar diferentes formatos de payload da GO, por exemplo:
  - `data.state`
  - `instance.state`
  - `status`
  - `connected`
  - `instance.connected`
  - `connectionStatus`
- Assim o sistema marca conectado mesmo que a API varie o shape da resposta.

4. Tornar a atualização visual mais rápida no frontend
- Reduzir o intervalo do polling enquanto o QR está visível, de 4s para algo mais rápido e seguro, como 2s.
- Quando `check_status` retornar conectado:
  - limpar QR imediatamente
  - invalidar query de status
  - opcionalmente aplicar atualização otimista local do estado para o texto mudar na hora

5. Ajustar o hook `useWhatsAppConnectionStatus`
- Garantir que, ao encontrar `whatsapp_settings.is_active = true`, ele trate isso como conectado mesmo antes de aparecer linha “open” em `whatsapp_instances`.
- Opcionalmente ampliar o fallback para aceitar status transitórios sincronizados pelo polling/backend.

6. Revisar o webhook como complemento, não como dependência principal
- Manter o webhook para eventos assíncronos, mas não depender dele para a UX de conexão.
- Se necessário, ampliar logs e parsing de `CONNECTION_UPDATE`, porém a confirmação principal deve vir do `check_status`.

Resultado esperado
- Após escanear o QR, em cerca de 2–4 segundos a tela troca de:
  `Aguardando conexão…`
  para
  `WhatsApp conectado (...)`
- Mesmo se o webhook falhar, o polling detecta e sincroniza o banco.
- O usuário não fica mais preso no estado de espera.

Arquivos a ajustar
- `supabase/functions/whatsapp-qr-connect/index.ts`
- `src/components/whatsapp-crm/WhatsAppConnector.tsx`
- `src/hooks/useWhatsAppConnectionStatus.ts`

Validação
1. Abrir `/whatsapp-crm`
2. Clicar em conectar e gerar QR
3. Escanear o QR
4. Confirmar que em poucos segundos o QR some
5. Confirmar que aparece “WhatsApp conectado”
6. Confirmar no banco que:
   - `whatsapp_settings.is_active = true`
   - `whatsapp_instances.status = open`
