

## Problemas Identificados

### 1. Status "in_progress" não detectado no painel
O `DeviceTestPage.tsx` chama `handleTestStart` que faz update do status para `"in_progress"` no Supabase. O `DiagnosticShareDialog` escuta via realtime. O problema é que o update na `DeviceTestPage` é feito pelo **cliente público (anon)**, e a política RLS de UPDATE (`"Public update test results via token"`) usa `USING (share_token IS NOT NULL AND expires_at > NOW() AND status NOT IN ('completed', 'expired'))` — isso deveria funcionar.

Porém, o update em `handleTestStart` (linha 125-132) faz `.eq("id", session.id)` sem verificar se o RLS permite acessar por `id`. A política de SELECT pública (`"Public read via valid token"`) usa `public.is_valid_test_token(share_token)` — que filtra por `share_token`, não por `id`. Então o update pode falhar silenciosamente porque a row não é "visível" para o anon user via `id`.

**Correção**: No `DeviceTestPage.tsx`, alterar os updates para usar `.eq("share_token", session.share_token)` em vez de `.eq("id", session.id)`, garantindo que o RLS match funcione. Também adicionar checagem de erro nos updates de `handleTestStart`.

### 2. QR Code não atualiza ao "Redefinir Link"
Em `handleForceNewSession` (linha 305-316), ao criar nova sessão:
- `diagnosticUrl` é atualizado via `createNewSession`
- Mas `showQR` continua `true` e `qrDataUrl` mantém o QR antigo
- O QR não é regenerado automaticamente com a nova URL

**Correção**: Em `handleForceNewSession`, resetar `qrDataUrl` e `showQR`. Depois que a nova sessão é criada, se o QR estava visível, regenerar automaticamente.

## Plano de Implementação

### Arquivo 1: `src/pages/DeviceTestPage.tsx`
- Alterar `handleTestStart` para usar `.eq("share_token", session.share_token)` e checar erro
- Alterar `handleResultUpdate` para usar `.eq("share_token", session.share_token)`
- Alterar `handleTestComplete` para usar `.eq("share_token", session.share_token)`

### Arquivo 2: `src/components/service-orders/DiagnosticShareDialog.tsx`
- Em `handleForceNewSession`: resetar `qrDataUrl` e `showQR` antes de criar nova sessão
- Após criar nova sessão, se QR estava visível anteriormente, regenerar o QR automaticamente com a nova URL

| Arquivo | Alteração |
|---|---|
| `src/pages/DeviceTestPage.tsx` | Usar `share_token` nos updates em vez de `id` para compatibilidade RLS |
| `src/components/service-orders/DiagnosticShareDialog.tsx` | Resetar e regenerar QR Code ao redefinir link |

