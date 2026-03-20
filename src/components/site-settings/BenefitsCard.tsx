import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Zap } from 'lucide-react';
import { SiteSettings } from './useSiteSettings';

interface Props {
  settings: SiteSettings;
  onChange: (field: keyof SiteSettings, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: string, value: string) => void;
}

const ICON_OPTIONS = ['Zap', 'Shield', 'Users', 'Award', 'Star', 'CheckCircle', 'Clock', 'Target'];

export function BenefitsCard({ settings, onChange, onAdd, onRemove, onUpdate }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" /> Seção de Benefícios</CardTitle>
        <CardDescription>Configure a seção de vantagens do sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Título da Seção</Label>
            <Input value={settings.benefits_section_title || ''} onChange={(e) => onChange('benefits_section_title', e.target.value)} placeholder="Vantagens do OneDrip" />
          </div>
          <div>
            <Label>Subtítulo da Seção</Label>
            <Input value={settings.benefits_section_subtitle || ''} onChange={(e) => onChange('benefits_section_subtitle', e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Exibir Seção de Benefícios</Label>
            <p className="text-sm text-muted-foreground">Controla se a seção aparece na página</p>
          </div>
          <Switch checked={settings.show_benefits_section} onCheckedChange={(v) => onChange('show_benefits_section', v)} />
        </div>
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-medium">Benefícios</h4>
          <Button onClick={onAdd} size="sm"><Plus className="h-4 w-4 mr-2" /> Adicionar Benefício</Button>
        </div>
        <div className="space-y-3">
          {(settings.benefits_data || []).map((benefit, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Ícone</Label>
                      <select className="w-full p-2 border rounded" value={benefit.icon} onChange={(e) => onUpdate(index, 'icon', e.target.value)}>
                        {ICON_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Título</Label>
                      <Input value={benefit.title} onChange={(e) => onUpdate(index, 'title', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea value={benefit.description} onChange={(e) => onUpdate(index, 'description', e.target.value)} rows={2} />
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onRemove(index)} className="text-destructive hover:text-destructive ml-2">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
