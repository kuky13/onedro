import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings, Plus } from 'lucide-react';
import { WhatsAppTemplate } from '@/hooks/worm/useWhatsAppMessageTemplates';
import { WormWhatsAppConfig } from './WormWhatsAppConfig';

interface WormTemplateSelectorProps {
  selectedTemplateId: string | null;
  onTemplateSelect: (templateId: string) => void;
  templates: WhatsAppTemplate[];
  disabled?: boolean;
}

export const WormTemplateSelector: React.FC<WormTemplateSelectorProps> = ({
  selectedTemplateId,
  onTemplateSelect,
  templates,
  disabled
}) => {
  const [showConfig, setShowConfig] = useState(false);

  // Template padrão embutido (com sistema de blocos para qualidades)
  const defaultTemplate = {
    id: 'default',
    template_name: 'Padrão',
    message_template: `📱 *{nome_empresa}* 

*Aparelho:* {modelo_dispositivo} 
*Serviço:* {nome_reparo} 

{qualidades_inicio}*{qualidade_nome}* – {peca_garantia_meses} meses de garantia
💰 À vista {peca_preco_vista} | no cartão (crédito) {peca_preco_parcelado} {peca_parcelas}x de {peca_valor_parcela}

{qualidades_fim}
*📦 Serviços Inclusos:*
{servicos_inclusos}

🚫 Não cobre danos por água ou molhado

📝 *Observações:*
{observacoes}

📅 Válido até: {data_validade}`,
    is_default: true
  };

  const allTemplates = [defaultTemplate, ...templates];

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Template da Mensagem</label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConfig(true)}
            className="h-8 px-2"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        <Select
          value={selectedTemplateId || 'default'}
          onValueChange={onTemplateSelect}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione um template" />
          </SelectTrigger>
          <SelectContent>
            {allTemplates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center gap-2">
                  {template.template_name}
                  {template.is_default && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Padrão
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {templates.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Crie seu template personalizado clicando no ícone de configurações
          </p>
        )}
      </div>

      {showConfig && (
        <WormWhatsAppConfig />
      )}
    </>
  );
};