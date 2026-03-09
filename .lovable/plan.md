

# Otimização de Performance — VPS System + Site Geral

## Problemas Identificados

1. **`VpsStatusBanner`** é importado **estaticamente** no `App.tsx` e renderizado para TODOS os usuários. Ele instancia `useApiStatus`, que faz fetch para `api.kuky.help/api/health` a cada 60s — mesmo para quem nunca usa funcionalidades da VPS.

2. **`VpsMonitorPage`** é importada de forma **eager** (não lazy) no `SuperAdminPage.tsx`, ao contrário de outras páginas como `ProblemPage` e `UpdateManagementPage` que usam `lazyWithRetry`.

3. **`VpsRequestFlow`** (~284 linhas com HoverCard) é importado eagerly dentro do `VpsMonitorPage` — componente pesado e puramente visual.

4. **`useApiStatus`** continua fazendo polling mesmo depois do banner ser dispensado (dismissed) — o estado `dismissed` apenas esconde o JSX, mas o hook continua rodando.

## Plano de Otimização

### 1. Lazy-load do `VpsStatusBanner` no App.tsx
- Envolver com `React.lazy` + `Suspense` para não bloquear o bundle principal
- Reduz o tamanho do chunk inicial

### 2. Tornar `useApiStatus` condicional
- Aceitar um parâmetro `enabled` (default `true`) que, quando `false`, não inicia polling nem faz fetch
- No `VpsStatusBanner`, usar `enabled: !dismissed` para parar o polling quando dispensado

### 3. Lazy-load do `VpsMonitorPage` no SuperAdminPage
- Substituir o import estático por `lazyWithRetry`, como já é feito com `ProblemPage` e `UpdateManagementPage`

### 4. Lazy-load do `VpsRequestFlow` dentro do VpsMonitorPage
- Carregar o componente de fluxo arquitetural só quando a página é aberta, usando `React.lazy`

### Resumo de Impacto

| Mudança | Efeito |
|---|---|
| Lazy VpsStatusBanner | Remove ~3KB+ do bundle inicial |
| useApiStatus condicional | Elimina polling desnecessário quando banner dispensado |
| Lazy VpsMonitorPage | Remove ~10KB do chunk do SuperAdmin |
| Lazy VpsRequestFlow | Remove ~8KB do chunk da VpsMonitorPage |

**Arquivos modificados:** `src/App.tsx`, `src/hooks/useApiStatus.ts`, `src/components/VpsStatusBanner.tsx`, `src/pages/SuperAdminPage.tsx`, `src/components/super-admin/VpsMonitorPage.tsx`

