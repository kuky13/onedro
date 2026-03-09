
# Remover Texto dos Botões "Imprimir" e "Copiar" no /worm

## Análise

Identifiquei os botões circulados na imagem. Eles estão no componente `WormBudgetList.tsx` (linhas 293-310), dentro do header de cada grupo de dispositivo.

**Código atual:**
```tsx
<Button variant="outline" size="sm" className="rounded-xl shrink-0 border-primary/20">
  <Printer className="h-3.5 w-3.5 mr-1.5" />
  Imprimir
</Button>

<Button variant="outline" size="sm" className="rounded-xl shrink-0 border-primary/20 bg-success text-primary-foreground">
  <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
  Copiar
</Button>
```

## Alterações

Transformar os botões em icon-only buttons:
- Remover o texto "Imprimir" e "Copiar"
- Ajustar classe do ícone para remover `mr-1.5` (não precisa mais de margem)
- Usar `size="icon"` ao invés de `size="sm"` para dimensionamento adequado
- Adicionar `title` para acessibilidade (tooltip nativo)

**Código novo:**
```tsx
<Button variant="outline" size="icon" className="h-8 w-8 rounded-xl border-primary/20" title="Imprimir">
  <Printer className="h-4 w-4" />
</Button>

<Button variant="outline" size="icon" className="h-8 w-8 rounded-xl border-primary/20 bg-success text-primary-foreground" title="Copiar para WhatsApp">
  <MessageCircle className="h-4 w-4" />
</Button>
```

## Arquivo a modificar
- `src/components/worm/WormBudgetList.tsx` (linhas 293-310)
