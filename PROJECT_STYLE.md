# PROJECT_STYLE.md
# Design system deste projeto. Edite à vontade.
# Gerado em: 2026-03-17

## Projeto
name: OneDrip
description: Plataforma SaaS completa de gestão para assistências técnicas e centros de reparo — controle de ordens de serviço, CRM, orçamentos via WhatsApp e loja virtual.
tone: profissional, técnico, confiável, direto ao ponto

## Stack
framework: React 18 + Vite (SPA — não é Next.js)
typescript: sim
component_library: Shadcn/ui (baseada em Radix UI)
icons: Lucide React
animations: Framer Motion

## Cores
# Todas as cores são dark-only. O projeto usa exclusivamente tema escuro.
primary: "#fec832"
primary_hover: "#e5a800"
background: "#121212"
surface: "#171717"
border: "#333333"
text_primary: "#F0F0F0"
text_secondary: "#B3B3B3"
accent: "#fec832"
success: "#3ECF50"
error: "#E03E2D"
warning: "#f59e0b"

# Tokens adicionais identificados no projeto:
input_bg: "#171717"
popover_bg: "#171717"
secondary_bg: "#262626"
focus_ring: "#fec832"

## Dark Mode
dark_mode: dark_only
# O projeto é 100% dark. Não há variáveis de light mode.

## Tipografia
font_heading: "Inter — Google Fonts (same as body)"
font_body: "Inter — Google Fonts"
font_mono: "JetBrains Mono — Google Fonts"

# Nota: o projeto usa Inter tanto para headings quanto para body.
# A hierarquia visual é criada via peso (font-weight) e tamanho, não por famílias distintas.

## Layout & Tokens
# --radius: 0.75rem definido globalmente (≈ 12px = modern)
border_radius: modern
# Botões: rounded-lg | Cards: rounded-xl | Badges: rounded-full | Avatares: rounded-full

# Densidade: balanced — espaçamentos p-4/p-6, gaps gap-3/gap-4
density: balanced

## Componentes Específicos do Domínio

# --- ServiceOrderCard ---
# Card de ordem de serviço com:
#   - Número da OS + status badge (colorido por estado: aberto/em andamento/concluído)
#   - Nome do cliente + dispositivo
#   - Técnico responsável + data de entrada
#   - Valor estimado
# Estados do badge: default (cinza) | in_progress (amarelo #fec832) | completed (verde #3ECF50) | cancelled (vermelho #E03E2D)

# --- WormBudgetCard ---
# Card de orçamento gerado pelo sistema Worm:
#   - Título do orçamento + número
#   - Lista de itens (peça/serviço + valor)
#   - Total destacado em #fec832
#   - Botão de compartilhar via WhatsApp (verde #25D366)
#   - Badge de validade

# --- PWAInstallPrompt ---
# Banner/modal de instalação do PWA:
#   - Ícone do app + título + descrição
#   - Botão primário "Instalar" + botão secundário "Agora não"
#   - Aparece como bottom sheet no mobile, modal centralizado no desktop

# --- AppSidebar ---
# Sidebar colapsável:
#   - Logo no topo
#   - Itens de navegação com ícone Lucide + label
#   - Item ativo destacado com bg #fec832 e texto #000000
#   - Colapsa para modo icon-only no desktop (largura 64px)
#   - Substitui por hamburger menu flutuante no mobile

# --- DashboardStatCard ---
# Card de métrica do dashboard:
#   - Ícone Lucide + título + valor principal grande
#   - Indicador de variação (seta + percentual, verde ou vermelho)
#   - Fundo surface (#171717), borda border (#333333)
