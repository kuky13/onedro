import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Save, DollarSign, Calendar, Sparkles, CreditCard } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  plan_type: string;
  name: string;
  description: string | null;
  price: number;
  days: number;
  features: string[];
  active: boolean;
  created_at: string;
}

export function PlansManagement() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('plan_type');

      if (error) throw error;
      
      const formattedPlans = (data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : [],
        active: !!plan.active,
      }));
      
      setPlans(formattedPlans);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const updatePlan = async (plan: SubscriptionPlan) => {
    setSaving(plan.id);
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({
          name: plan.name,
          description: plan.description,
          price: plan.price,
          days: plan.days,
          features: plan.features,
          active: plan.active
        })
        .eq('id', plan.id)
        .select();

      if (error) throw error;
      toast.success('Plano atualizado com sucesso!');
      await fetchPlans();
    } catch (error: unknown) {
      console.error('Erro ao atualizar plano:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao atualizar plano: ${errorMessage}`);
    } finally {
      setSaving(null);
    }
  };

  const handlePlanChange = (planId: string, field: keyof SubscriptionPlan, value: unknown) => {
    setPlans(prev => prev.map(p => 
      p.id === planId ? { ...p, [field]: value } : p
    ));
  };

  const handleFeatureChange = (planId: string, index: number, value: string) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      const newFeatures = [...p.features];
      newFeatures[index] = value;
      return { ...p, features: newFeatures };
    }));
  };

  const addFeature = (planId: string) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      return { ...p, features: [...p.features, ''] };
    }));
  };

  const removeFeature = (planId: string, index: number) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      return { ...p, features: p.features.filter((_, i) => i !== index) };
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl lg:text-3xl font-bold tracking-tight">Gerenciamento de Planos</h1>
        <p className="text-sm lg:text-base text-muted-foreground">
          Configure os preços e recursos dos planos de assinatura.
        </p>
      </div>

      {plans.length === 0 ? (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Nenhum plano encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {plans.map(plan => (
            <Card key={plan.id} className={`rounded-2xl border-border/50 transition-colors hover:border-primary/20 ${!plan.active ? 'opacity-60' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      {plan.plan_type === 'monthly' ? (
                        <Calendar className="h-4 w-4 text-primary" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                  </div>
                  <Switch
                    checked={plan.active}
                    onCheckedChange={(checked) => handlePlanChange(plan.id, 'active', checked)}
                  />
                </div>
                <CardDescription>
                  Plano {plan.plan_type === 'monthly' ? 'Mensal' : 'Anual'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Nome do Plano</Label>
                  <Input
                    value={plan.name}
                    onChange={(e) => handlePlanChange(plan.id, 'name', e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Descrição</Label>
                  <Textarea
                    value={plan.description || ''}
                    onChange={(e) => handlePlanChange(plan.id, 'description', e.target.value)}
                    rows={2}
                    className="rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs">
                      <DollarSign className="h-3 w-3" />
                      Preço (R$)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={plan.price}
                      onChange={(e) => handlePlanChange(plan.id, 'price', parseFloat(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs">
                      <Calendar className="h-3 w-3" />
                      Dias
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={plan.days}
                      onChange={(e) => handlePlanChange(plan.id, 'days', parseInt(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Recursos Inclusos</Label>
                  <div className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={feature}
                          onChange={(e) => handleFeatureChange(plan.id, index, e.target.value)}
                          placeholder="Ex: Acesso completo"
                          className="rounded-xl"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFeature(plan.id, index)}
                          className="shrink-0 text-destructive h-9 w-9"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addFeature(plan.id)}
                      className="w-full rounded-xl"
                    >
                      + Adicionar Recurso
                    </Button>
                  </div>
                </div>

                <Button
                  className="w-full rounded-xl"
                  onClick={() => updatePlan(plan)}
                  disabled={saving === plan.id}
                >
                  {saving === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Alterações
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
