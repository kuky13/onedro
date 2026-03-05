# 🛠️ Utilitários e Geração de PDFs

> [!TIP]
> O formato dos utilitários de arquivos do sistema (`/src/utils/`) está construído para focar no Client-Side, aliviando o servidor de processamento e banda.

---

## 📄 1. Geração de PDFs (Client-Side)

O sistema gera PDFs **100% no navegador** usando a biblioteca `jsPDF`, eliminando custos de largura de banda e servidor Deno.

### `pdfUtils.ts`
Focado na geração de Orçamentos Comerciais (Módulo Worm) em formato A4:
*   Cabeçalho automático com logo embutido da empresa.
*   Tabela de peças/serviços com preços renderizados lado a lado.
*   Condições de pagamento detalhadas (à vista vs parcelado).
*   Garantia e termos legais customizáveis.
*   Assinatura digital do cliente/técnico.

### `serviceOrderPdfUtils.ts`
Focado em Recibos e vias de Assistência Técnica (Módulo OS):
*   Dados do cliente e status do dispositivo móvel.
*   Checklist de entrada completo do estado do aparelho.
*   Senha do dispositivo (mascarada/escondida para ética).
*   QR Code na página para rastreamento de via física.
*   Modo **Formato térmico (80mm)** disponível para impressoras bluetooh.

**Exemplo de uso:**
```typescript
import { generateBudgetPdf } from "@/utils/pdfUtils";

const doc = generateBudgetPdf(budgetData, companyInfo, parts);
doc.save("orcamento.pdf");
```

---

## 🔄 2. LazyWithRetry (Carregamento Resiliente)

O `lazyWithRetry` envolve a função natural `React.lazy()` com um sistema de *retry* (repetição) automático para ajudar a lidar com falhas de sinal ou de pacote (chunk) em PWA mobile:

```typescript
const Page = lazyWithRetry(() => import("./pages/Page"), {
  retries: 2,
  retryDelayMs: 350,
});
```

*   Detecta `ChunkLoadError` e *Failed to fetch dynamically imported module*.
*   Tenta recarregar o chunk até N vezes com sistema de *backoff*.
*   Se falhar drasticamente, dispara evento nativo `chunk-load-failed`.
*   O componente raiz `ChunkLoadRecoveryBanner` captura esse evento escutador e exibe na View inteira um botão vermelho de "Recarregar".

---

## 💰 3. Formatação de Moeda

### `currency.ts`
Padronização de Reais (BRL).

```typescript
formatBRL(1234.56); // "R$ 1.234,56"
parseBRL("R$ 1.234,56"); // 1234.56
```

---

## 💬 4. WhatsApp Utils

### `whatsappUtils.ts`
*   `formatPhoneForWhatsApp(phone)` → Normaliza para formato internacional (+55).
*   `openWhatsApp(phone, message)` → Abre link injetável na URI (`wa.me/`).
*   `validateWhatsAppNumber(phone)` → Validação REGEX rigorosa de formato BR (DDD + 9 dígitos).

### `whatsappTemplateUtils.ts`
*   Templates de mensagem prontos para orçamentos, OS e dias de garantias.
*   Trabalha com substituição de variáveis estáticas, ex: `{{cliente}}`, `{{valor}}`.

---

## 🧹 5. Autenticação e Limpeza

### `authCleanup.ts`
Acionado durante o evento de *signOut*:
*   Limpa tokens, cache de sessão persistente e dados de estado do usuário da RAM.
*   Remove estritamente *items* do `secureStorage` e `localStorage`.
*   Invoca invalidação global bloqueante de queries em andamento do React Query.

---

## 📱 6. PWA Utils

### `pwaDetection.ts`
*   `isPWA()` → Verifica se rodando o app via "Adicionar à Tela Inicial".
*   `isStandalone()` → Verifica modo *standalone* real (sem barra de pesquisa flutuando no navegador).

### `pwaReset.ts`
*   `resetPWACache()` → Força a deleção integral do cache do Service Worker.
*   Extremamente usado em situações de Atualização Forçada do código no deploy pelo botão lateral do "SuperAdmin".

---

## 🐞 7. Debug e Logging

### `debugLogger.ts`
*Logger* condicional customizado que só "printa" no console em ambiente (*development*):
```typescript
debugLog("auth", "Token renovado com sucesso", { expiresIn: 3600 });
```

### `asciiConsole.ts`
*Easter Egg* e utilitário de branding: Exibe a assinatura/arte ASCII no console do navegador de curiosos ao carregar a página inteira limpa.
