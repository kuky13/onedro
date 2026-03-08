

## Analise e Melhorias nos Botões do Onboarding + Remoção do Username

### Problemas Identificados

**Botões inconsistentes no onboarding:**
- Mistura de `<button className="btn-premium">` (HTML puro) com `<Button variant="outline">` (shadcn) — estilos visuais desalinhados
- Botões "Pular" e "Continuar" nas etapas 4-7 usam layout `flex gap-3` lado a lado, mas nas etapas 1-3 os botões são empilhados verticalmente
- O botão "Sim, criar loja" na etapa Store usa `btn-premium px-8` inline, diferente do padrão das outras etapas
- Botões "Não agora" e "Pular etapa →" redundantes na etapa Store

**Username no Perfil:** Campo desnecessário que será removido.

### Plano de Alterações

**1. Padronizar todos os botões do onboarding** com estilo consistente inspirado na loja pública (`/loja/:slug`):
- **Botão primário (Continuar/Começar):** `btn-premium` full-width, `h-12 rounded-xl`, com ícone `ArrowRight` ou `ChevronRight` para indicar progressão
- **Botão secundário (Pular):** Estilo ghost/text sutil abaixo do primário (não lado a lado), padrão `text-sm text-muted-foreground` — consistente em todas as etapas
- **Botão "Sim, criar loja" / "Não agora":** Redesenhar como dois cards clicáveis side-by-side (como os cards de marca/device da loja pública) em vez de botões simples

**2. Alterações por arquivo:**

- **OnboardingProfile.tsx:** Remover campo Username; mudar layout dos botões de side-by-side para stacked (primário em cima, "Pular" como text link abaixo)
- **OnboardingCompany.tsx:** Mesma mudança de layout dos botões
- **OnboardingTechnician.tsx:** Mesma mudança de layout dos botões
- **OnboardingStore.tsx:** Redesenhar a escolha "Sim/Não" como dois cards visuais com ícones; padronizar botões do formulário da loja
- **OnboardingComplete.tsx:** Adicionar ícone ArrowRight ao botão (já tem, manter)
- **OnboardingWelcome.tsx, OnboardingDrippy.tsx, OnboardingSupport.tsx:** Já usam layout stacked — apenas adicionar ícone ChevronRight ao btn-premium

**3. Remover Username:**
- Remover state `username`, input e label do `OnboardingProfile.tsx`
- Atualizar `OnboardingPage.tsx` handler `handleProfile` para não enviar `username`
- Atualizar interface `Props` de `onNext` para `{ name: string }` apenas

