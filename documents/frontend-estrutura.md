# 🎨 Estrutura do Frontend (React & App)

Este documento tem o foco de explicar como o visual e a lógica do navegador funcionam, baseados na pasta principal do projeto web: `/src`.

---

## 🛠️ 1. Stack Base de UI

*   🟦 **React.js com TypeScript**: Para tipagem restrita e segurança de código.
*   ⚡ **Vite**: Configurado pelo arquivo `vite.config.ts`, focado em dividir em pequenos pacotes (*code splitting*) pra carregar excepcionalmente rápido.
*   💅 **Tailwind CSS + Shadcn UI**: Componentes criados a partir da base do Radix UI, totalmente personalizáveis e acessíveis, localizados em `src/components/ui/`. Formatações gráficas pesadas (animações/modais) ficam nesse diretório.

---

## 🔀 2. A Espinha Dorsal: O Roteamento (`App.tsx`)

Se você precisar criar, renomear ou deletar uma tela, é no arquivo `src/App.tsx` que a "mágica" acontece:

1.  **React Router DOM:** Ele usa a versão moderna do roteador para navegar entre views.
2.  **Lazy Loading:** A maioria das telas da aplicação (especialmente o Painel/Dashboard) é importada via `lazy(() => import(...))`. 
    *   *Por que?* Isso impede que o usuário baixe a Loja Virtual se ele quiser apenas entrar na página de Política de Privacidade de forma rápida.

> [!IMPORTANT]
> **Guards e Proteção**: Você verá que as rotas estão envolvidas em "Escudos" (Higher Order Components).
> *   🛡️ `<UnifiedProtectionGuard>` e `<AdminGuard>`: Exigem que o usuário esteja logado com uma licença autêntica validada, puxada dos Estados globais. Se a pessoa tentar acessar `/superadmin` sem poder de "Deus" no banco de dados, a tela redireciona imediatamente.
> *   🚧 `<MaintenanceGuard>`: Bloqueia acesso se a telemetria do app avisar que ele está em manutenção.

---

## 🔄 3. Como os Dados fluem até a Tela?

> [!TIP]
> O projeto quase nunca usa o clássico `useEffect` para bater em API porque ele é assíncrono e lento para lidar com loading/error.

Em vez disso, utilizamos:

*   **TanStack Query (`react-query`)**: Cuida de todo o "fetch" (buscar a lista de OS, as informações do perfil, os produtos da loja). 
    *   Ele faz cache automático no navegador. Se o usuário vai pra página 1 e volta, o sistema não recarrega do servidor se não for necessário. 
    *   O QueryClient global está ajustado no cabeçalho de `App.tsx` (`staleTime: 5 mins`).
*   **Zustand**: Guardião de estado para variáveis globais.
    *   Quando precisamos de um estado em várias telas (ex: preferências da conta, status do botão flutuante e modo escuro/claro), guardamos via Zustand ao invés do complexo "Context API".

---

## 📂 4. Pastas Críticas no `src/`

*   🧩 `src/components/` -> Partes reutilizáveis pelas telas. Separado em sub-domínios contextuais (`admin/`, `auth/`, `service-orders/`, `store/`). Elementos de interface pequenos, e modais gigantes (como `PatternPasswordViewer` de senhas de celular) vivem aqui.
*   📄 `src/pages/` -> Telas propriamente ditas (o que é montado nos Routes do `App.tsx`). 
*   🪝 `src/hooks/` -> Abstração da lógica para simplificar os componentes. (Ex: Hooks que dizem se você tá num iOS via `useDeviceDetection.ts`, e dezenas de utilitários nativos).
*   🛠️ `src/utils/` -> Regras de negócio genéricas, formatadores de BRL (moeda), validadores lógicos de WhatsApp (`whatsappValidation.ts`).
*   🌐 `src/services/` -> Normalmente onde ficam concentradas as requisições puras e APIs externas. O SDK do Supabase JS atua muito forte aqui.

---

## 🔐 5. Caches e Segurança Front-end (`secureStorage.js`)

Ao invés de usar `LocalStorage` normal para guardar parâmetros de login que um usuário maldoso pudesse injetar, o projeto possui funções utilitárias que estendem o controle de armazenamento.

> [!NOTE]
> Isso garante uma "session persistence" mais criptográfica para lidar com os tokens sensíveis da plataforma e impedir sequestro de sessão trivial.

---

## 📌 Em Resumo

*   **Se for mexer no layout:** Modifique `src/pages` ou `src/components/ui`.
*   **Se precisar criar rotas:** Modifique o `App.tsx` e importe de forma dinâmica.
*   **Se o carregamento estiver lento:** Revise os Fetchers envoltos no `react-query`.
