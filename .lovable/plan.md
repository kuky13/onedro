

## Plano: Adicionar etapas Drippy + Suporte/Central de Ajuda ao Onboarding + Reset para teste

### O que será feito

1. **Adicionar 2 novas etapas ao onboarding** (antes das etapas existentes, logo após Welcome):
   - **Etapa 2 — Conheça a Drippy**: Apresenta a assistente IA Drippy, explica que ela está disponível no dashboard (barra de pesquisa), no WhatsApp CRM, e como suporte 24/7. Design premium com ícone `Bot`/`Sparkles`, cards mostrando onde encontrar a Drippy.
   - **Etapa 3 — Suporte e Central de Ajuda**: Apresenta os canais de suporte (WhatsApp, Discord, Email) e a Central de Ajuda (`/central-de-ajuda`). Mostra botões/links para `/suporte` e `/central-de-ajuda`. Design premium com ícone `Headphones`/`HelpCircle`.

2. **Atualizar TOTAL_STEPS** de 6 para 8 e reordenar:
   - 1: Welcome
   - 2: **Drippy (NOVO)**
   - 3: **Suporte & Ajuda (NOVO)**
   - 4: Perfil
   - 5: Empresa
   - 6: Técnico
   - 7: Loja
   - 8: Conclusão

3. **Reset do onboarding para o usuário de teste**: Executar SQL via Supabase para setar `onboarding_completed = false` no `user_profiles` do usuário `oliveira2@onedrip.email`.

### Arquivos

- **Criar** `src/components/onboarding/OnboardingDrippy.tsx` — Etapa sobre a Drippy
- **Criar** `src/components/onboarding/OnboardingSupport.tsx` — Etapa sobre Suporte/Central de Ajuda
- **Modificar** `src/pages/OnboardingPage.tsx` — Importar novos componentes, TOTAL_STEPS = 8, reordenar steps
- **Modificar** `src/components/onboarding/OnboardingWelcome.tsx` — Adicionar Drippy e Suporte na lista de features do welcome
- **SQL** — `UPDATE user_profiles SET onboarding_completed = false WHERE id = (SELECT id FROM auth.users WHERE email = 'oliveira2@onedrip.email')`

### Design das novas etapas

Ambas seguem o mesmo padrão premium: `motion.div` com fade/slide, ícone grande em circle `bg-primary/10`, título `text-2xl font-bold`, cards informativos em `bg-muted/30 border-border/30 rounded-xl`, botão "Continuar" (`btn-premium`) + "Pular" (text link).

