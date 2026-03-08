

## Plano: Criar página /teste-rapido com Checklist de Funcionamento (sem salvar)

### Resumo
Criar uma página standalone em `/teste-rapido` que reutiliza o `DeviceChecklist` e `ChecklistTestRunner` existentes, mas sem salvar nada no banco. Substituir o botão "Garantias" no dashboard por "Teste Rápido" apontando para essa nova rota. Adicionar também na página `/apps`.

### Alterações

**1. Criar `src/pages/TesteRapidoPage.tsx`**
- Página standalone que renderiza o `DeviceChecklist` com estado local (useState)
- O `onChange` apenas atualiza o state local, sem chamadas ao Supabase
- Botão de voltar no topo, título "Teste Rápido de Funcionamento"
- Botão de reset para limpar todos os campos
- O `ChecklistTestRunner` (diagnóstico automático) funciona normalmente pois já é client-side

**2. Registrar rota em `src/App.tsx`**
- Adicionar `Route path="/teste-rapido"` com `AppShell`, `UnifiedProtectionGuard` e `MaintenanceGuard`

**3. Atualizar `src/components/lite/enhanced/DashboardLiteQuickAccessEnhanced.tsx`**
- Substituir o item `warranties` (Garantias/Shield) por `teste-rapido` (Teste Rápido/Smartphone)
- Adicionar rota `/teste-rapido` no mapa de rotas

**4. Atualizar `src/pages/AppsPage.tsx`**
- Substituir ou adicionar entrada "Teste Rápido" com ícone Smartphone apontando para `/teste-rapido`

