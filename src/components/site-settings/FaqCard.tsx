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
  onUpdate: (index: number, field: string, value: string) => void;
}

export function FaqCard({ settings, onChange, onAdd, onRemove, onUpdate }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Seção de FAQ</CardTitle>
        <CardDescription>Configure as perguntas frequentes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Título da Seção</Label>
            <Input value={settings.faq_section_title || ''} onChange={(e) => onChange('faq_section_title', e.target.value)} placeholder="Perguntas Frequentes" />
          </div>
          <div>
            <Label>Subtítulo da Seção</Label>
            <Input value={settings.faq_section_subtitle || ''} onChange={(e) => onChange('faq_section_subtitle', e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Exibir Seção de FAQ</Label>
            <p className="text-sm text-muted-foreground">Controla se a seção aparece na página</p>
          </div>
          <Switch checked={settings.show_faq_section} onCheckedChange={(v) => onChange('show_faq_section', v)} />
        </div>
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-medium">Perguntas e Respostas</h4>
          <Button onClick={onAdd} size="sm"><Plus className="h-4 w-4 mr-2" /> Adicionar FAQ</Button>
        </div>
        <div className="space-y-3">
          {(settings.faq_data || []).map((faq, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-3">
                  <div>
                    <Label>Pergunta</Label>
                    <Input value={faq.question} onChange={(e) => onUpdate(index, 'question', e.target.value)} placeholder="Pergunta frequente..." />
                  </div>
                  <div>
                    <Label>Resposta</Label>
                    <Textarea value={faq.answer} onChange={(e) => onUpdate(index, 'answer', e.target.value)} rows={3} />
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
