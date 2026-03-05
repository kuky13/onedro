# ⚡ Edge Functions (Backend Serverless)

Todas as Edge Functions rodam em **Deno** na pasta `supabase/functions/`. Elas são invocadas diretamente via SDK do Supabase ou REST.

---

## 💳 1. Pagamentos (Mercado Pago)

| Função | Descrição |
|--------|-----------|
| `create-mercadopago-checkout` | Gera link de checkout para planos SaaS |
| `check-mercadopago-payment` | Verifica status de pagamento pendente |
| `mercadopago-webhook` | Recebe webhooks do MP e ativa licenças |
| `cancel-mercadopago-payment` | Cancela assinatura recorrente |
| `create-mercadopago-subscription` | Cria assinatura recorrente (mensal/anual) |
| `create-mercadopago-pix` | Gera QR Code Pix para pagamento |

> [!NOTE]
> **Fluxo de Pagamento**: Frontend → `create-checkout` → MP redirect → Usuário paga → MP → `webhook` → Ativa licença no Banco de Dados.

---

## 📲 2. WhatsApp (Multi-Broker)

| Função | Descrição |
|--------|-----------|
| `whatsapp-proxy` | Proxy universal para envio de mensagens/PDFs |
| `whatsapp-webhook` | Recebe mensagens *incoming* de todas as engines |
| `whatsapp-qr-connect` | Gera QR code para conectar instância |
| `whatsapp-ai-reply` | Resposta automática via IA |
| `whatsapp-instance-manage` | CRUD de instâncias WhatsApp |
| `waha-proxy` | Proxy específico para engine Waha (Docker) |
| `waha-list-groups` | Lista grupos WhatsApp da instância |
| `whatsapp-zapi-orcamentos` | Automação de orçamentos via Z-API |

> [!TIP]
> **Engines suportadas**: Waha (Open Source), Z-API (Comercial), Evolution API.

---

## 🤖 3. Inteligência Artificial

| Função | Descrição |
|--------|-----------|
| `chat-ai` | Chat principal com *tool-calling* (busca orçamentos, OS, clientes) |
| `triage-ai` | Triagem automática de mensagens WhatsApp |
| `analyze-budgets` | Análise em lote de orçamentos para insights |
| `kowalski-ai-reply` | IA para grupos de WhatsApp (Kowalski System) |

---

## 🛡️ 4. Segurança e Monitoramento

| Função | Descrição |
|--------|-----------|
| `security-api` | Validação de senhas banidas, CSP, *bot detection* |
| `rate-limiter` | Rate limiting por IP/usuário |
| `real-time-monitoring` | *Health checks* e métricas do sistema |
| `audit-system` | *Logging* centralizado de ações críticas |

---

## 🔑 5. Usuários e Licenças

| Função | Descrição |
|--------|-----------|
| `validate-license` | Valida código de licença e ativa no BD |
| `manage-user-profile` | CRUD de perfil do usuário |
| `admin-reset-password` | Reset de senha por admin |
| `admin-update-user-email` | Troca de email por admin |
| `generate-license-keys` | Gera lotes de chaves de licença |

---

## 📧 6. Comunicação

| Função | Descrição |
|--------|-----------|
| `send-license-email` | Email de boas-vindas com chave de licença |
| `send-payment-receipt-email` | Recibo de pagamento por email |
| `send-push-notification` | Push notification via Web Push (VAPID) |
| `notification-system` | CRUD de notificações do sistema |

---

## 🛠️ 7. Utilitários

| Função | Descrição |
|--------|-----------|
| `sync-budgets-to-store` | Sincroniza orçamentos como produtos da loja |
| `cleanup-expired-data` | Limpeza automática de dados expirados |
| `check-maintenance-mode` | Verifica flag de manutenção global |

---

## 🔌 Padrão de Request/Response (Exemplo)

> [!CAUTION]
> Ao criar uma nova Edge Function, siga estritamente o modelo de CORS e injeção do cabeçalho de Autenticação para não vazar dados ou ter a requisição bloqueada pelo navegador.

**Invocação via SDK (Frontend)**
```typescript
const { data, error } = await supabase.functions.invoke("nome-da-function", {
  body: { param1: "valor" },
});
```

**Estrutura da Edge Function (Deno)**
```typescript
serve(async (req) => {
  // 1. CORS headers
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  
  // 2. Auth (opcional)
  const authHeader = req.headers.get("Authorization");
  const supabase = createClient(url, key, { global: { headers: { Authorization: authHeader } } });
  
  // 3. Lógica
  const { data } = await supabase.from("tabela").select("*");
  
  // 4. Response
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```
