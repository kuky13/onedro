

## Plano: Expandir busca do /worm para mais campos

### Problema
A busca atual só filtra por `client_name`, `device_model` e `device_type`. Pesquisar "tela" ou "bateria" não retorna resultados porque o campo `issue` (ex: "Troca de tela") não é incluído no filtro.

### Correção

**Arquivo**: `src/hooks/worm/useWormBudgets.ts` (linha 77)

Adicionar `issue`, `part_quality`, `notes` e `custom_services` ao filtro `.or()`:

```typescript
const baseOr = [
  `client_name.ilike.%${term}%`,
  `device_model.ilike.%${term}%`,
  `device_type.ilike.%${term}%`,
  `issue.ilike.%${term}%`,
  `part_quality.ilike.%${term}%`,
  `notes.ilike.%${term}%`,
  `custom_services.ilike.%${term}%`
].join(',');
```

Isso faz com que pesquisar "tela" encontre orçamentos com "Troca de tela" no campo `issue`, "bateria" encontre "Troca de bateria", etc.

