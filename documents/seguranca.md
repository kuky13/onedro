# 🔒 Arquitetura de Segurança

> [!WARNING]
> O ecossistema garante segurança robusta desde a persistência no navegador do cliente até a borda (Edge) e banco de dados.

---

## 🔑 1. SecureStorage (Criptografia Client-Side)

A classe `secureStorage` (`src/utils/secureStorage.ts`) substitui o clássico `localStorage` com forte criptografia na máquina do usuário:

*   **Algoritmo**: AES-GCM 256-bit.
*   **Derivação de chave**: `PBKDF2` com 100.000 iterações na CPU e hash SHA-256.
*   **Salt**: Gerado dinamicamente e de forma aleatória por item.
*   **IV**: Único por operação de escrita.

**Uso:**
```typescript
await secureStorage.setItem("session_token", tokenValue, { encrypt: true, ttl: 3600000 });
const token = await secureStorage.getItem("session_token");
```

---

## 🗄️ 2. Row Level Security (RLS)

Todas as tabelas críticas do Supabase possuem políticas RLS ativas injetadas por SQL. 

> [!CAUTION]
> **Regra de ouro**: O Banco de dados jamais confia no Frontend cego.

```sql
-- Padrão: usuário só consegue visualizar e puxar seus próprios dados
CREATE POLICY "Users can view own data"
ON budgets FOR SELECT
USING (owner_id = auth.uid());

-- IMPORTANTE: A key "SERVICE_ROLE", utilizada dentro das Edge Functions Deno, é a única capaz de ignorar o RLS.
```
*Portanto, sempre inclua `user_id` ou `owner_id` nos `INSERTs` provenientes do site, ou a linha criada sumirá da tela do usuário.*

---

## 🕵️ 3. SecurityLogger e Auditoria

O componente silencioso `SecurityLogger` intercepta anomalias e as despacha para a tabela cega `audit_logs`:
*   Tentativas bruscas de login (sucesso/falha).
*   Acessos a rotas restritas e proibidas.
*   Modificações em dados nevrálgicos (como edição de licenças manualmente e cargos de perfil).

---

## 🤖 4. Detecção de Bots e Fingerprinting

O módulo nativo `botDetection` atua como vigilante e analisa ativamente:
*   Padrões suspeitos em User-Agents conhecidos de scrapers da Web.
*   Velocidade de interação inumana (clicar formulários rápido demais).
*   *Fingerprinting* básico de assinaturas de navegador.

---

## 🚦 5. Rate Limiting nas Bordas

Nas respostas processuais (Edge Functions), o utilitário embutido `rate-limiter` contém e pune tráfego não-amigável.
*   **Login**: Máx. 5 tentativas por minuto por IP.
*   **Disparo SMS/WhatsApp**: Máx. 10 envios por minuto (evita que o cliente gaste o saldo da API terceirizada mandando spam).
*   **API geral**: Limitação em 100 requests por minuto.

```typescript
// Exemplo defensivo nas Edge Functions:
const allowed = await checkRateLimit(userId, "login", { maxAttempts: 5, windowMs: 60000 });
if (!allowed) return new Response("Too Many Requests", { status: 429 });
```

---

## 🔄 6. Token Rotation

O app não deixa o mesmo token vulnerável estático por anos em um celular roubado. O hook invisível `useTokenRotation` faz o trabalho sujo de atualizar o Refresh Token silenciosamente.
*   Intervalo padrão: Tenta limpar tokens velhos a cada 30 minutos.
*   Usa o `BroadcastChannel` para sincronizar as outras abas do navegador (se o cara tiver três abas abertas da Loja).

---

## 🛂 7. Licenciamento Validado

A validação não pode ser totalmente crackeada via front-end pois obedece a um fluxo:
```text
Frontend (via useLicenseCache) 
  └─→ Expirou na Máquina? 
       └─→ Chama Edge Function "validate-license"
            └─→ Backend consulta a tabela inviolável "licenses" (is_active, expires_at)
                 └─→ Retorna { valid: true/false }
                      └─→ O Frontend então reage e engatilha o <UnifiedGuard> para chutar ou liberar.
```

---

## 🛡️ 8. CSP (Content Security Policy)

Os *Headers* de navegação impedem injeção fatal de Scripts Maliciosos (XSS):
*   `script-src 'self'`: Bloqueia Javascript inline malicioso.
*   `connect-src`: Trava requisições para a rua, mantendo apenas liberados destinos como `Supabase` e `Mercado Pago`.
*   `frame-ancestors 'none'`: Medida Anti-Clickjacking impossibilitando a concorrência de espelhar o site em em `iframes` para roubar a UI.
