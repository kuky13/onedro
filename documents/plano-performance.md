# Plano de Otimização de Performance - One Drip

Este plano visa melhorar a performance, velocidade e agilidade da aplicação, focando em Core Web Vitals, otimização de carregamento, cache e eficiência de dados.

## 1. Diagnóstico Atual

- **Framework**: React 18 + Vite 5
- **Estado**: Zustand + TanStack Query v5
- **Build**: Code splitting manual básico configurado.
- **PWA**: Service Worker personalizado com estratégias de cache (Cache First, Network First).
- **Imagens**: Uso de `browser-image-compression` no client-side.
- **Supabase**: Autenticação persistente, mas queries precisam de revisão para otimização.

## 2. Core Web Vitals & Otimização de Carregamento

### LCP (Largest Contentful Paint)
- **Ação**: Identificar o elemento LCP (provavelmente o banner ou stats do dashboard).
- **Ação**: Adicionar `fetchPriority="high"` para a imagem LCP.
- **Ação**: Remover `loading="lazy"` da imagem LCP (lazy load apenas para imagens abaixo da dobra).
- **Ação**: Pré-carregar fontes críticas e usar `font-display: swap` para evitar FOIT (Flash of Invisible Text).

### CLS (Cumulative Layout Shift)
- **Ação**: Garantir que todas as imagens e contêineres de mídia tenham `width` e `height` (ou `aspect-ratio`) explícitos no CSS/Tailwind.
- **Ação**: Reservar espaço para componentes carregados dinamicamente (Skeleton screens com tamanho fixo).

### INP (Interaction to Next Paint)
- **Ação**: Verificar tarefas longas no main thread. Otimizar `useEffect` pesados.
- **Ação**: Utilizar `useTransition` ou `useDeferredValue` do React 18 para atualizações de estado não urgentes (ex: filtros de busca).

### Bundle Size & Code Splitting
- **Ação**: Refinar a configuração de `manualChunks` no `vite.config.ts`.
- **Ação**: Analisar o bundle com `rollup-plugin-visualizer` para identificar dependências gigantes.
- **Ação**: Verificar importações de ícones (`lucide-react`). Garantir que o tree-shaking está funcionando (importar de `lucide-react` e não sub-caminhos se possível, ou vice-versa dependendo da config).

## 3. Estratégias de Cache (Agressivo)

### Service Worker (`public/sw.js`)
- **Problema Identificado**: A função `staleWhileRevalidateStrategy` existe mas não é usada no listener `fetch`.
- **Ação**: Implementar `stale-while-revalidate` para rotas de API de leitura (GET) que não exigem tempo real estrito (ex: configurações do app, planos, textos estáticos).
- **Ação**: Adicionar versionamento de cache mais robusto para garantir atualização quando houver deploy.

### TanStack Query
- **Ação**: Aumentar `staleTime` para dados que mudam pouco (ex: Perfil do Usuário, Configurações do Sistema) para `Infinity` ou 1 hora.
- **Ação**: Implementar `PersistQueryClientProvider` para salvar o cache no `localStorage` ou `IndexedDB`. Isso permite que o app carregue instantaneamente com dados da sessão anterior enquanto revalida em background.

## 4. Otimização de Imagens e Mídia

- **Build-time**: Integrar `vite-plugin-image-optimizer` para comprimir assets estáticos (logo, ícones) durante o build.
- **Runtime**:
  - Utilizar formato **WebP** ou **AVIF** para uploads de usuários (Edge Function para conversão ou usar transformação de imagem do Supabase se disponível/pago).
  - Implementar tamanhos responsivos (`srcset`) para evitar carregar imagens 4K em celulares.

## 5. Supabase & Dados

### Consultas (TanStack Query + Supabase Client)
- **Ação**: Revisar todos os `useQuery`. Garantir que estamos selecionando apenas os campos necessários (`.select('id, nome, status')` ao invés de `.select('*')`).
- **Ação**: Usar paginação no backend (limit/range) para listas longas (Service Orders, Logs).

### Banco de Dados
- **Ação**: Criar índices para colunas frequentemente usadas em filtros e ordenação:
  - `service_orders(user_id, status, created_at)`
  - `clients(user_id, name)`
  - `budgets(user_id, status)`

### Edge Functions
- **Ação**: Verificar "Cold Starts". Manter funções quentes se crítico, ou reescrever lógica simples em Postgres Functions (PL/pgSQL) para evitar overhead de HTTP da Edge Function.

## 6. Cronograma de Execução

1.  **Fase 1 (Imediato - Quick Wins)**:
    - Ajustar `vite.config.ts` (chunks).
    - Corrigir `sw.js` para usar Stale-While-Revalidate.
    - Ajustar `staleTime` no TanStack Query.
2.  **Fase 2 (Imagens & LCP)**:
    - Otimização de imagens LCP.
    - Instalar plugin de otimização de imagem no build.
3.  **Fase 3 (Dados & Estrutura)**:
    - Refatorar queries do Supabase (select específicos).
    - Aplicar persistência no QueryClient.
    - Criar índices no banco.
