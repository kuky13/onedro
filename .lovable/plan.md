

## Problema

Dois erros distintos:

1. **"Requested format is not available"** — O arquivo `download.js` na VPS provavelmente ainda tem seletores com `[ext=mp4]` ou `[ext=m4a]` que a IA da VPS não substituiu completamente. O arquivo local (no Lovable) está correto, mas o que roda na VPS pode estar diferente.

2. **`ERR_CONNECTION_TIMED_OUT`** — O yt-dlp demora demais e o cliente (120s) ou a rede corta antes da resposta chegar.

## Causa raiz

A IA da VPS disse que fez "mudanças cirúrgicas" em vez de substituir o arquivo inteiro. O `qualityMap` na VPS pode ainda ter restrições `[ext=mp4]` nas resoluções originais (480p, 360p, etc.) e o `formatArg` para mp3 pode ainda exigir `[ext=m4a]`.

## Correção

### 1. VPS — substituição completa do `download.js`

Enviar um prompt para a IA da VPS com o arquivo completo (não cirúrgico), garantindo que:
- Nenhum seletor contenha `[ext=mp4]` ou `[ext=m4a]`
- Todo seletor termine com `/best` como fallback final
- O formatArg para mp3 seja `bestaudio/best` (sem filtro de extensão)
- `--merge-output-format mp4` seja adicionado apenas para vídeo

### 2. Frontend — aumentar timeout para 180s

O `mediaDownloads.ts` tem timeout de 120s (linha 100). Vídeos longos podem precisar de mais tempo. Aumentar para 180s.

### 3. Frontend — melhorar mensagem de erro

Quando o erro contém "Requested format is not available", mostrar mensagem amigável sugerindo tentar qualidade "Melhor".

### Arquivos alterados no Lovable
- `src/services/api/mediaDownloads.ts` — timeout 120s -> 180s + mensagem amigável para erro de formato
- `vps-api/src/routes/download.js` — sincronizar com a versão correta (para referência)

### Prompt para a VPS
Gerar prompt com arquivo completo para substituição total, sem mudanças cirúrgicas.

