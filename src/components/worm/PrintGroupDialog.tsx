import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Printer, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateGroupBudgetPdf, processBudgetTemplate } from '@/utils/wormPdfGenerator';
import { usePdfTemplates, DEFAULT_PDF_SERVICE_TEMPLATE } from '@/hooks/worm/usePdfTemplates';
import { useCompanyDataLoader } from '@/hooks/useCompanyDataLoader';
import { useAuth } from '@/hooks/useAuth';

interface PrintGroupDialogProps {
  budgets: any[];
  triggerClassName?: string;
  children?: React.ReactNode;
}

const GroupBudgetPreview: React.FC<{
  budgets: any[];
  template: string;
  paperWidth: '58mm' | '80mm';
  companyName: string;
  companyPhone?: string;
  companyAddress?: string;
}> = ({ budgets, template, paperWidth, companyName, companyPhone, companyAddress }) => {
  
  const content = useMemo(() => {
    if (!budgets || budgets.length === 0) return '';

    // Usamos o primeiro orçamento como base para informações globais
    const mainBudget = budgets[0];

    // Simulamos "peças" usando a lista de orçamentos
    const simulatedParts = budgets.map(b => ({
      part_type: b.part_quality || b.part_type || 'Opção',
      name: b.part_quality || b.part_type || 'Opção',
      warranty_months: b.warranty_months,
      cash_price: b.cash_price,
      installment_price: b.installment_price,
      installment_count: b.installments,
      quantity: 1
    }));

    return processBudgetTemplate({
      budget: mainBudget,
      parts: simulatedParts,
      template,
      companyName,
      companyPhone: companyPhone ?? '',
      companyAddress: companyAddress ?? '',
      paperWidth
    });
  }, [budgets, template, companyName, companyPhone, companyAddress, paperWidth]);

  const maxWidth = paperWidth === '58mm' ? '280px' : '380px';
  const fontSize = paperWidth === '58mm' ? '12px' : '14px';

  return (
    <div 
      className="bg-white text-black font-mono shadow-md border border-gray-200 mx-auto overflow-hidden"
      style={{
        width: '100%',
        maxWidth,
        padding: '10px',
        fontSize,
        lineHeight: '1.2',
        whiteSpace: 'pre-wrap',
        fontFamily: "'Courier New', Courier, monospace"
      }}
    >
      {content}
    </div>
  );
};

export const PrintGroupDialog: React.FC<PrintGroupDialogProps> = ({ budgets, triggerClassName, children }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { data: pdfTemplates = [] } = usePdfTemplates(user?.id);
  const { getCompanyDataForPDF } = useCompanyDataLoader();

  const handleGeneratePdf = (paperWidth: '58mm' | '80mm') => {
    const companyData = getCompanyDataForPDF();
    const defaultTemplate = pdfTemplates?.find((t: any) => t.is_default) || pdfTemplates?.[0];
    const templateContent = defaultTemplate?.service_section_template || DEFAULT_PDF_SERVICE_TEMPLATE;

    console.log('Generating PDF with template length:', templateContent.length);

    generateGroupBudgetPdf({
      budgets,
      template: templateContent,
      paperWidth,
      companyName: companyData.shop_name,
      companyPhone: companyData.contact_phone,
      companyAddress: companyData.address
    });
    setIsOpen(false);
  };

  const getTemplate = () => {
    return pdfTemplates?.find((t: any) => t.is_default)?.service_section_template || pdfTemplates?.[0]?.service_section_template || DEFAULT_PDF_SERVICE_TEMPLATE;
  };

  const companyData = getCompanyDataForPDF();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className={triggerClassName}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Todos
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-32px)] sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Imprimir Grupo de Orçamentos</DialogTitle>
          <DialogDescription>
            Gera um único PDF contendo todos os {budgets.length} orçamentos deste grupo.
          </DialogDescription>
        </DialogHeader>

        {budgets.length > 1 && (
          <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md text-sm border border-yellow-200 mb-4 flex gap-2 items-start dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-900/50">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <strong>Atenção:</strong> Isso gerará um <u>único documento</u> combinando as {budgets.length} opções.
              Pode ocorrer erros na impressão se os orçamentos forem de aparelhos diferentes.
            </div>
          </div>
        )}

        <Tabs defaultValue="80mm" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="80mm" className="text-xs sm:text-sm">80mm (Padrão)</TabsTrigger>
            <TabsTrigger value="58mm" className="text-xs sm:text-sm">58mm (Pequeno)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="80mm" className="mt-4 space-y-4">
            <div className="border rounded-md p-2 sm:p-4 bg-gray-100 dark:bg-gray-800 overflow-x-auto flex justify-center">
              <GroupBudgetPreview 
                budgets={budgets}
                template={getTemplate()}
                paperWidth="80mm"
                companyName={companyData.shop_name}
                companyPhone={companyData.contact_phone}
                companyAddress={companyData.address}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={() => handleGeneratePdf('80mm')}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir 80mm
            </Button>
          </TabsContent>
          
          <TabsContent value="58mm" className="mt-4 space-y-4">
            <div className="border rounded-md p-2 sm:p-4 bg-gray-100 dark:bg-gray-800 overflow-x-auto flex justify-center">
              <GroupBudgetPreview 
                budgets={budgets}
                template={getTemplate()}
                paperWidth="58mm"
                companyName={companyData.shop_name}
                companyPhone={companyData.contact_phone}
                companyAddress={companyData.address}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={() => handleGeneratePdf('58mm')}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir 58mm
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
