import { useState } from 'react';
import { Download, Share, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { generateBudgetPDF, saveBudgetPDF } from '@/utils/pdfUtils';
import { useCompanyDataLoader } from '@/hooks/useCompanyDataLoader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDefaultPdfTemplate } from '@/hooks/worm/usePdfTemplates';
import { useAuth } from '@/hooks/useAuth';
import { PrintLabelDialog } from '@/components/printing/PrintLabelDialog';

interface WormBudgetActionsProps {
  budget: any;
  onClose: () => void;
}

export const WormBudgetActions = ({ budget, onClose }: WormBudgetActionsProps) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { getCompanyDataForPDF, hasMinimalData, refreshData } = useCompanyDataLoader();
  const { user } = useAuth();
  const { data: defaultPdfTemplate } = useDefaultPdfTemplate(user?.id);

  const labelOrder = {
    id: budget.id,
    sequential_number: budget.sequential_number,
    client_name: budget.client_name,
    device_model: budget.device_model,
    issue: (budget.notes || budget.issue || '').substring(0, 50),
    entry_date: budget.created_at || new Date().toISOString(),
  };

  const handleGeneratePDF = async () => {
    if (isGeneratingPDF) return;

    setIsGeneratingPDF(true);
    try {
      console.log('[WORM PDF] Iniciando geração de PDF...');

      if (!hasMinimalData()) {
        console.log('[WORM PDF] Dados insuficientes - tentando recarregar');
        await refreshData();

        if (!hasMinimalData()) {
          toast.error('Dados da empresa não carregados. Verifique suas configurações ou sua conexão.');
          return;
        }
      }

      // Buscar dados completos do orçamento
      const { data: fullBudget, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budget.id)
        .single();

      if (error) {
        console.error('[WORM PDF] Erro ao buscar dados completos:', error);
        toast.error('Erro ao carregar dados do orçamento');
        return;
      }

      // Buscar serviços/peças do orçamento
      const { data: parts, error: partsError } = await supabase
        .from('budget_parts')
        .select('*')
        .eq('budget_id', budget.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (partsError) {
        console.warn('[WORM PDF] Erro ao buscar peças/serviços do orçamento:', partsError);
      }

      const mappedParts = (parts || []).map(p => ({
        name: p.name,
        part_type: p.part_type || undefined,
        quantity: p.quantity || 1,
        price: (p.price || 0) / 100,
        cash_price: p.cash_price != null ? p.cash_price / 100 : undefined,
        installment_price: p.installment_price != null ? p.installment_price / 100 : undefined,
        installment_count: p.installment_count || undefined,
        warranty_months: p.warranty_months || undefined,
      }));

      // Preparar dados do orçamento
      const pdfData = {
        id: fullBudget.id,
        device_model: fullBudget.device_model || 'Dispositivo não informado',
        part_quality: fullBudget.part_quality || fullBudget.part_type || 'Não informado',
        total_price: (fullBudget.cash_price || fullBudget.total_price || 0) / 100,
        installment_price: fullBudget.installment_price ? fullBudget.installment_price / 100 : undefined,
        installment_count: fullBudget.installments || 1,
        created_at: fullBudget.created_at,
        validity_date: fullBudget.expires_at || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        warranty_months: fullBudget.warranty_months || undefined,
        // Preferir notas do orçamento atual em memória se existirem, senão cair para banco/issue
        notes: (budget?.notes ?? fullBudget.notes ?? fullBudget.issue ?? '').trim(),
        // Serviços personalizados: garantir que sejam enviados ao PDF
        custom_services: (budget?.custom_services ?? fullBudget.custom_services ?? '').trim(),
        includes_delivery: fullBudget.includes_delivery === true,
        includes_screen_protector: fullBudget.includes_screen_protector === true,
        sequential_number: fullBudget.sequential_number,
        parts: mappedParts,
      } as any;

      const companyData = getCompanyDataForPDF();
      console.log('[WORM PDF] Gerando PDF com dados:', { pdfData, companyData });

      console.log('[WORM PDF] Gerando PDF com dados:', { pdfData, companyData });

      const serviceTemplate = defaultPdfTemplate?.service_section_template;
      await saveBudgetPDF(pdfData, companyData, serviceTemplate);
      toast.success('PDF gerado com sucesso!');
      onClose();
    } catch (error) {
      console.error('[WORM PDF] Erro ao gerar PDF:', error);
      const message = error instanceof Error ? error.message : 'Não foi possível gerar o PDF';
      toast.error(message);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSharePDF = async () => {
    if (isGeneratingPDF) return;

    setIsGeneratingPDF(true);
    try {
      console.log('[WORM PDF] Iniciando compartilhamento de PDF...');

      if (!hasMinimalData()) {
        await refreshData();
        if (!hasMinimalData()) {
          toast.error('Dados da empresa não carregados. Verifique suas configurações ou sua conexão.');
          return;
        }
      }

      // Buscar dados completos do orçamento
      const { data: fullBudget, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budget.id)
        .single();

      if (error) {
        console.error('[WORM PDF] Erro ao buscar dados completos:', error);
        toast.error('Erro ao carregar dados do orçamento');
        return;
      }

      // Buscar serviços/peças do orçamento
      const { data: parts, error: partsError } = await supabase
        .from('budget_parts')
        .select('*')
        .eq('budget_id', budget.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (partsError) {
        console.warn('[WORM PDF] Erro ao buscar peças/serviços do orçamento:', partsError);
      }

      const mappedParts = (parts || []).map(p => ({
        name: p.name,
        part_type: p.part_type || undefined,
        quantity: p.quantity || 1,
        price: (p.price || 0) / 100,
        cash_price: p.cash_price != null ? p.cash_price / 100 : undefined,
        installment_price: p.installment_price != null ? p.installment_price / 100 : undefined,
        installment_count: p.installment_count || undefined,
        warranty_months: p.warranty_months || undefined,
      }));

      // Preparar dados do orçamento
      const pdfShareData = {
        id: fullBudget.id,
        device_model: fullBudget.device_model || 'Dispositivo não informado',
        part_quality: fullBudget.part_quality || fullBudget.part_type || 'Não informado',
        total_price: (fullBudget.cash_price || fullBudget.total_price || 0) / 100,
        installment_price: fullBudget.installment_price ? fullBudget.installment_price / 100 : undefined,
        installment_count: fullBudget.installments || 1,
        created_at: fullBudget.created_at,
        validity_date: fullBudget.expires_at || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        warranty_months: fullBudget.warranty_months || undefined,
        // Preferir notas do orçamento atual em memória se existirem, senão cair para banco/issue
        notes: (budget?.notes ?? fullBudget.notes ?? fullBudget.issue ?? '').trim(),
        includes_delivery: fullBudget.includes_delivery === true,
        includes_screen_protector: fullBudget.includes_screen_protector === true,
        sequential_number: fullBudget.sequential_number,
        parts: mappedParts,
      } as any;


      const companyData = getCompanyDataForPDF();
      const serviceTemplate = defaultPdfTemplate?.service_section_template;
      const pdfBlob = await generateBudgetPDF(pdfShareData, companyData, serviceTemplate);

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([], 'test.pdf')] })) {
        const shopSlug = (companyData.shop_name || 'minha-loja').replace(/\s+/g, '-').toLowerCase();
        const modelSlug = (pdfShareData.device_model || 'dispositivo').replace(/\s+/g, '-').toLowerCase();
        const seqFormatted = (pdfShareData.sequential_number != null && Number.isFinite(pdfShareData.sequential_number))
          ? `OR-${pdfShareData.sequential_number.toString().padStart(4, '0')}`
          : `OR-${(pdfShareData.id || '').slice(-8)}`;
        const shareName = `orcamento-${shopSlug}-${modelSlug}-${seqFormatted}.pdf`;
        const file = new File([pdfBlob], shareName, {
          type: 'application/pdf'
        });

        await navigator.share({
          files: [file],
          title: 'Orçamento'
        });
      } else {
        // Fallback: fazer download do PDF
        const shopSlug = (companyData.shop_name || 'minha-loja').replace(/\s+/g, '-').toLowerCase();
        const modelSlug = (pdfShareData.device_model || 'dispositivo').replace(/\s+/g, '-').toLowerCase();
        const seqFormatted = (pdfShareData.sequential_number != null && Number.isFinite(pdfShareData.sequential_number))
          ? `OR-${pdfShareData.sequential_number.toString().padStart(4, '0')}`
          : `OR-${(pdfShareData.id || '').slice(-8)}`;
        const downloadName = `orcamento-${shopSlug}-${modelSlug}-${seqFormatted}.pdf`;
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('PDF baixado com sucesso');
      }

      onClose();
    } catch (error) {
      console.error('[WORM PDF] Erro ao compartilhar PDF:', error);
      const message = error instanceof Error ? error.message : 'Não foi possível compartilhar o PDF';
      toast.error(message);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle>Ações do Orçamento</SheetTitle>
      </SheetHeader>

      <div className="space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium">Orçamento</h3>
            <span className="bg-primary/10 px-2 py-1 rounded-md text-sm font-mono font-medium text-primary">
              {budget.sequential_number
                ? `OR: ${budget.sequential_number.toString().padStart(4, '0')}`
                : `OR-${budget.id?.slice(-8)}`
              }
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {budget.client_name} - {budget.device_type} {budget.device_model}
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
            className="w-full justify-start"
            variant="outline"
          >
            {isGeneratingPDF ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Baixar PDF
          </Button>

          <Button
            onClick={handleSharePDF}
            disabled={isGeneratingPDF}
            className="w-full justify-start"
            variant="outline"
          >
            {isGeneratingPDF ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Share className="h-4 w-4 mr-2" />
            )}
            Compartilhar PDF
          </Button>

          <PrintLabelDialog 
            order={labelOrder}
            companyData={getCompanyDataForPDF()}
            triggerClassName="w-full justify-start"
          />
        </div>

        <div className="pt-4 border-t">
          <Button variant="ghost" onClick={onClose} className="w-full">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};