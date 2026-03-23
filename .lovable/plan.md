
Objetivo: corrigir o bug em que “as mensagens não aparecem nos logs”, atacando a causa real no backend e no painel.

O que eu encontrei
- O painel “Auditoria” atual lê só a tabela `whatsapp_webhook_events`.
- Essa tabela está praticamente parada: último evento em `2026-03-05`, e os mais recentes ficaram com `owner_not_resolved`.
- A tabela `whatsapp_instances` está vazia agora.
- Já existe tráfego recente de WhatsApp em `whatsapp_zapi_logs` até `2026-03-21`, com vários registros `received_raw` e `processing`.
- Não há logs recentes da edge function `whatsapp-webhook`, então o fluxo que hoje alimenta `whatsapp_webhook_events` não está sendo o caminho principal das mensagens atuais.

Diagnóstico
- Hoje existem 2 trilhas de observabilidade:
  1. `whatsapp_webhook_events` → auditoria do `whatsapp-context`
  2. `whatsapp_zapi_logs` → auditoria robusta do `whatsapp-zapi-orcamentos`
- O seu painel mostra só a trilha 1.
- Como as mensagens recentes estão entrando pela trilha 2, o painel passa a impressão de que “não chegou nada”, mesmo quando chegou.
- Além disso, quando o roteamento depende de `whatsapp_instances`, mensagens podem ser descartadas cedo demais no fluxo legado.

Plano de correção
1. Unificar a visualização de logs no painel
- Atualizar `WebhookEventsViewer.tsx` para mostrar também os registros de `whatsapp_zapi_logs`, ou trocar a fonte principal da aba “Auditoria” para uma visão combinada.
- Exibir origem/tipo do log com clareza:
  - `webhook_events`
  - `zapi_logs`
- Mostrar status úteis como:
  - `received_raw`
  - `processing`
  - `ignored_*`
  - `processed`
  - `budget_created`
  - `reply_sent`

2. Parar de depender só do fluxo legado para auditoria
- Ajustar a experiência da aba “Auditoria” para refletir o caminho que realmente está ativo hoje.
- Se houver eventos em `whatsapp_zapi_logs` e nenhum em `whatsapp_webhook_events`, ainda assim o usuário verá a chegada da mensagem.

3. Corrigir o roteamento/backend para não sumir com mensagens
- Revisar `supabase/functions/whatsapp-webhook/index.ts` para garantir que, quando houver fallback via `whatsapp_zapi_settings`, a observabilidade continue existindo mesmo sem `whatsapp_instances`.
- Revisar `supabase/functions/whatsapp-context/index.ts` para reduzir casos de `owner_not_resolved` e evitar “silêncio” em cenários sem instância provisionada.
- Se necessário, planejo restaurar auto-provisionamento consistente de `whatsapp_instances` a partir de `whatsapp_zapi_settings`.

4. Melhorar os logs mostrados no front
- Incluir colunas como:
  - data/hora
  - evento
  - telefone/chat
  - status
  - erro/motivo
  - origem
- Adicionar filtro por texto e por origem/status para facilitar debug.

5. Corrigir os build errors em paralelo
- Antes de concluir, corrigir os erros listados de TypeScript para o projeto voltar a compilar.
- Arquivos já identificados:
  - `src/components/ServiceOrderPublicShare.tsx`
  - `src/components/site-settings/useSiteSettings.ts`
  - `src/pages/HelpCenterPage.tsx`
  - `src/pages/help-center/helpCenterData.tsx`
  - `src/utils/pdfUtils.ts`

Resultado esperado
- Mensagens novas passam a aparecer na aba de auditoria mesmo quando entram pelo pipeline da IA.
- O painel deixa de “ignorar visualmente” mensagens reais.
- O projeto volta a buildar sem os erros atuais.
- Depois disso, dá para validar se o orçamento específico foi classificado como `ignored_not_budget`, `unsupported_type`, `missing_from` ou outro motivo real, em vez de parecer que não houve entrada nenhuma.

Detalhes técnicos
```text
Hoje:
WhatsApp -> whatsapp-zapi-orcamentos -> whatsapp_zapi_logs
                      \
                       X painel não lê essa tabela

Também existe:
WhatsApp -> whatsapp-webhook -> whatsapp-context -> whatsapp_webhook_events
mas esse fluxo não está registrando os eventos recentes

Correção:
Painel de Auditoria -> ler ambos os logs / visão unificada
Backend -> reduzir descarte silencioso e dependência frágil de whatsapp_instances
```
