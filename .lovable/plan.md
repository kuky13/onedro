

## Análise do Estado Atual

Após inspecionar os 3 arquivos, identifiquei que **2 das 4 correções solicitadas já estão aplicadas**:

1. **Edge Function (`media-download-proxy`)** — Já retorna `status: 200` na linha 151. Correção 2 já aplicada.
2. **VPS (`download.js`)** — Não contém `--remote-components ejs:github`. O array de args está limpo (linhas 60-66). Bug A da Correção 3 não existe no código atual.

### O que realmente precisa ser corrigido:

**Correção 1 — `src/services/api/mediaDownloads.ts`**

**Bug A — `normalizeDownloadUrl`**: A implementação atual usa `API_BASE_URL.replace(/\/api\/?$/, "")` que funciona, mas é frágil. Trocar por `new URL(API_BASE_URL).origin` é mais robusto e à prova de mudanças futuras no path.

**Bug B — Fallback 5xx**: O catch final (linhas 180-189) só faz fallback para erros de rede. Precisa incluir erros HTTP 5xx para que o edge proxy seja usado quando a VPS retorna 500/502/503/504.

**Correção 2 — `vps-api/src/routes/download.js`**

**Timeout do yt-dlp**: O processo `spawn` não tem timeout (linhas 75-138). Se o yt-dlp travar, a requisição fica pendente para sempre. Adicionar kill timer de 5 minutos.

### Plano de implementação

1. **Atualizar `normalizeDownloadUrl`** em `mediaDownloads.ts` — usar `new URL(API_BASE_URL).origin`
2. **Expandir fallback** no catch final de `requestMediaDownload` — incluir mensagens com "500", "502", "503", "504"
3. **Adicionar timeout de 5 min** ao spawn do yt-dlp em `download.js` com `SIGKILL` e resposta 504
4. **Deploy** da edge function `media-download-proxy` (sem mudanças nela, mas redeploy para garantir versão mais recente)

### Detalhes técnicos

- `API_BASE_URL` = `https://api.kuky.help/api` — `new URL(...).origin` retorna `https://api.kuky.help` corretamente
- O timeout no VPS usa variável `finished` para evitar respostas duplicadas ao cliente
- O fallback 5xx verifica a mensagem de erro por substrings dos códigos HTTP

