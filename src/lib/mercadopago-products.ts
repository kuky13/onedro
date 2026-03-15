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
    name: 'Plano de Suporte Mensal',
    description: 'Prestação de serviço de suporte técnico e configuração de sistemas',
    price: 10.0,
    currency: 'BRL',
    interval: 'month',
    features: [
      'Ferramenta de apoio para orçamentos e ordens de serviço',
      'Ferramenta de apoio para loja virtual',
      'Ferramenta de apoio para garantias',
      'Ferramenta de apoio para películas compatíveis',
      'Suporte técnico contínuo',
      'Atualizações da ferramenta incluídas',
      'Backup automático',
    ],
  },
  yearly: {
    id: 'professional_yearly',
    name: 'Plano de Suporte Anual',
    description: 'Prestação de serviço de suporte técnico e configuração de sistemas',
    price: 10.0,
    currency: 'BRL',
    interval: 'year',
    features: [
      'Ferramenta de apoio para orçamentos e ordens de serviço',
      'Ferramenta de apoio para loja virtual',
      'Ferramenta de apoio para garantias',
      'Ferramenta de apoio para películas compatíveis',
      'Suporte técnico contínuo',
      'Atualizações da ferramenta incluídas',
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
