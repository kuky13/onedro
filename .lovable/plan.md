

## Arredondar e remover bordas dos cards internos em "Marca da Empresa"

### Problema
Os cards internos (Aviso de Orçamentos, Informações da Empresa, Termos de Garantia) têm bordas visíveis e cantos que parecem "pontudos" no mobile. O card base já usa `rounded-xl` mas a classe `border-border` reforça a borda.

### Solução

No `CompanyBrandingSettings.tsx`, alterar os `<Card>` internos para:
- Remover bordas explícitas (`border-0` ou `border-none`)
- Aumentar arredondamento para `rounded-2xl`
- Usar fundo sutil sem borda: `bg-card/50` ou `bg-muted/30`

**Mudanças específicas:**

1. **Card "Aviso de Orçamentos"** (linha 487): `<Card className="border-border bg-card">` → `<Card className="border-0 bg-muted/30 rounded-2xl">`

2. **Card "Informações da Empresa"** (linha 506): `<Card>` → `<Card className="border-0 bg-muted/30 rounded-2xl">`

3. **Card "Termos de Garantia"** (preciso verificar, mas mesmo padrão): → `<Card className="border-0 bg-muted/30 rounded-2xl">`

4. Também atualizar a classe `.card-premium` base no `index.css` de `rounded-xl` para `rounded-2xl` e reduzir a borda para `border-border/20` para consistência global, ou aplicar overrides apenas neste componente.

**Abordagem escolhida:** Override apenas nos cards deste componente para não afetar o resto do app.

### Arquivo modificado

| Arquivo | Mudança |
|---|---|
| `src/components/CompanyBrandingSettings.tsx` | Todos os `<Card>` internos: `border-0 bg-muted/30 rounded-2xl` |

