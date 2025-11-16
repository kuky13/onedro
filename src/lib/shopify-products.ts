export interface ShopifyPlanConfig {
  id: string;
  variantId: string;
  productId: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  features: string[];
  sku: string;
  handle: string;
}

export const SHOPIFY_PLANS: Record<string, ShopifyPlanConfig> = {
  monthly: {
    id: 'monthly',
    variantId: 'gid://shopify/ProductVariant/52519299383659',
    productId: 14812158656875,
    name: 'Plano Profissional Mensal',
    description: 'Acesso completo ao sistema OneDrip',
    price: 35.85,
    currency: 'BRL',
    interval: 'month',
    sku: 'ONEDRIP-MONTHLY',
    handle: 'plano-profissional-mensal',
    features: [
      'Sistema de orçamentos e ordens de serviço',
      'Gestão de clientes ilimitada',
      'Cálculos automáticos',
      'Suporte técnico incluso',
      'Atualizações gratuitas',
      'Backup automático'
    ]
  },
  yearly: {
    id: 'yearly',
    variantId: 'gid://shopify/ProductVariant/52519299449195',
    productId: 14812158722411,
    name: 'Plano Profissional Anual',
    description: 'Acesso completo ao sistema OneDrip com economia anual',
    price: 315.25,
    currency: 'BRL',
    interval: 'year',
    sku: 'ONEDRIP-YEARLY',
    handle: 'plano-profissional-anual',
    features: [
      'Sistema de orçamentos e ordens de serviço',
      'Gestão de clientes ilimitada',
      'Cálculos automáticos',
      'Suporte técnico incluso',
      'Atualizações gratuitas',
      'Backup automático',
      '🎁 4 meses grátis'
    ]
  }
};

export function getShopifyPlan(planType: 'monthly' | 'yearly'): ShopifyPlanConfig {
  return SHOPIFY_PLANS[planType];
}

export function calculateAnnualSavings(): number {
  const monthlyTotal = SHOPIFY_PLANS.monthly.price * 12;
  const yearlyPrice = SHOPIFY_PLANS.yearly.price;
  return monthlyTotal - yearlyPrice;
}
