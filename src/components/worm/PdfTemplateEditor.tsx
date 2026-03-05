import React, { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { useCreatePdfTemplate, useUpdatePdfTemplate, PdfTemplate } from '@/hooks/worm/usePdfTemplates';

interface PdfTemplateEditorProps {
    template?: PdfTemplate;
    onSuccess: () => void;
    onCancel: () => void;
}

export const PdfTemplateEditor = ({ template, onSuccess, onCancel }: PdfTemplateEditorProps) => {
    const { user } = useAuth();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [templateName, setTemplateName] = useState(template?.template_name || '');
    const [serviceTemplate, setServiceTemplate] = useState(template?.service_section_template || '');
    const [isDefault, setIsDefault] = useState(template?.is_default || false);

    // Update state when template prop changes
    React.useEffect(() => {
        setTemplateName(template?.template_name || '');
        setServiceTemplate(template?.service_section_template || '');
        setIsDefault(template?.is_default || false);
    }, [template]);

    const createTemplate = useCreatePdfTemplate();
    const updateTemplate = useUpdatePdfTemplate();

    const isEditing = !!template?.id;
    const isSaving = createTemplate.isPending || updateTemplate.isPending;

    const insertPlaceholder = (placeholder: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = serviceTemplate;
        const before = text.substring(0, start);
        const after = text.substring(end);

        const newText = before + placeholder + after;
        setServiceTemplate(newText);

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

        if (!serviceTemplate.trim()) {
            toast.error('Digite o conteúdo do template');
            return;
        }

        try {
            if (isEditing) {
                await updateTemplate.mutateAsync({
                    id: template.id,
                    userId: user.id,
                    updates: {
                        template_name: templateName,
                        service_section_template: serviceTemplate,
                        is_default: isDefault,
                    }
                });
            } else {
                await createTemplate.mutateAsync({
                    user_id: user.id,
                    template_name: templateName,
                    service_section_template: serviceTemplate,
                    is_default: isDefault,
                });
            }
            onSuccess();
        } catch (error) {
            console.error('Error saving template:', error);
        }
    };

    const generatePreview = () => {
        let preview = serviceTemplate;

        if (preview.includes('{qualidades_inicio}') && preview.includes('{qualidades_fim}')) {
            const before = preview.split('{qualidades_inicio}')[0];
            const after = preview.split('{qualidades_fim}')[1] || '';
            const middle = (preview.split('{qualidades_inicio}')[1] ?? '').split('{qualidades_fim}')[0] ?? '';
            if (!middle) return preview;

            const exampleParts = [
                {
                    qualidade_nome: 'Original',
                    peca_preco_vista: 'R$ 450,00',
                    peca_preco_parcelado: 'R$ 490,00',
                    peca_parcelas: '6',
                    peca_valor_parcela: 'R$ 81,66',
                    peca_garantia_meses: '12',
                    peca_nome: 'Original',
                    peca_quantidade: '1'
                },
                {
                    qualidade_nome: 'Premium',
                    peca_preco_vista: 'R$ 280,00',
                    peca_preco_parcelado: 'R$ 310,00',
                    peca_parcelas: '3',
                    peca_valor_parcela: 'R$ 103,33',
                    peca_garantia_meses: '3',
                    peca_nome: 'Premium',
                    peca_quantidade: '1'
                }
            ];

            const replaceAllSafe = (str: string, find: string, repl: string) => {
                return str.split(find).join(repl);
            };

            let processedParts = '';
            exampleParts.forEach(part => {
                let partText = middle ?? '';
                Object.entries(part).forEach(([key, value]) => {
                    partText = replaceAllSafe(partText, `{${key}}`, value);
                });
                processedParts += partText;
            });

            preview = `${before}${processedParts}${after}`;
        }

        const replacements: Record<string, string> = {
            '{nome_reparo}': 'Troca de Tela Frontal',
            '{modelo_dispositivo}': 'iPhone 11',
            '{tipo_dispositivo}': 'Smartphone',
            '{preco_vista}': 'R$ 450,00',
            '{preco_parcelado}': 'R$ 490,00',
            '{num_parcelas}': '6',
            '{valor_parcela}': 'R$ 81,66',
        };

        Object.entries(replacements).forEach(([key, value]) => {
            preview = preview.split(key).join(value);
        });

        return preview;
    };

    return (
        <div className="space-y-6">
            <SheetHeader>
                <SheetTitle>
                    {isEditing ? 'Editar Template PDF' : 'Novo Template PDF'}
                </SheetTitle>
                <SheetDescription>
                    Personalize como a seção "Valores do Serviço" aparecerá no PDF.
                </SheetDescription>
            </SheetHeader>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Nome do Template</Label>
                    <Input
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Ex: Padrão Loja"
                    />
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="isDefault"
                        checked={isDefault}
                        onCheckedChange={(checked) => setIsDefault(checked as boolean)}
                    />
                    <Label htmlFor="isDefault">Definir como padrão</Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Conteúdo do Serviço/Reparo</Label>
                        <div className="bg-muted p-2 rounded-md mb-2 flex flex-wrap gap-2 text-xs">
                            <span className="font-semibold w-full block mb-1">Placeholders disponíveis:</span>
                            {[
                                '{nome_reparo}',
                                '{modelo_dispositivo}',
                                '{qualidades_inicio}',
                                '{qualidade_nome}',
                                '{peca_preco_vista}',
                                '{peca_preco_parcelado}',
                                '{peca_parcelas}',
                                '{peca_valor_parcela}',
                                '{peca_garantia_meses}',
                                '{qualidades_fim}'
                            ].map(p => (
                                <button
                                    key={p}
                                    onClick={() => insertPlaceholder(p)}
                                    className="px-2 py-1 bg-background border rounded hover:bg-accent transition-colors"
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                        <Textarea
                            ref={textareaRef}
                            value={serviceTemplate}
                            onChange={(e) => setServiceTemplate(e.target.value)}
                            className="h-[300px] font-mono text-sm"
                            placeholder="Digite o conteúdo..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Pré-visualização (Simulação)</Label>
                        <div className="h-[300px] w-full rounded-md border bg-slate-50 p-4 overflow-auto whitespace-pre-wrap text-sm font-mono text-slate-800">
                            {generatePreview()}
                        </div>
                    </div>
                </div>
            </div>

            <SheetFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                    Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Salvando...' : 'Salvar Template'}
                </Button>
            </SheetFooter>
        </div>
    );
};
