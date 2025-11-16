export interface MercadoPagoPlan {
  id: string;
  name: string;
  description: string;
  price: number; // em centavos
  currency: string;
  interval: "month" | "year";
  features: string[];
}

// Produtos configurados no Mercado Pago
export const MERCADOPAGO_PRODUCTS = {
  professional_monthly: {
    id: "professional_monthly",
    name: "Plano Profissional Mensal",
    description: "Acesso completo ao sistema de gestão OneDrip",
    price: 3585, // R$ 35,85 em centavos
    currency: "BRL",
    interval: "month" as const,
    features: [
      "Ordens de serviço ilimitadas",
      "Gestão completa de clientes",
      "Orçamentos profissionais",
      "Emissão de notas fiscais",
      "Relatórios detalhados",
      "Suporte prioritário",
    ],
  },
  professional_yearly: {
    id: "professional_yearly",
    name: "Plano Profissional Anual",
    description: "Acesso completo ao sistema de gestão OneDrip (12 meses)",
    price: 31525, // R$ 315,25 em centavos (desconto aplicado)
    currency: "BRL",
    interval: "year" as const,
    features: [
      "Ordens de serviço ilimitadas",
      "Gestão completa de clientes",
      "Orçamentos profissionais",
      "Emissão de notas fiscais",
      "Relatórios detalhados",
      "Suporte prioritário",
      "Economia de 4 meses (≈30%)",
    ],
  },
} as const;

export type PlanType = keyof typeof MERCADOPAGO_PRODUCTS;
