# Page Design — /settings (iOS Settings + Glassmorphism)

## Global Styles (desktop-first)
- Grid/layout: container 1120–1280px, 2 colunas (lista à esquerda + conteúdo à direita) acima de 1024px; abaixo disso vira 1 coluna com navegação por “push” (subpágina ocupa tela).
- Tokens (exemplo):
  - Background: #0B1020 com gradiente sutil (radial) + noise leve.
  - Glass surface: rgba(255,255,255,0.08) com blur 18–24px; border rgba(255,255,255,0.14); shadow 0 12px 40px rgba(0,0,0,0.35).
  - Text: primary rgba(255,255,255,0.92); secondary rgba(255,255,255,0.68).
  - Accent: #5B8CFF; Destructive: #FF4D4F; Success: #45D483.
  - Radius: 16 (cards), 12 (rows); hit-area mínimo 44px.
  - Hover/focus: elevação + border mais forte; focus ring 2px em accent.

## Componente base: SettingsLite
- SettingsLiteGroup: card de vidro com título da seção e espaçamento iOS (rows empilhadas, divisórias internas 1px).
- SettingsLiteRow (variantes):
  - Navigation: título + descrição opcional + chevron; clique abre subpágina.
  - Toggle: switch à direita; row clicável apenas no switch (evitar toggles acidentais).
  - Action: botão textual à direita (ex.: “Limpar”); suporta estado loading.
  - Destructive: cor destructive; sempre pede confirmação.
- Partes: leading icon (16–20px), title (16–17px), subtitle (13–14px), trailing (value/toggle/button), chevron, helper/error text.

---

## Página: /settings
### Meta
- Title: "Settings"; Description: "Gerencie preferências, segurança e dados da conta."; OG: igual ao title/description.

### Estrutura
- Header fixo do conteúdo: título + campo de busca (filtra rows em tempo real).
- Coluna esquerda (desktop): lista de seções (âncoras) + destaque da seção ativa.
- Coluna direita: conteúdo em cards SettingsLiteGroup.

### Seções & Componentes
1) Seção "Conta"
- Rows: "Perfil" → /settings/profile; "Segurança" → /settings/security.
2) Seção "Organização"
- Row: "Empresa" → /settings/company.
3) Seção "Orçamento"
- Row: "Avisos de orçamento" → /settings/budget-warning.
4) Seção "Sistema"
- Row: "Limpar cache" → /settings/cache-clear.
5) Seção "Dados"
- Row: "Dados da conta" → /settings/account-data.

Estados
- Empty search: mensagem curta + botão "Limpar busca".

---

## Subpágina: /settings/profile
- Layout: painel à direita (desktop) / tela cheia (mobile).
- Conteúdo: SettingsLiteGroup com formulário (inputs), salvar no rodapé do card.
- Estados: dirty state (habilita salvar), validação inline, toast de sucesso/erro.

## Subpágina: /settings/security
- Conteúdo: cards de ações e preferências; itens destrutivos separados no final.
- Interações: confirmações modais para ações críticas; texto de ajuda curto.

## Subpágina: /settings/company
- Conteúdo: formulário de dados da empresa em 1–2 cards; salvar com feedback.

## Subpágina: /settings/budget-warning
- Conteúdo: toggle principal (ativar avisos) + controle de limiar/nível + preview do estado atual.

## Subpágina: /settings/cache-clear
- Conteúdo: explicação do que será limpo + botão "Limpar cache" (destructive/action) + confirmação.

## Subpágina: /settings/account-data
- Conteúdo: 2 cards: "Exportar dados" (ação) e "Excluir conta" (destructive, confirmação forte, texto de risco).

## Motion/Transitions
- Transição entre lista↔subpágina: slide-in suave (200–260ms) + fade; respeitar prefers-reduced-motion.