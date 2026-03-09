
# Fix: Preview da Etiqueta Térmica Cortado

## Problema
O container do preview tem `max-h-[50vh]` que é insuficiente para mostrar a etiqueta completa (especialmente com o QR Code grande). O conteúdo fica cortado na parte inferior.

## Solução

**Arquivo:** `src/components/printing/PrintLabelDialog.tsx`

### 1. Preview container (linha 305)
- Aumentar altura máxima: `max-h-[60vh] sm:max-h-[500px]` (de 50vh/400px)
- Manter overflow para casos extremos

### 2. ThermalLabel component (linha 54-71)
- Adicionar `maxWidth` baseado no size: 280px para 58mm, 380px para 80mm
- Isso evita que a etiqueta ocupe toda a largura e fique desproporcional, centralizando melhor no container
