

# Remover botão transparente na página /docs

## Problema
Na lista de categorias do HelpCenter, há uma entrada duplicada e incompleta na linha 842:
```js
{ id: 'suporte' }
```
Essa entrada não tem `label` nem `icon`, gerando um botão vazio/transparente visível na interface (circulado em vermelho no screenshot).

## Solução
Remover essa entrada duplicada em `src/pages/HelpCenterPage.tsx` (linha 841-842), mantendo apenas a entrada completa de "Suporte" que já existe nas linhas 834-836.

