
Objetivo: descobrir por que o botão “Imprimir” não funciona e definir correção segura.

Diagnóstico (confirmado pelo código):
1) Causa principal do “não imprime”
- No arquivo `src/components/printing/PrintLabelDialog.tsx`, o hook está assim:
  - `useReactToPrint({ content: () => contentRef, ... })`
- O projeto usa `react-to-print@3.3.0`, e nessa versão a opção correta é `contentRef` (não `content`).
- Resultado prático: o callback de print não recebe conteúdo válido e a biblioteca cai no fluxo “There is nothing to print” (não abre diálogo de impressão).

2) Indicador técnico adicional
- O próprio build já acusa:
  - `TS2353: 'content' does not exist in type 'UseReactToPrintOptions'`
- Isso confirma incompatibilidade de API (código legado v2 rodando com API v3).

3) Bloqueios paralelos de build (não são a causa direta do clique não imprimir, mas impedem estabilidade/deploy)
- `supabaseClient` indefinido em `supabase/functions/whatsapp-zapi-orcamentos/index.ts` (deve usar `supabase`).
- Tipagem Supabase desalinhada (`service_order_photos`, `get_public_os_status` etc.), indicando schema/types desatualizados.
- Campos obrigatórios ausentes (`photos`) e imports não usados em alguns arquivos.

Plano de implementação:
Fase 1 — Corrigir impressão (prioridade máxima)
1. Ajustar `PrintLabelDialog.tsx` para API correta do `react-to-print@3`:
   - trocar `content` por `contentRef` (ou chamar `handlePrint(() => node)` explicitamente).
   - padronizar `ref` com `useRef<HTMLDivElement>(null)` para evitar estado de nó DOM.
2. Garantir clique com gesto do usuário:
   - `onClick={() => handlePrint()}` (ou variação com callback content), sem passar evento acidental como conteúdo.
3. Limpar warnings TS no mesmo componente:
   - remover imports não usados (`useCallback`, `Loader2`) e manter apenas o necessário.
4. Melhorar feedback:
   - manter `onPrintError` com toast explícito e log detalhado para diagnóstico futuro.

Fase 2 — Destravar build para não mascarar regressões
1. Edge function:
   - `whatsapp-zapi-orcamentos/index.ts`: substituir `supabaseClient` por `supabase` no trecho do cliente padrão.
2. Hooks de OS:
   - incluir `photos: []` no `setFormData` de edição.
3. Supabase types:
   - sincronizar/generar tipos atuais para incluir `service_order_photos` e RPC `get_public_os_status`.
4. Limpeza TS:
   - remover imports/props não usados (`Upload`, `orderId`, `CardTitle`, `CardDescription`, etc.).

Fase 3 — Validação end-to-end (obrigatória)
1. Fluxo desktop:
   - abrir OS > Etiqueta > escolher 58mm/80mm > clicar Imprimir.
   - validar abertura do diálogo de impressão e preview com QR + dados da OS.
2. Repetição:
   - imprimir 2 vezes seguidas para confirmar que `ref` não “perde” o nó.
3. Sanidade de build:
   - confirmar typecheck sem erros.
4. Regressão rápida:
   - validar criação/edição de OS e página pública de status (arquivos tocados por erros atuais).

Detalhes técnicos (seção dedicada):
- API correta `react-to-print@3`:
  - esperado: `useReactToPrint({ contentRef, ... })`
  - atual no projeto: `content: () => contentRef` (inválido em v3)
- Por que o clique falha:
  - sem `contentRef` válido na opção do hook, a lib não encontra nó para clonar no iframe de print.
- Efeito colateral atual:
  - o usuário clica “Imprimir”, mas nada acontece visualmente (ou só erro silencioso de console).

Resultado esperado após execução:
- Botão “Imprimir” volta a abrir o print preview consistentemente.
- Build volta a passar, evitando que novos bugs de impressão fiquem “escondidos” por erros de compilação não relacionados.
