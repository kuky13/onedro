import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';

export interface SiteSettings {
  id: string;
  plan_name: string;
  plan_description: string;
  plan_price: number;
  plan_currency: string;
  plan_period: string;
  plan_features: string[];
  payment_url: string;
  whatsapp_number: string;
  page_title: string;
  page_subtitle: string;
  popular_badge_text: string;
  cta_button_text: string;
  support_text: string;
  show_popular_badge: boolean;
  show_support_info: boolean;
  additional_info: string;
  default_budget_validity_days: number;
  benefits_section_title: string;
  benefits_section_subtitle: string;
  benefits_data: any[];
  show_benefits_section: boolean;
  testimonials_section_title: string;
  testimonials_section_subtitle: string;
  testimonials_data: any[];
  show_testimonials_section: boolean;
  faq_section_title: string;
  faq_section_subtitle: string;
  faq_data: any[];
  show_faq_section: boolean;
  show_dev_warning?: boolean;
  dev_warning_title?: string;
  dev_warning_message?: string;
}

export function useSiteSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newFeature, setNewFeature] = useState('');
  const [localSettings, setLocalSettings] = useState<SiteSettings | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  useEffect(() => {
    supabase.rpc('get_user_role')
      .then(({ data, error }) => {
        if (!error) setUserRole(data);
        setIsCheckingRole(false);
      })
      .catch(() => setIsCheckingRole(false));
  }, []);

  const { data: settings, isLoading, error: queryError } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('*').maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const settingsData = data as SiteSettings;
      setLocalSettings(settingsData);
      return settingsData;
    },
    enabled: userRole === 'admin' && !isCheckingRole,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<SiteSettings>) => {
      if (!settings?.id) throw new Error('Settings ID not found');
      const { data, error } = await supabase
        .from('site_settings')
        .update(updatedSettings)
        .eq('id', settings.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      setLocalSettings(data as SiteSettings);
      toast({ title: 'Configurações atualizadas', description: 'As configurações foram salvas com sucesso.' });
    },
    onError: () => {
      toast({ title: 'Erro ao salvar', description: 'Ocorreu um erro ao salvar as configurações.', variant: 'destructive' });
    },
  });

  const currentSettings = localSettings || settings;

  const handleInputChange = (field: keyof SiteSettings, value: any) => {
    if (!settings) return;
    setLocalSettings((prev) => (prev ? { ...prev, [field]: value } : null));
    updateSettingsMutation.mutate({ [field]: value });
  };

  const handleAddFeature = () => {
    if (!newFeature.trim() || !currentSettings) return;
    handleInputChange('plan_features', [...currentSettings.plan_features, newFeature.trim()]);
    setNewFeature('');
  };

  const handleRemoveFeature = (index: number) => {
    if (!currentSettings) return;
    handleInputChange('plan_features', currentSettings.plan_features.filter((_, i) => i !== index));
  };

  const handleAddBenefit = () => {
    if (!currentSettings) return;
    handleInputChange('benefits_data', [
      ...(currentSettings.benefits_data || []),
      { icon: 'Zap', title: 'Novo Benefício', description: 'Descrição do benefício' },
    ]);
  };

  const handleRemoveBenefit = (index: number) => {
    if (!currentSettings) return;
    handleInputChange('benefits_data', currentSettings.benefits_data.filter((_, i) => i !== index));
  };

  const handleUpdateBenefit = (index: number, field: string, value: string) => {
    if (!currentSettings) return;
    const updated = [...currentSettings.benefits_data];
    updated[index] = { ...updated[index], [field]: value };
    handleInputChange('benefits_data', updated);
  };

  const handleAddTestimonial = () => {
    if (!currentSettings) return;
    handleInputChange('testimonials_data', [
      ...(currentSettings.testimonials_data || []),
      { name: 'Nome do Cliente', role: 'Cargo - Empresa', content: 'Depoimento do cliente...', rating: 5 },
    ]);
  };

  const handleRemoveTestimonial = (index: number) => {
    if (!currentSettings) return;
    handleInputChange('testimonials_data', currentSettings.testimonials_data.filter((_, i) => i !== index));
  };

  const handleUpdateTestimonial = (index: number, field: string, value: string | number) => {
    if (!currentSettings) return;
    const updated = [...currentSettings.testimonials_data];
    updated[index] = { ...updated[index], [field]: value };
    handleInputChange('testimonials_data', updated);
  };

  const handleAddFaq = () => {
    if (!currentSettings) return;
    handleInputChange('faq_data', [
      ...(currentSettings.faq_data || []),
      { question: 'Nova pergunta?', answer: 'Resposta da pergunta...' },
    ]);
  };

  const handleRemoveFaq = (index: number) => {
    if (!currentSettings) return;
    handleInputChange('faq_data', currentSettings.faq_data.filter((_, i) => i !== index));
  };

  const handleUpdateFaq = (index: number, field: string, value: string) => {
    if (!currentSettings) return;
    const updated = [...currentSettings.faq_data];
    updated[index] = { ...updated[index], [field]: value };
    handleInputChange('faq_data', updated);
  };

  return {
    currentSettings, isCheckingRole, isLoading, queryError, userRole,
    newFeature, setNewFeature,
    updateSettingsMutation,
    handleInputChange,
    handleAddFeature, handleRemoveFeature,
    handleAddBenefit, handleRemoveBenefit, handleUpdateBenefit,
    handleAddTestimonial, handleRemoveTestimonial, handleUpdateTestimonial,
    handleAddFaq, handleRemoveFaq, handleUpdateFaq,
  };
}
