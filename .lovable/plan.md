

## Problema: Inputs "fantasma" na página de login

### Causa raiz

O `SessionPersistence` restaura valores salvos nos inputs após 1 segundo usando `input.value = savedValue` + `input.dispatchEvent(new Event('input'))`. Porém, React usa um sistema de eventos sintético interno e **ignora eventos nativos `Event`** em inputs controlados (`value={email}`, `onChange={...}`).

O que acontece:
1. Usuário digita email → React state atualiza normalmente
2. `restoreDrafts` dispara após 1s, seta `input.value` direto no DOM e dispara evento nativo
3. React **não processa** o evento nativo → state continua `''`
4. No próximo render, React sobrescreve o DOM com `value=''` → valor "some"

### Solução

Corrigir o `restoreDrafts` em `SessionPersistence.tsx` para usar o **native value setter** do React, que é o padrão reconhecido para forçar React a detectar mudanças em inputs controlados:

```js
const nativeSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype, 'value'
)?.set || Object.getOwnPropertyDescriptor(
  HTMLTextAreaElement.prototype, 'value'
)?.set;

nativeSetter?.call(input, savedValue);
input.dispatchEvent(new Event('input', { bubbles: true }));
```

Além disso, **excluir a página `/auth`** da restauração de drafts, pois restaurar emails/senhas parciais na tela de login causa mais problemas do que resolve.

### Correção secundária: `fetchPriority` warning

O console mostra `React does not recognize fetchPriority prop`. Em React 18, o atributo correto é `fetchpriority` (lowercase) como atributo HTML. Corrigir em `Index.tsx`.

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/components/SessionPersistence.tsx` | Usar native value setter; excluir rotas `/auth` e `/sign` da restauração |
| `src/pages/Index.tsx` | Corrigir `fetchPriority` → usar spread com atributo HTML correto |

