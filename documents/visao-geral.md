# 🌍 Visão Geral do Serviço (OneDrip / Cookie2026)

Este documento explica de forma simplificada a proposta principal, os módulos que compõem a plataforma e a arquitetura geral do serviço.

---

## 📌 1. O que é este projeto?

> [!NOTE] 
> O OneDrip é uma **prestação de serviço de suporte remoto** para técnicos de assistência técnica, com acesso a uma ferramenta de apoio (web + PWA).

Ele foi construído para ajudar prestadores de serviços e assistências técnicas a organizarem suas **Ordens de Serviço (OS)**, orçamentos, garantias, e até catálogos online, tudo através de uma interface web progressiva (PWA - funciona no navegador e como aplicativo).

---

## 🧩 2. Principais Módulos da Plataforma

### 🔄 Orçamentos & Ordens de Serviço (OS)
*   **Módulo de Reparos/Garantias** (`/reparos`, `/service-orders`): 
    *   Um fluxo completo para assistências técnicas.
    *   Criação de ordens de serviço.
    *   Checklist de aparelho.
    *   Controle de senhas de aparelhos de clientes (código numérico, padrão de desenho).
    *   Controle de técnicos e emissão de garantias.
*   **Módulo de Orçamentos - Worm**: 
    *   Gerador moderno de orçamentos e serviços. 
    *   Possui integração para compartilhamento via WhatsApp ou PDF.
    *   Aceitação eletrônica de termos.
    *   Integração nativa com IA nas propostas.

### 🛒 Catálogo/Loja (Stores)
*   A plataforma permite que usuários criem páginas públicas de catálogo de serviços e itens (acessível via `/loja/[slug-da-loja]`). 
*   Possui controles de carrinho e integração de pagamentos (fluxo atual no código: **AbacatePay/PIX**; pode haver referências legadas a Mercado Pago) para checkout (`/store`).

### 🤖 Inteligência Artificial (IA) & Chat
*   **Painel IA**: Para interagir com uma Inteligência Artificial focada em triagem e negociações de valores por WhatsApp, auxiliando ao lojista de forma automatizada.
*   **Chat Online**: Integrado na plataforma para gerenciar conversas com clientes em tempo real.

### 👑 Administração e Multi-Nível
> [!IMPORTANT]
> O site trabalha com fortes controles de roteamento baseados em cargos.

*   **Usuários Comuns/Clientes**: Veem a parte pública, landing page e seu próprio dashboard "Lite".
*   **Admin da Loja**: Controla uma loja virtual e sua assistência técnica (`/dashboard`, `/settings`, `/admin`).
*   **SuperAdmin / "Deus"**: Controla acessos ao suporte, usuários bloqueados, atualizações gerais da plataforma e funções de telemetria geral (`/supadmin`).

---

## 🏗️ 3. A Arquitetura Macro (High Level)

O projeto usa stacks muito modernas do ecossistema JS/TS:

*   🌐 **Web Frontend**: `React 18` construído com `Vite`. Ele é uma Single Page Application (SPA), usando uma abordagem de renderização no cliente. O visual é todo impulsionado por `Tailwind CSS`.
*   📱 **PWA**: Ele pode ser instalado em celulares (ícones próprios e modo tela-cheia sem a barra de navegação) através de um worker e um manifest, dando a sensação de um App nativo no iOS e Android.
*   ☁️ **Backend Serverless (BaaS - Backend as a Service)**: Hospedado no `Supabase`. O Supabase fornece a autenticação, o banco de dados Postgres estruturado, storage para arquivos, sistema Real-Time através de WebSockets e Hospedagem das **Edge Functions** (funções minúsculas serverless usadas para rodar o backend).

---

## 🚀 4. O Fluxo do Usuário Perfeito

1.  O usuário entra em `/landing` ou acessa os planos de suporte.
2.  Faz o pagamento (fluxo atual no código: AbacatePay/PIX), com webhook em nuvem que avisa o sistema para gerar uma chave de acesso ao suporte (`/verify-licenca`).
3.  Uma vez logado, ele usa módulos baseados em PWA *offline-first* (onde alguns dados são cacheados e funcionam com má conectividade).
4.  O cliente emite orçamentos/OS que enviam gatilhos pelo lado do servidor (Edge Functions) para o WhatsApp usando bibliotecas externas (Waha, Evolution API, ou Z-API).
