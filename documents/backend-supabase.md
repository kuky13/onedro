# ☁️ O Backend Supabase (e Edge Functions)

Para conseguir fornecer um sistema 24h acessível, sem a necessidade de hospedar uma API Node.js/Python monolítica pesada num VPS normal, este site utiliza o **Supabase** como a camada 100% vital do Backend.

---

## 🗄️ 1. O Banco de Dados (PostgreSQL)

Toda a parte de Banco de Dados está registrada via *migrations* e espelhada localmente na pasta `supabase/migrations/`.

*   **Organização das Tabelas**: O sistema possui dezenas de tabelas para atender à lógica de CRM (`warranties`, `repair_closings`, `subscription_plans`, `purchase_registrations`, etc).
*   **Triggers**: Muito do trabalho de sincronizar dados ocorre no nível do BD.
    *   *Exemplo:* Atualizar a data de "modificado em" ou criar logs de auditoria automáticos toda vez que algo for modificado.

> [!CAUTION]
> **RLS (Row Level Security)**: Fundamental no Supabase! 
> 
> Para garantir que o *Cliente X* não consiga ler a Ordem de Serviço do *Cliente Y*, as tabelas possuem Políticas de RLS. Toda query ao backend passa por um `AUTH.UID();` da sessão, permitindo que a linha só seja devolvida se você mesmo for o dono dela.

---

## 📁 2. Supabase Storage (Arquivos)

Pastas para imagens de ordens de serviço, recibos de mercadopago, logos das `store_system` (Lojas) são servidas em **Buckets do Supabase Storage** e devolvem URLs otimizadas para o Frontend.

---

## 🧠 3. O "Cérebro Escondido": Supabase Edge Functions

A inteligência do negócio por trás dos panos reside primariamente na pasta `supabase/functions/` (*Serverless Edge runtimes* em Deno Typescript). Diferente da SPA do front, isso executa nos servidores mundiais escondendo chaves secretas. Esse é o **Backend Prático**.

Dentre as mais de 40 funções principais que o site abriga para execução remota, destacam-se:

*   💳 **`create-mercadopago-checkout/` & `mercadopago-webhook/`**: Lidam com todo o fluxo de compras de assinaturas e checagem via webhooks assíncronos que a própria API do Marcado Pago aciona para aprovar sua licença.
*   📧 **`send-license-email/`**: Se comunica num micro-serviço (geralmente SMTP ou Resend) para enviar os pacotes de boas vindas para novos assinantes.
*   💬 **`whatsapp-proxy/` e `whatsapp-webhook/`**: Atua como ponte seguríssima da emissão dos pacotes via Z-api/Waha entre a Plataforma OS e os aparelhos dos usuários pelo WhatsApp.
*   🤖 **`chat-ai/` & `triage-ai/`**: A malha neural das funcionalidades em Deno. Recebe contexto de conversas de vendedores com o cliente usando prompts de sistema estagiários e manda request para provedores externos de LLM para responder via mensagens Z-API integradas.
*   🛡️ **`real-time-monitoring/` e `security-api/`**: APIs invocadas rotineiramente para manter os contadores de limites gerais, checagens de senhas banidas e suspensão de lojas.

---

## 🖥️ 4. O Proxy Auxiliar `vps-api`

Além das funções Edge Deno limitadas por memória e tempo de disparo (2 ~ 10seg max no edge), o código possui também na pasta raíz `/vps-api/` uma integração Node nativa voltada exclusivamente para servir de proxy bruto.

> [!NOTE] 
> Ele é usado para operações maiores e mais robustas de download num VPS auxiliar de retaguarda, para burlar certas configurações de domínios ou integrações mais teimosas de Whatsapp.

---

## 💡 Resumindo o Paradigma Supabase

1.  **Requisição:** Frontend manda pedido REST ou chama funções Edge pelo WebSDK direto dos hooks TS.
2.  **Validação:** A sessão criptografada valida o UID e dispara a Edge Function no serverless global (Edge Node).
3.  **Execução:** A function executa logs, comunica-se com AWS/Mercado Pago, faz inserção segura no postgres ignorando o RLS se rodar como "SERVICE ROLE" e responde com status final.
