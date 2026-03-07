// @ts-nocheck
import React, { useState, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { useCreateOsPdfTemplate, useUpdateOsPdfTemplate, OsPdfTemplate, OsTemplateType } from '@/hooks/useOsPdfTemplates';

interface Props {
  template?: Partial<OsPdfTemplate> | null;
  templateType: OsTemplateType;
  onSuccess: () => void;
  onCancel: () => void;
}

const OS_RECEIPT_PLACEHOLDERS = {
  'Empresa': ['{nome_empresa}', '{telefone}', '{email}', '{endereco}', '{cnpj}'],
  'Ordem de Serviço': ['{num_os}', '{status}', '{data_entrada}', '{data_saida}', '{data_previsao}', '{data_entrega}'],
  'Cliente': ['{nome_cliente}', '{telefone_cliente}'],
  'Equipamento': ['{modelo_dispositivo}', '{tipo_dispositivo}', '{imei_serial}'],
  'Serviço': ['{defeito}', '{observacoes}'],
  'Valores': ['{valor_total}', '{status_pagamento}'],
  'Garantia': ['{garantia_meses}', '{termos_cancelamento}', '{lembretes_garantia}'],
};

const THERMAL_LABEL_PLACEHOLDERS = {
  'Empresa': ['{nome_empresa}', '{telefone}'],
  'OS': ['{num_os}', '{data_entrada}'],
  'Cliente/Equip.': ['{nome_cliente}', '{modelo_dispositivo}', '{defeito}'],
  'Especial': ['{qr_code}'],
};

const SAMPLE_DATA: Record<string, string> = {
  '{nome_empresa}': 'TechFix Assistência',
  '{telefone}': '(11) 99999-9999',
  '{email}': 'contato@techfix.com',
  '{endereco}': 'Rua das Flores, 123 - Centro, SP',
  '{cnpj}': '12.345.678/0001-90',
  '{num_os}': 'OS-00042',
  '{status}': 'Em Andamento',
  '{data_entrada}': '07/03/2026',
  '{data_saida}': '10/03/2026',
  '{data_previsao}': '09/03/2026',
  '{data_entrega}': '10/03/2026',
  '{nome_cliente}': 'João da Silva',
  '{telefone_cliente}': '(11) 98888-8888',
  '{modelo_dispositivo}': 'iPhone 14 Pro',
  '{tipo_dispositivo}': 'Smartphone',
  '{imei_serial}': '353456789012345',
  '{defeito}': 'Tela trincada e touch não funciona',
  '{observacoes}': 'Aparelho caiu na água antes de trincar.',
  '{valor_total}': 'R$ 650,00',
  '{status_pagamento}': 'Pendente',
  '{garantia_meses}': '3',
  '{termos_cancelamento}': 'A garantia não cobre danos por mau uso.',
  '{lembretes_garantia}': 'Guarde este comprovante para acionamento da garantia.',
  '{qr_code}': '[QR Code]',
};

export const OsPdfTemplateEditor = ({ template, templateType, onSuccess, onCancel }: Props) => {
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [templateName, setTemplateName] = useState(template?.template_name || '');
  const [content, setContent] = useState(template?.template_content || '');
  const [isDefault, setIsDefault] = useState(template?.is_default || false);

  React.useEffect(() => {
    setTemplateName(template?.template_name || '');
    setContent(template?.template_content || '');
    setIsDefault(template?.is_default || false);
  }, [template]);

  const createTemplate = useCreateOsPdfTemplate();
  const updateTemplate = useUpdateOsPdfTemplate();

  const isEditing = !!template?.id;
  const isSaving = createTemplate.isPending || updateTemplate.isPending;
  const placeholders = templateType === 'os_receipt' ? OS_RECEIPT_PLACEHOLDERS : THERMAL_LABEL_PLACEHOLDERS;

  const insertPlaceholder = (placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);
    const newText = before + placeholder + after;
    setContent(newText);
    setTimeout(() => {
      textarea.focus();
      const pos = start + placeholder.length;
      textarea.setSelectionRange(pos, pos);
    }, 0);
  };

  const preview = useMemo(() => {
    let result = content;
    Object.entries(SAMPLE_DATA).forEach(([key, value]) => {
      result = result.split(key).join(value);
    });
    return result;
  }, [content]);

  const handleSave = async () => {
    if (!user?.id) return;
    if (!templateName.trim()) { toast.error('Digite um nome para o template'); return; }
    if (!content.trim()) { toast.error('Digite o conteúdo do template'); return; }

    try {
      if (isEditing && template?.id) {
        await updateTemplate.mutateAsync({
          id: template.id,
          userId: user.id,
          updates: { template_name: templateName, template_content: content, is_default: isDefault },
        });
      } else {
        await createTemplate.mutateAsync({
          user_id: user.id,
          template_name: templateName,
          template_type: templateType,
          template_content: content,
          is_default: isDefault,
        });
      }
      onSuccess();
    } catch (e) {
      console.error('Error saving OS PDF template:', e);
    }
  };

  const isLabel = templateType === 'thermal_label';

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle>{isEditing ? 'Editar Template' : 'Novo Template'}</SheetTitle>
        <SheetDescription>
          {isLabel
            ? 'Personalize a etiqueta térmica (58mm/80mm). Use as chaves para inserir dados dinâmicos.'
            : 'Personalize o recibo da Ordem de Serviço (A4). Use as chaves para inserir dados dinâmicos.'
          }
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nome do Template</Label>
          <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Ex: Recibo Completo" />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox id="osIsDefault" checked={isDefault} onCheckedChange={v => setIsDefault(v as boolean)} />
          <Label htmlFor="osIsDefault">Definir como padrão</Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Conteúdo do Template</Label>
            <div className="bg-muted p-2 rounded-md mb-2 flex flex-wrap gap-1.5 text-xs max-h-48 overflow-y-auto">
              {Object.entries(placeholders).map(([group, keys]) => (
                <React.Fragment key={group}>
                  <span className="font-semibold w-full block mb-0.5 mt-1">{group}:</span>
                  {keys.map(p => (
                    <button
                      key={p}
                      onClick={() => insertPlaceholder(p)}
                      className="px-2 py-1 bg-background border border-border rounded hover:bg-accent transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </React.Fragment>
              ))}
            </div>
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              className="h-[400px] font-mono text-sm"
              placeholder="Digite o conteúdo do template usando {chaves}..."
            />
          </div>

          <div className="space-y-2">
            <Label>Pré-visualização</Label>
            <div
              className={`rounded-md border bg-white p-4 overflow-auto whitespace-pre-wrap text-sm font-mono text-black shadow-sm ${
                isLabel ? 'h-[400px] max-w-[260px] mx-auto' : 'h-[400px]'
              }`}
              style={isLabel ? { aspectRatio: '58/120' } : undefined}
            >
              {preview}
            </div>
          </div>
        </div>
      </div>

      <SheetFooter className="flex-col sm:flex-row gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar Template'}
        </Button>
      </SheetFooter>
    </div>
  );
};
