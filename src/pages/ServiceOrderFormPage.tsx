/**
 * Página de Formulário de Ordem de Serviço
 * Sistema OneDrip - Mobile First Design
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ValidatedInput, ValidatedTextarea, PhoneInput, IMEIInput, CurrencyInput } from '@/components/ui/validated-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AutoSaveIndicatorCompact } from '@/components/ui/auto-save-indicator';
import { DevicePasswordSection } from '@/components/service-orders/DevicePasswordSection';
import { DeviceChecklist } from '@/components/service-orders/DeviceChecklist';
import { ImageUploadSection } from '@/components/service-orders/ImageUploadSection';

import {
  ArrowLeft,
  Save,
  Wrench,
  User,
  Smartphone,
  AlertCircle,
  Phone,
  Calendar,
  FileText,
  Search,
  X,
  Plus,
  DollarSign,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useServiceOrderEdit } from '@/hooks/useServiceOrderEdit';
import { toast } from 'sonner';
import type { Enums } from '@/integrations/supabase/types';

type ServiceOrderStatus = Enums<'service_order_status'>;
type ServiceOrderPriority = Enums<'service_order_priority'>;

interface FormData {
  // Client Information (will be stored in clients table)
  clientId: string;
  
  // Device Information
  deviceType: string;
  deviceModel: string;
  imeiSerial: string;
  
  // Service Information
  reportedIssue: string;
  priority: ServiceOrderPriority;
  warrantyMonths: string;
  
  // Date Information
  entryDate: string;
  exitDate: string;
  deliveryDate: string;
  
  // Payment and Progress Information
  paymentStatus: string;
  estimatedCompletion: string;
  actualCompletion: string;
  
  // Notes
  customerNotes: string;
  technicianNotes: string;
}

export const ServiceOrderFormPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  
  // Use the dedicated hook for service order editing
  const {
    // Form data and state
    formData,
    isLoading,
    isSubmitting,
    
    // Auxiliary data
    deviceTypes,
    clients,
    filteredClients,
    
    // UI state
    clientSearchTerm,
    selectedClientId,
    showNewClientForm,
    isCreatingClient,
    newClientData,
    
    // Validation
    validation,
    
    // Auto-save
    autoSave,
    
    // Functions
    updateFormData,
    handleClientSearch,
    handleSelectClient,
    handleNewClientDataChange,
    handleCreateNewClient,
    handleCancelNewClient,
    handleSubmit
  } = useServiceOrderEdit(id);

  // All data loading and state management is now handled by useServiceOrderEdit hook

  // All helper functions are now provided by useServiceOrderEdit hook

  // Form validation and submission are now handled by useServiceOrderEdit hook

  // Check authentication
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



  if (isEditMode && isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Back button clicked', { hasUnsavedChanges: autoSave.hasUnsavedChanges });
                
                if (autoSave.hasUnsavedChanges) {
                  const confirmLeave = window.confirm(
                    'Você tem alterações não salvas. Deseja realmente sair?'
                  );
                  if (!confirmLeave) {
                    console.log('User cancelled navigation');
                    return;
                  }
                  autoSave.clearSavedData();
                }
                
                console.log('Navigating to /service-orders');
                navigate('/service-orders');
              }}
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
            {!isEditMode && (
              <AutoSaveIndicatorCompact
                isSaving={autoSave.isSaving}
                lastSaved={autoSave.lastSaved}
                hasUnsavedChanges={autoSave.hasUnsavedChanges}
                error={autoSave.error}
              />
            )}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-4 pb-24">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const orderId = await handleSubmit(e);
          if (orderId && !isEditMode) {
            navigate('/service-orders');
          }
        }} className="space-y-6">
          {/* Client Information */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Client Search and Selection */}
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
                            <Input
                              id="newClientPhone"
                              type="tel"
                              value={newClientData.phone}
                              onChange={(e) => handleNewClientDataChange('phone', e.target.value)}
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
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft hover:shadow-medium transition-all duration-300"
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
                            className="border-border/50 bg-background hover:bg-muted/50 text-foreground"
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

          {/* Device Information */}
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

          {/* Service Information */}
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
              </div>

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



            </CardContent>
          </Card>

          {/* Device Checklist */}
          <DeviceChecklist
            value={formData.deviceChecklist}
            onChange={(data) => updateFormData('deviceChecklist', data)}
            disabled={isSubmitting}
          />

          {/* Status de Pagamento */}
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
                onBlur={() => validation.touchField('totalPrice')}
                error={validation.getFieldError('totalPrice')}
                isValid={validation.isFieldValid('totalPrice')}
                touched={validation.isFieldTouched('totalPrice')}
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

            </CardContent>
          </Card>

          {/* Delivery and Warranty */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Entrega e Garantia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ValidatedInput
                  label="Data de Entrega"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(value) => updateFormData('deliveryDate', value)}
                  description="Data prevista para entrega"
                />

                <ValidatedInput
                  label="Garantia (meses)"
                  type="number"
                  value={formData.warrantyMonths}
                  onChange={(value) => updateFormData('warrantyMonths', value)}
                  onBlur={() => validation.touchField('warrantyMonths')}
                  placeholder="Ex: 12"
                  min={0}
                  max={60}
                  error={validation.getFieldError('warrantyMonths')}
                  isValid={validation.isFieldValid('warrantyMonths')}
                  touched={validation.isFieldTouched('warrantyMonths')}
                  description="Período de garantia em meses (máx: 60)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 p-4 -mx-4">
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