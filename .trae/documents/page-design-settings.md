# Redesign da página /settings (aba de configurações)

## Problemas observados na versão atual
- **Aparência de “landing page”** (hero, badges e card promocional) compete com a tarefa de “configurar” e reduz densidade de informação.
- **Navegação por cards + tabs** não se comporta como “aba de configurações”: dificulta escaneio, não cria senso de hierarquia e mistura navegação com conteúdo.
- **Seções pouco “autoexplicativas” na rolagem**: ao descer, o usuário perde contexto de onde está/qual seção está ativa.
- **Ações críticas do perfil** (sair, redefinir senha, atualizar e-mail) ficam visualmente no mesmo nível de informações passivas, sem agrupamento.
- **Redundâncias** (menu mobile + cards + tabs) aumentam carga cognitiva.

## Objetivo do redesign
Fazer a página parecer uma **tela de configurações clássica**: navegação lateral (desktop), seções bem delimitadas, leitura rápida e navegação interna simples.

---

## Layout (desktop-first)
- **Grid 12 colunas (CSS Grid + Tailwind)**:
  - Coluna esquerda (3/12): **nav lateral sticky** (top: 72px) com lista de seções.
  - Coluna direita (9/12): conteúdo com **seções empilhadas**.
- Espaçamento base: 24px (desktop) / 16px (mobile).
- Largura máxima do conteúdo: 1100–1200px (centralizado).

## Meta Information
- Title: `Configurações | OneDrip`
- Description: `Gerencie conta, marca da empresa e privacidade.`
- Open Graph: `og:title`, `og:description`, `og:type=website`.

## Global Styles (tokens)
- Usar tokens existentes do design system: `bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`, `primary`.
- Componentes base: `Card`, `Separator`, `Button`, `Tabs`/`ScrollArea` (se necessário).
- Estados:
  - Nav item ativo: fundo `primary/10`, borda/indicador `primary`, fonte semibold.
  - Hover: `bg-muted/50`.
  - Focus: anel visível (acessibilidade teclado).

## Page Structure
1. **Header compacto**
   - Título “Configurações” + breadcrumb curto (opcional) + ação “Voltar/Dashboard”.
   - Remover hero/badges promocionais.
2. **Corpo em 2 colunas**
   - Esquerda: navegação interna.
   - Direita: seções (Empresa, Perfil, Dados e Privacidade) em cards.
3. **Rodapé / Ajuda**
   - Atalhos de ajuda/suporte como bloco secundário no final (ou no topo da coluna direita, mas abaixo do título).

## Sections & Components (detalhamento)

### A) Navegação interna (desktop)
- Componente: `SettingsSideNav`
- Itens (âncoras):
  - Marca da Empresa (`#empresa`)
  - Perfil Pessoal (`#perfil`)
  - Dados e Privacidade (`#privacidade`)
- Interação:
  - Clique: rolar suave até a seção (scroll + `id`).
  - Seção ativa: atualizada por IntersectionObserver (ou por scroll spy simples).

### B) Navegação interna (mobile)
- Padrão: **seletor compacto** no topo do conteúdo (ex.: `Select`/`Tabs` em linha) que leva à mesma âncora.
- Evitar duplicar 3 navegadores (cards + tabs + drawer). Manter **apenas 1**.

### C) Seção “Marca da Empresa” (id: empresa)
- Card com título + descrição curta.
- Conteúdo: `CompanyBrandingSettings` (como hoje).
- Subdivisões internas (visuais, não novas features): blocos “Logo”, “Identidade”, “Informações”.

### D) Seção “Perfil Pessoal” (id: perfil)
- Card com 2 áreas:
  1) **Dados** (E-mail, Nome, Função, Licença)
  2) **Ações da conta** (redefinir senha, atualizar e-mail, suporte, sair, reset)
- Prioridade visual:
  - Botão “Salvar” alinhado ao campo de Nome.
  - Ações destrutivas (Sair) isoladas e claramente marcadas.

### E) Seção “Dados e Privacidade” (id: privacidade)
- Card com título + descrição curta.
- Conteúdo: `DataPrivacyTab` (como hoje).

### F) Bloco “Ajuda”
- Card secundário com 3 botões: Central de Ajuda, Suporte, Chat com Drippy.
- Colocar como **auxiliar**, sem competir com o topo da página.

## Responsividade
- >= 1024px: layout 2 colunas com nav lateral sticky.
- < 1024px: layout 1 coluna; navegação vira seletor fixo/compacto no topo do conteúdo.

## Acessibilidade
- Navegação com teclado (Tab/Enter), foco visível.
- Cabeçalhos por seção (H2) + `aria-label` no nav.
