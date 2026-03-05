# 🤝 Guia de Contribuição para Novos Desenvolvedores

Bem-vindo(a) ao projeto! Este guia fornece todas as bases necessárias para que você comece a codar seguindo os padrões do sistema.

---

## 🚀 1. Rodando o Projeto Localmente

```bash
# 1. Clone o repositório
git clone <repo-url> && cd onedrip

# 2. Instale dependências
npm install  # ou bun install

# 3. Configure variáveis de ambiente
cp .env.example .env.local
# Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

# 4. Rode o dev server
npm run dev  # Vite geralmente roda na porta 8080 ou 5173
```

---

## 📏 2. Convenções de Código

### 🔄 Fetching de Dados

> [!TIP]
> **Use sempre o React Query (TanStack Query) para chamadas de API.**

✅ **CORRETO**:
```tsx
const { data, isLoading } = useQuery({
  queryKey: ["budgets", userId],
  queryFn: () => supabase.from("budgets").select("*").eq("owner_id", userId),
});
```

❌ **ERRADO** (Evite `useEffect` para fetch):
```tsx
useEffect(() => {
  fetch("/api/budgets").then(r => r.json()).then(setData);
}, []);
```

### 🧠 Estado Global
*   **Zustand**: Para estado cross-componente (dark mode, menu mobile, preferências).
*   **React Context**: Apenas para Auth e providers de escopo muito limitado.
*   **React Query**: Para fazer o cache automático de dados vindos do servidor.

### 📣 Toasts e Feedback
Utilize o `sonner` para avisos na tela:
```tsx
import { toast } from "sonner";

toast.success("Orçamento criado!");
toast.error("Erro ao salvar");
```

---

## 📄 3. Como Criar Uma Nova Página

1.  **Crie o arquivo** em `src/pages/NovaPagina.tsx`.
2.  **Registre a rota** no arquivo central `src/App.tsx`:
    ```tsx
    const NovaPagina = lazyWithRetry(() => import("./pages/NovaPagina"));
    
    // Dentro do Router:
    <Route path="/nova" element={
        <UnifiedProtectionGuard>
            <NovaPagina />
        </UnifiedProtectionGuard>
    } />
    ```
3.  **Escolha o Guard Correto**: 
    *   Público? Nenhum guard. 
    *   Requer login do SaaS? `<UnifiedProtectionGuard>`. 
    *   Requer permissão de Admin? `<AdminGuard>`.
4.  **Lazy vs Estático**: Use `lazyWithRetry` (padrão do app). Só use importação estática se a página for crítica para o carregamento do PWA offline logo de entrada.

---

## 🪝 4. Como Criar Um Novo Hook

1.  Crie o arquivo na pasta `src/hooks/useNomeDoHook.ts`.
2.  Siga o padrão de nomenclatura: `use` + Domínio + Ação.
3.  Se envolver requisições ao banco, chame o `useQuery` de dentro do seu hook personalizado.
4.  Exporte as tipagens Typescript junto com o hook para autocompletar e documente com *JSDoc*.

```typescript
/** 
 * Busca os dados vitais da loja X com cache automático de 5 minutos.
 */
export function useStoreData(storeId: string) {
  return useQuery({
    queryKey: ["store-data", storeId],
    queryFn: async () => { /* ... fetch do supabase ... */ },
    staleTime: 5 * 60 * 1000, 
  });
}
```

---

## 🌩️ 5. Como Adicionar Uma Edge Function

A lógica serverless em Deno fica na pasta `supabase/functions`.

1.  Crie a pasta correspondente: `supabase/functions/nome-da-function/`.
2.  Crie um `index.ts` com o *handler* básico:

    ```typescript
    import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
    import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };

    serve(async (req) => {
      // Pré-flight do CORS
      if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
      
      // Lógica aqui...
    });
    ```
3.  Faça o deploy pelo terminal: `supabase functions deploy nome-da-function`.
4.  No frontend, invoque através do SDK: `await supabase.functions.invoke("nome-da-function", { body })`.

---

## ☑️ 6. Checklist Criterioso de PR (Pull Request)

Antes de "comitar", sempre valide:
- [ ] O código compila sem erros **TypeScript** na sua máquina?
- [ ] Não há `console.log` vazando em produção? (Use a função utilitária `debugLog` se necessário).
- [ ] Novas requisições usam `React Query` (e não `useEffect` puro)?
- [ ] Novos itens salvos no banco de dados incluem o `owner_id` ou `user_id` (para não quebrar a segurança RLS)?
- [ ] Os componentes estão usando tokens semânticos de cor do *Tailwind/Shadcn UI* (`bg-primary`, `text-muted-foreground`), ao invés de cores hex hardcoded?
- [ ] A página foi registrada no `App.tsx` com o **Guard correto**?

---

## 🚨 7. Erros Comuns e Como Evitar

> [!CAUTION]
> Tabela das falhas mais comuns nas *reviews* de código da plataforma:

| Erro | Causa Provável | Solução |
|------|-------|---------|
| **Dados não aparecem na tela** | Você esqueceu o `owner_id` no INSERT, e agora o RLS bloqueia o SELECT por segurança. | Sempre inclua o `user_id` na payload ao inserir. |
| **Tela totalmente branca** | Chunk falhou ao carregar em redes lentas. | Use `lazyWithRetry` ao invés de `React.lazy`. |
| **Network Error offline** | O PWA não fez cache dessa rota. | Verifique o *Service Worker* do Vite e o *staleTime* do React Query. |
| **"Licença inválida" (Loop)** | Cache local da licença desatualizou ou expirou. | O `useLicenseCache` tem TTL; force refresh deslogando. |
| **Notificação (Toast) invisível** | Falta o `Provider` na página. | Verifique se `<Toaster />` está englobando corretamente a view no layout principal. |
