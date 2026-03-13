# Descrição do Sistema (OneDrip)

O OneDrip é uma plataforma SaaS (web + PWA) voltada para assistências técnicas e lojas, unificando **Ordens de Serviço**, **orçamentos**, **comunicação com cliente**, **documentos (PDF)** e **rotinas administrativas**, com camadas de acesso por perfil (usuário, admin e superadmin).

## O que o sistema resolve

- Centraliza o fluxo de atendimento: entrada do aparelho/cliente → diagnóstico/orçamento → execução → entrega/garantia.
- Padroniza documentos (orçamento/OS) com templates e geração de PDF.
- Permite compartilhamento público controlado (ex.: status da OS, links de teste/diagnóstico) com segurança.
- Oferece módulos de loja/vitrine e integrações externas (ex.: WhatsApp e pagamentos), conforme configuração.

## Principais módulos

- **Ordens de Serviço (OS) / Reparos / Garantias**: criação e acompanhamento de OS, checklists, senhas do dispositivo, linha do tempo e compartilhamento público.
- **Worm (Orçamentos)**: criação/edição/lista/lixeira de orçamentos, ações de PDF/WhatsApp, templates de PDF e utilitários de venda.
- **Teste de Dispositivo**: suíte de testes no navegador (touch, câmera, áudio, bateria, sensores) com sessões compartilháveis e atualização em tempo real.
- **Store (Loja/Catálogo)**: páginas públicas e área de gestão de produtos/serviços/orçamentos de loja.
- **Admin / SuperAdmin**: administração do sistema, licenças, painéis operacionais e ferramentas internas.

## Arquitetura (alto nível)

- **Frontend**: React + TypeScript (SPA) com Vite; UI baseada em Tailwind e componentes Radix/shadcn.
- **Dados no cliente**: React Query (cache/fetch) e Zustand (estado global em módulos específicos).
- **Backend**: Supabase (Auth + Postgres + Realtime + Storage) como base do produto.
- **Serverless**: Edge Functions (Deno/TypeScript) para operações sensíveis (ex.: integrações externas, webhooks, automações).

## Dados e segurança

- Tabelas e regras de acesso são controladas por **RLS (Row Level Security)** no Postgres.
- Fluxos públicos (ex.: compartilhamentos) usam tokens e/ou RPCs específicas quando necessário.
- Atualizações em tempo real usam **Supabase Realtime** com fallback para polling em cenários instáveis.

## Integrações

- **Pagamentos**: o código atual possui fluxo ativo com **AbacatePay/PIX** (Edge Functions + registro de compra/licença). Pode existir nomenclatura/arquivos legados citando Mercado Pago.
- **WhatsApp/CRM**: existem Edge Functions e componentes de integração para mensageria e atendimento.
- **Storage**: envio de imagens e anexos via Supabase Storage (ex.: imagens de OS).

## Observações operacionais

- Por ser PWA/SPA, o app depende do navegador para recursos de hardware (câmera, microfone, sensores) e pode ter restrições em iOS/Android.
- Recursos em tempo real (WebSocket) podem oscilar em redes móveis; o sistema implementa estratégias de reconexão/fallback em pontos críticos.

