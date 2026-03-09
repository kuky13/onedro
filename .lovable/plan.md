

# Remover Tela de Ativação de Licença do `/auth`

## O que será removido

A tela "Ative sua Licença" que aparece nas linhas 104-117 do `AuthPage.tsx` — o bloco que verifica `if (user && isLicenseValid === false)` e renderiza o `LicenseActivationSection` / `LicenseActivationIOS`.

## Alterações

**Arquivo: `src/pages/AuthPage.tsx`**

1. Remover o bloco condicional (linhas 104-117) que exibe a tela de ativação de licença
2. Remover imports não mais usados: `LicenseActivationSection`, `LicenseActivationIOS`, `useLicenseVerification`, `useIOSDetection`
3. Remover variáveis associadas: `licenseData`, `isLicenseValid`, `isIOS`, `handleLicenseActivated`
4. Se o usuário já estiver logado, simplesmente redirecionar para `/dashboard` (comportamento padrão do auth)

A ativação de licença continuará disponível na página dedicada `/license` (`LicensePage.tsx`) — apenas a interrupção forçada no fluxo de login será removida.

