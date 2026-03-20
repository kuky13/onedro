import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';
import { SiteSettings } from './useSiteSettings';

interface Props {
  settings: SiteSettings;
  onChange: (field: keyof SiteSettings, value: any) => void;
}

export function PlanInfoCard({ settings, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Star className="h-5 w-5" /> Informações do Plano</CardTitle>
        <CardDescription>Configure os detalhes principais do plano</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="plan_name">Nome do Plano</Label>
            <Input id="plan_name" value={settings.plan_name} onChange={(e) => onChange('plan_name', e.target.value)} placeholder="Ex: Plano Profissional" />
          </div>
          <div>
            <Label htmlFor="plan_description">Descrição do Plano</Label>
            <Input id="plan_description" value={settings.plan_description} onChange={(e) => onChange('plan_description', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="plan_currency">Moeda</Label>
            <Input id="plan_currency" value={settings.plan_currency} onChange={(e) => onChange('plan_currency', e.target.value)} placeholder="R$" />
          </div>
          <div>
            <Label htmlFor="plan_price">Preço</Label>
            <Input id="plan_price" type="number" value={settings.plan_price} onChange={(e) => onChange('plan_price', Number(e.target.value))} />
          </div>
          <div>
            <Label htmlFor="plan_period">Período</Label>
            <Input id="plan_period" value={settings.plan_period} onChange={(e) => onChange('plan_period', e.target.value)} placeholder="/mês" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
