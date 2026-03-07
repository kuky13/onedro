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
  'Empresa': ['{logo}', '{nome_empresa}', '{telefone}', '{email}', '{endereco}', '{cnpj}'],
  'Ordem de Serviço': ['{num_os}', '{status}', '{prioridade}', '{data_entrada}', '{data_saida}', '{data_previsao}', '{data_entrega}'],
  'Cliente': ['{nome_cliente}', '{telefone_cliente}', '{endereco_cliente}'],
  'Equipamento': ['{modelo_dispositivo}', '{tipo_dispositivo}', '{imei_serial}'],
  'Serviço': ['{defeito}', '{observacoes}', '{obs_tecnico}', '{obs_cliente}'],
  'Valores': ['{valor_total}', '{custo_mao_obra}', '{custo_pecas}', '{status_pagamento}'],
  'Garantia': ['{garantia_meses}', '{termos_cancelamento}', '{lembretes_garantia}'],
};

const THERMAL_LABEL_PLACEHOLDERS = {
  'Empresa': ['{nome_empresa}', '{telefone}'],
  'OS': ['{num_os}', '{data_entrada}'],
  'Cliente/Equip.': ['{nome_cliente}', '{modelo_dispositivo}', '{defeito}'],
  'Especial': ['{qr_code}'],
};

const SECTION_BLOCKS = [
  { tag: '[CABECALHO]', label: 'Cabeçalho' },
  { tag: '[BADGE_OS]', label: 'Badge OS' },
  { tag: '[STATUS]', label: 'Status/Pills' },
  { tag: '[SECAO: DADOS DO CLIENTE]', label: 'Seção Cliente' },
  { tag: '[SECAO: DADOS DO EQUIPAMENTO]', label: 'Seção Equipamento' },
  { tag: '[SECAO: PROBLEMA RELATADO]', label: 'Seção Problema' },
  { tag: '[SECAO: VALORES]', label: 'Seção Valores' },
  { tag: '[SECAO: DATAS]', label: 'Seção Datas' },
  { tag: '[SECAO: OBSERVAÇÕES]', label: 'Seção Observações' },
  { tag: '[GARANTIA]', label: 'Garantia' },
  { tag: '[ASSINATURAS]', label: 'Assinaturas' },
];

const SAMPLE_DATA: Record<string, string> = {
  '{logo}': '🖼️',
  '{nome_empresa}': 'TechFix Assistência',
  '{telefone}': '(11) 99999-9999',
  '{email}': 'contato@techfix.com',
  '{endereco}': 'Rua das Flores, 123 - Centro, SP',
  '{cnpj}': '12.345.678/0001-90',
  '{num_os}': 'OS-0042',
  '{status}': 'Em Andamento',
  '{prioridade}': 'Alta',
  '{data_entrada}': '07/03/2026',
  '{data_saida}': '10/03/2026',
  '{data_previsao}': '09/03/2026',
  '{data_entrega}': '10/03/2026',
  '{nome_cliente}': 'João da Silva',
  '{telefone_cliente}': '(11) 98888-8888',
  '{endereco_cliente}': 'Av. Paulista, 1000 - São Paulo, SP',
  '{modelo_dispositivo}': 'iPhone 14 Pro',
  '{tipo_dispositivo}': 'Smartphone',
  '{imei_serial}': '353456789012345',
  '{defeito}': 'Tela trincada e touch não funciona',
  '{observacoes}': 'Aparelho caiu na água antes de trincar.',
  '{obs_tecnico}': 'Necessário trocar módulo completo.',
  '{obs_cliente}': 'Solicitou urgência na entrega.',
  '{valor_total}': 'R$ 650,00',
  '{custo_mao_obra}': 'R$ 200,00',
  '{custo_pecas}': 'R$ 450,00',
  '{status_pagamento}': 'Pendente',
  '{garantia_meses}': '3',
  '{termos_cancelamento}': 'A garantia não cobre danos por mau uso, quedas ou contato com líquidos.',
  '{lembretes_garantia}': 'Guarde este comprovante para acionamento da garantia.',
  '{qr_code}': '[QR Code]',
};

