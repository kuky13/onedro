# Mega Análise e Atualização: `/central-de-ajuda` → `/docs`

## Resumo

A Central de Ajuda atual está razoavelmente completa, mas faltam seções importantes para funcionalidades que existem no sistema. Além disso, a URL `/central-de-ajuda` precisa ser migrada para `/docs` em todos os arquivos.

---

## 1. Renomear rota `/central-de-ajuda` → `/docs`

**10 arquivos precisam ser atualizados:**


| Arquivo                                                                 | Mudança                                                            |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `src/App.tsx` (linha 278)                                               | Route path `/central-de-ajuda` → `/docs`                           |
| `src/middleware/routeMiddleware.ts` (linha 92)                          | Key `/central-de-ajuda` → `/docs`                                  |
| `src/config/routeConfig.ts` (linha 40)                                  | `/central-de-ajuda` → `/docs`                                      |
| `src/pages/ChatPage.tsx` (linha 54)                                     | path `/central-de-ajuda` → `/docs`                                 |
| `src/components/lite/DashboardLiteLicenseStatus.tsx` (linha 105)        | navigate `/central-de-ajuda` → `/docs`                             |
| `src/components/super-admin/AppsHub.tsx` (linha 442)                    | path `/central-de-ajuda` → `/docs`                                 |
| `src/components/onboarding/OnboardingSupport.tsx` (linha 11)            | desc texto `/central-de-ajuda` → `/docs`                           |
| `src/components/AppSidebar.tsx` (linha 38)                              | Label "Central de Ajuda" (manter label, só ajustar se houver path) |
| `src/services/helpCenterIntegration.ts`                                 | Todas as URLs `/central-de-ajuda#...` → `/docs#...`                |
| `supabase/functions/chat-ai/prompts/system-prompt.ts` (linhas 526, 588) | URLs `/central-de-ajuda` → `/docs`                                 |


---

## 2. Conteúdos Faltando na Central de Ajuda

A página `HelpCenterPage.tsx` já tem seções para: Orçamentos, OS, Lixeira, Configurações, Drippy IA, Planos, Loja, Dashboard, Reparos, Garantias, Apps, Películas, Notificações.

**Seções que faltam e devem ser adicionadas:**

### a) Download de Vídeos (`/downloads`)

- Seção explicando como usar o downloader de vídeos integrado

### b) Suporte (`/suporte`)

- Como abrir um chamado de suporte
- Canais disponíveis (WhatsApp, Discord, Email)

### d) Conta e Segurança

- Como alterar senha, verificar email
- Limpeza de conta, exportação de dados
- Consentimento e LGPD

---

## 3. Atualizar `helpCenterIntegration.ts` (Drippy)

Adicionar novos artigos ao array `helpArticles` para as seções novas (downloads, suporte, conta/segurança) e novos itens ao `faqItems`.

---

## 4. Atualizar System Prompt da Drippy

No arquivo `supabase/functions/chat-ai/prompts/system-prompt.ts`, trocar referências de `/central-de-ajuda` para `/docs`.

---

## Arquivos a modificar (resumo)

1. `src/pages/HelpCenterPage.tsx` — Adicionar 3 novas seções (Downloads, Suporte, Conta e Segurança) + FAQs correspondentes + categorias no filtro + atalho rápido para Suporte + título "Documentação" no lugar de "Central de Ajuda"
2. `**src/services/helpCenterIntegration.ts**` — Adicionar artigos e FAQs para as novas seções + trocar todas URLs para `/docs#...`
3. `**src/App.tsx**` — Rota `/central-de-ajuda` → `/docs`
4. `**src/middleware/routeMiddleware.ts**` — `/central-de-ajuda` → `/docs`
5. `**src/config/routeConfig.ts**` — `/central-de-ajuda` → `/docs`
6. `**src/pages/ChatPage.tsx**` — path `/central-de-ajuda` → `/docs`
7. `**src/components/lite/DashboardLiteLicenseStatus.tsx**` — navigate `/central-de-ajuda` → `/docs`
8. `**src/components/super-admin/AppsHub.tsx**` — path → `/docs`
9. `**src/components/onboarding/OnboardingSupport.tsx**` — texto → `/docs`
10. `**supabase/functions/chat-ai/prompts/system-prompt.ts**` — URLs → `/docs`