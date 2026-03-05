# 🗺️ Mapa de Rotas e Guards

Todas as rotas são registradas em `src/App.tsx` usando **React Router DOM v6**.

---

## 🛡️ 1. Guards (HOCs de Proteção)

> [!NOTE]
> Os Guards são Higher Order Components que envolvem as páginas para ditar regras de acesso.

### `UnifiedProtectionGuard`
- Verifica se o `AUTH.UID()` está ativo na sessão.
- Valida a licença comercial no cache local ou no Supabase.
- Se a licença estiver expirada → Redireciona violentamente para `/licenca`.
- **Uso**: Envolve praticamente todas as rotas do painel principal (SaaS).

### `AdminGuard`
- Herda as verificações do `UnifiedProtectionGuard`.
- Exige que o cargo (`role`) do usuário seja `"admin"` ou que a *flag* `is_god` seja `true`.
- **Uso**: Protege `/supadmin` e rotas administrativas confidenciais da loja.

### `MaintenanceGuard`
- Consulta *flags* globais do sistema (Kowalski System).
- Se o modo de manutenção estiver ativo → Exibe a tela de manutenção e tranca o acesso.
- **Uso**: Bloqueia acesso a todas as rotas protegidas em momentos de Deploy.

### `MobileMenuProvider` (Extra)
- Não é exatamente um guard, mas um Context Provider que também envolve rotas do *dashboard*.
- Gerencia o estado do menu lateral mobile (Aberto/Fechado).
- Fornece o hook `useMobileMenu()` aos componentes filhos.

---

## 📍 2. Tabela de Rotas Principais

| Rota | Componente | Guard Usado | LazyLoad |
|------|-----------|-------|:------:|
| `/` | `Index` | Nenhum (Público) | ❌ |
| `/landing` | `LandingPage` | Nenhum | ✅ |
| `/auth` | `AuthPage` | Nenhum | ✅ |
| `/licenca` | `LicensePage` | Só Auth (Sem checar validade) | ✅ |
| `/dashboard` | `Dashboard` | Unified | ✅ |
| `/reparos` | `ServiceOrders` | Unified | ✅ |
| `/reparos/:id` | `ServiceOrderDetail` | Unified | ✅ |
| `/worm` | `WormPage` | Unified | ✅ |
| `/worm/pdf-config` | `WormPdfConfigPage` | Unified | ❌ |
| `/loja/:slug` | `PublicStorePage` | Nenhum (Público) | ✅ |
| `/admin` | `AdminPage` | Unified | ✅ |
| `/supadmin` | `SuperAdminPage` | AdminGuard | ✅ |

---

## 🔄 3. Fluxo de Redirecionamentos Lógicos

> [!TIP]
> A esteira de verificação quando o app é montado no celular/desktop ocorre da seguinte forma:

```text
Usuário Tenta Acesso
  └─→ Não autenticado? → Redireciona para /auth (Login/Cadastro)
         └─→ Logou? Sem licença válida?
              └─→ /licenca (Tela de bloqueio para Ativar/Comprar)
                   └─→ Pagou / Licença ativou automaticamente via Webhook
                        └─→ Acesso liberado para /dashboard e /reparos
```

---

## 📝 4. Como Adicionar Uma Nova Rota

1.  **Crie o componente da tela** na pasta `src/pages/NovaPagina.tsx`.
2.  No arquivo `App.tsx`, importe o componente de forma "preguiçosa" para não atrasar o carregamento inicial do app:
    ```tsx
    const NovaPagina = lazyWithRetry(() => import("./pages/NovaPagina"));
    ```
3.  **Adicione a `<Route>`** dentro do guard apropriado:
    ```tsx
    <Route path="/nova-pagina" element={
      <UnifiedProtectionGuard>
        <NovaPagina />
      </UnifiedProtectionGuard>
    } />
    ```
4.  *Observação:* Se for uma página pública que não exige estar logado (ex: Termos de Uso), basta colocar a `<Route>` direto fora dos guards.
