

## Redesign Completo da Página /settings

### Análise do Estado Atual

A página atual usa um grid 2x2 de cards simples para navegação entre seções, com sub-páginas contendo cards empilhados. O design é funcional mas básico — falta hierarquia visual, não aproveita glassmorphism usado em outras partes do app, e os formulários são visualmente monótonos.

### Novo Design

**Conceito**: Interface estilo iOS Settings com glassmorphism, seções agrupadas visualmente, avatar do usuário no topo, e transições fluidas.

---

**1. SettingsLite.tsx — Layout Principal (reescrita completa)**

- Header com avatar do usuário (iniciais ou foto), nome e email exibidos
- Seções como lista agrupada estilo iOS (não mais grid 2x2), com fundo `bg-muted/30 backdrop-blur-sm` e `rounded-2xl`
- Cada item é uma row com ícone colorido, label, descrição e chevron
- Separadores visuais entre grupos (Conta, App, Políticas, Sistema)
- Adicionar versão do app no rodapé
- Manter animações framer-motion mas com transição de slide horizontal (entrar da direita, sair pela esquerda)

**2. ProfileSettingsLite.tsx — Perfil**

- Avatar grande editável no topo do card com iniciais
- Input de nome com label flutuante dentro de container glassmorphism
- Remover card wrapper duplicado, usar seções com dividers

**3. SecuritySettingsLite.tsx — Segurança**

- Manter lista de ações mas com ícones dentro de círculos coloridos mais vibrantes
- Botão de logout separado visualmente com espaço e cor de destaque

**4. CompanySettingsLite.tsx — Empresa**

- Logo upload mais proeminente (circular, centralizado)
- Campos agrupados em 2 colunas onde possível (CNPJ + Telefone)
- Botão salvar com feedback visual melhorado (animação de check)

**5. BudgetWarningSettingsLite.tsx — Avisos**

- Switch mais proeminente com descrição inline
- Input de dias com stepper visual (+/-)

**6. CacheClearSettingsLite.tsx — Limpeza**

- Card com borda sutil vermelha e ícone de alerta
- Simplificar para botão único sem card header

**7. AccountDataSettingsLite.tsx — Dados**

- Manter estrutura mas com ícones maiores e melhor contraste

### Mudanças Visuais Globais (aplicadas a todos os componentes)

- Background dos cards: `bg-muted/30 backdrop-blur-sm` (glassmorphism)
- Bordas: `border-border/30 rounded-2xl`
- Inputs: `bg-background/50 rounded-xl border-border/30`
- Botões primários: gradiente sutil `bg-gradient-to-r from-primary to-primary/80`
- Ícones em containers com `rounded-full` em vez de `rounded-xl`
- Tipografia: títulos `text-base font-semibold`, labels `text-xs text-muted-foreground uppercase tracking-wide`

### Arquivos Modificados

- `src/components/lite/SettingsLite.tsx` — reescrita do layout principal
- `src/components/lite/ProfileSettingsLite.tsx` — novo design com avatar
- `src/components/lite/SecuritySettingsLite.tsx` — visual refinado
- `src/components/lite/AccountDataSettingsLite.tsx` — visual refinado
- `src/components/lite/CompanySettingsLite.tsx` — layout melhorado
- `src/components/lite/BudgetWarningSettingsLite.tsx` — visual refinado
- `src/components/lite/CacheClearSettingsLite.tsx` — visual refinado

