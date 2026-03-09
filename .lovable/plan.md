

# Melhorar Página /downloads

## O que melhorar

A página atual é funcional mas visualmente básica. Baseado no screenshot, vou melhorar o design com:

### Melhorias visuais e UX

1. **Header mais atrativo** — Adicionar ícone maior com gradiente/fundo decorativo, descrição com badges das plataformas suportadas (YouTube, Instagram, TikTok, etc.)

2. **Card principal com melhor visual** — Bordas mais suaves, padding maior, separadores visuais entre seções, fundo com gradiente sutil

3. **Plataformas suportadas** — Seção visual mostrando ícones/badges das plataformas compatíveis (YouTube, Instagram, TikTok, Twitter/X, Facebook)

4. **Botão de colar URL** — Botão ao lado do input para colar da área de transferência (clipboard API)

5. **Formato como toggle visual** — Substituir o Select de formato por botões toggle (MP4 / MP3) mais intuitivos e visuais

6. **Qualidade esconde quando MP3** — Qualidade só aparece quando formato é MP4 (não faz sentido para áudio)

7. **Loading com progresso visual** — Barra de progresso animada durante o processamento ao invés de apenas spinner

8. **Resultado com card destacado** — Card de resultado com borda colorida (primary), ícone de sucesso maior, e animação de entrada

9. **Dicas de uso** — Pequena seção "Como usar" com 3 passos ilustrados (cole URL → escolha formato → baixe)

### Arquivo modificado
- `src/pages/DownloadsPage.tsx` — reescrita completa do layout

