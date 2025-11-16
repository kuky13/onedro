import { toast } from "sonner";

const SHOPIFY_API_VERSION = '2025-07';
const SHOPIFY_STORE_PERMANENT_DOMAIN = 'onedri-dev-t0kp3.myshopify.com';
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
const SHOPIFY_STOREFRONT_TOKEN = '47ae4d3596021b57b097add35594c513';

const CART_CREATE_MUTATION = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        totalQuantity
        cost {
          totalAmount {
            amount
            currencyCode
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export interface ShopifyProduct {
  node: {
    id: string;
    title: string;
    description: string;
    handle: string;
    priceRange: {
      minVariantPrice: {
        amount: string;
        currencyCode: string;
      };
    };
    images: {
      edges: Array<{
        node: {
          url: string;
          altText: string | null;
        };
      }>;
    };
    variants: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          price: {
            amount: string;
            currencyCode: string;
          };
          availableForSale: boolean;
          selectedOptions: Array<{
            name: string;
            value: string;
          }>;
        };
      }>;
    };
    options: Array<{
      name: string;
      values: string[];
    }>;
  };
}

export async function storefrontApiRequest(query: string, variables: any = {}) {
  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (response.status === 402) {
    toast.error("Shopify: Pagamento requerido", {
      description: "O acesso à API do Shopify requer um plano de pagamento ativo. Visite admin.shopify.com para atualizar."
    });
    return;
  }

  if (!response.ok) {
    throw new Error(`Erro HTTP! status: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`Erro ao chamar Shopify: ${data.errors.map((e: any) => e.message).join(', ')}`);
  }

  return data;
}

export async function createShopifyCheckout(variantId: string, quantity: number = 1): Promise<string> {
  try {
    const cartData = await storefrontApiRequest(CART_CREATE_MUTATION, {
      input: {
        lines: [{
          quantity,
          merchandiseId: variantId,
        }],
      },
    });

    if (cartData.data.cartCreate.userErrors.length > 0) {
      throw new Error(`Falha ao criar carrinho: ${cartData.data.cartCreate.userErrors.map((e: any) => e.message).join(', ')}`);
    }

    const cart = cartData.data.cartCreate.cart;
    
    if (!cart.checkoutUrl) {
      throw new Error('URL de checkout não retornada pelo Shopify');
    }

    const url = new URL(cart.checkoutUrl);
    url.searchParams.set('channel', 'online_store');
    url.searchParams.set('locale', 'pt-BR');
    
    // Adicionar return URL para redirecionar após pagamento
    const returnUrl = `https://www.onedrip.com.br/purchase-success?order_id={order_id}`;
    url.searchParams.set('return_url', returnUrl);
    
    const checkoutUrl = url.toString();
    
    return checkoutUrl;
  } catch (error) {
    console.error('Erro ao criar checkout Shopify:', error);
    throw error;
  }
}
