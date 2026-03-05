# 🪝 Referência de Hooks Customizados

O projeto possui **65+ hooks** organizados em `src/hooks/`. Este documento os cataloga por categoria.

---

## 🔐 1. Autenticação & Sessão

| Hook | Descrição |
|------|-----------|
| `useAuth` | Contexto principal de auth (user, session, signIn/Out) |
| `useTokenRotation` | Rotação automática de tokens para segurança |
| `useSecurity` | Logger de segurança e detecção de bots |
| `useSessionPersistence` | Persistência de sessão *cross-tab* via BroadcastChannel |

---

## 📜 2. Licenciamento

| Hook | Descrição |
|------|-----------|
| `useLicense` | Estado da licença ativa do usuário |
| `useLicenseVerification` | Validação periódica com o backend |
| `useLicenseCache` | Cache local da licença para uso offline |
| `useTrialLicense` | Controle de período *trial* |

---

## 📱 3. Detecção de Dispositivo

| Hook | Descrição |
|------|-----------|
| `useDeviceDetection` | Detecta tipo de dispositivo (*mobile/tablet/desktop*) |
| `useIOSDetection` | Verifica se é iOS/Safari para *workarounds* |
| `useMobileDetection` | Atalho simplificado para *mobile* |
| `useBatteryDetection` | Nível de bateria via Battery API |

---

## 🛠️ 4. Ordens de Serviço

| Hook | Descrição |
|------|-----------|
| `useSecureServiceOrders` | CRUD de OS com RLS automático |
| `useServiceOrderEdit` | Edição *inline* de OS |
| `useServiceOrderRealTime` | *Subscriptions* real-time para mudanças |
| `useServiceOrderShare` | Compartilhamento via link ou WhatsApp |

---

## 🐛 5. Orçamentos (Worm)

| Hook | Descrição |
|------|-----------|
| `useBudgetData` | *Fetch* de orçamentos com `react-query` |
| `useBudgetDeletion` | *Soft-delete* com auditoria |
| `useBudgetServiceOrder` | Conversão orçamento → OS |
| `useCreateServiceOrderFromBudget` | Criação automática de OS a partir de *budget* |

---

## 📡 6. PWA & Offline

| Hook | Descrição |
|------|-----------|
| `usePWA` | Controle de instalação PWA (*prompt*, estado) |
| `useOfflineDetection` | Monitora conectividade |
| `useSwipeGesture` | Gestos de *swipe* para navegação mobile |
| `useChunkLoadTelemetry` | Detecta falhas de carregamento de *chunks* |

---

## 🎨 7. UI/UX

| Hook | Descrição |
|------|-----------|
| `useResponsive` | *Breakpoints* responsivos |
| `useMobileMenu` | Estado do menu mobile (`MobileMenuProvider`) |
| `usePopupState` | Controle de popups e modais |
| `useDebounce` | *Debounce* genérico para inputs textuais |

---

## 🛒 8. Store (Loja Virtual)

| Hook | Descrição |
|------|-----------|
| `useShopProfile` | Dados do perfil da loja |
| `useImportBudgetToStore` | Importa orçamentos como produtos |
| `useStoreProducts` | CRUD de produtos da vitrine |
| `useStoreCart` | Carrinho de compras |

---

## ⚙️ 9. Configuração

| Hook | Descrição |
|------|-----------|
| `useAppConfig` | Configurações globais do app |
| `useCompanyBranding` | Dados visuais da empresa (logo, cores) |
| `useDrippySettings` | Config do provedor de IA (modelo, temperatura) |
| `useCookiePreferences` | Preferências de cookies/consentimento |

---

## 🎮 10. Gamificação

| Hook | Descrição |
|------|-----------|
| `useGameSettings` | Configurações do mini-game |
| `useGameScores` | Ranking e pontuações |

---

## 💡 Exemplo de Uso Típico

> [!TIP]
> **Componente que lista OS com proteção de licença:**

```tsx
function ServiceOrdersList() {
  const { user } = useAuth();
  const { isValid } = useLicense();
  const { data: orders, isLoading } = useSecureServiceOrders(user?.id);
  const { isMobile } = useDeviceDetection();

  if (!isValid) return <Navigate to="/licenca" />;
  if (isLoading) return <Skeleton />;

  return isMobile ? <MobileList data={orders} /> : <DesktopTable data={orders} />;
}
```
