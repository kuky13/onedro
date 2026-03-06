

## Plano: Substituir Lovable AI por provedores próprios (Claude, DeepSeek, Gemini) em TODO o site

### Analise completa - Onde a Lovable AI é usada

| Edge Function | O que faz | Usa Lovable AI? |
|---|---|---|
| `chat-ai` | Chat Drippy principal | Sim (mas já suporta DeepSeek/Gemini via `getAIConfiguration`) |
| `whatsapp-zapi-orcamentos` | Parser de orçamentos via WhatsApp | Sim (hardcoded `LOVABLE_API_KEY`) |
| `analyze-budgets` | Análise de orçamentos com tool calling | Sim (hardcoded `LOVABLE_API_KEY`) |
| `triage-ai` | Triagem de suporte via WhatsApp | Sim (hardcoded `LOVABLE_API_KEY`) |

**Problema central**: Só o `chat-ai` lê a config de `drippy_settings`. Os outros 3 edge functions ignoram a configuração e usam Lovable AI diretamente.

### Alterações

#### 1. Criar shared helper `_shared/ai-provider.ts`
Extrair a lógica de `getAIConfiguration` + `callAI` do `chat-ai` para um módulo compartilhado que todas as edge functions possam usar. Incluir suporte a **Claude (Anthropic)** como novo provider.

Providers suportados:
- **Claude** (Anthropic): `https://api.anthropic.com/v1/messages` com header `x-api-key` e `anthropic-version`
- **DeepSeek**: `https://api.deepseek.com/v1/chat/completions` (OpenAI-compatible)
- **Gemini Direct**: `https://generativelanguage.googleapis.com/v1beta/...`
- **Lovable AI**: `https://ai.gateway.lovable.dev/v1/chat/completions` (fallback)

#### 2. Atualizar os 3 edge functions hardcoded
- **`whatsapp-zapi-orcamentos`**: Substituir `callGeminiViaLovable` para usar o shared helper
- **`analyze-budgets`**: Substituir chamada direta para usar o shared helper
- **`triage-ai`**: Substituir chamada direta para usar o shared helper

Todos passam a ler `drippy_settings` + `api_keys` do Supabase para saber qual provider usar.

#### 3. Adicionar Claude aos providers disponíveis

**`src/services/drippyConfigService.ts`**: Adicionar provider `claude` com modelos:
- `claude-sonnet-4-20250514` (Claude Sonnet 4)
- `claude-3-5-haiku-20241022` (Claude 3.5 Haiku - rápido)

**`src/components/super-admin/drippy/ApiKeysManager.tsx`**: Adicionar `anthropic`/`claude` na lista SERVICES.

**`src/components/super-admin/drippy/ProviderSelector.tsx`**: Adicionar ícone para claude.

**`src/hooks/useDrippySettings.ts`**: Expandir tipo do provider para incluir `'claude'`.

#### 4. Criar tabela `ai_request_logs` + UI de logs no /supadmin/drippy

**Migration SQL**:
```sql
create table public.ai_request_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  provider text not null,
  model text not null,
  source text not null default 'unknown', -- 'chat', 'whatsapp', 'analyze', 'triage'
  input_tokens int,
  output_tokens int,
  duration_ms int,
  status text not null default 'success', -- 'success', 'error'
  error_message text,
  user_id uuid references auth.users(id),
  metadata jsonb default '{}'
);
alter table public.ai_request_logs enable row level security;
```

**Shared helper**: Após cada chamada AI, registrar automaticamente na tabela `ai_request_logs`.

**Nova aba "Logs" no DrippyManagement.tsx**: Tabela com filtros por provider, source, status, data. Mostrar:
- Timestamp, provider, modelo, source, tokens (in/out), duração, status
- Resumo com totais por provider e contagem de erros

#### 5. Atualizar `chat-ai/index.ts`
- Adicionar case `claude` no switch de providers com formato Anthropic Messages API
- Importar shared helper ou manter inline (já tem a lógica, só falta Claude)

### Arquivos alterados

| Arquivo | Tipo |
|---|---|
| `supabase/functions/_shared/ai-provider.ts` | Novo - helper centralizado |
| `supabase/functions/chat-ai/index.ts` | Editar - adicionar Claude + logging |
| `supabase/functions/whatsapp-zapi-orcamentos/index.ts` | Editar - usar config dinâmica |
| `supabase/functions/analyze-budgets/index.ts` | Editar - usar config dinâmica |
| `supabase/functions/triage-ai/index.ts` | Editar - usar config dinâmica |
| `src/services/drippyConfigService.ts` | Editar - adicionar Claude |
| `src/components/super-admin/drippy/ApiKeysManager.tsx` | Editar - adicionar Claude/Anthropic |
| `src/components/super-admin/drippy/ProviderSelector.tsx` | Editar - ícone Claude |
| `src/hooks/useDrippySettings.ts` | Editar - tipo provider |
| `src/components/super-admin/DrippyManagement.tsx` | Editar - aba Logs |
| `src/components/super-admin/drippy/AiLogsViewer.tsx` | Novo - componente de logs |
| Migration SQL | Novo - tabela `ai_request_logs` |