const DEFAULT_OS_TEMPLATE = `[CABECALHO]
{logo} {nome_empresa}
{telefone} • {email} • {cnpj}
{endereco}

[BADGE_OS]
OS #{num_os} - {data_entrada}

[STATUS]
Status: {status} | Prioridade: {prioridade} | Pagamento: {status_pagamento}

[SECAO: DADOS DO CLIENTE]
Nome: {nome_cliente}
Telefone: {telefone_cliente}
Endereço: {endereco_cliente}

[SECAO: DADOS DO EQUIPAMENTO]
Equipamento: {modelo_dispositivo}
Tipo: {tipo_dispositivo}
IMEI/Serial: {imei_serial}

[SECAO: PROBLEMA RELATADO]
{defeito}

[SECAO: VALORES]
Mão de Obra: {custo_mao_obra}
Peças: {custo_pecas}
TOTAL: {valor_total}

[SECAO: DATAS]
Entrada: {data_entrada}
Previsão: {data_previsao}
Saída: {data_saida}
Entrega: {data_entrega}

[SECAO: OBSERVAÇÕES]
{observacoes}
Técnico: {obs_tecnico}
Cliente: {obs_cliente}

[GARANTIA]
Garantia: {garantia_meses} meses
{termos_cancelamento}
{lembretes_garantia}

[ASSINATURAS]`;

const DEFAULT_THERMAL_TEMPLATE = `{nome_empresa}
{telefone}
---
{num_os}
{data_entrada}
---
CL: {nome_cliente}
AP: {modelo_dispositivo}
DEF: {defeito}
---
{qr_code}
CONSULTE STATUS ONLINE`;

// Preview renderer that simulates PDF sections visually
const PreviewSection = ({ tag, lines }: { tag: string; lines: string[] }) => {
  const filteredLines = lines.filter(l => l.trim() !== '');

  if (tag === 'CABECALHO') {
    return (
      <div className="border-b-2 border-teal-600 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="text-lg font-bold text-foreground">{filteredLines[0] || ''}</div>
        </div>
        {filteredLines.slice(1).map((l, i) => (
          <div key={i} className="text-xs text-muted-foreground">{l}</div>
        ))}
      </div>
    );
  }

  if (tag === 'BADGE_OS') {
    return (
      <div className="inline-block bg-teal-700 text-white px-3 py-1 rounded text-sm font-bold mb-2">
        {filteredLines.join(' ')}
      </div>
    );
  }

  if (tag === 'STATUS') {
    return (
      <div className="flex flex-wrap gap-1 mb-2">
        {filteredLines.join(' ').split('|').map((pill, i) => (
          <span key={i} className="bg-teal-100 text-teal-800 text-xs px-2 py-0.5 rounded-full font-medium">
            {pill.trim()}
          </span>
        ))}
      </div>
    );
  }

  if (tag === 'GARANTIA') {
    return (
      <div className="mt-3 border-t pt-2">
        <div className="bg-teal-700 text-white text-center text-sm font-bold py-1 rounded mb-2">
          TERMOS DE GARANTIA
        </div>
        {filteredLines.map((l, i) => (
          <div key={i} className="text-xs text-foreground">{l}</div>
        ))}
      </div>
    );
  }

  if (tag === 'ASSINATURAS') {
    return (
      <div className="mt-3 grid grid-cols-2 gap-4 pt-2">
        <div className="text-center">
          <div className="border-b border-foreground mb-1 h-8" />
          <div className="text-xs text-muted-foreground">Assinatura Técnico</div>
        </div>
        <div className="text-center">
          <div className="border-b border-foreground mb-1 h-8" />
          <div className="text-xs text-muted-foreground">Assinatura Cliente</div>
        </div>
      </div>
    );
  }

  // Generic SECAO
  const title = tag.replace('SECAO: ', '');
  return (
    <div className="mb-2">
      <div className="flex items-stretch gap-0 mb-1">
        <div className="w-1 bg-teal-600 rounded-l" />
        <div className="bg-muted px-2 py-1 flex-1 rounded-r">
          <span className="text-xs font-bold text-foreground">{title}</span>
        </div>
      </div>
      {filteredLines.map((l, i) => (
        <div key={i} className="text-xs text-foreground pl-3">{l}</div>
      ))}
    </div>
  );
};

