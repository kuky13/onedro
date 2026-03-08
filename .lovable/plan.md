

## Plano: Remover /security + Redesign Mobile-First do Super Admin

### 1. Remover a página /security e seus componentes

**Arquivos a deletar:**
- `src/pages/Security.tsx`
- `src/components/SecurityDashboard.tsx`
- `src/components/SecuritySettings.tsx`
- `src/hooks/useSecurity.ts`

**Arquivos a modificar:**
- `src/App.tsx` — Remover import e rota `/security`
- `src/components/super-admin/SuperAdminLayout.tsx` — Remover item "Segurança" (`/security`) do `navigationItems`

> Nota: `SecuritySettingsLite.tsx` e `securityAuditLogger.ts` NÃO serão removidos (são usados em outros contextos).

---

### 2. Redesign Mobile-First das páginas Super Admin

Inspirado no estilo da Landing (`Index.tsx`) e Suporte (`SuportePage.tsx`): gradientes sutis, cards com `rounded-2xl`, ícones em círculos `bg-primary/10`, tipografia responsiva `text-lg lg:text-3xl`, espaçamento `px-4 lg:px-8`.

**Padrão de header premium para todas as páginas:**
```text
┌─────────────────────────────────┐
│ [ícone circle]                  │
│ Título Grande                   │
│ Descrição em muted-foreground   │
│ [badge status se aplicável]     │
└─────────────────────────────────┘
```

**Arquivos a modificar (conteúdo interno):**

- **`Dashboard.tsx`** — Header premium com gradiente, métricas em cards `rounded-2xl` com ícones coloridos, licenças em card premium
- **`UserManagement.tsx`** (wrapper) — Adicionar header premium; o `EnhancedUserManagement` interno já é funcional, apenas encapsular com o novo header
- **`PlansManagement.tsx`** — Header premium, cards de planos com `rounded-2xl border-border/50 hover:border-primary/30`, layout responsivo `grid-cols-1 lg:grid-cols-2`
- **`DrippyManagement.tsx`** — Header premium com circle icon, tabs responsivas (empilhadas em mobile via `grid-cols-1 lg:grid-cols-3`), card de info com design moderno
- **`WhatsAppManagement.tsx`** — Header premium, tabs responsivas, cards internos `rounded-2xl`
- **`VpsMonitorPage.tsx`** — Header premium, cards de status `rounded-2xl` com ícones em circles coloridos, layout `grid-cols-1 lg:grid-cols-3`
- **`license/EnhancedLicenseManagement.tsx`** — Header premium wrapper

**Arquivos a modificar (layout/navegação):**

- **`SuperAdminLayout.tsx`** — Mobile sidebar com design premium (items com `rounded-xl`, ícones em circles `bg-primary/10`), header mobile com gradiente sutil

### Padrão de Design Consistente

Cada página seguirá:
- Header: `<div className="space-y-2 mb-6 lg:mb-10">` com ícone em circle `w-12 h-12 rounded-xl bg-primary/10`, título `text-xl lg:text-3xl font-bold`, descrição `text-sm lg:text-base text-muted-foreground`
- Cards: `rounded-2xl border-border/50 bg-card` sem sombras pesadas
- Grids: `grid-cols-1` em mobile, expandindo em `lg:`
- Botões: `rounded-xl` com ícones, full-width em mobile
- Espaçamento: `px-4 lg:px-8`, `gap-3 lg:gap-6`

### Resumo de Impacto

- **4 arquivos deletados** (Security page + componentes + hook)
- **~8 arquivos modificados** (layout + 7 páginas admin)
- Zero impacto funcional — apenas visual + remoção de rota morta

