import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { SiteSettings } from './useSiteSettings';

interface Props {
  settings: SiteSettings;
  newFeature: string;
  onNewFeatureChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export function PlanFeaturesCard({ settings, newFeature, onNewFeatureChange, onAdd, onRemove }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recursos do Plano</CardTitle>
        <CardDescription>Gerencie a lista de funcionalidades incluídas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={newFeature}
            onChange={(e) => onNewFeatureChange(e.target.value)}
            placeholder="Digite uma nova funcionalidade"
            onKeyPress={(e) => e.key === 'Enter' && onAdd()}
          />
          <Button onClick={onAdd} disabled={!newFeature.trim()}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar
          </Button>
        </div>
        <div className="space-y-2">
          {settings.plan_features.map((feature, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <span>{feature}</span>
              <Button variant="ghost" size="sm" onClick={() => onRemove(index)} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
