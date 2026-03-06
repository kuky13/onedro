

## Plano: Melhorar conexão com a VPS (api.kuky.help)

### Analise do estado atual

O guia enviado aponta 3 problemas que o frontend precisa resolver:

1. **Falta `apiPost`**: O `apiClient.ts` só tem `apiGet`. Não existe método POST/PUT/DELETE para criar/atualizar orçamentos via VPS.
2. **Sem health check na inicialização**: Não existe `useApiStatus` hook. O `VpsMonitorPage` faz health check mas é só para admin, não para o app inteiro.
3. **Sem tratamento de "offline"**: Quando a VPS falha (visto no network: `GET /api/budgets → Error: Failed to fetch`), não há fallback nem indicação visual para o usuário.

### Correções

#### 1. Adicionar `apiPost`, `apiPut`, `apiDelete` ao `apiClient.ts`
Criar métodos genéricos que seguem o mesmo padrão do `apiGet` (envelope `{ success, data }`, timeout, JWT).

#### 2. Criar hook `useApiStatus` 
Hook que faz health check na inicialização do app e periodicamente (a cada 60s). Expõe `isVpsOnline` para outros componentes. Rota: `GET /api/health`.

#### 3. Criar `VpsStatusBanner` component
Banner discreto no topo quando a VPS está offline, informando o usuário que algumas funcionalidades (downloads, orçamentos VPS) podem estar indisponíveis.

#### 4. Adicionar retry com backoff ao `apiClient`
Quando uma requisição falha por rede (não por 4xx), tentar novamente 1x com delay de 1.5s antes de lançar o erro.

#### 5. Atualizar `budgetsApi` e `clientsApi`
Adicionar métodos `create`, `update`, `delete` usando os novos `apiPost`/`apiPut`/`apiDelete`.

### Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `src/services/api/apiClient.ts` | Adicionar `apiPost`, `apiPut`, `apiDelete` + retry |
| `src/hooks/useApiStatus.ts` | Novo - health check periódico |
| `src/components/VpsStatusBanner.tsx` | Novo - banner de status offline |
| `src/services/api/budgetsApi.ts` | Expandir com create/update/delete |
| `src/services/api/clientsApi.ts` | Expandir com create/update/delete |
| `src/App.tsx` ou layout principal | Montar `VpsStatusBanner` + `useApiStatus` |

