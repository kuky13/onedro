/**
 * Componente de Edição de Ordem de Serviço
 * Estrutura em cards similar ao WormBudgetForm
 * Sistema OneDrip - Mobile First Design
 */

import React, { useState, useCallback, Suspense, lazy } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ValidatedInput, ValidatedTextarea, PhoneInput, IMEIInput, CurrencyInput } from '@/components/ui/validated-input';
// Lazy load Select components to improve initial render performance
const Select = lazy(() => import('@/components/ui/select').then(module => ({ default: module.Select })));
const SelectContent = lazy(() => import('@/components/ui/select').then(module => ({ default: module.SelectContent })));
const SelectItem = lazy(() => import('@/components/ui/select').then(module => ({ default: module.SelectItem })));
const SelectTrigger = lazy(() => import('@/components/ui/select').then(module => ({ default: module.SelectTrigger })));
const SelectValue = lazy(() => import('@/components/ui/select').then(module => ({ default: module.SelectValue })));

import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
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
  CheckCircle
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

interface ServiceOrderEditFormProps {
  serviceOrderId?: string;
}

export const ServiceOrderEditForm: React.FC<ServiceOrderEditFormProps> = ({ serviceOrderId }) => {
  // Debug: Log do serviceOrderId recebido
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

  // Hook para gerenciar upload de imagens
  const imageUpload = useImageUpload(orderId);

  // Estado para controlar imagens pendentes
  const [hasPendingImages, setHasPendingImages] = useState(false);
  const [showPendingToast, setShowPendingToast] = useState(false);

  // Handler personalizado que salva a ordem e faz upload das imagens
  const handleSaveAndUpload = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar se há imagens pendentes
    if (hasPendingImages) {
      setShowPendingToast(true);
      return;
    }
    
    try {
      // 1. Salvar a ordem de serviço
      const savedOrderId = await handleSubmit(e);
      
      if (!savedOrderId) {
        return; // Se falhou ao salvar, não continuar
      }
      
      // 2. Se houver imagens pendentes, fazer upload
      if (imageUpload.state.files.length > 0) {
        console.log('📸 Fazendo upload de', imageUpload.state.files.length, 'imagens...');
        await imageUpload.uploadImages(savedOrderId);
        toast.success('Ordem salva e imagens enviadas com sucesso!');
      }
      
      // 3. Navegar de volta para a lista
      navigate('/service-orders');
    } catch (error) {
      console.error('Erro ao salvar ordem e fazer upload:', error);
      toast.error('Erro ao processar ordem de serviço');
    }
  }, [handleSubmit, imageUpload, navigate]);



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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/service-orders')}
              className="p-2 -ml-2"
              type="button"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">
                {isEditMode ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isEditMode ? 'Atualize as informações da ordem' : 'Preencha os dados para criar uma nova ordem'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-4 pb-24">
        <form onSubmit={handleSaveAndUpload} className="space-y-6">
          {/* Service Order Header - Apenas no modo de edição */}
          {isEditMode && formData.formatted_id && (
            <Card className="border-border/50 bg-gradient-to-r from-primary/5 to-secondary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Ordem de Serviço #{formData.formatted_id}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <p className="font-medium">
                      {formData.status === 'opened' && 'Aberta'}
                      {formData.status === 'in_progress' && 'Em Andamento'}
                      {formData.status === 'completed' && 'Concluída'}
                      {formData.status === 'delivered' && 'Entregue'}
                      {formData.status === 'cancelled' && 'Cancelada'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Prioridade</Label>
                    <p className="font-medium">
                      {formData.priority === 'low' && 'Baixa'}
                      {formData.priority === 'medium' && 'Média'}
                      {formData.priority === 'high' && 'Alta'}
                      {formData.priority === 'urgent' && 'Urgente'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Criada em</Label>
                    <p className="font-medium">
                      {formData.created_at ? new Date(formData.created_at).toLocaleDateString('pt-BR') : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Atualizada em</Label>
                    <p className="font-medium">
                      {formData.updated_at ? new Date(formData.updated_at).toLocaleDateString('pt-BR') : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Client Information Card */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                {clients.length > 0 ? (
                  <div className="space-y-2">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Buscar cliente por nome, telefone ou email..."
                        value={clientSearchTerm}
                        onChange={(e) => handleClientSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* Client Selection */}
                    <Suspense fallback={<div className="h-10 w-full bg-muted animate-pulse rounded-md" />}>
                    <Select value={selectedClientId} onValueChange={handleSelectClient}>
                      <SelectTrigger className={!formData.clientId ? "border-red-300" : ""}>
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

                    {/* Inline New Client Form */}
                    {showNewClientForm && (
                      <div className="mt-4 p-4 border border-border/50 rounded-lg bg-muted/30 backdrop-blur-sm">
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
                              className="mt-1 bg-background border-border/50 text-foreground placeholder:text-muted-foreground"
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
                              className="mt-1 bg-background border-border/50 text-foreground placeholder:text-muted-foreground"
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
                              className="mt-1 bg-background border-border/50 text-foreground placeholder:text-muted-foreground"
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
                              className="mt-1 bg-background border-border/50 text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            type="button"
                            onClick={handleCreateNewClient}
                            disabled={isCreatingClient}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                    <p className="text-sm text-muted-foreground mb-2">
                      Nenhum cliente encontrado. Você precisa criar um cliente primeiro.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/clients/new')}
                    >
                      Criar Primeiro Cliente
                    </Button>
                  </div>
                )}
                {!formData.clientId && clients.length > 0 && (
                  <p className="text-sm text-red-600">Cliente é obrigatório</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Device Information Card */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Informações do Dispositivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deviceType">Tipo de Dispositivo *</Label>
                <Suspense fallback={<div className="h-10 w-full bg-muted animate-pulse rounded-md" />}>
                <Select value={formData.deviceType} onValueChange={(value) => updateFormData('deviceType', value)}>
                  <SelectTrigger className={!formData.deviceType ? "border-red-300" : ""}>
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
                  <p className="text-sm text-red-600">Tipo de dispositivo é obrigatório</p>
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
            </CardContent>
          </Card>

          {/* Device Password Section */}
          <DevicePasswordSection
            value={formData.devicePassword}
            onChange={(data) => updateFormData('devicePassword', data)}
            disabled={isSubmitting}
          />

          {/* Service Information Card */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Informações do Serviço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Checklist de Funcionamento do Aparelho */}
          <DeviceChecklist
            value={formData.deviceChecklist}
            onChange={(data) => updateFormData('deviceChecklist', data)}
            disabled={isSubmitting}
            serviceOrderId={formData.id}
          />



          {/* Status de Pagamento Card */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Status de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CurrencyInput
                label="Valor Total"
                value={formData.totalPrice}
                onChange={(value) => updateFormData('totalPrice', value)}
                description="Valor total do serviço em reais"
                placeholder="R$ 0,00"
              />

              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
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
                      className=""
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
                        className=""
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
            </CardContent>
          </Card>

          {/* Garantia Card */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Garantia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
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
              </div>
              
              {(() => {
                const months = Number(formData.warrantyMonths) || 0;
                if (months <= 0) return null;

                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Garantia válida até:</strong>{' '}
                      {new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Dates Card */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Datas Importantes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Image Upload Section */}
          <div className="relative">
            {/* Evita passar undefined (exactOptionalPropertyTypes) e evita upload sem ordem criada */}
            {orderId ? (
              <ImageUploadSection
                serviceOrderId={orderId}
                disabled={isSubmitting}
                onPendingFilesChange={setHasPendingImages}
              />
            ) : (
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
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

          {/* Submit Button */}
          <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 p-4 -mx-4 space-y-3">
            <Button
              type="submit"
              className="w-full h-12 text-base font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
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
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="flex-1">
              <Skeleton className="h-6 w-48 mb-1" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
      </div>

      {/* Form Content Skeleton */}
      <div className="p-4 pb-24 space-y-6">
        {/* Service Order Header Skeleton */}
        <Card className="border-border/50">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cards Skeleton */}
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Submit Button Skeleton */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 p-4 -mx-4">
          <Skeleton className="w-full h-12" />
        </div>
      </div>
    </div>
  );
};

export default ServiceOrderEditForm;