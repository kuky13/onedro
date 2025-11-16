import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCreateTemplate, useUpdateTemplate } from '@/hooks/worm/useWhatsAppMessageTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PLACEHOLDERS = [
  { key: '{nome_empresa}', label: 'Nome da Empresa', description: 'Nome da sua empresa' },
  { key: '{nome_cliente}', label: 'Nome do Cliente', description: 'Nome completo do cliente' },
  { key: '{telefone_cliente}', label: 'Telefone do Cliente', description: 'Telefone do cliente' },
  { key: '{modelo_dispositivo}', label: 'Modelo do Dispositivo', description: 'Ex: iPhone 13 Pro' },
  { key: '{tipo_dispositivo}', label: 'Tipo do Dispositivo', description: 'Ex: Smartphone, Notebook' },
  { key: '{problema_dispositivo}', label: 'Problema Relatado', description: 'Problema do dispositivo' },
  { key: '{nome_reparo}', label: 'Nome do Reparo', description: 'Ex: Troca de Tela' },
  { key: '{qualidade_peca}', label: 'Qualidade da Peça', description: 'Ex: Original, AAA (global)' },
  { key: '{garantia_meses}', label: 'Garantia (meses)', description: 'Tempo de garantia (global)' },
  { key: '{preco_vista}', label: 'Preço à Vista', description: 'Preço formatado em R$ (global)' },
  { key: '{preco_parcelado}', label: 'Preço Parcelado', description: 'Preço total parcelado (global)' },
  { key: '{num_parcelas}', label: 'Número de Parcelas', description: 'Quantidade de parcelas (global)' },
  { key: '{valor_parcela}', label: 'Valor da Parcela', description: 'Valor de cada parcela (global)' },
  { key: '{forma_pagamento}', label: 'Forma de Pagamento', description: 'Ex: Cartão de Crédito' },
  { key: '{servicos_inclusos}', label: 'Serviços Inclusos', description: 'Lista de serviços' },
  { key: '{observacoes}', label: 'Observações', description: 'Notas do orçamento' },
  { key: '{data_validade}', label: 'Data de Validade', description: 'Válido até' },
  { key: '{qualidades_inicio}', label: '🔁 Início Bloco Qualidades', description: 'Inicia repetição por peça' },
  { key: '{qualidades_fim}', label: '🔁 Fim Bloco Qualidades', description: 'Finaliza repetição' },
  { key: '{qualidade_nome}', label: '📦 Nome da Qualidade', description: 'Nome (dentro do bloco)' },
  { key: '{peca_preco_vista}', label: '💰 Preço Vista Peça', description: 'Preço da peça (bloco)' },
  { key: '{peca_preco_parcelado}', label: '💳 Preço Parcelado Peça', description: 'Parcelado da peça (bloco)' },
  { key: '{peca_parcelas}', label: '🔢 Num. Parcelas Peça', description: 'Parcelas da peça (bloco)' },
  { key: '{peca_valor_parcela}', label: '💵 Valor Parcela Peça', description: 'Valor parcela da peça (bloco)' },
  { key: '{peca_garantia_meses}', label: '🛡️ Garantia Peça', description: 'Garantia em meses (bloco)' },
];

