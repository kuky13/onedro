export interface MercadoPagoPlanConfig {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  features: string[];
}

export const MERCADOPAGO_PLANS: {
  monthly: MercadoPagoPlanConfig;
  yearly: MercadoPagoPlanConfig;
} = {
  monthly: {
    id: 'professional_monthly',
    name: 'Plano Mensal',
    description: 'Acesso completo ao sistema OneDrip',
    price: 10.0,
    currency: 'BRL',
    interval: 'month',
    features: [
      'Sistema de orçamentos e ordens de serviço',
      'Sistema de loja virtual',
      'Sistema de garantias',
      'Sistema de peliculas compatíveis',
      'Suporte técnico incluso',
      'Atualizações gratuitas',
      'Backup automático',
    ],
  },
  yearly: {
    id: 'professional_yearly',
    name: 'Plano Anual',
    description: 'Acesso completo ao sistema OneDrip com economia anual',
    price: 10.0,
    currency: 'BRL',
    interval: 'year',
    features: [
      'Sistema de orçamentos e ordens de serviço',
      'Sistema de loja virtual',
      'Sistema de garantias',
      'Sistema de peliculas compatíveis',
      'Suporte técnico incluso',
      'Atualizações gratuitas',
      'Backup automático',
    ],
  },
};

export function getMercadoPagoPlan(planType: 'monthly' | 'yearly'): MercadoPagoPlanConfig {
  return MERCADOPAGO_PLANS[planType];
}

export function calculateAnnualSavings(): number {
  const monthlyTotal = MERCADOPAGO_PLANS.monthly.price * 12;
  const yearlyPrice = MERCADOPAGO_PLANS.yearly.price;
  return monthlyTotal - yearlyPrice;
}
