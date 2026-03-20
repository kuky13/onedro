// @ts-nocheck

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Globe, Lock, Eye, MessageSquare, Image } from 'lucide-react';
import { AdminImageManager } from '@/components/admin/AdminImageManager';
import { useSiteSettings } from './site-settings/useSiteSettings';
import { PlanInfoCard } from './site-settings/PlanInfoCard';
import { PlanFeaturesCard } from './site-settings/PlanFeaturesCard';
import { BenefitsCard } from './site-settings/BenefitsCard';
import { TestimonialsCard } from './site-settings/TestimonialsCard';
import { FaqCard } from './site-settings/FaqCard';

export const SiteSettingsContent = () => {
  const {
    currentSettings, isCheckingRole, isLoading, queryError, userRole,
    newFeature, setNewFeature, updateSettingsMutation,
    handleInputChange,
    handleAddFeature, handleRemoveFeature,
    handleAddBenefit, handleRemoveBenefit, handleUpdateBenefit,
    handleAddTestimonial, handleRemoveTestimonial, handleUpdateTestimonial,
    handleAddFaq, handleRemoveFaq, handleUpdateFaq,
  } = useSiteSettings();

  if (isCheckingRole) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (userRole !== 'admin') {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="bg-destructive/10 p-3 rounded-xl w-fit mx-auto"><Lock className="h-8 w-8 text-destructive" /></div>
        <div>
          <h2 className="text-xl font-semibold text-destructive">Acesso Restrito</h2>
          <p className="text-muted-foreground mt-2">Apenas usuários com role <strong>admin</strong> podem acessar as configurações do site.</p>
          <p className="text-sm text-muted-foreground mt-1">Seu role atual: <Badge variant="outline">{userRole || 'Não definido'}</Badge></p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (queryError) {
    return <div className="text-center py-8"><p className="text-destructive">Erro ao carregar configurações. Verifique suas permissões e tente novamente.</p></div>;
  }

  if (!currentSettings) {
    return <div className="text-center py-8"><p className="text-muted-foreground">Configurações não encontradas. Recarregue a página.</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <div className="bg-primary/10 p-3 rounded-xl"><Globe className="h-8 w-8 text-primary" /></div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Configurações do Site</h1>
          <p className="text-muted-foreground">Gerencie o conteúdo da página de planos</p>
        </div>
      </div>

      <PlanInfoCard settings={currentSettings} onChange={handleInputChange} />

      <PlanFeaturesCard
        settings={currentSettings}
        newFeature={newFeature}
        onNewFeatureChange={setNewFeature}
        onAdd={handleAddFeature}
        onRemove={handleRemoveFeature}
      />

      {/* Conteúdo da Página */}
      <Card>
        <CardHeader>
          <CardTitle>Conteúdo da Página</CardTitle>
          <CardDescription>Configure textos e títulos da página</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="page_title">Título Principal</Label>
            <Input id="page_title" value={currentSettings.page_title} onChange={(e) => handleInputChange('page_title', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="page_subtitle">Subtítulo</Label>
            <Textarea id="page_subtitle" value={currentSettings.page_subtitle} onChange={(e) => handleInputChange('page_subtitle', e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cta_button_text">Texto do Botão</Label>
              <Input id="cta_button_text" value={currentSettings.cta_button_text} onChange={(e) => handleInputChange('cta_button_text', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="popular_badge_text">Texto do Badge Popular</Label>
              <Input id="popular_badge_text" value={currentSettings.popular_badge_text} onChange={(e) => handleInputChange('popular_badge_text', e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="additional_info">Informações Adicionais</Label>
            <Input id="additional_info" value={currentSettings.additional_info} onChange={(e) => handleInputChange('additional_info', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Aviso de Desenvolvimento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5" /> Aviso de Desenvolvimento</CardTitle>
          <CardDescription>Configure o aviso para funcionalidades em desenvolvimento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch id="show_dev_warning" checked={currentSettings.show_dev_warning || false} onCheckedChange={(v) => handleInputChange('show_dev_warning', v)} />
            <Label htmlFor="show_dev_warning">Mostrar aviso de desenvolvimento</Label>
          </div>
          <div>
            <Label>Título do Aviso</Label>
            <Input value={currentSettings.dev_warning_title || 'Funcionalidade em Desenvolvimento'} onChange={(e) => handleInputChange('dev_warning_title', e.target.value)} />
          </div>
          <div>
            <Label>Mensagem do Aviso</Label>
            <Textarea value={currentSettings.dev_warning_message || ''} onChange={(e) => handleInputChange('dev_warning_message', e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Contato e Suporte */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Contato e Suporte</CardTitle>
          <CardDescription>Configure informações de contato e suporte</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="payment_url">URL de Pagamento</Label>
            <Input id="payment_url" value={currentSettings.payment_url || ''} onChange={(e) => handleInputChange('payment_url', e.target.value)} placeholder="https://exemplo.com/pagamento" />
            <p className="text-sm text-muted-foreground mt-1">Este link será usado para redirecionamento do pagamento</p>
          </div>
          <div>
            <Label htmlFor="default_budget_validity_days">Dias de Validade Padrão (orçamentos)</Label>
            <Input
              id="default_budget_validity_days"
              type="number" min={1} max={365}
              value={currentSettings.default_budget_validity_days ?? 15}
              onChange={(e) => handleInputChange('default_budget_validity_days', Math.max(1, Math.min(365, Number(e.target.value || 15))))}
            />
          </div>
          <div>
            <Label htmlFor="whatsapp_number">Número do WhatsApp</Label>
            <Input id="whatsapp_number" value={currentSettings.whatsapp_number} onChange={(e) => handleInputChange('whatsapp_number', e.target.value)} placeholder="556496028022" />
          </div>
          <div>
            <Label htmlFor="support_text">Texto de Suporte</Label>
            <Input id="support_text" value={currentSettings.support_text} onChange={(e) => handleInputChange('support_text', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Gestão de Imagens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Image className="h-5 w-5" /> Gestão de Imagens</CardTitle>
          <CardDescription>Faça upload e gerencie imagens do sistema</CardDescription>
        </CardHeader>
        <CardContent><AdminImageManager /></CardContent>
      </Card>

      <BenefitsCard
        settings={currentSettings}
        onChange={handleInputChange}
        onAdd={handleAddBenefit}
        onRemove={handleRemoveBenefit}
        onUpdate={handleUpdateBenefit}
      />

      <TestimonialsCard
        settings={currentSettings}
        onChange={handleInputChange}
        onAdd={handleAddTestimonial}
        onRemove={handleRemoveTestimonial}
        onUpdate={handleUpdateTestimonial}
      />

      <FaqCard
        settings={currentSettings}
        onChange={handleInputChange}
        onAdd={handleAddFaq}
        onRemove={handleRemoveFaq}
        onUpdate={handleUpdateFaq}
      />

      {/* Opções de Exibição */}
      <Card>
        <CardHeader>
          <CardTitle>Opções de Exibição</CardTitle>
          <CardDescription>Configure elementos visuais da página</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Mostrar Badge "Popular"</Label>
              <p className="text-sm text-muted-foreground">Exibe o badge destacando o plano como popular</p>
            </div>
            <Switch checked={currentSettings.show_popular_badge} onCheckedChange={(v) => handleInputChange('show_popular_badge', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Mostrar Informações de Suporte</Label>
              <p className="text-sm text-muted-foreground">Exibe as informações de suporte na parte inferior</p>
            </div>
            <Switch checked={currentSettings.show_support_info} onCheckedChange={(v) => handleInputChange('show_support_info', v)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Badge variant="secondary" className="text-xs">
          {updateSettingsMutation.isPending ? 'Salvando...' : 'Todas as alterações são salvas automaticamente'}
        </Badge>
      </div>
    </div>
  );
};
