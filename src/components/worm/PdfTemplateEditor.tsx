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
import { BudgetPreview } from './BudgetPreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
        // Dados de exemplo para o preview
        const exampleBudget = {
            id: '12345678',
            sequential_number: 1234,
            client_name: 'João da Silva',
            client_phone: '(11) 98888-8888',
            device_model: 'iPhone 11',
            device_type: 'Smartphone',
            issue: 'Troca de Tela Frontal',
            notes: 'Cliente relatou que o aparelho caiu na água.',
            created_at: '2023-12-15T10:00:00Z',
            valid_until: '2023-12-30T10:00:00Z',
            workflow_status: 'pending',
            custom_services: 'Limpeza Interna, Película de Vidro',
            cash_price: 45000, // em centavos
            installment_price: 49000, // em centavos
            installments: 6,
            warranty_months: 3,
            part_quality: 'Premium'
        };

        const exampleParts = [
            {
                name: 'Tela Original',
                part_type: 'Original',
                price: 45000,
                cash_price: 45000,
                installment_price: 8166,
                installment_count: 6,
                warranty_months: 12,
                quantity: 1
            },
            {
                name: 'Tela Premium',
                part_type: 'Premium',
                price: 28000,
                cash_price: 28000,
                installment_price: 10333,
                installment_count: 3,
                warranty_months: 3,
                quantity: 1
            }
        ];

        const companyInfo = {
            shop_name: 'Minha Loja de Celulares',
            contact_phone: '(11) 99999-9999',
            address: 'Rua das Flores, 123 - Centro, SP'
        };

        return {
            budget: exampleBudget,
            parts: exampleParts,
            companyInfo
        };
    };

    const previewData = generatePreview();

    return (
        <div className="space-y-6 h-full flex flex-col">
            <SheetHeader>
                <SheetTitle>
                    {isEditing ? 'Editar Template PDF' : 'Novo Template PDF'}
                </SheetTitle>
                <SheetDescription>
                    Personalize o layout do PDF para impressão térmica. Visualize em 58mm ou 80mm.
                </SheetDescription>
            </SheetHeader>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden min-h-0">
                <div className="space-y-4 overflow-y-auto pr-2">
                    <div className="space-y-2">
                        <Label>Nome do Template</Label>
                        <Input
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder="Ex: Cupom Térmico Padrão"
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

                    <div className="space-y-2">
                        <Label>Conteúdo do Template</Label>
                        <div className="bg-muted p-2 rounded-md mb-2 flex flex-wrap gap-2 text-xs">
                            <span className="font-semibold w-full block mb-1">Dados da Loja/Cliente:</span>
                            {[
                                '{nome_empresa}', '{telefone_contato}', '{endereco}',
                                '{num_or}', '{data_criacao}', '{status}',
                                '{nome_cliente}', '{telefone_cliente}',
                                '{modelo_dispositivo}', '{nome_reparo}', 
                                '{observacoes}', '{data_validade}', '{serviços}'
                            ].map(p => (
                                <button
                                    key={p}
                                    onClick={() => insertPlaceholder(p)}
                                    className="px-2 py-1 bg-background border rounded hover:bg-accent transition-colors"
                                >
                                    {p}
                                </button>
                            ))}
                            <span className="font-semibold w-full block mb-1 mt-2">Loop de Peças/Qualidades:</span>
                            {['{qualidades_inicio}', '{qualidade_nome}', '{peca_garantia_meses}', '{peca_preco_vista}', '{peca_preco_parcelado}', '{qualidades_fim}'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => insertPlaceholder(p)}
                                    className="px-2 py-1 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors dark:bg-blue-900/20 dark:border-blue-800"
                                >
                                    {p}
                                </button>
                            ))}
                            <span className="font-semibold w-full block mb-1 mt-2">Utilitários:</span>
                            <button
                                onClick={() => insertPlaceholder('----------------')}
                                className="px-2 py-1 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors dark:bg-gray-800 dark:border-gray-700"
                                title="Insere uma linha que se adapta à largura do papel"
                            >
                                Linha Separadora
                            </button>
                            <button
                                onClick={() => setServiceTemplate('')}
                                className="px-2 py-1 bg-red-100 border border-red-300 rounded hover:bg-red-200 transition-colors text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                                title="Limpar todo o conteúdo do editor"
                            >
                                Limpar Editor
                            </button>
                        </div>
                        <Textarea
                            ref={textareaRef}
                            value={serviceTemplate}
                            onChange={(e) => setServiceTemplate(e.target.value)}
                            className="h-[400px] font-mono text-sm"
                            placeholder="Digite o conteúdo..."
                        />
                    </div>
                </div>

                <div className="flex flex-col space-y-2 h-full overflow-hidden">
                    <Label>Pré-visualização (Simulação)</Label>
                    <div className="flex-1 border rounded-md bg-gray-50 dark:bg-gray-900/50 p-4 overflow-hidden flex flex-col">
                        <Tabs defaultValue="80mm" className="w-full h-full flex flex-col">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="80mm">80mm (Padrão)</TabsTrigger>
                                <TabsTrigger value="58mm">58mm (Pequeno)</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="80mm" className="flex-1 overflow-auto flex justify-center bg-gray-100 dark:bg-gray-800 rounded-md p-4 mt-0">
                                <BudgetPreview 
                                    budget={previewData.budget}
                                    parts={previewData.parts}
                                    template={serviceTemplate}
                                    paperWidth="80mm"
                                    companyName={previewData.companyInfo.shop_name}
                                    companyPhone={previewData.companyInfo.contact_phone}
                                    companyAddress={previewData.companyInfo.address}
                                />
                            </TabsContent>
                            
                            <TabsContent value="58mm" className="flex-1 overflow-auto flex justify-center bg-gray-100 dark:bg-gray-800 rounded-md p-4 mt-0">
                                <BudgetPreview 
                                    budget={previewData.budget}
                                    parts={previewData.parts}
                                    template={serviceTemplate}
                                    paperWidth="58mm"
                                    companyName={previewData.companyInfo.shop_name}
                                    companyPhone={previewData.companyInfo.contact_phone}
                                    companyAddress={previewData.companyInfo.address}
                                />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>

            <SheetFooter className="flex-col sm:flex-row gap-2 mt-4">
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
