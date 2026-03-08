/**
 * Componente de Edição de Ordem de Serviço
 * Sistema OneDrip - Premium Design
 */

import React, { useState, useCallback, Suspense, lazy } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ValidatedInput, ValidatedTextarea, PhoneInput, IMEIInput, CurrencyInput } from '@/components/ui/validated-input';
const Select = lazy(() => import('@/components/ui/select').then(module => ({ default: module.Select })));
const SelectContent = lazy(() => import('@/components/ui/select').then(module => ({ default: module.SelectContent })));
const SelectItem = lazy(() => import('@/components/ui/select').then(module => ({ default: module.SelectItem })));
const SelectTrigger = lazy(() => import('@/components/ui/select').then(module => ({ default: module.SelectTrigger })));
const SelectValue = lazy(() => import('@/components/ui/select').then(module => ({ default: module.SelectValue })));

import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  Save,
  Wrench,
  User,
  Smartphone,
  DollarSign,
  Calendar,
  FileText,
  Search,
  X,
  Clock,
  CheckCircle,
  ClipboardList,
  Camera,
  Shield
} from 'lucide-react';
import { useServiceOrderEdit } from '@/hooks/useServiceOrderEdit';
import { useImageUpload } from '@/hooks/useImageUpload';
import { DevicePasswordSection } from './DevicePasswordSection';
import { DeviceChecklist } from './DeviceChecklist';
import { ImageUploadSection } from './ImageUploadSection';
import { MiniToastWithArrow } from '../lite/MiniToastWithArrow';

import { toast } from 'sonner';
import type { Enums } from '@/integrations/supabase/types';

type ServiceOrderPriority = Enums<'service_order_priority'>;

// Premium section wrapper component
const PremiumSection = ({ icon: Icon, title, children, className = '' }: { icon: React.ElementType; title: string; children: React.ReactNode; className?: string }) => (
  <section className={`bg-muted/20 border border-border/30 rounded-2xl p-4 sm:p-6 ${className}`}>
    <div className="flex items-center gap-3 mb-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
    </div>
    {children}
  </section>
);

interface ServiceOrderEditFormProps {
  serviceOrderId?: string;
}

