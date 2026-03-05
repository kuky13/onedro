

## Análise PageSpeed — Performance 56/100

### Problemas principais identificados

| Métrica | Valor | Meta |
|---|---|---|
| FCP | 9.3s | < 1.8s |
| LCP | 10.8s | < 2.5s |
| JS não utilizado | 806 KiB | — |
| Imagens não otimizadas | 705 KiB | — |
| CSS render-blocking | 830ms | — |

### Causas raiz

1. **Title tag quebrado**: `"One Drip | Orçamentos a partir de ROne Drip | Orçamentos a partir de R$25/mês5/mês"` — texto duplicado/corrompido
2. **Bundle gigante carregado na landing**: `App.tsx` importa estaticamente ~40 páginas (RepairsDashboard, WormPage, ServiceOrders, etc.) que nunca são usadas na landing page
3. **Logos das marcas são PNGs enormes** (Huawei 2000x2006 = 222KB, OPPO 2758x860 = 168KB) exibidos em 35x35px
4. **Font do Google é render-blocking** (preload + stylesheet síncrono)
5. **`vendor-pdf-excel` (254KB)** carregado mesmo na landing page
6. **Preconnect com fonts.gstatic.com** não é usado (fonte vem via CSS do googleapis)

### Plano de correções

#### 1. Corrigir title tag (`index.html`)
Corrigir o texto duplicado no `<title>`.

#### 2. Lazy load massivo no `App.tsx`
Converter ~30 imports estáticos para `lazyWithRetry()`. Manter estáticos apenas: `Index`, `AuthPage`, `SignUpPage`, `SignPage`, `PlansPage` (rotas da landing/auth). Todo o resto (Dashboard, Worm, Repairs, ServiceOrders, etc.) vira lazy.

#### 3. Melhorar code splitting (`vite.config.ts`)
Separar chunks:
- `vendor-react`: react, react-dom, react-router-dom
- `vendor-supabase`: @supabase/supabase-js
- `vendor-ui`: radix, cmdk, sonner, vaul
- `vendor-pdf-excel`: jspdf, xlsx (já existe)
- `vendor`: resto

#### 4. Font loading não-bloqueante (`index.html`)
Trocar `<link rel="preload" ... as="style">` + `<link href="..." rel="stylesheet">` por pattern com `media="print" onload="this.media='all'"` para carregar a fonte sem bloquear render.

#### 5. Otimizar imagens dos logos (`Index.tsx`)
Adicionar `decoding="async"` e dimensões reais menores (`width="35" height="35"`) nos logos do carrossel. Não resolve o tamanho do arquivo (precisaria substituir os PNGs por versões menores), mas reduz o impacto no layout.

#### 6. Preconnect para Supabase (`index.html`)
Trocar `dns-prefetch` por `preconnect` para o domínio Supabase (usado logo na landing para `system_status`).

### Arquivos modificados

| Arquivo | Alteração |
|---|---|
| `index.html` | Fix title, font non-blocking, preconnect supabase |
| `src/App.tsx` | Converter ~30 imports para lazy |
| `vite.config.ts` | Melhorar manualChunks |
| `src/pages/Index.tsx` | Otimizar attrs das imagens dos logos |

### Impacto esperado
- **Bundle inicial**: de ~1.5MB para ~400KB (só react + landing page)
- **FCP/LCP**: melhoria significativa pela redução do JS parser/eval
- **Não quebra**: todas as rotas continuam funcionando via lazy loading

