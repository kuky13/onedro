
# Melhorar Pop-up de Impressão no Mobile (/worm)

## Problema
O `DialogContent` tem largura fixa (`sm:max-w-md`) e o preview usa larguras fixas em pixels (280px/380px), causando cortes horizontais em telas pequenas.

## Solução

### 1. DialogContent - Ajustar para mobile
- Adicionar margens laterais mínimas: `mx-4` 
- Altura máxima mais adaptativa: `max-h-[85vh]` (evitar corte pelo teclado/navbar)
- Largura responsiva: `w-[calc(100vw-32px)] sm:max-w-md`

### 2. Preview Container - Scroll horizontal
- Trocar `overflow-auto` para `overflow-x-auto overflow-y-auto`
- Altura dinâmica mobile: `max-h-[50vh] sm:max-h-[400px]`
- Padding menor no mobile: `p-2 sm:p-4`

### 3. GroupBudgetPreview - Escalar em mobile
- Largura máxima responsiva: `max-w-full`
- Usar `transform: scale()` ou CSS `width: min(280px, 100%)` para 58mm e `min(380px, calc(100vw - 80px))` para 80mm

### 4. Tabs - Compactar
- Texto menor em mobile: `text-xs sm:text-sm`

## Arquivo a modificar
- `src/components/worm/PrintGroupDialog.tsx`
