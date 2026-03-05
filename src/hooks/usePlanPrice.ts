import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function usePlanPrice(planType: 'monthly' | 'yearly', initialPrice: number) {
  const [price, setPrice] = useState(initialPrice);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrice() {
      try {
        const { data } = await supabase
          .from('subscription_plans')
          .select('price')
          .eq('plan_type', planType)
          .eq('active', true)
          .single();

        if (data) {
          setPrice(data.price);
        }
      } catch (error) {
        console.error('Error fetching plan price:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPrice();
  }, [planType]);

  return { price, loading };
}
