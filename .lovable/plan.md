

## Plano: Menu Hamburger Global + Trocar "Usuários" por "Planos"

### Problema Atual
- O menu hamburger só existe em 3 páginas: DashboardLite (via AdaptiveLayout), ChatPage e WarrantyPage (manualmente).
- As demais páginas (WormPage, ServiceOrders, Settings, Películas, Store, etc.) não possuem o menu.
- O item "Usuários" precisa ser substituído por "Planos" apontando para `/plans`.

### Solução

**1. Trocar "Usuários" por "Planos" no menu**
- Em `src/hooks/useMobileMenu.ts`, substituir o item `usuarios` por:
  ```
  { id: 'planos', label: 'Planos', icon: 'CreditCard', href: '/plans' }
  ```

**2. Criar um layout wrapper global com o hamburger menu**
- Criar `src/components/layout/AppShell.tsx` — um componente que envolve qualquer página autenticada e adiciona:
  - Header compacto com hamburger button, logo e título
  - O `MobileHamburgerMenu` overlay
  - Wrapped em `MobileMenuProvider`
- O header será fixo no topo, com estilo consistente entre todas as páginas.

**3. Aplicar o AppShell nas rotas do App.tsx**
- Envolver as rotas autenticadas principais (Worm, ServiceOrders, Settings, Películas, Mensagens, Store, Reparos, SuperAdmin, etc.) com o `AppShell`.
- Páginas que já têm o menu manualmente (ChatPage, WarrantyPage) serão refatoradas para usar o AppShell, removendo o código duplicado do hamburger.
- Páginas públicas (Auth, Privacy, Terms, etc.) não recebem o AppShell.

### Estrutura Técnica

```text
App.tsx
 └─ Route /worm → <AppShell><WormPage /></AppShell>
 └─ Route /service-orders → <AppShell><ServiceOrdersPage /></AppShell>
 └─ Route /chat → <AppShell><ChatPage /></AppShell>
 └─ Route /settings → <AppShell>...</AppShell>
 └─ ... (todas as rotas autenticadas)
```

O `AppShell` internamente:
```text
<MobileMenuProvider>
  <header> [Hamburger] [Logo] [Title] ... [Notifications] </header>
  <main>{children}</main>
  <MobileHamburgerMenu />
</MobileMenuProvider>
```

### Arquivos Afetados
- `src/hooks/useMobileMenu.ts` — trocar Usuários → Planos
- `src/components/layout/AppShell.tsx` — **novo** layout wrapper
- `src/App.tsx` — envolver rotas com AppShell
- `src/pages/ChatPage.tsx` — remover hamburger manual duplicado
- `src/pages/WarrantyPage.tsx` — remover hamburger manual duplicado

