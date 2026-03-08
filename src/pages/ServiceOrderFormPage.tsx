/**
 * Página de Formulário de Ordem de Serviço
 * Sistema OneDrip - Premium Design
 */

import { type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ValidatedInput, ValidatedTextarea, IMEIInput, CurrencyInput } from '@/components/ui/validated-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AutoSaveIndicatorCompact } from '@/components/ui/auto-save-indicator';
import { DevicePasswordSection } from '@/components/service-orders/DevicePasswordSection';
import { DeviceChecklist } from '@/components/service-orders/DeviceChecklist';
import { UnifiedSpinner } from '@/components/ui/UnifiedSpinner';
import { PhotoEntryManager } from '@/components/photos/PhotoEntryManager';

import { ArrowLeft, Save, Wrench, User, Smartphone, Calendar, Search, X, DollarSign, CheckCircle, Clock, Camera, ClipboardList } from 'lucide-react';
import { useServiceOrderEdit } from '@/hooks/useServiceOrderEdit';
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

export const ServiceOrderFormPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  
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
    handleClientSearch,
    handleSelectClient,
    handleNewClientDataChange,
    handleCreateNewClient,
    handleCancelNewClient,
    handleSubmit,
  } = useServiceOrderEdit(id);

  const autoSave = {
    isSaving: false,
    lastSaved: null as Date | null,
    hasUnsavedChanges: false,
    error: null as Error | null,
    clearSavedData: () => {},
  };

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
      <UnifiedSpinner fullScreen size="md" message="Carregando ordem de serviço..." />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Premium Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between py-3 lg:py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (autoSave.hasUnsavedChanges) {
                  const confirmLeave = window.confirm(
                    'Você tem alterações não salvas. Deseja realmente sair?'
                  );
                  if (!confirmLeave) return;
                  autoSave.clearSavedData();
                }
                navigate('/service-orders');
              }}
              className="gap-2"
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>

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
        <form onSubmit={async (e: FormEvent) => {
          e.preventDefault();
          const orderId = await handleSubmit(e);
          if (orderId && !isEditMode) {
            navigate('/service-orders');
          }
        }} className="space-y-6">
          {/* Client Information */}
          <PremiumSection icon={User} title="Informações do Cliente">
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
                            <Input
                              id="newClientPhone"
                              type="tel"
                              value={newClientData.phone}
                              onChange={(e) => handleNewClientDataChange('phone', e.target.value)}
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

          {/* Fotos de Entrada */}
          <PremiumSection icon={Camera} title="Fotos de Entrada">
            <PhotoEntryManager
              onPhotosComplete={(photos) => updateFormData('photos', photos)}
              minPhotos={1}
            />
          </PremiumSection>

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
            </div>
          </PremiumSection>

          {/* Checklist de Funcionamento do Aparelho */}
          <DeviceChecklist
            value={formData.deviceChecklist}
            onChange={(data) => updateFormData('deviceChecklist', data)}
            disabled={isSubmitting}
            {...(formData.id ? { serviceOrderId: formData.id } : {})}
          />

          {/* Status de Pagamento */}
          <PremiumSection icon={DollarSign} title="Status de Pagamento">
            <div className="space-y-4">
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
            </div>
          </PremiumSection>

          {/* Delivery and Warranty */}
          <PremiumSection icon={Calendar} title="Entrega e Garantia">
            <div className="space-y-4">
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
            </div>
          </PremiumSection>

          {/* Submit Button */}
          <div className="sticky bottom-0 z-30 bg-background/95 backdrop-blur border-t border-border/50 p-4 -mx-4 lg:-mx-8">
            <div className="max-w-7xl mx-auto">
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
