import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, MessageSquare } from 'lucide-react';
import { SiteSettings } from './useSiteSettings';

interface Props {
  settings: SiteSettings;
  onChange: (field: keyof SiteSettings, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: string, value: string | number) => void;
}

export function TestimonialsCard({ settings, onChange, onAdd, onRemove, onUpdate }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Seção de Depoimentos</CardTitle>
        <CardDescription>Configure os depoimentos dos clientes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Título da Seção</Label>
            <Input value={settings.testimonials_section_title || ''} onChange={(e) => onChange('testimonials_section_title', e.target.value)} placeholder="O que nossos clientes dizem" />
          </div>
          <div>
            <Label>Subtítulo da Seção</Label>
            <Input value={settings.testimonials_section_subtitle || ''} onChange={(e) => onChange('testimonials_section_subtitle', e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Exibir Seção de Depoimentos</Label>
            <p className="text-sm text-muted-foreground">Controla se a seção aparece na página</p>
          </div>
          <Switch checked={settings.show_testimonials_section} onCheckedChange={(v) => onChange('show_testimonials_section', v)} />
        </div>
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-medium">Depoimentos</h4>
          <Button onClick={onAdd} size="sm"><Plus className="h-4 w-4 mr-2" /> Adicionar Depoimento</Button>
        </div>
        <div className="space-y-3">
          {(settings.testimonials_data || []).map((testimonial, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Nome</Label>
                      <Input value={testimonial.name} onChange={(e) => onUpdate(index, 'name', e.target.value)} />
                    </div>
                    <div>
                      <Label>Cargo/Empresa</Label>
                      <Input value={testimonial.role} onChange={(e) => onUpdate(index, 'role', e.target.value)} />
                    </div>
                    <div>
                      <Label>Avaliação (estrelas)</Label>
                      <Input type="number" min="1" max="5" value={testimonial.rating} onChange={(e) => onUpdate(index, 'rating', parseInt(e.target.value))} />
                    </div>
                  </div>
                  <div>
                    <Label>Depoimento</Label>
                    <Textarea value={testimonial.content} onChange={(e) => onUpdate(index, 'content', e.target.value)} rows={3} />
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
