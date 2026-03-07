

# Expansao da Documentacao do Projeto OneDrip

## Objetivo
Criar documentacao tecnica completa e detalhada para que qualquer desenvolvedor que entre no projeto consiga entender rapidamente como tudo funciona. Vamos expandir os 5 arquivos existentes e criar 7 novos arquivos `.md`.

---

## Arquivos Existentes - Melhorias

### `0-ai-project-context.md` - Atualizar
- Adicionar secao sobre o sistema de Diagnostico de Dispositivos (`/testar/:token`)
- Documentar o modulo de Peliculas (`/p`)
- Mencionar o sistema de Gamificacao (HamsterPage/CookiePage)
- Atualizar a lista de Guards com `MobileMenuProvider`

### `1-visao-geral.md` - Expandir
- Adicionar modulo de Garantias (`/garantia`)
- Documentar Central de Ajuda (`/central-de-ajuda`)
- Adicionar secao sobre Notificacoes Push e sistema de Updates
- Mencionar Apps Page e Sistema (mini-OS no browser)

### `2-frontend-estrutura.md` - Detalhar
- Documentar o sistema de `lazyWithRetry` com telemetria de chunks
- Explicar `ChunkLoadRecoveryBanner` e `useChunkLoadTelemetry`
- Detalhar o `SessionPersistence` e `secureStorage`
- Documentar o `MobileMenuProvider` e navegacao mobile

### `3-backend-supabase.md` - Expandir
- Listar todas as 40+ Edge Functions com descricao curta
- Documentar o fluxo de `rate-limiter` e `security-api`
- Explicar o sistema de notificacoes push (`send-push-notification`)

### `4-integracoes-externas.md` - Atualizar
- Adicionar secao sobre Evolution API e multi-broker completo
- Documentar o sistema de download de video via VPS proxy

---

## Novos Arquivos

### `5-typescript-tipos.md` - Tipos e Interfaces
Documentar todas as interfaces criticas do sistema:
- `ServiceOrderData` (OS com campos de senha, checklist, etc.)
- `Budget` (tipo canonico via Supabase Tables)
- `User`, `UserProfile`, `DebugInfo`
- `CompanyInfo`, `CompanyData`, `CompanyFormData`
- `TestSession`, `TestResult`, `TestDetails`, `TestConfig`
- `DevicePasswordType` e seus valores
- `CheckoutParams`, `PixPaymentData`
- `BudgetData`, `BudgetPartData` (para PDFs)
- `AuthContextType` e `UserRole`
- Tabela visual com cada tipo e onde e usado

### `6-hooks-referencia.md` - Guia de Hooks
Catalogar os 60+ hooks com categorias:
- **Autenticacao**: `useAuth`, `useTokenRotation`, `useSecurity`
- **Licenciamento**: `useLicense`, `useLicenseVerification`, `useLicenseCache`, `useTrialLicense`
- **Dispositivo**: `useDeviceDetection`, `useIOSDetection`, `useMobileDetection`, `useBatteryDetection`
- **Ordens de Servico**: `useSecureServiceOrders`, `useServiceOrderEdit`, `useServiceOrderRealTime`, `useServiceOrderShare`
- **Orcamentos (Worm)**: `useBudgetData`, `useBudgetDeletion`, `useBudgetServiceOrder`, `useCreateServiceOrderFromBudget`
- **PWA/Offline**: `usePWA`, `useOfflineDetection`, `useSwipeGesture`
- **UI/UX**: `useResponsive`, `useMobileMenu`, `usePopupState`, `useDebounce`
- **Store**: `useShopProfile`, `useImportBudgetToStore`
- **Config**: `useAppConfig`, `useCompanyBranding`, `useDrippySettings`, `useCookiePreferences`
- Exemplos de uso para os mais importantes

### `7-rotas-e-guards.md` - Mapa de Rotas
Tabela completa com todas as rotas do `App.tsx`:
- Rota, Componente, Guard aplicado, Lazy/Estatico
- Fluxo visual de redirecionamentos (auth -> licenca -> dashboard)
- Explicacao de cada Guard: `UnifiedProtectionGuard`, `AdminGuard`, `MaintenanceGuard`
- Como adicionar uma nova rota (passo a passo)

### `8-edge-functions.md` - Backend Serverless
Documentacao detalhada de cada Edge Function:
- **Pagamentos**: `create-mercadopago-checkout`, `check-mercadopago-payment`, `mercadopago-webhook`, `cancel-mercadopago-payment`, `create-mercadopago-subscription`
- **WhatsApp**: `whatsapp-proxy`, `whatsapp-webhook`, `whatsapp-qr-connect`, `whatsapp-ai-reply`, `whatsapp-instance-manage`, `waha-proxy`
- **IA**: `chat-ai`, `triage-ai`, `analyze-budgets`
- **Seguranca**: `security-api`, `rate-limiter`, `real-time-monitoring`, `audit-system`
- **Usuarios**: `manage-user-profile`, `admin-reset-password`, `admin-update-user-email`, `validate-license`
- **Comunicacao**: `send-license-email`, `send-payment-receipt-email`, `send-push-notification`, `notification-system`
- Fluxo de request/response de cada grupo

### `9-seguranca.md` - Arquitetura de Seguranca
- Sistema `secureStorage` com criptografia AES-GCM e PBKDF2
- `SecurityLogger` e auditoria de acessos
- RLS (Row Level Security) - regras e padroes
- `botDetection`, `secureCSP`, `secureNavigation`
- Rate limiting nas Edge Functions
- Token rotation (`useTokenRotation`)
- Fluxo de validacao de licencas

### `10-pdf-e-utils.md` - Utilitarios e Geracao de PDFs
- Como funciona o `pdfUtils.ts` (jsPDF client-side)
- `serviceOrderPdfUtils.ts` para recibos de OS
- `currency.ts` - formatacao BRL
- `whatsappUtils.ts` e `whatsappTemplateUtils.ts`
- `authCleanup.ts` - limpeza de sessao
- `pwaDetection.ts` e `pwaReset.ts`
- `debugLogger.ts` e `asciiConsole.ts`

### `11-guia-contribuicao.md` - Guia para Novos Devs
- Como rodar o projeto localmente
- Convencoes de codigo (React Query > useEffect, Zustand para global state)
- Como criar uma nova pagina (registrar rota, escolher Guard, lazy vs estatico)
- Como criar um novo hook
- Como adicionar uma Edge Function
- Checklist de PR/review
- Erros comuns e como evitar (RLS, chunks, offline)

---

## Detalhes Tecnicos

### Arquivos a criar:
1. `.documentação/docs/5-typescript-tipos.md`
2. `.documentação/docs/6-hooks-referencia.md`
3. `.documentação/docs/7-rotas-e-guards.md`
4. `.documentação/docs/8-edge-functions.md`
5. `.documentação/docs/9-seguranca.md`
6. `.documentação/docs/10-pdf-e-utils.md`
7. `.documentação/docs/11-guia-contribuicao.md`

### Arquivos a editar:
1. `.documentação/docs/0-ai-project-context.md`
2. `.documentação/docs/1-visao-geral.md`
3. `.documentação/docs/2-frontend-estrutura.md`
4. `.documentação/docs/3-backend-supabase.md`
5. `.documentação/docs/4-integracoes-externas.md`

Total: **12 arquivos** (7 novos + 5 atualizados)

