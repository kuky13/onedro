

## Onboarding Flow para Novos Usuários

### Conceito
Criar um fluxo de triagem multi-etapas (`/onboarding`) que aparece após o primeiro login quando o usuário ainda não completou a configuração inicial. Cada etapa tem um botão "Pular" e segue o design premium (gradientes, `rounded-2xl`, ícones em círculos coloridos, `backdrop-blur`).

### Alteração no Banco de Dados
Adicionar coluna `onboarding_completed` (boolean, default `false`) na tabela `user_profiles`. Quando o fluxo termina (ou é totalmente pulado), marca como `true`.

```sql
ALTER TABLE user_profiles ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;
```

### Etapas do Onboarding

1. **Boas-vindas** — Tela de boas-vindas com breve explicação do que será configurado
2. **Perfil Pessoal** — Nome, username (campos de `user_profiles`)
3. **Marca da Empresa** — Nome, logo, CNPJ, telefone, email, endereço, WhatsApp (salva em `company_info`)
4. **Criar Técnico** — Formulário simplificado para cadastrar o primeiro técnico (nome, comissão) em `repair_technicians`
5. **Criar Loja** — Pergunta se quer criar uma loja; se sim, formulário inline (nome, slug, telefone) em `stores`; se não, pula
6. **Conclusão** — Resumo do que foi configurado + botão "Ir para o Dashboard"

Cada etapa terá:
- Barra de progresso no topo (step X de 6)
- Botão "Pular" (outline) + Botão "Continuar" (btn-premium)
- Design premium: `bg-muted/20 border-border/30 rounded-2xl`, ícones em `bg-primary/10 rounded-full`

### Redirecionamento
- **`RootRedirect.tsx`**: Se `user` está logado e `onboarding_completed === false`, redireciona para `/onboarding` em vez de `/dashboard`
- Buscar `onboarding_completed` da tabela `user_profiles` via query

### Arquivos a Criar
- `src/pages/OnboardingPage.tsx` — Página principal com state machine de etapas
- `src/components/onboarding/OnboardingWelcome.tsx` — Etapa 1
- `src/components/onboarding/OnboardingProfile.tsx` — Etapa 2
- `src/components/onboarding/OnboardingCompany.tsx` — Etapa 3
- `src/components/onboarding/OnboardingTechnician.tsx` — Etapa 4
- `src/components/onboarding/OnboardingStore.tsx` — Etapa 5
- `src/components/onboarding/OnboardingComplete.tsx` — Etapa 6
- `src/components/onboarding/OnboardingProgress.tsx` — Barra de progresso reutilizável

### Arquivos a Modificar
- `src/App.tsx` — Adicionar rota `/onboarding` (protegida com `UnifiedProtectionGuard`)
- `src/components/RootRedirect.tsx` — Checar `onboarding_completed` e redirecionar para `/onboarding` se `false`

### Design Premium (padrão das outras páginas)
- Layout: `max-w-2xl mx-auto px-4` (centralizado, não muito largo)
- Header: título da etapa com ícone em circle colorido
- Cards: `bg-muted/20 border border-border/30 rounded-2xl p-6`
- Barra de progresso: `bg-primary/20` track + `bg-primary` fill com animação
- Botões: "Pular" (`variant="outline" rounded-xl`) | "Continuar" (`btn-premium rounded-xl`)
- Transições entre etapas com `framer-motion` (fade + slide)

