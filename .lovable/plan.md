

# Fix: Download redireciona para api.kuky.help e é bloqueado

## Problema
Quando o usuário clica em "Baixar arquivo", o link aponta diretamente para `api.kuky.help/...`. O browser tenta navegar para essa URL e recebe `ERR_BLOCKED_BY_RESPONSE` (headers CORS/COEP bloqueiam a navegação direta).

## Solução
Substituir o link direto (`<a href=...>`) por um **fetch + blob download** no cliente. Ao clicar, o app:
1. Faz `fetch()` da URL de download
2. Converte a resposta em blob
3. Cria um `URL.createObjectURL()` temporário
4. Dispara o download via `<a>` virtual com `click()`
5. Revoga o object URL após o download

### Mudança em `src/pages/DownloadsPage.tsx`
- Adicionar função `handleFileDownload` que faz fetch blob + download programático
- Substituir o `<a href={result.downloadUrl}>` por um `<Button onClick={handleFileDownload}>`
- Adicionar estado `downloading` para feedback visual durante o fetch do arquivo
- Fallback: se o fetch blob falhar, abrir a URL em nova aba como último recurso

