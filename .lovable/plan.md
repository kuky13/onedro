

## Problema

As duas instâncias da logo no `ServiceOrderPublicShare.tsx` têm a classe `bg-white` no `<img>`, que sobrepõe a transparência do PNG.

## Plano

Alterar as duas tags `<img>` da logo (linhas 400 e 786) removendo `bg-white` e `p-1`, e usando `bg-transparent` para preservar a transparência do PNG. Também remover o `border` que fica estranho sem fundo branco.

**Linha 400** (header):
```
bg-white p-1 → bg-transparent
```

**Linha 786** (card de contato):
```
bg-white p-1 → bg-transparent
```

### Arquivo alterado
- `src/components/ServiceOrderPublicShare.tsx`

