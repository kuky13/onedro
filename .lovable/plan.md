

## Análise e Plano de Redesign

### Problema Atual
As páginas `/service-orders/new` (ServiceOrderFormPage) e `/service-orders/:id/edit` (ServiceOrderEditForm) usam um design básico e antigo:
- Header simples com `bg-background/95 border-b` sem hero section
- Cards com `border-border/50` sem estilização premium
- Sem seção hero com título grande como nas outras páginas
- Sem `max-w-7xl mx-auto px-4 lg:px-8` (layout consistente)
- Sem ícones coloridos nos headers dos cards
- Submit button sem `btn-premium`

### Padrão Premium (usado em /landing, /service-orders, /worm)
- Layout: `max-w-7xl mx-auto px-4 lg:px-8`
- Header sticky: com botão "Voltar" à esquerda e ações à direita, `rounded-xl`
- Hero section: título grande `text-3xl sm:text-4xl font-bold`, subtítulo `text-muted-foreground`
- Cards: seções com `bg-muted/20 border border-border/30 rounded-2xl` (painel premium)
- Card headers com ícones em circle colorido (`bg-primary/10 text-primary rounded-full`)
- Botões com `btn-premium rounded-xl`

### Plano de Alterações

#### 1. Atualizar `ServiceOrderFormPage.tsx` (Nova OS)
- **Header**: Substituir pelo padrão sticky com botão Voltar + ações à direita (AutoSave)
- **Hero section**: Adicionar título grande "Nova Ordem de Serviço" com subtítulo e ícone
- **Layout**: Envolver em `max-w-7xl mx-auto px-4 lg:px-8`
- **Cards**: Trocar headers para usar ícones em círculos coloridos (`div` com `h-10 w-10 rounded-full bg-primary/10`), bordas `border-border/30 rounded-2xl`
- **Submit button**: Usar classe `btn-premium rounded-xl`

#### 2. Atualizar `ServiceOrderEditForm.tsx` (Editar OS)
- Mesmas mudanças do FormPage
- **Header info card** (OS #): Redesenhar com gradiente mais premium e badges para status/prioridade
- **Image upload section**: Manter mas com card premium
- **Skeleton**: Atualizar para refletir novo layout

#### Detalhes visuais por seção (ambos arquivos):

**Header sticky:**
```
header.sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50
  > flex items-center justify-between py-3 lg:py-4
    > Button ghost "Voltar"
    > ações à direita
```

**Hero section (após header):**
```
section.text-center lg:text-left py-6
  > ícone em circle bg-primary/10
  > h1.text-3xl font-bold
  > p.text-muted-foreground
```

**Cards reformulados:**
```
section.bg-muted/20 border border-border/30 rounded-2xl p-4 sm:p-6
  > header com ícone em circle + título
  > conteúdo
```

**Submit sticky:**
```
btn-premium w-full h-12 rounded-xl
```

### Arquivos alterados
- `src/pages/ServiceOrderFormPage.tsx`
- `src/components/service-orders/ServiceOrderEditForm.tsx`