interface WhatsAppTemplateEditorProps {
  template?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export const WhatsAppTemplateEditor = ({ template, onSuccess, onCancel }: WhatsAppTemplateEditorProps) => {
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [templateName, setTemplateName] = useState(template?.template_name || '');
  const [messageTemplate, setMessageTemplate] = useState(template?.message_template || '');
  const [isDefault, setIsDefault] = useState(template?.is_default || false);

  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();

  const isEditing = !!template?.id;
  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  const insertPlaceholder = (placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = messageTemplate;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    const newText = before + placeholder + after;
    setMessageTemplate(newText);

    // Restaurar foco e posição do cursor
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + placeholder.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleSave = async () => {
    if (!user?.id) return;

    if (!templateName.trim()) {
      toast.error('Digite um nome para o template');
      return;
    }

    if (!messageTemplate.trim()) {
      toast.error('Digite o conteúdo do template');
      return;
    }

    if (messageTemplate.length > 5000) {
      toast.error('Template muito longo (máximo 5000 caracteres)');
      return;
    }

    try {
      if (isEditing) {
        await updateTemplate.mutateAsync({
          id: template.id,
          userId: user.id,
          updates: {
            template_name: templateName,
            message_template: messageTemplate,
            is_default: isDefault,
          }
        });
      } else {
        await createTemplate.mutateAsync({
          user_id: user.id,
          template_name: templateName,
          message_template: messageTemplate,
          is_default: isDefault,
        });
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const generatePreview = () => {
    let preview = messageTemplate;
    
    // Processar blocos de qualidades primeiro
    if (preview.includes('{qualidades_inicio}') && preview.includes('{qualidades_fim}')) {
      const before = preview.split('{qualidades_inicio}')[0];
      const middle = preview.split('{qualidades_inicio}')[1].split('{qualidades_fim}')[0];
      const after = preview.split('{qualidades_fim}')[1] || '';
      
      // Gerar 2 peças de exemplo
      const exampleParts = [
        {
          qualidade_nome: 'Nacional',
          peca_preco_vista: 'R$ 330,00',
          peca_preco_parcelado: 'R$ 360,00',
          peca_parcelas: '4',
          peca_valor_parcela: 'R$ 90,00',
          peca_garantia_meses: '6',
        },
        {
          qualidade_nome: 'Importada',
          peca_preco_vista: 'R$ 250,00',
          peca_preco_parcelado: 'R$ 280,00',
          peca_parcelas: '4',
          peca_valor_parcela: 'R$ 70,00',
          peca_garantia_meses: '3',
        }
      ];
      
      let processedParts = '';
      exampleParts.forEach(part => {
        let partText = middle;
        Object.entries(part).forEach(([key, value]) => {
          partText = partText.replaceAll(`{${key}}`, value);
        });
        processedParts += partText;
      });
      
      preview = `${before}${processedParts}${after}`;
    }
    
    // Substituir placeholders globais por dados de exemplo
    const replacements: Record<string, string> = {
      '{nome_empresa}': 'TechCell Assistência',
      '{nome_cliente}': 'João Silva',
      '{telefone_cliente}': '(11) 98765-4321',
      '{modelo_dispositivo}': 'iPhone 13 Pro',
      '{tipo_dispositivo}': 'Smartphone',
      '{problema_dispositivo}': 'Tela quebrada',
      '{nome_reparo}': 'Troca de Tela',
      '{qualidade_peca}': 'Original Apple',
      '{garantia_meses}': '6',
      '{preco_vista}': 'R$ 850,00',
      '{preco_parcelado}': 'R$ 950,00',
      '{num_parcelas}': '4',
      '{valor_parcela}': 'R$ 237,50',
      '{forma_pagamento}': 'Cartão de Crédito',
      '{servicos_inclusos}': 'Buscamos e entregamos o seu aparelho\nPelícula 3D de brinde',
      '{observacoes}': 'Peça 100% original com garantia Apple',
      '{data_validade}': '31/12/2025',
    };

    // Aplicar substituições
    Object.entries(replacements).forEach(([key, value]) => {
      preview = preview.replaceAll(key, value);
    });

    return preview;
  };

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle>
          {isEditing ? 'Editar Template' : 'Novo Template de WhatsApp'}
        </SheetTitle>
      </SheetHeader>

      <div className="space-y-4">
        <div>
          <Label htmlFor="template-name">Nome do Template</Label>
          <Input
            id="template-name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Ex: Template Padrão"
            maxLength={100}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="is-default">Definir como Padrão</Label>
            <p className="text-sm text-muted-foreground">
              Este template será usado por padrão
            </p>
          </div>
          <Switch
            id="is-default"
            checked={isDefault}
            onCheckedChange={setIsDefault}
          />
        </div>

        <div>
          <Label htmlFor="message-template">Mensagem do Template</Label>
          <Textarea
            ref={textareaRef}
            id="message-template"
            value={messageTemplate}
            onChange={(e) => setMessageTemplate(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="min-h-[300px] font-mono text-sm"
            maxLength={5000}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {messageTemplate.length} / 5000 caracteres
          </p>
        </div>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Palavras-chave Disponíveis</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Clique para inserir no template
          </p>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {PLACEHOLDERS.map((placeholder) => (
                <Button
                  key={placeholder.key}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => insertPlaceholder(placeholder.key)}
                >
                  <div className="flex-1">
                    <div className="font-mono text-xs font-medium">
                      {placeholder.key}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {placeholder.description}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </Card>

        <Card className="p-4 bg-muted/30">
          <h3 className="font-semibold mb-3">Preview da Mensagem</h3>
          <div className="bg-background rounded-lg p-4 border border-border">
            <pre className="text-sm whitespace-pre-wrap font-sans">
              {generatePreview() || 'Digite um template para ver o preview...'}
            </pre>
          </div>
        </Card>

        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1"
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Atualizar' : 'Criar'} Template
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
};
