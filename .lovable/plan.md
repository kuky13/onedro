

## Plano: Redesign Mobile-First do Dashboard (`/dashboard`)

### Analise Atual

O dashboard atual (`DashboardLite.tsx`) é composto por 4 componentes principais:
1. **`DashboardLiteStatsEnhanced`** — Header com saudação, search bar (Drippy), versão, badge de role, PWA banner
2. **`DashboardLiteQuickAccessEnhanced`** — Grid 2x4 de botões de acesso rápido dentro de um GlassCard
3. **`DashboardLiteLicenseStatus`** — Card de status de licença com estilo antigo (`rounded-lg`, botões sem `rounded-xl`)
4. **`DashboardLiteHelpSupport`** — Card de dicas rápidas simples

### Problemas Identificados
- **Stats header** usa padding inline complexo com safe-area que cria espaçamento inconsistente; versão "🫐 v2.9.0" hardcoded com cor branca fixa
- **Quick Access** usa `GlassCard` genérico enquanto as páginas inspiração (Worm, Service Orders) usam layout limpo `max-w-7xl mx-auto px-4 lg:px-8`
- **License Status** usa `rounded-lg` e botões com estilo antigo (cores hardcoded `bg-green-600`, `bg-blue-600`) fora do padrão premium (`rounded-2xl`, `border-border/50`)
- **Help Support** é muito básico — card com `border-dashed` não combina com o design premium

### Mudanças Propostas

**Inspiração**: Layout do `/service-orders` e `/worm` — container `max-w-7xl`, hero section com título grande, cards `rounded-2xl border-border/50`, espaçamento `py-6 lg:py-10`.

#### 1. `DashboardLiteStatsEnhanced.tsx` — Header Premium
- Remover `GlassCard` wrapper, usar layout direto como `/service-orders` hero
- Saudação com tipografia maior `text-3xl lg:text-4xl font-bold tracking-tight`
- Subtítulo `text-muted-foreground` elegante
- Badge de role com design `rounded-xl bg-primary/10 text-primary`
- Mover versão para badge discreto `text-xs`
- Manter DrippySearchBar e PWAInstallBanner

#### 2. `DashboardLiteQuickAccessEnhanced.tsx` — Grid Modernizado
- Remover `GlassCard` wrapper
- Cards individuais com `rounded-2xl border border-border/50 hover:border-primary/30` (estilo landing page)
- Ícones em circles `rounded-xl bg-{color}/10` ao invés de `bg-muted/30 rounded-2xl`
- Grid `grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4`
- Altura dos cards ajustada para mobile `h-28` com mais breathing room

#### 3. `DashboardLiteLicenseStatus.tsx` — Card Premium
- Wrapper `rounded-2xl border-border/50` consistente
- Botões com `rounded-xl` ao invés de `rounded-lg`
- Substituir cores hardcoded por classes do design system (`btn-premium`, `bg-primary`)
- Ícone de status em circle `w-10 h-10 rounded-xl`
- Informações da licença em layout mais limpo

#### 4. `DashboardLiteHelpSupport.tsx` — Dicas Modernas
- Remover `border-dashed`, usar `rounded-2xl border-border/50`
- Adicionar ícone em circle no header
- Items com `rounded-xl bg-muted/20 p-3` ao invés de bullets simples

#### 5. `DashboardLite.tsx` — Layout Container
- Mobile: `px-4 space-y-6` (consistente com service-orders/worm)
- Remover padding excessivo do container

### Resumo de Impacto

- **5 arquivos modificados** (apenas visual, zero impacto funcional)
- Design alinhado com `/service-orders`, `/worm` e landing page
- Melhor experiência em iPhone (tipografia, espaçamento, touch targets)

