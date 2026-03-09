

# Tornar /docs Pública + Adicionar Botões de Documentação

## 1. Tornar /docs acessível sem login

**3 arquivos:**
- `src/App.tsx` (linha 278-280): Remover `UnifiedProtectionGuard` e `AppShell` do `/docs`, renderizar `<HelpCenterPage />` diretamente (como `/plans`)
- `src/middleware/routeMiddleware.ts` (linha 92): Remover a entrada `/docs` das rotas protegidas
- `src/config/routeConfig.ts`: Já está na lista `publicRoutes` (linha 40) -- ok, nada a fazer

## 2. Adicionar botão "Documentação" nas páginas públicas

**Landing (`src/pages/Index.tsx`):**
- No footer (linhas 527-538), adicionar link `/docs` junto com Termos, Privacidade e Cookies

**PlansPage (`src/plans/PlansPage.tsx`):**
- No footer (linhas 293-311), adicionar botão `/docs` "Documentação" na lista de links

**CheckoutPage (`src/plans/components/CheckoutPage.tsx`):**
- No footer (linhas 437-445), adicionar botão `/docs` "Documentação" na segunda linha de links

