

## Plano: Remover /supadmin/dw + Mover /problem e /update para dentro do /supadmin

### 1. Remover rota /supadmin/dw

**Arquivos a modificar:**
- `src/pages/SuperAdminPage.tsx` — Remover import do `DownloadVideoPage` e a `<Route path="dw">` 
- `src/components/super-admin/SuperAdminLayout.tsx` — Remover item "Download Vídeos" do `navigationItems`, remover import `Download` do lucide

**Arquivo a deletar:**
- `src/components/super-admin/DownloadVideoPage.tsx`

> Nota: A rota pública `/downloads` em `App.tsx` usa o mesmo componente via lazy import — essa referência também será removida do `App.tsx`.

---

### 2. Mover /problem para /supadmin/problem

**Arquivos a modificar:**
- `src/App.tsx` — Remover a rota standalone `/problem` (linhas ~200-202) e o lazy import do `ProblemPage`
- `src/pages/SuperAdminPage.tsx` — Adicionar import do `ProblemPage` e nova `<Route path="problem" element={<ProblemPage />} />`
- `src/components/super-admin/SuperAdminLayout.tsx` — Atualizar href do item "Problem" de `/problem` para `/supadmin/problem`

---

### 3. Mover /update para /supadmin/update

**Arquivos a modificar:**
- `src/App.tsx` — Remover a rota standalone `/update` (linhas ~301-303) e o lazy import do `UpdateManagementPage`
- `src/pages/SuperAdminPage.tsx` — Adicionar import do `UpdateManagementPage` e nova `<Route path="update" element={<UpdateManagementPage />} />`
- `src/components/super-admin/SuperAdminLayout.tsx` — Atualizar href do item "Atualizações" de `/update` para `/supadmin/update`

> Nota: Ambas as páginas já estavam protegidas por `AdminGuard` — ao movê-las para dentro do `SuperAdminPage` (que já está dentro de `AdminGuard` no `App.tsx`), a proteção se mantém automaticamente.

---

### Resumo de Impacto

- **1 arquivo deletado** (`DownloadVideoPage.tsx`)
- **3 arquivos modificados** (`App.tsx`, `SuperAdminPage.tsx`, `SuperAdminLayout.tsx`)
- Zero quebra funcional — Problem e Update continuam acessíveis, apenas sob `/supadmin/*`