export const ServiceOrderEditForm: React.FC<ServiceOrderEditFormProps> = ({ serviceOrderId }) => {
  console.log('🔧 ServiceOrderEditForm - serviceOrderId recebido:', serviceOrderId);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const orderId = serviceOrderId || id;
  const isEditMode = !!orderId;
  
  console.log('📝 ServiceOrderEditForm - serviceOrderId prop:', serviceOrderId);
  console.log('📝 ServiceOrderEditForm - id from useParams:', id);
  console.log('📝 ServiceOrderEditForm - final orderId:', orderId);
  console.log('📝 ServiceOrderEditForm - isEditMode:', isEditMode);

  const {
    formData,
    isLoading,
    isSubmitting,
    deviceTypes,
    clients,
    filteredClients,
    clientSearchTerm,
    selectedClientId,
    showNewClientForm,
    isCreatingClient,
    newClientData,
    validation,
    updateFormData,
    handleSelectClient,
    handleNewClientDataChange,
    handleCreateNewClient,
    handleCancelNewClient,
    handleClientSearch,
    handleSubmit
  } = useServiceOrderEdit(orderId);

  const imageUpload = useImageUpload(orderId);
  const [hasPendingImages, setHasPendingImages] = useState(false);
  const [showPendingToast, setShowPendingToast] = useState(false);

  const handleSaveAndUpload = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (hasPendingImages) {
      setShowPendingToast(true);
      return;
    }
    
    try {
      const savedOrderId = await handleSubmit(e);
      
      if (!savedOrderId) return;
      
      if (imageUpload.state.files.length > 0) {
        console.log('📸 Fazendo upload de', imageUpload.state.files.length, 'imagens...');
        await imageUpload.uploadImages(savedOrderId);
        toast.success('Ordem salva e imagens enviadas com sucesso!');
      }
      
      navigate('/service-orders');
    } catch (error) {
      console.error('Erro ao salvar ordem e fazer upload:', error);
      toast.error('Erro ao processar ordem de serviço');
    }
  }, [handleSubmit, imageUpload, navigate, hasPendingImages]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acesso Negado</h1>
          <p className="text-muted-foreground mb-6">Você precisa estar logado para acessar esta página.</p>
          <Button onClick={() => navigate('/auth')}>Fazer Login</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <ServiceOrderEditFormSkeleton />;
  }

  const statusLabels: Record<string, string> = {
    opened: 'Aberta',
    in_progress: 'Em Andamento',
    completed: 'Concluída',
    delivered: 'Entregue',
    cancelled: 'Cancelada',
  };

  const priorityLabels: Record<string, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-primary/10 text-primary',
    high: 'bg-orange-500/10 text-orange-600',
    urgent: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Premium Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between py-3 lg:py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/service-orders')}
              className="gap-2"
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-28">
        {/* Hero Section */}
        <div className="py-6 lg:py-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                {isEditMode ? 'Editar Ordem' : 'Nova Ordem de Serviço'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isEditMode ? 'Atualize as informações da ordem' : 'Preencha os dados para criar uma nova ordem'}
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSaveAndUpload} className="space-y-6">
          {/* Service Order Header - Edit mode only */}
          {isEditMode && formData.formatted_id && (
            <section className="bg-gradient-to-br from-primary/5 via-muted/20 to-secondary/5 border border-border/30 rounded-2xl p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Ordem de Serviço #{formData.formatted_id}
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div>
                    <Badge variant="secondary" className="text-xs">
                      {statusLabels[formData.status] || formData.status}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Prioridade</Label>
                  <div>
                    <Badge className={`text-xs ${priorityColors[formData.priority] || ''}`}>
                      {priorityLabels[formData.priority] || formData.priority}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Criada em</Label>
                  <p className="font-medium text-sm">
                    {formData.created_at ? new Date(formData.created_at).toLocaleDateString('pt-BR') : '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Atualizada em</Label>
                  <p className="font-medium text-sm">
                    {formData.updated_at ? new Date(formData.updated_at).toLocaleDateString('pt-BR') : '-'}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Client Information */}
          <PremiumSection icon={User} title="Dados do Cliente">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                {clients.length > 0 ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Buscar cliente por nome, telefone ou email..."
                        value={clientSearchTerm}
                        onChange={(e) => handleClientSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    <Suspense fallback={<div className="h-10 w-full bg-muted animate-pulse rounded-md" />}>
                    <Select value={selectedClientId} onValueChange={handleSelectClient}>
                      <SelectTrigger className={!formData.clientId ? "border-destructive/50" : ""}>
                        <SelectValue placeholder="Selecionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">+ Criar Novo Cliente</SelectItem>
                        {filteredClients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} {client.phone && `- ${client.phone}`}
                          </SelectItem>
                        ))}
                        {filteredClients.length === 0 && clientSearchTerm && (
                          <SelectItem value="no-results" disabled>
                            Nenhum cliente encontrado
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    </Suspense>

                    {showNewClientForm && (
                      <div className="mt-4 p-4 border border-border/30 rounded-xl bg-background/50 backdrop-blur-sm">
                        <h4 className="text-lg font-medium mb-4 text-foreground">Criar Novo Cliente</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="newClientName">Nome *</Label>
                            <Input
                              id="newClientName"
                              type="text"
                              value={newClientData.name}
                              onChange={(e) => handleNewClientDataChange('name', e.target.value)}
                              placeholder="Nome completo do cliente"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="newClientPhone">Telefone *</Label>
                            <PhoneInput
                              label="Telefone"
                              id="newClientPhone"
                              value={newClientData.phone}
                              onChange={(value) => handleNewClientDataChange('phone', value)}
                              placeholder="(11) 99999-9999"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="newClientEmail">Email</Label>
                            <Input
                              id="newClientEmail"
                              type="email"
                              value={newClientData.email}
                              onChange={(e) => handleNewClientDataChange('email', e.target.value)}
                              placeholder="cliente@email.com"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="newClientAddress">Endereço</Label>
                            <Input
                              id="newClientAddress"
                              type="text"
                              value={newClientData.address}
                              onChange={(e) => handleNewClientDataChange('address', e.target.value)}
                              placeholder="Endereço completo"
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            type="button"
                            onClick={handleCreateNewClient}
                            disabled={isCreatingClient}
                            className="btn-premium rounded-xl"
                          >
                            {isCreatingClient ? (
                              <>
                                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                                Salvando...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Salvar Cliente
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancelNewClient}
                            disabled={isCreatingClient}
                            className="rounded-xl"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-muted/30 rounded-xl border border-border/30">
                    <p className="text-sm text-muted-foreground mb-2">
                      Nenhum cliente encontrado. Você precisa criar um cliente primeiro.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/clients/new')}
                      className="rounded-xl"
                    >
                      Criar Primeiro Cliente
                    </Button>
                  </div>
                )}
                {!formData.clientId && clients.length > 0 && (
                  <p className="text-sm text-destructive">Cliente é obrigatório</p>
                )}
              </div>
            </div>
          </PremiumSection>

          {/* Device Information */}
          <PremiumSection icon={Smartphone} title="Informações do Dispositivo">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deviceType">Tipo de Dispositivo *</Label>
                <Suspense fallback={<div className="h-10 w-full bg-muted animate-pulse rounded-md" />}>
                <Select value={formData.deviceType} onValueChange={(value) => updateFormData('deviceType', value)}>
                  <SelectTrigger className={!formData.deviceType ? "border-destructive/50" : ""}>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceTypes.length === 0 ? (
                      <SelectItem value="loading" disabled>
                        Carregando tipos de dispositivo...
                      </SelectItem>
                    ) : (
                      deviceTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                </Suspense>
                {!formData.deviceType && (
                  <p className="text-sm text-destructive">Tipo de dispositivo é obrigatório</p>
                )}
              </div>

              <ValidatedInput
                label="Modelo do Dispositivo"
                value={formData.deviceModel}
                onChange={(value) => updateFormData('deviceModel', value)}
                onBlur={() => validation.touchField('deviceModel')}
                placeholder="Ex: iPhone 14 Pro, Samsung Galaxy S23"
                required
                error={validation.getFieldError('deviceModel')}
                isValid={validation.isFieldValid('deviceModel')}
                touched={validation.isFieldTouched('deviceModel')}
                description="Informe o modelo exato do dispositivo"
              />

              <IMEIInput
                label="Número de Série/IMEI"
                value={formData.imeiSerial}
                onChange={(value) => updateFormData('imeiSerial', value)}
                onBlur={() => validation.touchField('imeiSerial')}
                error={validation.getFieldError('imeiSerial')}
                isValid={validation.isFieldValid('imeiSerial')}
                touched={validation.isFieldTouched('imeiSerial')}
                description="IMEI de 15 dígitos ou número de série"
              />
            </div>
          </PremiumSection>

          {/* Device Password Section */}
          <DevicePasswordSection
            value={formData.devicePassword}
            onChange={(data) => updateFormData('devicePassword', data)}
            disabled={isSubmitting}
          />

          {/* Service Information */}
          <PremiumSection icon={Wrench} title="Informações do Serviço">
            <div className="space-y-4">
              <ValidatedTextarea
                label="Descrição do Reparo"
                value={formData.reportedIssue}
                onChange={(value) => updateFormData('reportedIssue', value)}
                onBlur={() => validation.touchField('reportedIssue')}
                placeholder="Descreva detalhadamente o reparo realizado"
                rows={4}
                required
                error={validation.getFieldError('reportedIssue')}
                isValid={validation.isFieldValid('reportedIssue')}
                touched={validation.isFieldTouched('reportedIssue')}
                description="Mínimo de 10 caracteres para uma descrição adequada"
                maxLength={500}
              />

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Suspense fallback={<div className="h-10 w-full bg-muted animate-pulse rounded-md" />}>
                <Select value={formData.priority} onValueChange={(value) => updateFormData('priority', value as ServiceOrderPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
                </Suspense>
              </div>

              <ValidatedTextarea
                label="Observações Adicionais"
                value={formData.notes}
                onChange={(value) => updateFormData('notes', value)}
                placeholder="Informações adicionais sobre o serviço"
                rows={3}
                description="Informações extras que podem ser úteis"
                maxLength={500}
              />
            </div>
          </PremiumSection>

          {/* Checklist */}
          <DeviceChecklist
            value={formData.deviceChecklist}
            onChange={(data) => updateFormData('deviceChecklist', data)}
            disabled={isSubmitting}
            {...(formData.id ? { serviceOrderId: formData.id } : {})}
          />

          {/* Payment Status */}
          <PremiumSection icon={DollarSign} title="Status de Pagamento">
            <div className="space-y-4">
              <CurrencyInput
                label="Valor Total"
                value={formData.totalPrice}
                onChange={(value) => updateFormData('totalPrice', value)}
                description="Valor total do serviço em reais"
                placeholder="R$ 0,00"
              />

              <div className="flex items-center space-x-3 p-3 bg-background/50 rounded-xl border border-border/20">
                <Switch
                  id="isPaid"
                  checked={formData.isPaid}
                  onCheckedChange={(checked) => updateFormData('isPaid', checked)}
                />
                <Label htmlFor="isPaid" className="flex items-center gap-2">
                  {formData.isPaid ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-orange-500" />
                  )}
                  {formData.isPaid ? 'Pagamento Realizado' : 'Pagamento Pendente'}
                </Label>
              </div>
              
              {formData.isPaid && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                  <div className="space-y-2">
                    <Label>Data do Pagamento</Label>
                    <Input
                      type="date"
                      value={formData.paymentDate || ''}
                      onChange={(e) => updateFormData('paymentDate', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Parcelas</Label>
                    <Input
                      type="number"
                      value={formData.installments || ''}
                      onChange={(e) => updateFormData('installments', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="1"
                      min="1"
                      max="12"
                    />
                  </div>
                  
                  {formData.installments && formData.installments > 1 && (
                    <div className="space-y-2 md:col-span-2">
                      <CurrencyInput
                        label="Valor por Parcela (R$)"
                        value={formData.installmentValue || ''}
                        onChange={(value) => updateFormData('installmentValue', value)}
                        placeholder="0,00"
                        fieldContext="total"
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">
                        Calculado automaticamente: R$ {formData.totalPrice ? (parseFloat(formData.totalPrice.replace(',', '.')) / (formData.installments || 1)).toFixed(2).replace('.', ',') : '0,00'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </PremiumSection>

          {/* Warranty */}
          <PremiumSection icon={Shield} title="Garantia">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Período (meses)</Label>
                <Input
                  type="number"
                  value={formData.warrantyMonths || ''}
                  onChange={(e) => updateFormData('warrantyMonths', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Ex: 3"
                  min="0"
                  max="60"
                />
              </div>
              
              {(() => {
                const months = Number(formData.warrantyMonths) || 0;
                if (months <= 0) return null;
                return (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                    <p className="text-sm text-foreground">
                      <strong>Garantia válida até:</strong>{' '}
                      {new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                );
              })()}
            </div>
          </PremiumSection>

          {/* Dates */}
          <PremiumSection icon={Calendar} title="Datas Importantes">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ValidatedInput
                  label="Data de Entrada"
                  type="datetime-local"
                  value={formData.entryDate}
                  onChange={(value) => updateFormData('entryDate', value)}
                  onBlur={() => validation.touchField('entryDate')}
                  error={validation.getFieldError('entryDate')}
                  isValid={validation.isFieldValid('entryDate')}
                  touched={validation.isFieldTouched('entryDate')}
                  description="Data e hora de entrada do dispositivo"
                />

                <ValidatedInput
                  label="Data de Saída"
                  type="datetime-local"
                  value={formData.exitDate}
                  onChange={(value) => updateFormData('exitDate', value)}
                  onBlur={() => validation.touchField('exitDate')}
                  error={validation.getFieldError('exitDate')}
                  isValid={validation.isFieldValid('exitDate')}
                  touched={validation.isFieldTouched('exitDate')}
                  description="Data e hora de saída do dispositivo"
                />
              </div>

              <ValidatedInput
                label="Data de Entrega"
                type="date"
                value={formData.deliveryDate}
                onChange={(value) => updateFormData('deliveryDate', value)}
                description="Data prevista para entrega"
              />
            </div>
          </PremiumSection>

          {/* Image Upload */}
          <PremiumSection icon={Camera} title="Imagens">
            <div className="relative">
              {orderId ? (
                <ImageUploadSection
                  serviceOrderId={orderId}
                  disabled={isSubmitting}
                  onPendingFilesChange={setHasPendingImages}
                />
              ) : (
                <div className="rounded-xl border border-border/30 bg-background/50 p-4">
                  <p className="text-sm text-muted-foreground">
                    Salve a ordem primeiro para habilitar o envio de imagens.
                  </p>
                </div>
              )}
              <MiniToastWithArrow
                show={showPendingToast}
                message="Envie as imagens primeiro"
                onClose={() => setShowPendingToast(false)}
              />
            </div>
          </PremiumSection>

          {/* Submit Button */}
          <div className="sticky bottom-0 z-30 bg-background/95 backdrop-blur border-t border-border/50 p-4 -mx-4 lg:-mx-8">
            <div className="max-w-7xl mx-auto space-y-3">
              <Button
                type="submit"
                className="btn-premium w-full h-12 text-base font-semibold rounded-xl"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                    {isEditMode ? 'Atualizando...' : 'Criando...'}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditMode ? 'Atualizar Ordem' : 'Criar Ordem de Serviço'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Skeleton Loading Component
const ServiceOrderEditFormSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between py-3 lg:py-4">
            <Skeleton className="h-9 w-20 rounded-xl" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-28">
        {/* Hero Skeleton */}
        <div className="py-6 lg:py-8 flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>

        {/* Cards Skeleton */}
        <div className="space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-muted/20 border border-border/30 rounded-2xl p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-6 w-40" />
              </div>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ServiceOrderEditForm;
