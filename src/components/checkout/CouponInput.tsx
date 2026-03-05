import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Tag, X, Check } from 'lucide-react';
import { toast } from 'sonner';

interface AppliedCoupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
}

interface CouponInputProps {
  planType: 'monthly' | 'yearly';
  originalPrice: number;
  onCouponApplied: (coupon: AppliedCoupon | null, finalPrice: number) => void;
}

export function CouponInput({ planType, originalPrice, onCouponApplied }: CouponInputProps) {
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Digite um código de cupom');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error('Cupom inválido ou expirado');
        return;
      }

      // Check if coupon is valid for this plan
      if (data.applicable_plans && data.applicable_plans.length > 0) {
        if (!data.applicable_plans.includes(planType)) {
          toast.error('Este cupom não é válido para este plano');
          return;
        }
      }

      // Check max uses
      if (data.max_uses && (data.current_uses || 0) >= data.max_uses) {
        toast.error('Este cupom atingiu o limite de usos');
        return;
      }

      // Check minimum purchase
      if (data.min_purchase_amount && originalPrice < data.min_purchase_amount) {
        toast.error(`Valor mínimo para este cupom: R$ ${data.min_purchase_amount.toFixed(2)}`);
        return;
      }

      // Calculate discount
      let discountAmount = 0;
      if (data.discount_type === 'percentage') {
        discountAmount = (originalPrice * data.discount_value) / 100;
      } else {
        discountAmount = data.discount_value;
      }

      const finalPrice = Math.max(0, originalPrice - discountAmount);

      const coupon: AppliedCoupon = {
        id: data.id,
        code: data.code,
        discount_type: data.discount_type,
        discount_value: data.discount_value
      };

      setAppliedCoupon(coupon);
      onCouponApplied(coupon, finalPrice);
      toast.success('Cupom aplicado com sucesso!');
    } catch (error) {
      console.error('Erro ao validar cupom:', error);
      toast.error('Erro ao validar cupom');
    } finally {
      setLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    onCouponApplied(null, originalPrice);
    toast.info('Cupom removido');
  };

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span className="text-sm text-foreground">
            Cupom <strong>{appliedCoupon.code}</strong> aplicado
          </span>
          <Badge className="bg-green-500/20 text-green-500 border-0 text-xs">
            {appliedCoupon.discount_type === 'percentage' 
              ? `-${appliedCoupon.discount_value}%`
              : `-R$ ${appliedCoupon.discount_value.toFixed(2)}`}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={removeCoupon} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Código do cupom"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            className="pl-10"
            disabled={loading}
          />
        </div>
        <Button
          variant="outline"
          onClick={validateCoupon}
          disabled={loading || !couponCode.trim()}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
        </Button>
      </div>
    </div>
  );
}
