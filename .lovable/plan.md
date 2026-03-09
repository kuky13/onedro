

# Criar Página `/downloads` (Download de Vídeos)

## Problema
A rota `/downloads` é referenciada no `AppsPage.tsx` mas nunca foi criada -- não existe nem o componente da página nem a rota no `App.tsx`. Por isso dá 404.

## Solução

### 1. Criar `src/pages/DownloadsPage.tsx`
Página funcional de download de vídeos usando o serviço já existente `src/services/api/mediaDownloads.ts`. Conterá:
- Input para colar URL do vídeo
- Seletor de formato (MP4/MP3)
- Seletor de qualidade (best, 1080p, 720p, 480p, 360p)
- Botão de download que chama `requestMediaDownload()`
- Feedback de loading/erro/sucesso
- Link de download gerado após processamento
- Design consistente com o resto do app (Tailwind + shadcn/ui)

### 2. Adicionar rota em `src/App.tsx`
Adicionar a rota protegida `/downloads` apontando para `DownloadsPage`, com `UnifiedProtectionGuard` + `AppShell` (como as outras páginas autenticadas).

