# 🧠 Contexto Global do Projeto (AI Documentation)

> [!WARNING]
> **AVISO PARA AGENTES DE IA (LLMs):**  
> Leia este documento **antes** de realizar modificações estruturais no projeto. Ele compila o contexto 100% atualizado, stack tecnológica e regras de negócio do repositório `OneDrip / Cookie2026`.

---

## 🏗️ 1. Arquitetura e Stack Tecnológica

Este repositório contém uma aplicação **SaaS PWA** (Offline-first) com as seguintes tecnologias base:

*   🌐 **Frontend Core**: `React 18` (Single Page Application) rodando no ecossistema **Vite** (com TypeScript).
*   💅 **Estilização**: `TailwindCSS` + Bibliotecas de componentes nativos combinados do [Shadcn UI] (Radix-UI). Há um uso intensivo de modais (`Vaul`, `Dialog`) e Toasts (`Sonner`).
*   📡 **Gerenciamento de Estado de Redes (Fetch)**: `TanStack Query` (`@tanstack/react-query`). 
    *   *Regra Estrita*: Praticamente todas as requisições ao Supabase no cliente são envolvidas em Hooks do `useQuery` para cache automático e refetch on window focus. Evite usar `useEffect` puro para buscar dados assíncronos principais.
*   🧠 **Gerenciamento de Estado Global**: `Zustand`.
*   ☁️ **Backend / BaaS**: `Supabase`.
    *   O estado do banco relacional, Triggers e RLS vivem nos scripts em `supabase/migrations/`.
    *   A inteligência assíncrona da nuvem reside nas Node/Deno functions em `supabase/functions/`.

---

## 📂 2. Árvore de Diretórios (Mental Map)

### 💻 `src/` (Aplicação React)
*   **`/src/pages/`**: Ponto de entrada de rotas geridas pelo `react-router-dom` (registradas em `src/App.tsx`). A maior parte possui código dinâmico `lazy()` para *code-splitting*.
*   **`/src/components/`**:
    *   `/ui/`: Componentes brutos do Shadcn UI (botões, modais, carrossel).
    *   `/admin/`, `/auth/`, `/service-orders/`, `/store/`: Componentes amarrados a módulos específicos.
*   **`/src/hooks/`**: Toda lógica extraída de componentes. Contém lógicas nativas robustas de detecção de mobile/iOS (`useDeviceDetection.ts`), queries ao banco e webhooks.
*   **`/src/utils/`**: Funções puras (PDF Generators como `jspdf`, parseamento de Data `date-fns`, sanitização).
*   **`/src/lib/`**: Configurações de terceiros (ex: Cliente Mercado Pago `mercadopago-client.ts`, clientes Supabase).

### ⚙️ `supabase/` (Infraestrutura)
*   **`/supabase/migrations/`**: Mais de 90 arquivos `.sql` que constroem do zero as tabelas e políticas de RLS (Row Level Security).
*   **`/supabase/functions/`**: +40 Edge Functions (Deno). Todas as integrações com Waha (WhatsApp), Evolution API, Geração de Chaves, e IA de triagem (`triage-ai`, `chat-ai`) ficam aqui, operando sem expor chaves no client-site.

---

## 🧩 3. Módulos Críticos de Negócio

1.  🛠️ **Reparos e Ordens de Serviço (OS)**
    *   Funciona em `/reparos`.
    *   Lida com cadastro de equipamentos, controle visual de senhas de bloqueio (*Pattern grids* e PINs com *form validation* via `zod`), Checklist e exportação dinâmica para PDFs/Recibos térmicos (`pdfUtils.ts`).
2.  🐛 **Worm (Orçamentos em lote e CRM AI)**
    *   Funciona no endpoint `/worm`.
    *   Gera propostas comerciais completas.
    *   Possui automação nativa integrada ao Prompts de LLM (`IAPage`, `triage-ai`) para processamento rápido baseados no histórico do cliente que pediu via WhatsApp.
3.  🛒 **Store System (Lojas Virtuais)**
    *   Usuários do sistema (lojistas) podem ativar vitrines públicas do tipo *e-commerce* (`/loja/[slug]`).
    *   Lida com vitrines, SEO, produtos (com/sem variações de parcelamento) baseados no catálogo do painel.
4.  💳 **SaaS e Pagamentos (Mercado Pago)**
    *   Planos (Mensal/Anual) e Checkout processados internamente com redirects dinâmicos (Edge functions como `create-mercadopago-checkout` e `check-mercadopago-payment`). O acesso completo do usuário é regido pelas tabelas de `subscriptions` atualizadas via **Webhooks silenceados** no *background*.

---

## 🛡️ 4. Segurança e Roteamento (`src/App.tsx`)

O `App.tsx` possui Guards (HOCs) pesados nas rotas:

*   🔒 **`<UnifiedProtectionGuard>`**: Verifica se o `AUTH.UID()` da sessão atual existe E se tem uma Licença comercial válida no cache. Caso a licença esteja vencida, redireciona o usuário (Force Redirect) para `/licenca`.
*   👑 **`<AdminGuard>` / `SuperAdminPage`**: Níveis superiores com telemetria restrita (acesso a `/supadmin` e comandos SQL restritos).
*   🚧 **`<MaintenanceGuard>`**: Bloqueia páginas momentaneamente caso o modo vacina do sistema (`Kowalski System`) engatilhe chaves de manutenção globais.

> [!TIP]
> **Ao criar novas páginas**: Registre-as em `App.tsx` e decida o Guard apropriado a envolver o `<Route>`.

---

## 📡 5. Regras de Código (Guidelines para IAs)

> [!IMPORTANT]
> 1. **Nunca quebre o RLS**: O Supabase não retornará dados no front-end se você não inserir o `user_id` de quem está criando a linha. Sempre use `await supabase.auth.getUser()`.
> 2. **Importação Estrita vs Lazy**: Telas vitais (que podem falhar o PWA no celular offline se os chunks não forem bem cacheados) estão em importação estática em `App.tsx` (ex: `WormPdfConfigPage`). Lojas virtuais e módulos de admins estão empacotados usando `lazyWithRetry`.
> 3. **Gerencie o UI Moderno**: Utilize a estrutura do `sonner` para mensagens de sucesso/erro (ex: `toast.success("Feito!")`). Use bibliotecas visuais como `framer-motion` se tiver que animar entradas de modais.
> 4. **Variáveis Ambientes**: No frontend, são acessadas globalmente por `import.meta.env.VITE_SUPABASE_URL`. No serverless (Edge functions), por `Deno.env.get("CHAVE")`.
> 5. **PDFs e Renderização**: Os PDFs das assistências não são gerados pelo backend (Node), eles são costurados 100% no *Client Side* através do plugin `jspdf` para salvar custos de nuvem.

### 🎯 Resumo Final:
Qualquer refatoração deve respeitar a estrutura **Offline-First do PWA**, o modelo **Serverless** pelo Deno/Supabase, e a **imutabilidade das queries** gerenciadas pelo React Query via TypeScript Strict.
