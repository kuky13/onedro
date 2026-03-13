

## Problema

Na rota `/testar/:token` em iPhone (modo PWA), o conteúdo fica cortado porque o `#root` tem padding de safe-area definido em CSS no `index.html` com regras de alta especificidade (`@supports`, `@media`). O `FullscreenWrapper` tenta remover via JS, mas as regras CSS com `max(env(...), 44px)` e `max(env(...), 59px)` sobrescrevem o inline style em alguns casos.

## Solução

Adicionar no `FullscreenWrapper` um `useEffect` que injeta uma tag `<style>` global com regras de alta prioridade (`!important`) para zerar todo o padding do `#root` quando a página de teste está ativa. Isso garante que nenhuma regra CSS (incluindo as de `@supports` e `@media`) force padding.

### Mudanças em `src/components/device-test/FullscreenWrapper.tsx`

Substituir o `useEffect` atual (linhas 37-53) que manipula `root.style.*` por um que injete um `<style>` element no `<head>`:

```typescript
useEffect(() => {
  const style = document.createElement('style');
  style.id = 'fullscreen-wrapper-override';
  style.textContent = `
    #root {
      padding: 0 !important;
      margin: 0 !important;
      min-height: 100dvh !important;
      max-width: 100vw !important;
    }
  `;
  document.head.appendChild(style);
  return () => { style.remove(); };
}, []);
```

Também remover o `max-width: 1280px` do `App.css` `#root` que pode limitar a largura — isso já será coberto pelo `!important` acima apenas quando o wrapper está ativo.

### Arquivo modificado
- `src/components/device-test/FullscreenWrapper.tsx` — 1 useEffect substituído

