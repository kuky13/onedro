

## Plano: Unificar Checklist de Funcionamento em todas as páginas

### Problema atual
- **Service Orders** (`ServiceOrderEditForm.tsx` e `ServiceOrderFormPage.tsx`): Usa `DeviceTestIntegration` (sistema de link remoto) em vez do `DeviceChecklist` completo com teste ao vivo
- **Reparos/Garantias** (`RepairsWarranties.tsx`): Não tem checklist/teste nenhum
- **Garantia** (`WarrantyPage.tsx`): Não tem checklist/teste nenhum

### O que será feito

#### 1. Service Orders — Trocar `DeviceTestIntegration` por `DeviceChecklist`
Nos dois arquivos que usam `DeviceTestIntegration`:
- `src/components/service-orders/ServiceOrderEditForm.tsx`
- `src/pages/ServiceOrderFormPage.tsx`

Substituir `DeviceTestIntegration` pelo componente `DeviceChecklist` (o mesmo usado em `/reparos/servicos`), que inclui:
- Checklist manual com categorias (Tela, Áudio, Câmeras, Sensores, Sistema, Extras)
- Botão "Diagnóstico Automático" com `DiagnosticShareDialog` (link/QR para teste remoto)
- `ChecklistTestRunner` para teste ao vivo no próprio dispositivo
- Botões "Tudo OK" e "Limpar"

O `formData.deviceChecklist` já existe no hook `useServiceOrderEdit` e já é salvo no banco. Basta conectar o componente ao state.

#### 2. Garantias — Adicionar `device_checklist` ao banco e UI

**Migration SQL**: Adicionar coluna `device_checklist jsonb` na tabela `warranties`.

**`RepairsWarranties.tsx`** e **`WarrantyPage.tsx`**: Adicionar o componente `DeviceChecklist` dentro de cada card de garantia expandido ou em um dialog de detalhes, permitindo registrar o estado do aparelho na garantia. Salvar/carregar via update na tabela warranties.

**`useWarranties.ts`**: Incluir `device_checklist` no tipo `Warranty` e nas queries/mutations.

### Arquivos modificados

| Arquivo | Alteração |
|---|---|
| Nova migration SQL | `ALTER TABLE warranties ADD COLUMN device_checklist jsonb` |
| `ServiceOrderEditForm.tsx` | Trocar `DeviceTestIntegration` por `DeviceChecklist` conectado a `formData.deviceChecklist` |
| `ServiceOrderFormPage.tsx` | Idem |
| `RepairsWarranties.tsx` | Adicionar `DeviceChecklist` com state local + save para cada garantia |
| `WarrantyPage.tsx` | Idem |
| `useWarranties.ts` | Adicionar `device_checklist` ao tipo e queries |

