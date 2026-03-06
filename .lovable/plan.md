

## Redesign completo da página /settings

### Problema atual
A página de settings está funcional mas visualmente desconectada do design premium usado em `/suporte` e `/landing`. Os elementos estão achatados no mobile, o layout é genérico, e falta a identidade visual da marca.

### Redesign proposto

Reescrever `ServiceOrdersSettingsHub.tsx` com o design language do `/suporte`:

#### 1. Header simplificado e limpo
- Mesmo padrão do suporte: `sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/40`
- Logo "OneDrip" à esquerda com seta de voltar, botões de ação à direita
- Altura compacta `h-14`

#### 2. Mini hero section leve (não o hero gigante removido antes)
- Badge pill: "Configurações" com ícone Settings
- Título: "Gerencie sua **conta**"
- Subtítulo discreto
- Trust badges inline: "Dados seguros", "Salvamento automático"
- Estilo idêntico ao hero do `/suporte` mas menor/mais contido

#### 3. Card Drippy redesenhado
- Desktop: card lateral no grid como no `/suporte` (gradient `from-primary/10 via-background to-primary/5`, border `border-border/60`, `rounded-2xl`)
- Mobile: card compacto como no `/suporte` mobile (rounded-xl, menor)
- Avatar redondo com indicador online verde

#### 4. Navegação por seções redesenhada
- Substituir as TabsList por cards clicáveis em grid (como os canais de suporte)
- Cada seção é um card com: ícone colorido em box, título, descrição curta, badge de status
- Grid `lg:grid-cols-3` no desktop, stack no mobile
- Hover com `hover:border-primary/40 hover:shadow-lg transition-all`
- Ao clicar, abre o conteúdo da seção abaixo (mantém tabs internamente mas UI é de cards)

#### 5. Conteúdo das seções
- Cards internos com `bg-card border border-border/60 rounded-xl` (padrão suporte)
- Sem gradientes pesados, visual limpo
- Perfil pessoal: layout mais espaçado, campos com labels melhores
- Botões de ação (Redefinir Senha, Sair etc): estilo pill com ícones

#### 6. Quick links row
- 3 botões horizontais estilo pill: Central de Ajuda, Suporte, Chat Drippy
- Background sutil, ícones coloridos

#### 7. Footer
- Idêntico ao do `/suporte`: copyright, links para Termos/Privacidade/Cookies
- Limpo e mínimo

#### 8. Mobile drawer
- Redesenhar o Sheet para ter visual mais premium
- Seções com ícones coloridos e descrições
- Links rápidos para Drippy/Ajuda/Suporte no final

### Arquivo modificado

| Arquivo | Mudança |
|---|---|
| `src/components/ServiceOrdersSettingsHub.tsx` | Redesign completo seguindo padrões visuais do SuportePage |

### Detalhes técnicos
- Manter toda lógica existente (tabs value/onChange, mutations, license, lazy imports)
- Usar mesmos padrões CSS do SuportePage: `border-border/60`, `rounded-xl`, `bg-card`, `hover:border-primary/40`
- Tabs continuam funcionando internamente mas a UI de navegação muda para cards clicáveis
- Mobile: seção atual indicada com destaque visual, drawer para trocar
- Responsivo: `lg:grid-cols-3` para seções, stack vertical no mobile

