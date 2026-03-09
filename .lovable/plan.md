

# Diagnóstico e Plano de Otimização de Performance

## Problemas Identificados

### 1. Chamadas RPC de Licença Duplicadas (CRÍTICO)
Na inicialização, o sistema faz **3-6 chamadas** simultâneas a `get_user_license_status`:
- `useLicenseVerification` (no `UnifiedProtectionGuard`)
- `routeMiddleware.canAccessRoute()` (no `UnifiedProtectionGuard`)
- `routeMiddleware.checkLicenseStatus()` (verificação periódica imediata no `UnifiedProtectionGuard`)
- `LicenseStatusMonitor` (polling a cada 2 min + realtime)
- React StrictMode dobra tudo em dev

Cada `UnifiedProtectionGuard` renderizado cria **seus próprios** intervalos de 5 min. Como há múltiplas rotas aninhadas, isso multiplica.

### 2. SecurityAuditLogger Falhando (DESPERDÍCIO)
O `securityAuditLogger` posta para `site_events` e recebe **HTTP 400** (`PGRST102: All object keys must match`). O circuit breaker eventualmente para, mas antes disso gera requests inúteis e logs de warning.

### 3. Fetch externo ao `api.ipify.org` no boot
O `securityAuditLogger` faz `fetch('https://api.ipify.org?format=json')` na inicialização para obter o IP do cliente — bloqueia e adiciona latência.

### 4. Imports Estáticos Desnecessários no Bundle Principal
No `App.tsx`, estes são importados estaticamente mas poderiam ser lazy:
- `Index` (landing page — só precisa na rota `/landing`)
- `AuthPage`, `SignUpPage`, `SignPage`, `PlansPage` (só precisam em rotas de auth)
- `SmartNavigation` (wrapper com `routeMiddleware` + `broadcast-channel`)
- `IOSRedirectHandler` — **retorna `null`**, é código morto

### 5. `broadcast-channel` Carregado Eagerly
`multiTabCache.ts` importa `broadcast-channel` no topo, puxando a lib inteira para o bundle principal.

### 6. Token Rotation a Cada 1 Minuto
`useTokenRotation` verifica `supabase.auth.getSession()` a cada 60s — o Supabase SDK já faz refresh automático.

### 7. Logging Excessivo em Produção
Console logs em produção (`🔄 Verificação periódica de licença configurada`, `🔍 Iniciando monitoramento`, etc.) são guardados com `devLog` em alguns lugares, mas vários `console.log` diretos continuam ativos.

---

## Plano de Otimização

### Fase 1 — Eliminar Chamadas Duplicadas de Licença
**Arquivo:** `src/components/UnifiedProtectionGuard.tsx`
- Remover a chamada imediata `performPeriodicLicenseCheck()` na montagem (linha 216) — já existe `checkRouteProtection()` que faz a mesma coisa
- Aumentar o intervalo periódico de 5 min para **15 min** (o realtime do `LicenseStatusMonitor` já cobre mudanças)
- Remover o log de `securityLogger.logUserActivity` dentro do check periódico (gera writes desnecessários)

**Arquivo:** `src/hooks/useLicenseVerification.ts`
- Aumentar `cacheTTL` padrão de 5 min para **10 min**
- O `routeMiddleware` já tem seu próprio cache de licença; não precisam competir

**Arquivo:** `src/middleware/routeMiddleware.ts`
- Aumentar o TTL do cache interno de licença para alinhar com 10 min

### Fase 2 — Remover Código Morto e Cargas Desnecessárias
**Arquivo:** `src/App.tsx`
- Remover `IOSRedirectHandler` (retorna `null`)
- Converter `Index`, `AuthPage`, `SignUpPage`, `SignPage`, `PlansPage` para `lazyWithRetry`
- Lazy-load `SmartNavigation`

**Arquivo:** `src/utils/securityAuditLogger.ts`
- Remover o fetch ao `api.ipify.org` — usar `'unknown'` diretamente (IP deve vir do backend, não do cliente)
- Como o `site_events` retorna 400, desabilitar o flush até a tabela ser corrigida (circuit breaker imediato)

### Fase 3 — Reduzir Polling e Intervalos
**Arquivo:** `src/hooks/useTokenRotation.ts`
- Aumentar `checkInterval` padrão de 1 min para **5 min** (Supabase SDK já faz auto-refresh)

**Arquivo:** `src/components/LicenseStatusMonitor.tsx`
- Aumentar polling fallback de 2 min para **10 min** (já tem realtime como principal)

### Fase 4 — Lazy-load broadcast-channel
**Arquivo:** `src/services/multiTabCache.ts`
- Importar `BroadcastChannel` com `import()` dinâmico, só quando necessário

---

## Resumo de Impacto Esperado

| Otimização | Efeito |
|---|---|
| Eliminar RPCs duplicadas | -4 a -8 requests HTTP no boot |
| Remover ipify.org fetch | -1 request + ~200ms de latência |
| Lazy-load páginas auth/landing | -30-50KB do bundle inicial |
| Remover IOSRedirectHandler | Código morto eliminado |
| Reduzir intervalos de polling | Menos CPU/rede em background |
| Desabilitar securityAuditLogger flush | Elimina requests 400 falhando |

**Arquivos modificados:** `src/App.tsx`, `src/components/UnifiedProtectionGuard.tsx`, `src/hooks/useLicenseVerification.ts`, `src/middleware/routeMiddleware.ts`, `src/hooks/useTokenRotation.ts`, `src/components/LicenseStatusMonitor.tsx`, `src/utils/securityAuditLogger.ts`, `src/services/multiTabCache.ts`

