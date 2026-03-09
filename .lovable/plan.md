

# Modernizar Design do Modulo /reparos

## Diagnostico

Analisei todas as 6 paginas do modulo de reparos e o layout principal. O design atual usa componentes basicos (`Card`, `PageHeader`, `Button`) mas falta a linguagem visual premium que as paginas `/landing`, `/dashboard` e `/worm` possuem. Problemas principais:

1. **RepairsLayout** - Header e bottom nav funcionais mas sem glassmorphism refinado
2. **RepairsDashboard** (1481 linhas) - Summary cards genericos sem icones/cores. Selects nativos sem estilo. Lista de servicos com `border p-3` basico. Mobile actions menu sem polish
3. **RepairsServices** (1219 linhas) - Wizard mobile funcional mas cards/steps sem visual premium. Summary bar muito simples
4. **RepairsStatus** (691 linhas) - Ja tem boa base com rounded-2xl e badges, mas dialog interno pode melhorar
5. **RepairsTechnicians** (190 linhas) - Mais desatualizado: lista basica com `border p-3`, sem icones/badges, botoes grandes sem refinamento
6. **RepairsWarranties** (498 linhas) - Razoavelmente moderno ja
7. **RepairsTrash** (265 linhas) - Card generico, lista com grid basico

## Padroes de referencia (Landing/Dashboard/Worm)

- Cards com `bg-primary/10 border-primary/20` para destaque
- Glassmorphism: `bg-background/80 backdrop-blur-2xl`
- Rounded corners: `rounded-2xl` consistente
- Icon containers: `rounded-xl bg-primary/10 p-2`
- Pill badges com `rounded-full` e cores semanticas
- Hover states com `hover:border-primary/30 transition-all`
- Empty states com icone grande + texto centrado
- Sections com `bg-muted/30` para separacao visual

## Plano de Implementacao

### 1. RepairsLayout - Refinamentos
- Melhorar bottom nav com efeito glassmorphism mais forte
- FAB com sombra premium e animacao suave
- Header com separacao visual mais sutil

### 2. RepairsDashboard - Maior refactoring
- **Summary cards**: Trocar Card generico por pills estilizados com icones coloridos (como na `/reparos/status`), cada um com icone, label uppercase pequeno e valor grande
- **Year/month selectors**: Substituir `<select>` nativos por componentes `Select` do Radix com estilo `rounded-xl bg-muted/30`
- **Quick actions mobile**: Transformar em grid de botoes com icones ao inves de lista vertical
- **Service list items**: Trocar `rounded-lg border p-3` por cards premium com `rounded-2xl bg-muted/5 border-border/30 hover:bg-muted/15`
- **Technician search card**: Modernizar com search input premium e resultados com avatar-like badges
- **Layout editor**: Cards de toggle mais visuais com switch ao inves de checkbox nativo
- **Empty states**: Icone grande centralizado + texto descritivo

### 3. RepairsServices - Polish do wizard
- Stepper mobile: pills com cores semanticas (verde ok, amber pendente) mais visuais
- Summary inline bar: glassmorphism `bg-muted/20 backdrop-blur-sm border-border/30`
- Summary card final: gradiente sutil no header
- Inputs com labels mais hierarquicas
- Navigation buttons (Proximo/Anterior) mais premium

### 4. RepairsTechnicians - Redesign completo
- Remover Card wrapper generico, usar lista direta com items `rounded-2xl`
- Cada tecnico como card com: avatar placeholder colorido, nome, badge de comissao `bg-primary/10 text-primary rounded-full`, status pill (Ativo/Inativo)
- Botoes inline mais compactos e com icones
- Dialog de criacao/edicao com layout mais espaçado e moderno

### 5. RepairsTrash - Modernizar lista
- Items com `rounded-2xl bg-muted/5 border-border/30` ao inves de grid com border
- Checkbox integrado visualmente
- Botoes de acao como pills menores
- Empty state premium com icone Trash2 grande + mensagem

### 6. RepairsStatus & RepairsWarranties - Ajustes finos
- Ja estao razoavelmente modernos, apenas pequenos ajustes de consistencia
- Dialog content: sections com `rounded-xl` ao inves de `rounded-md`
- Unificar spacing e corner radius

### Arquivos a modificar
- `src/pages/repairs/RepairsLayout.tsx`
- `src/pages/repairs/RepairsDashboard.tsx`
- `src/pages/repairs/RepairsServices.tsx`
- `src/pages/repairs/RepairsTechnicians.tsx`
- `src/pages/repairs/RepairsTrash.tsx`
- `src/pages/repairs/RepairsStatus.tsx` (ajustes menores)
- `src/pages/repairs/RepairsWarranties.tsx` (ajustes menores)

