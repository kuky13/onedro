

## Redesign da página /settings inspirado no design do /suporte e /landing

### Análise atual

A página `/settings` (`ServiceOrdersSettingsHub.tsx`) é funcional mas visualmente pobre comparada às páginas `/suporte` e `/landing`:

- **Sem hero section** — vai direto para tabs sem contexto visual
- **Sem menção à Drippy** — não oferece ajuda contextual
- **Sem links para Central de Ajuda ou Suporte** — o usuário fica perdido
- **Cards simples sem gradientes** — visual flat sem a identidade premium do resto do site
- **Sem badges/trust indicators** — que existem nas outras páginas
- **Sem footer** com links úteis

### Design proposto

Inspirado nos padrões visuais do `/suporte` (hero com badge, card da Drippy, gradientes, trust badges) e `/landing` (seções com ícones coloridos, CTAs claros):

#### 1. Hero Section no topo das Configurações
- Badge com ícone: "Configurações OneDrip"
- Título estilizado: "Personalize sua **experiência**"
- Subtítulo explicativo
- Trust badges: "Dados seguros", "Salvamento automático"

#### 2. Card da Drippy IA (lateral no desktop, inline no mobile)
- Mesmo padrão visual do `/suporte` — avatar com indicador online, texto explicativo
- Botão "Conversar com Drippy" → `/chat`
- Mensagem contextual: "Precisa de ajuda com as configurações? A Drippy pode te guiar!"

#### 3. Botões de navegação rápida (antes das tabs)
- "Central de Ajuda" → `/help` — ícone BookOpen, estilo outline
- "Falar com Suporte" → `/suporte` — ícone Headphones, estilo outline
- "Conversar com Drippy" → `/chat` — ícone MessageCircle, estilo primary

#### 4. Melhorias visuais nas tabs
- Cards com gradientes sutis (`bg-gradient-to-br from-primary/5 to-transparent`)
- Ícones com cores diferenciadas por seção
- Descrições mais detalhadas nos CardDescription

#### 5. Footer contextual
- Links para Central de Ajuda, Suporte, Termos, Privacidade
- Texto: "Dúvidas? A Drippy está sempre disponível para ajudar."

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/components/ServiceOrdersSettingsHub.tsx` | Redesign completo: hero section, card Drippy, botões de ajuda, gradientes, footer |

### Detalhes técnicos

- Reutilizar ícones já importados + adicionar `Headphones`, `BookOpen`, `MessageCircle`, `Zap`, `CheckCircle2` do lucide-react
- Manter toda a lógica existente (tabs, mutations, license, profile) intacta
- Apenas envolver o conteúdo existente com o novo layout visual
- Card da Drippy usa a mesma imagem: `/lovable-uploads/e12ec9f1-06ab-4f49-8d81-78a481c5b4c0.png`

