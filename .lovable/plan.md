

## Plano: Modernizar o design de toda a seção /reparos

### Problema atual
A seção de reparos usa um design funcional mas datado comparado com `/landing`, `/dashboard` e `/worm` -- cards genéricos com `Card/CardHeader/CardContent`, botões sem estilo premium, ausencia de gradientes, backdrop-blur, e ícones coloridos em containers arredondados.

### Abordagem
Aplicar o mesmo padrão visual premium (glassmorphism, rounded-2xl, backdrop-blur, ícones em containers coloridos, gradientes sutis, spacing generoso) usado no dashboard e worm.

### Alterações por arquivo

**1. `RepairsLayout.tsx` -- Header e navegação**
- Header com gradiente sutil no fundo (como landing)
- Título com subtítulo descritivo
- Bottom nav com indicador animado mais proeminente (pill ativa com gradiente)
- FAB com gradiente e sombra mais premium

**2. `RepairsDashboard.tsx` -- Dashboard principal (~1470 linhas)**
- **Header da page**: Usar PageHeader-style com ícone em container colorido
- **Seletor de mês**: Estilizar como pill/select premium com rounded-2xl e bg-muted/30
- **Cards de resumo** (Faturamento, Lucro, Custos, Técnico): Trocar Card genérico por cards glassmorphism (`rounded-2xl bg-muted/30 backdrop-blur-sm border-border/40`) com ícones coloridos e labels uppercase tracking-wider
- **Busca de técnico**: Input com rounded-2xl e estilo premium
- **Lista de serviços**: Cards individuais com rounded-2xl, hover states, badges premium
- **Botões de ação**: Rounded-xl, sem cores hardcoded (#ff4242, #fec834), usando classes semânticas
- **Layout editor**: Cards com estilo consistente
- **Menu mobile**: Substituir botão "Opções rápidas" por action bar premium

**3. `RepairsTechnicians.tsx` -- Lista de técnicos**
- Header com ícone em container (Users)
- Cards de técnico com glassmorphism, badges de status (ativo/inativo) com cores semânticas
- Dialog de criação/edição com inputs rounded-xl
- Empty state com ícone centralizado e descrição
- Botão "Novo Técnico" com rounded-xl e ícone Plus

**4. `RepairsStatus.tsx` -- Fechamentos mensais**
- Já tem um design razoável (pills de stats, cards com rounded-2xl) -- alinhar cores e spacing com o padrão
- Dialog de detalhes com header mais premium
- Cards de serviço dentro do dialog com mesmo estilo

**5. `RepairsWarranties.tsx` -- Garantias**
- Já tem design decente -- alinhar filtros e spacing
- Input de busca e select com rounded-2xl consistente

**6. `RepairsServices.tsx` -- Formulário de criação (~1219 linhas)**
- Step indicator mobile: Redesenhar com pills/dots mais premium (gradiente na etapa ativa)
- Inputs com labels mais clean, containers rounded-2xl
- Cards de seção com glassmorphism
- Summary bar com design premium
- Botão salvar com gradiente

### Padrão visual aplicado (consistente com /dashboard e /worm)
- `rounded-2xl` em todos os containers
- `bg-muted/30 backdrop-blur-sm border border-border/40` para glassmorphism
- Ícones em containers `rounded-xl bg-{color}/10 p-2`
- Labels `text-[10px] uppercase tracking-wider font-semibold text-muted-foreground`
- Hover: `hover:bg-muted/50 hover:border-primary/30 transition-all`
- Remover cores hardcoded (`#ff4242`, `#fec834`) por classes Tailwind semânticas
- Empty states centralizados com ícone + texto descritivo

### Escopo
Todas as 6 páginas da seção reparos serão atualizadas. A lógica e funcionalidade permanecem intactas -- apenas o JSX/classes de estilo mudam.

