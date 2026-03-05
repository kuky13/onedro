# 🌍 Integrações Externas e Automações

O sistema **OneDrip SaaS** deve muito de sua força motriz na integração de protocolos e APIs de comunicação fora do escopo original da internet convencional. Este documento compila quais são essas integrações críticas.

---

## 💳 1. Gateway de Pagamentos: Mercado Pago

Responsável **100%** pelo controle de entrada monetária, *checkout*, e controle de pagamentos recorrentes/parcelados.

*   🖥️ **Ambiente Frontend**: Perto da tela de *checkout*, as assinaturas ou faturamentos da "Loja/Carrinho" são empacotados pelo arquivo utilitário `lib/mercadopago-client.ts`.
*   🕵️ **Serviço Confidencial Backend**: Funções Serverless (como `check-mercadopago-payment`) operam consultando o *Payment Status* por debaixo dos panos através de Cronjobs ou Webhooks invocados via API Pix.
*   🚦 **Radar de Licença**: Somente o webhook confidencial é que pode alterar a matriz do Supabase de "Pendente" para "Aprovado", ativando um ano ou plano mensal para o usuário finalmente acessar o App.

---

## 📲 2. Comunicação via WhatsApp: Waha / Z-API / Evolution

Como um CRM embutido, a plataforma permite "conectar" números de WhatsApp Web (sem precisar da API oficial cara da Meta) e despachar orçamentos e recibos em PDF direto na cara do cliente.

> [!NOTE]
> **Motor Multi-Engine**
> 
> Pela análise do banco (`supabase/functions/waha-list-groups` ou `whatsapp-ai-reply`), nota-se a estrutura para integrar múltiplas *engines* de WhatsApp independentes. 
> Seja Waha (plataforma open source em Docker) ou APIs terceiras comerciais (*Z-API*, *Evolution*), a função `whatsapp-proxy` envelopa o PDF da Ordem de Serviço ou do módulo Worm para ser mandado via REST em *buffer* limpo diretamente ao número mapeado na interface React.

---

## 🧠 3. Inteligência Artificial: Triage

O sistema se comunica com as LLMs por trás do panos para oferecer funções únicas:

*   **Aceleração na Interface**: Funções voltadas para o auxílio em negociação.
*   **Prompt Limpo**: Ele abstrai o "prompt system" (como o site é configurado) em arquivos internos para que a IA não sofra injeções por clientes ardilosos (vide a Edge Function `chat-ai`).
*   **Extração de Dados**: A IA entende catálogos e orçamentos de serviços através de Data Extractors de SQL pré-processados, gerando em segundos um template polido para o vendedor.

---

## 🖨️ 4. Comunicação Visual Externa

*   📄 **PDF Gen**: Muito do material orçamentário e comercial *offline* do sistema é dinamicamente programado em TypeScript. Ele exporta *layouts* em A4 formatados pesadamente através da biblioteca auxiliar `jspdf`, servindo para os técnicos e tickets térmicos de assistências (`/utils/pdfUtils.ts`). 
*   🔔 **Web Push Notifications**: Usa a API do navegador e *ServiceWorkers* com VAPID configurados e chave de assinatura na API Supabase `send-push-notification` para mandar **Alertas globais** de urgência ou manutenções iminentes, mesmo quando o cliente está com o app fechado no Android.

---

## 🔐 5. Caches e Segurança

> [!IMPORTANT]
> O sistema não confia apenas no RLS do Supabase, estendendo a segurança para as bordas.

*   **Rate Limiting**: O sistema inclui proteções passivas como *Rate Limiting* nativo a nível de Edge (limitando "ddos" em funções de SMS e Login a centenas de acessos/min).
*   **OCR e Captcha**: Possui sistema de OCR e captcha nativos, prontos para serem habilitados ou desabilitados pelo dono da instância no caminho `/Admin/Config`.
