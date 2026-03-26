

## Problema

O `qualityMap` exige `[ext=mp4]` e `[ext=m4a]` nos seletores de formato. Muitos vídeos do YouTube (especialmente Shorts) só disponibilizam formatos WebM/Opus, então o yt-dlp falha com "Requested format is not available".

## Correção

Alterar o `qualityMap` para usar fallbacks flexíveis — tentar mp4/m4a primeiro, mas aceitar qualquer formato se não houver. Adicionar `--merge-output-format mp4` nos args para garantir que a saída final seja sempre .mp4 independente do formato de origem.

### Arquivo: `vps-api/src/routes/download.js`

**1. Substituir o `qualityMap` (linhas 42-53) por versão com fallbacks:**

```javascript
const qualityMap = {
  'best': 'bestvideo+bestaudio/best',
  '4320p': 'bestvideo[height<=4320]+bestaudio/best[height<=4320]/best',
  '2160p': 'bestvideo[height<=2160]+bestaudio/best[height<=2160]/best',
  '1440p': 'bestvideo[height<=1440]+bestaudio/best[height<=1440]/best',
  '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best',
  '720p': 'bestvideo[height<=720]+bestaudio/best[height<=720]/best',
  '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]/best',
  '360p': 'bestvideo[height<=360]+bestaudio/best[height<=360]/best',
  '240p': 'bestvideo[height<=240]+bestaudio/best[height<=240]/best',
  '144p': 'bestvideo[height<=144]+bestaudio/best[height<=144]/best'
};
```

**2. Adicionar `--merge-output-format mp4` nos args (linha 60-66):**

```javascript
const args = [
  '-f', formatArg,
  '-o', outputPath,
  '--no-playlist',
  '--no-warnings',
  '--quiet',
  '--merge-output-format', 'mp4'
];
```

Isso remove a restrição `[ext=mp4]`/`[ext=m4a]` e garante que o ffmpeg converta o resultado final para mp4.

**3. Para mp3, manter sem `--merge-output-format`** — o bloco `if (format === 'mp3')` na linha 68 já adiciona `-x --audio-format mp3`, que sobrescreve o merge format.

Ajuste: mover o `--merge-output-format` para fora do array inicial e adicioná-lo condicionalmente:

```javascript
const args = [
  '-f', formatArg,
  '-o', outputPath,
  '--no-playlist',
  '--no-warnings',
  '--quiet'
];

if (format === 'mp3') {
  args.push('-x', '--audio-format', 'mp3');
} else {
  args.push('--merge-output-format', 'mp4');
}
```

Após aplicar, será necessário atualizar o arquivo na VPS e rodar `pm2 restart all`.