function parseTemplateSections(text: string) {
  const sections: { tag: string; lines: string[] }[] = [];
  const rawLines = text.split('\n');
  let currentTag: string | null = null;
  let currentLines: string[] = [];

  for (const line of rawLines) {
    const sectionMatch = line.trim().match(/^\[(CABECALHO|BADGE_OS|STATUS|GARANTIA|ASSINATURAS|SECAO:\s*.+?)\]$/);
    if (sectionMatch) {
      if (currentTag !== null) {
        sections.push({ tag: currentTag, lines: currentLines });
      }
      currentTag = sectionMatch[1];
      currentLines = [];
    } else {
      if (currentTag !== null) {
        currentLines.push(line);
      } else {
        // Lines before any section tag - treat as raw text
        if (line.trim()) {
          if (!sections.length || sections[sections.length - 1].tag !== '__RAW__') {
            sections.push({ tag: '__RAW__', lines: [] });
          }
          sections[sections.length - 1].lines.push(line);
        }
      }
    }
  }
  if (currentTag !== null) {
    sections.push({ tag: currentTag, lines: currentLines });
  }
  return sections;
}

export const OsPdfTemplateEditor = ({ template, templateType, onSuccess, onCancel }: Props) => {
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isLabel = templateType === 'thermal_label';

  const defaultContent = isLabel ? DEFAULT_THERMAL_TEMPLATE : DEFAULT_OS_TEMPLATE;

  const [templateName, setTemplateName] = useState(template?.template_name || '');
  const [content, setContent] = useState(template?.template_content || defaultContent);
  const [isDefault, setIsDefault] = useState(template?.is_default || false);

  React.useEffect(() => {
    setTemplateName(template?.template_name || '');
    setContent(template?.template_content || defaultContent);
    setIsDefault(template?.is_default || false);
  }, [template, defaultContent]);

  const createTemplate = useCreateOsPdfTemplate();
  const updateTemplate = useUpdateOsPdfTemplate();

  const isEditing = !!template?.id;
  const isSaving = createTemplate.isPending || updateTemplate.isPending;
  const placeholders = isLabel ? THERMAL_LABEL_PLACEHOLDERS : OS_RECEIPT_PLACEHOLDERS;

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);
    const newText = before + text + after;
    setContent(newText);
    setTimeout(() => {
      textarea.focus();
      const pos = start + text.length;
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

  const previewSections = useMemo(() => {
    if (isLabel) return null;
    return parseTemplateSections(preview);
  }, [preview, isLabel]);

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

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle>{isEditing ? 'Editar Template' : 'Novo Template'}</SheetTitle>
        <SheetDescription>
          {isLabel
            ? 'Personalize a etiqueta térmica (58mm/80mm). Use as chaves para inserir dados dinâmicos.'
            : 'Personalize o recibo da OS (A4). Use as chaves e blocos [SECAO] para controlar o layout do PDF real.'
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

            {/* Placeholders */}
            <div className="bg-muted p-2 rounded-md mb-1 flex flex-wrap gap-1.5 text-xs max-h-36 overflow-y-auto">
              {Object.entries(placeholders).map(([group, keys]) => (
                <React.Fragment key={group}>
                  <span className="font-semibold w-full block mb-0.5 mt-1">{group}:</span>
                  {keys.map(p => (
                    <button
                      key={p}
                      onClick={() => insertAtCursor(p)}
                      className="px-2 py-1 bg-background border border-border rounded hover:bg-accent transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </React.Fragment>
              ))}
            </div>

            {/* Section blocks (OS only) */}
            {!isLabel && (
              <div className="bg-muted/50 p-2 rounded-md mb-1 flex flex-wrap gap-1.5 text-xs">
                <span className="font-semibold w-full block mb-0.5">Blocos de seção:</span>
                {SECTION_BLOCKS.map(b => (
                  <button
                    key={b.tag}
                    onClick={() => insertAtCursor(`\n${b.tag}\n`)}
                    className="px-2 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-700 rounded hover:bg-teal-200 dark:hover:bg-teal-800/40 transition-colors font-medium"
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            )}

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
              className={`rounded-md border bg-white dark:bg-white p-4 overflow-auto text-sm text-black shadow-sm ${
                isLabel ? 'h-[400px] max-w-[260px] mx-auto font-mono whitespace-pre-wrap' : 'h-[400px]'
              }`}
              style={isLabel ? { aspectRatio: '58/120' } : undefined}
            >
              {isLabel ? (
                <div className="whitespace-pre-wrap">{preview}</div>
              ) : (
                previewSections && previewSections.map((section, i) => {
                  if (section.tag === '__RAW__') {
                    return (
                      <div key={i} className="text-xs mb-1">
                        {section.lines.map((l, j) => <div key={j}>{l}</div>)}
                      </div>
                    );
                  }
                  return <PreviewSection key={i} tag={section.tag} lines={section.lines} />;
                })
              )}
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
