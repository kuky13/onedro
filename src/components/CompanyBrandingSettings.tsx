import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Building2, Upload, Save, Trash2, AlertCircle, Image as ImageIcon, FileText, Download, RotateCcw, Eye } from 'lucide-react';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { CompanyFormData } from '@/types/company';

// Inline Budget Warning Settings (form-only, no outer Card)
type ColorKey = 'amber' | 'red' | 'blue' | 'emerald';
type NotifyType = 'banner' | 'badge' | 'card';
function InlineBudgetWarningSettings() {
  const {
    user,
    profile
  } = useAuth();
  const queryClient = useQueryClient();
  const [isEnabled, setIsEnabled] = React.useState<boolean>(true);
  const [days, setDays] = React.useState<string>('');
  const [color, setColor] = React.useState<ColorKey>('amber');
  const [notifyType, setNotifyType] = React.useState<NotifyType>('banner');
  React.useEffect(() => {
    if (profile) {
      setIsEnabled(profile.budget_warning_enabled ?? true);
      const warningDays = profile.budget_warning_days ?? 15;
      setDays(String(warningDays));
    }
    try {
      const savedColor = localStorage.getItem('budgetWarningColor') as ColorKey || 'amber';
      const savedType = localStorage.getItem('budgetWarningType') as NotifyType || 'banner';
      setColor(savedColor);
      setNotifyType(savedType);
    } catch {}
  }, [profile]);
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: {
      budget_warning_enabled: boolean;
      budget_warning_days: number;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const {
        data,
        error
      } = await supabase.from('user_profiles').update({
        budget_warning_enabled: settings.budget_warning_enabled,
        budget_warning_days: settings.budget_warning_days
      }).eq('id', user.id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['user-profile', user?.id]
      });
      toast.success('Configurações salvas');
    },
    onError: (error: any) => {
      console.error('Erro ao salvar configurações de aviso:', error);
      toast.error('Não foi possível salvar suas configurações.');
    }
  });
  const handleSave = () => {
    const numericDays = parseInt(days, 10);
    if (!Number.isFinite(numericDays) || numericDays < 1 || numericDays > 365) {
      toast.error('O número de dias deve ser entre 1 e 365.');
      return;
    }
    updateSettingsMutation.mutate({
      budget_warning_enabled: isEnabled,
      budget_warning_days: numericDays
    });
    try {
      localStorage.setItem('budgetWarningColor', color);
      localStorage.setItem('budgetWarningType', notifyType);
    } catch {}
  };
  
  return <>
      <div className="flex items-center justify-between">
        <Label htmlFor="warning-enabled" className="flex flex-col">
          <span>Ativar avisos</span>
          <span className="text-xs text-muted-foreground">Exibir alerta para orçamentos antigos</span>
        </Label>
        <Switch id="warning-enabled" checked={isEnabled} onCheckedChange={setIsEnabled} />
      </div>

      {isEnabled && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="warning-days">Avisar após (dias)</Label>
            <Input id="warning-days" type="number" value={days} onChange={e => setDays(e.target.value)} min={1} max={365} placeholder="15" />
            <p className="text-xs text-muted-foreground">Defina o n° de dias para um orçamento ser "antigo".</p>
          </div>
          
          
          
        </div>}

      <Button onClick={handleSave} disabled={updateSettingsMutation.isPending} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {updateSettingsMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
      </Button>
    </>;
}
export function CompanyBrandingSettings() {
  const {
    companyInfo,
    loading,
    createCompanyInfo,
    updateCompanyInfo,
    uploadLogo,
    removeLogo,
    formatPhoneNumber,
    refreshData,
    resetWarrantyTermsToDefault
  } = useCompanyBranding();
  const [companyData, setCompanyData] = useState<CompanyFormData>({
    name: '',
    logo_url: '',
    whatsapp_phone: '',
    description: '',
    cnpj: '',
    warranty_cancellation_terms: '',
    warranty_legal_reminders: '',
    address: '',
    // Adicionar campo endereço
    email: '' // Adicionar campo email
  });
  const [companyErrors, setCompanyErrors] = useState<Partial<CompanyFormData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showWarrantyPreview, setShowWarrantyPreview] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    refreshData();
  }, []);
  useEffect(() => {
    if (companyInfo) {
      // Valores padrão definidos diretamente para evitar dependências que causam loop
      const defaultCancellationTerms = `A GARANTIA É CANCELADA AUTOMATICAMENTE NOS SEGUINTES CASOS: 
Em ocasião de quedas, esmagamentos, sobrecarga elétrica; exposição do aparelho a altas temperaturas, umidade ou 
líquidos; exposição do aparelho a poeira, pó e/ou limalha de metais, ou ainda quando constatado mau uso do aparelho, 
instalações, modificações ou atualizações no seu sistema operacional; abertura do equipamento ou tentativa de conserto 
deste por terceiros que não sejam os técnicos da NOMEDALOJA, mesmo que para realização de outros serviços; bem como 
a violação do selo/lacre de garantia colocado pela NOMEDALOJA.`;
      const defaultLegalReminders = `Vale lembrar que: 
1) A GARANTIA DE 90 (NOVENTA) dias está de acordo com o artigo 26 inciso II do código de defesa do 
consumidor. 
2) Funcionamento, instalação e atualização de aplicativos, bem como o sistema operacional do aparelho NÃO FAZEM 
parte desta garantia. 
3) Limpeza e conservação do aparelho NÃO FAZEM parte desta garantia. 
4) A não apresentação de documento (nota fiscal ou este termo) que comprove o serviço INVÁLIDA a garantia. 
5) Qualquer mal funcionamento APÓS ATUALIZAÇÕES do sistema operacional ou aplicativos NÃO FAZEM PARTE 
DESSA GARANTIA. 
6) A GARANTIA é válida somente para o item ou serviço descrito na nota fiscal, ordem de serviço ou neste termo 
de garantia, NÃO ABRANGENDO OUTRAS PARTES e respeitando as condições aqui descritas.`;
      setCompanyData({
        name: companyInfo.name || '',
        logo_url: companyInfo.logo_url || '',
        whatsapp_phone: companyInfo.whatsapp_phone || '',
        description: companyInfo.description || '',
        cnpj: companyInfo.cnpj || '',
        warranty_cancellation_terms: companyInfo.warranty_cancellation_terms || defaultCancellationTerms,
        warranty_legal_reminders: companyInfo.warranty_legal_reminders || defaultLegalReminders,
        address: companyInfo.address || '',
        // Adicionar endereço
        email: companyInfo.email || '' // Adicionar email
      });
    }
  }, [companyInfo]);
  const formatCNPJ = (value: string): string => {
    // Remove todos os caracteres não numéricos
    const cleaned = value.replace(/\D/g, '');

    // Limita a 14 dígitos
    const limited = cleaned.slice(0, 14);

    // Aplica a formatação XX.XXX.XXX/XXXX-XX
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 5) {
      return `${limited.slice(0, 2)}.${limited.slice(2)}`;
    } else if (limited.length <= 8) {
      return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5)}`;
    } else if (limited.length <= 12) {
      return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8)}`;
    } else {
      return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8, 12)}-${limited.slice(12)}`;
    }
  };
  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setCompanyData({
      ...companyData,
      cnpj: formatted
    });
  };
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setCompanyData({
      ...companyData,
      whatsapp_phone: formatted
    });
  };
  const validateCompanyForm = (): boolean => {
    const errors: Partial<CompanyFormData> = {};
    if (!companyData.name.trim()) {
      errors.name = 'Nome da empresa é obrigatório';
    }
    if (companyData.whatsapp_phone) {
      // Remove todos os caracteres não numéricos para validação
      const cleanedPhone = companyData.whatsapp_phone.replace(/\D/g, '');
      if (cleanedPhone.length < 10 || cleanedPhone.length > 15) {
        errors.whatsapp_phone = 'Número de WhatsApp inválido';
      }
    }
    if (companyData.cnpj) {
      const cnpjNumbers = companyData.cnpj.replace(/\D/g, '');
      if (cnpjNumbers.length > 0 && cnpjNumbers.length !== 14) {
        errors.cnpj = 'CNPJ deve ter 14 dígitos';
      }
    }
    setCompanyErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const handleCompanySubmit = async () => {
    if (!validateCompanyForm()) {
      return;
    }
    setIsSaving(true);
    try {
      const formattedData = {
        ...companyData,
        whatsapp_phone: companyData.whatsapp_phone ? formatPhoneNumber(companyData.whatsapp_phone) : ''
      };
      if (companyInfo) {
        await updateCompanyInfo(formattedData);
        toast.success('Informações da empresa atualizadas!');
      } else {
        await createCompanyInfo(formattedData);
        toast.success('Informações da empresa criadas!');
      }
    } catch (error) {
      toast.error('Erro ao salvar informações da empresa');
    } finally {
      setIsSaving(false);
    }
  };
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB');
      return;
    }
    setUploadingLogo(true);
    try {
      const logoUrl = await uploadLogo(file);

      // Atualizar o estado local
      setCompanyData({
        ...companyData,
        logo_url: logoUrl
      });

      // Salvar imediatamente no banco de dados para garantir persistência
      if (companyInfo) {
        await updateCompanyInfo({
          logo_url: logoUrl
        });
      } else {
        // Se não existe companyInfo, criar com a logo
        await createCompanyInfo({
          name: companyData.name || 'Minha Empresa',
          logo_url: logoUrl
        });
      }
      toast.success('Logo enviado com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar logo');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  const handleRemoveLogo = async () => {
    if (!companyData.logo_url) return;
    try {
      // @ts-ignore - Temporary fix for function signature mismatch
      await removeLogo(companyData.logo_url);

      // Atualizar o estado local
      setCompanyData({
        ...companyData,
        logo_url: ''
      });

      // Salvar imediatamente no banco de dados para garantir persistência
      if (companyInfo) {
        await updateCompanyInfo({
          logo_url: ''
        });
      }
      toast.success('Logo removido com sucesso!');
    } catch (error) {
      toast.error('Erro ao remover logo');
    }
  };
  const handleRestoreWarrantyTerms = async () => {
    try {
      await resetWarrantyTermsToDefault();
      // Recarregar dados para obter termos padrão
      await refreshData();
      toast.success('Termos restaurados para o padrão');
    } catch (error) {
      toast.error('Erro ao restaurar termos padrão');
    }
  };
  const generateWarrantyPDF = async () => {
    if (!companyData.name) {
      toast.error('Nome da empresa é obrigatório para gerar o PDF');
      return;
    }
    setGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 15; // Reduzir margem para mais espaço
      const maxWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2 - 15; // Reservar espaço para rodapé

      // Preparar textos
      const cancellationText = companyData.warranty_cancellation_terms.replace(/NOMEDALOJA/g, companyData.name);
      const remindersText = companyData.warranty_legal_reminders.replace(/NOMEDALOJA/g, companyData.name);

      // Calcular número de linhas necessárias para estimar espaço
      const tempDoc = new jsPDF();
      tempDoc.setFontSize(9); // Tamanho menor para cálculo
      const cancellationLines = tempDoc.splitTextToSize(cancellationText, maxWidth);
      const remindersLines = tempDoc.splitTextToSize(remindersText, maxWidth);

      // Estimar altura total necessária
      const headerHeight = 25; // Título
      const companyInfoHeight = 35; // Dados da empresa (máximo 4 linhas)
      const sectionTitlesHeight = 20; // 2 títulos de seção
      const contentHeight = (cancellationLines.length + remindersLines.length) * 4; // Espaçamento reduzido
      const totalEstimatedHeight = headerHeight + companyInfoHeight + sectionTitlesHeight + contentHeight;

      // Ajustar tamanhos de fonte dinamicamente
      let titleFontSize = 16;
      let sectionFontSize = 11;
      let textFontSize = 8;
      let lineSpacing = 4;
      if (totalEstimatedHeight > availableHeight) {
        // Reduzir ainda mais se necessário
        titleFontSize = 14;
        sectionFontSize = 10;
        textFontSize = 7;
        lineSpacing = 3.5;
      }
      let yPosition = margin;

      // Cabeçalho
      doc.setFontSize(titleFontSize);
      doc.setFont('helvetica', 'bold');
      doc.text('TERMOS DE GARANTIA', pageWidth / 2, yPosition, {
        align: 'center'
      });
      yPosition += 15;

      // Informações da empresa
      doc.setFontSize(sectionFontSize);
      doc.setFont('helvetica', 'bold');
      doc.text('DADOS DA EMPRESA', margin, yPosition);
      yPosition += 8;
      doc.setFontSize(textFontSize + 1);
      doc.setFont('helvetica', 'normal');

      // Nome da empresa
      doc.text(`Empresa: ${companyData.name}`, margin, yPosition);
      yPosition += 6;

      // CNPJ se disponível
      if (companyData.cnpj) {
        doc.text(`CNPJ: ${companyData.cnpj}`, margin, yPosition);
        yPosition += 6;
      }

      // WhatsApp se disponível
      if (companyData.whatsapp_phone) {
        doc.text(`WhatsApp: ${companyData.whatsapp_phone}`, margin, yPosition);
        yPosition += 6;
      }
      yPosition += 8;

      // Termos de cancelamento
      doc.setFontSize(sectionFontSize);
      doc.setFont('helvetica', 'bold');
      doc.text('CONDIÇÕES DE CANCELAMENTO DA GARANTIA', margin, yPosition);
      yPosition += 8;
      doc.setFontSize(textFontSize);
      doc.setFont('helvetica', 'normal');
      const finalCancellationLines = doc.splitTextToSize(cancellationText, maxWidth);
      for (const line of finalCancellationLines) {
        doc.text(line, margin, yPosition);
        yPosition += lineSpacing;
      }
      yPosition += 6;

      // Lembretes
      doc.setFontSize(sectionFontSize);
      doc.setFont('helvetica', 'bold');
      doc.text('LEMBRETES', margin, yPosition);
      yPosition += 8;
      doc.setFontSize(textFontSize);
      doc.setFont('helvetica', 'normal');
      const finalRemindersLines = doc.splitTextToSize(remindersText, maxWidth);
      for (const line of finalRemindersLines) {
        // Verificar se ainda há espaço, se não, reduzir ainda mais o espaçamento
        if (yPosition > pageHeight - 20) {
          lineSpacing = Math.max(2.5, lineSpacing - 0.5);
        }
        doc.text(line, margin, yPosition);
        yPosition += lineSpacing;
      }

      // Rodapé com data
      const currentDate = new Date().toLocaleDateString('pt-BR');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(`Documento gerado em: ${currentDate}`, margin, pageHeight - 8);

      // Salvar o PDF
      const fileName = `termos-garantia-${companyData.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`;
      doc.save(fileName);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };
  return <div className="min-h-screen bg-background px-3 py-4 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-primary/10 rounded-xl flex-shrink-0">
              <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground truncate">
                Marca da Empresa
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">Configure dados da sua empresa</p>
            </div>
          </div>
          <Separator className="my-4 md:my-6" />
        </div>

        {/* Status Cards */}
        

        <div className="grid grid-cols-1 gap-5 md:gap-8">
          {/* Budget Warning Settings - enhanced (inline) */}
          <Card className="!border-0 !bg-muted/30 !rounded-2xl !shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                
                Aviso de Orçamentos Antigos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Inline state and handlers for warning settings */}
              {(() => {
              // Inline local state scoped to this block using React hooks at top level
              // We elevate hooks to component scope to comply with rules
              return null;
            })()}
              <InlineBudgetWarningSettings />
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card className="!border-0 !bg-muted/30 !rounded-2xl !shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>Informações da Empresa</span>
              </CardTitle>
              <CardDescription>
                Configure os dados básicos da sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Company Name */}
              <div>
                <Label htmlFor="company_name">Nome da Empresa *</Label>
                <Input id="company_name" value={companyData.name} onChange={e => setCompanyData({
                ...companyData,
                name: e.target.value
              })} placeholder="Minha Empresa Ltda" autoComplete="organization" className={`h-11 w-full ${companyErrors.name ? 'border-red-500' : ''}`} />
                {companyErrors.name && <p className="text-sm text-red-500 mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {companyErrors.name}
                  </p>}
              </div>
              
              {/* Logo Upload */}
              <div>
                <Label>Logo da Empresa</Label>
                <div className="mt-2">
                  {companyData.logo_url ? <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                      <img src={companyData.logo_url} alt="Logo da empresa" className="w-14 h-14 sm:w-16 sm:h-16 object-contain border rounded-lg flex-shrink-0" />
                      <div className="flex-1 w-full">
                        <p className="text-sm text-muted-foreground">Logo atual</p>
                        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 mt-2">
                          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo} className="min-h-[44px] px-4 py-2 w-full sm:w-auto">
                            <Upload className="w-4 h-4 mr-2" />
                            Alterar
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleRemoveLogo} className="min-h-[44px] px-4 py-2 w-full sm:w-auto">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover
                          </Button>
                        </div>
                      </div>
                    </div> : <div className="border-2 border-dashed border-border rounded-lg p-4 sm:p-6 text-center">
                      <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/50 mx-auto mb-3 sm:mb-4" />
                      <p className="text-muted-foreground mb-3 sm:mb-4 text-sm">Nenhum logo enviado</p>
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo} className="min-h-[44px] px-6 py-3 text-base">
                        <Upload className="w-5 h-5 mr-2" />
                        {uploadingLogo ? 'Enviando...' : 'Enviar Logo'}
                      </Button>
                    </div>}
                  
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    Formatos aceitos: PNG, JPG, SVG. Tamanho máximo: 5MB
                  </p>
                </div>
              </div>
              
              {/* CNPJ */}
              <div>
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" value={companyData.cnpj} onChange={handleCNPJChange} placeholder="00.000.000/0000-00" maxLength={18} inputMode="numeric" autoComplete="off" className={`h-11 w-full ${companyErrors.cnpj ? 'border-red-500' : ''}`} />
                {companyErrors.cnpj && <p className="text-sm text-red-500 mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {companyErrors.cnpj}
                  </p>}
                <p className="text-xs text-muted-foreground mt-1">
                  CNPJ da empresa para documentos formais (14 dígitos)
                </p>
              </div>

              {/* WhatsApp Phone */}
              <div>
                <Label htmlFor="whatsapp_phone">WhatsApp</Label>
                <Input id="whatsapp_phone" value={companyData.whatsapp_phone} onChange={handlePhoneChange} placeholder="(11) 99999-9999" maxLength={15} inputMode="tel" autoComplete="tel" className={`h-11 w-full ${companyErrors.whatsapp_phone ? 'border-red-500' : ''}`} />
                {companyErrors.whatsapp_phone && <p className="text-sm text-red-500 mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {companyErrors.whatsapp_phone}
                  </p>}
                <p className="text-xs text-muted-foreground mt-1">
                  Apenas números, sem espaços ou caracteres especiais
                </p>
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="address">Endereço</Label>
                <Input id="address" value={companyData.address} onChange={e => setCompanyData({
                ...companyData,
                address: e.target.value
              })} placeholder="Rua Exemplo, 123 - Centro" autoComplete="street-address" className={`h-11 w-full ${companyErrors.address ? 'border-red-500' : ''}`} />
                {companyErrors.address && <p className="text-sm text-red-500 mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {companyErrors.address}
                  </p>}
                <p className="text-xs text-muted-foreground mt-1">
                  Endereço completo da empresa para documentos
                </p>
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={companyData.email} onChange={e => setCompanyData({
                ...companyData,
                email: e.target.value
              })} placeholder="contato@empresa.com" autoComplete="email" className={`h-11 w-full ${companyErrors.email ? 'border-red-500' : ''}`} />
                {companyErrors.email && <p className="text-sm text-red-500 mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {companyErrors.email}
                  </p>}
                <p className="text-xs text-muted-foreground mt-1">
                  Email de contato da empresa
                </p>
              </div>
              
              {/* Description */}
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" value={companyData.description} onChange={e => setCompanyData({
                ...companyData,
                description: e.target.value
              })} placeholder="Breve descrição da empresa..." rows={3} maxLength={100} className="w-full" />
                <div className="flex justify-end mt-1">
                  <p className={`text-xs ${companyData.description.length > 80 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    {companyData.description.length}/100 caracteres
                  </p>
                </div>
              </div>
              
              <Button onClick={handleCompanySubmit} disabled={isSaving || loading} className="w-full min-h-[48px] px-6 py-3 text-base font-medium">
                <Save className="w-5 h-5 mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar Informações'}
              </Button>
            </CardContent>
          </Card>

          {/* Warranty Terms Section */}
          <Card className="!border-0 !bg-muted/30 !rounded-2xl !shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Termos de Garantia</span>
              </CardTitle>
              <CardDescription>
                Configure os termos de garantia da sua empresa para gerar documentos formais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Warranty Cancellation Terms */}
              <div>
                <Label htmlFor="warranty_cancellation_terms">Condições de Cancelamento da Garantia</Label>
                <Textarea id="warranty_cancellation_terms" value={companyData.warranty_cancellation_terms} onChange={e => setCompanyData({
                ...companyData,
                warranty_cancellation_terms: e.target.value
              })} placeholder="Digite as condições que cancelam a garantia..." rows={6} className="mt-2" maxLength={900} />
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mt-1">
                  <p className="text-xs text-muted-foreground">
                    Use "NOMEDALOJA" como placeholder - será substituído automaticamente
                  </p>
                  <p className={`text-xs flex-shrink-0 ${companyData.warranty_cancellation_terms.length > 800 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    {companyData.warranty_cancellation_terms.length}/900 caracteres
                  </p>
                </div>
              </div>

              {/* Warranty Legal Reminders */}
              <div>
                <Label htmlFor="warranty_legal_reminders">Lembretes</Label>
                <Textarea id="warranty_legal_reminders" value={companyData.warranty_legal_reminders} onChange={e => setCompanyData({
                ...companyData,
                warranty_legal_reminders: e.target.value
              })} placeholder="Digite os lembretes sobre a garantia..." rows={8} className="mt-2" maxLength={900} />
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mt-1">
                  <p className="text-xs text-muted-foreground">
                    Direitos do consumidor e limitações da garantia
                  </p>
                  <p className={`text-xs flex-shrink-0 ${companyData.warranty_legal_reminders.length > 800 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    {companyData.warranty_legal_reminders.length}/900 caracteres
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
                <Button onClick={handleRestoreWarrantyTerms} variant="outline" className="flex-1 min-h-[44px] px-4 py-2">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restaurar Padrão
                </Button>
                
                <Button onClick={() => setShowWarrantyPreview(!showWarrantyPreview)} variant="outline" className="flex-1 min-h-[44px] px-4 py-2">
                  <Eye className="w-4 h-4 mr-2" />
                  {showWarrantyPreview ? 'Ocultar Preview' : 'Visualizar Preview'}
                </Button>
                
                <Button onClick={generateWarrantyPDF} disabled={generatingPDF || !companyData.name} className="flex-1 min-h-[44px] px-4 py-2">
                  <Download className="w-4 h-4 mr-2" />
                  {generatingPDF ? 'Gerando...' : 'Gerar PDF'}
                </Button>
              </div>

              {/* Preview Section */}
              {showWarrantyPreview && <div className="border rounded-lg p-3 sm:p-4 bg-muted/50">
                  <h4 className="font-semibold mb-3 text-black">Preview dos Termos de Garantia</h4>
                  <div className="space-y-4 text-sm">
                    <div>
                      <h5 className="font-medium text-gray-700">CONDIÇÕES DE CANCELAMENTO DA GARANTIA</h5>
                      <p className="mt-1 whitespace-pre-wrap text-gray-600">
                        {companyData.warranty_cancellation_terms.replace(/NOMEDALOJA/g, companyData.name || 'NOMEDALOJA')}
                      </p>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-700">Lembretes</h5>
                      <p className="mt-1 whitespace-pre-wrap text-gray-600">
                        {companyData.warranty_legal_reminders.replace(/NOMEDALOJA/g, companyData.name || 'NOMEDALOJA')}
                      </p>
                    </div>
                  </div>
                </div>}

              <Button onClick={handleCompanySubmit} disabled={isSaving || loading} className="w-full min-h-[48px] px-6 py-3 text-base font-medium">
                <Save className="w-5 h-5 mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar Termos'}
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>


    </div>;
}