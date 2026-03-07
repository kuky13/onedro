

## Problem: `formatSmart` Heuristic Causes Wrong Prices in Chat

The Drippy AI chat shows R$ 7750,00 instead of R$ 310,00. The root cause is the `formatSmart` function in `whatsappTemplateUtils.ts`:

```typescript
const formatSmart = (v: number): string => {
  return v >= 10000 ? formatCurrency(v) : formatCurrencyFromReais(v)
}
```

This guesses whether a value is in **cents** or **reais** based on magnitude:
- `>= 10000` → treats as cents (divides by 100) 
- `< 10000` → treats as reais (no division)

But database values are **always in cents**. So when `installment_price * installmentCount` produces a value like 7750 (which is < 10000), it gets treated as reais instead of being divided by 100. This creates wildly wrong prices.

### Fix

**File: `src/utils/whatsappTemplateUtils.ts`**

Replace the `formatSmart` and `formatSmartWithRef` functions to **always treat values as cents** (using `formatCurrency`), removing the broken heuristic:

```typescript
const formatSmart = (v: number): string => {
  if (v === null || v === undefined || isNaN(v as any)) return formatCurrencyFromReais(0)
  return formatCurrency(v)  // Always treat as cents from DB
}
const formatSmartWithRef = (v: number, _ref: number): string => {
  if (v === null || v === undefined || isNaN(v as any)) return formatCurrencyFromReais(0)
  return formatCurrency(v)  // Always treat as cents from DB
}
```

This is a 2-line change that fixes the price display across both the chat (Drippy) and WhatsApp message generation, since both paths use `generateWhatsAppMessageFromTemplate`.

### Files Affected
- `src/utils/whatsappTemplateUtils.ts` — fix `formatSmart` and `formatSmartWithRef` (lines 51-58)

