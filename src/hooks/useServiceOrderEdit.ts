/**
 * Hook para gerenciamento de edição de ordens de serviço
 * Centraliza toda a lógica de estado, validação e operações
 * Sistema OneDrip
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useServiceOrderValidation } from '@/hooks/useFormValidation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import { parseToReais, formatCurrencyFromReais } from '@/utils/currency';
import type { DeviceChecklistData } from '@/components/service-orders/DeviceChecklist';

import type { Enums } from '@/integrations/supabase/types';

type ServiceOrderStatus = Enums<'service_order_status'>;
type ServiceOrderPriority = Enums<'service_order_priority'>;

// Tipos para senha do dispositivo
export type DevicePasswordType = 'pin' | 'abc' | 'pattern' | 'biometric' | null;

export interface DevicePasswordData {
  type: DevicePasswordType;
  value: string;
  metadata?: {
    grid_size?: string;
    connections?: Array<{from: number; to: number}>;
  };
}

interface ServiceOrderFormData {
  id?: string;
  formatted_id: string;
  // Client
  clientId: string;
  // Device
  deviceType: string;
  deviceModel: string;
  imeiSerial: string;
  reportedIssue: string;
  priority: ServiceOrderPriority;
  status: ServiceOrderStatus;
  // Garantia
  warrantyMonths: string;
  // Datas
  entryDate: string;
  exitDate: string;
  deliveryDate: string;
  // Payment and Progress Information
  totalPrice: string;
  laborCost: string;
  partsCost: string;
  isPaid: boolean;
  paymentDate?: string;
  installments?: number | null;
  installmentValue?: string;
  // Senha do dispositivo
  devicePassword: DevicePasswordData;
  // Checklist de funcionamento do aparelho
  deviceChecklist: DeviceChecklistData | null;
  // Observações
  notes: string;
  // Fotos de entrada (novas)
  photos: File[];
  created_at?: string;
  updated_at?: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

interface DeviceType {
  id: string;
  name: string;
}

interface NewClientData {
  name: string;
  phone: string;
  email: string;
  address: string;
}

const initialFormData: ServiceOrderFormData = {
  formatted_id: '',
  clientId: '',
  deviceType: '',
  deviceModel: '',
  imeiSerial: '',
  reportedIssue: '',
  priority: 'medium',
  status: 'opened',
  // Garantia
  warrantyMonths: '12',
  // Datas
  entryDate: '',
  exitDate: '',
  deliveryDate: '',
  // Payment and Progress Information
  totalPrice: '',
  laborCost: '',
  partsCost: '',
  isPaid: false,
  paymentDate: '',
  installments: 1,
  installmentValue: '',
  // Senha do dispositivo
  devicePassword: {
    type: null,
    value: ''
  },
  // Checklist de funcionamento do aparelho
  deviceChecklist: null,
  // Observações
  notes: '',
  photos: []
};

const initialNewClientData: NewClientData = {
  name: '',
  phone: '',
  email: '',
  address: ''
};

export const useServiceOrderEdit = (serviceOrderId?: string) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const isEditMode = !!serviceOrderId;

  // Estados principais
  const [formData, setFormData] = useState<ServiceOrderFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados de dados auxiliares
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  
  // Estados de UI
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientData, setNewClientData] = useState<NewClientData>(initialNewClientData);

  // Hook de validação
  const validation = useServiceOrderValidation(formData as any);

  // Função para atualizar dados do formulário
  const updateFormData = useCallback((field: keyof ServiceOrderFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Carregamento inicial de dados usando RPC otimizada
  useEffect(() => {
    const loadInitialData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        
        if (isEditMode) {
          // Para edição, carregar dados da ordem de serviço
          const { data: serviceOrder, error: serviceOrderError } = await supabase
            .from('service_orders')
            .select(`
              *,
              clients (
                id,
                name,
                phone,
                email,
                address
              )
            `)
            .eq('id', serviceOrderId)
            .eq('owner_id', user.id)
            .single();

          if (serviceOrderError) {
            console.error('Erro ao carregar ordem de serviço:', serviceOrderError);
            showError({ title: 'Erro ao carregar ordem de serviço' });
            return;
          }
          
          // Carregar tipos de dispositivo e clientes separadamente
          const [deviceTypesResult, clientsResult] = await Promise.all([
            supabase
              .from('device_types')
              .select('id, name')
              .order('name'),
            supabase
              .from('clients')
              .select('id, name, phone, email, address')
              .eq('user_id', user.id)
              .order('name')
          ]);

          // Processar tipos de dispositivo
          if (deviceTypesResult.error) {
            console.error('Erro ao carregar tipos de dispositivo:', deviceTypesResult.error);
            showError({ title: 'Erro ao carregar tipos de dispositivo' });
          } else {
            setDeviceTypes(deviceTypesResult.data || []);
          }

          // Processar clientes
          if (clientsResult.error) {
            console.error('Erro ao carregar clientes:', clientsResult.error);
            showError({ title: 'Erro ao carregar clientes' });
          } else {
            const clientsData: Client[] = (clientsResult.data || []).map((c: any) => ({
              id: c.id,
              name: c.name,
              phone: c.phone,
              ...(c.email ? { email: c.email } : {}),
              ...(c.address ? { address: c.address } : {})
            }));
            setClients(clientsData);
            setFilteredClients(clientsData);
          }
          
          if (serviceOrder) {
            const so: any = serviceOrder;
            const seq = typeof so.sequential_number === 'number' ? so.sequential_number : null;
            const formattedId: string | undefined =
              typeof so.formatted_id === 'string' && so.formatted_id.trim()
                ? so.formatted_id
                : seq != null
                  ? `OS: ${String(seq).padStart(4, '0')}`
                  : undefined;

            const rawMeta = so.device_password_metadata;
            const passwordMetadata = rawMeta && typeof rawMeta === 'object' && !Array.isArray(rawMeta)
              ? (rawMeta as any)
              : undefined;

            const rawChecklist = so.device_checklist;
            const deviceChecklist = rawChecklist && typeof rawChecklist === 'object' && !Array.isArray(rawChecklist)
              ? (rawChecklist as any)
              : null;

            setFormData({
              id: so.id,
              formatted_id: formattedId ?? '',
              clientId: so.client_id ?? '',
              deviceType: so.device_type ?? '',
              deviceModel: so.device_model ?? '',
              imeiSerial: so.imei_serial ?? '',
              reportedIssue: so.reported_issue ?? '',
              priority: (so.priority ?? 'medium') as ServiceOrderPriority,
              status: (so.status ?? 'opened') as ServiceOrderStatus,
              // Garantia
              warrantyMonths: so.warranty_months != null ? String(so.warranty_months) : '12',
              // Datas
              entryDate: so.entry_date ? new Date(so.entry_date).toISOString().slice(0, 16) : '',
              exitDate: so.exit_date ? new Date(so.exit_date).toISOString().slice(0, 16) : '',
              deliveryDate: so.delivery_date ? new Date(so.delivery_date).toISOString().slice(0, 10) : '',
              // Payment and Progress Information
              totalPrice: so.total_price ? formatCurrencyFromReais(so.total_price, { showSymbol: false }) : '',
              laborCost: so.labor_cost ? formatCurrencyFromReais(so.labor_cost, { showSymbol: false }) : '',
              partsCost: so.parts_cost ? formatCurrencyFromReais(so.parts_cost, { showSymbol: false }) : '',
              isPaid: !!so.is_paid,
              // Senha do dispositivo
              devicePassword: {
                type: (so.device_password_type as DevicePasswordType) ?? null,
                value: so.device_password_value ?? '',
                metadata: passwordMetadata,
              },
              // Checklist de funcionamento do aparelho
              deviceChecklist,
              // Observações
              notes: so.notes ?? '',
              photos: [],
              created_at: so.created_at ?? undefined,
              updated_at: so.updated_at ?? undefined,
            });
            setSelectedClientId(so.client_id ?? '');
          }
        } else {
          // Para criação, carregar apenas tipos de dispositivo e clientes
          const [deviceTypesResult, clientsResult] = await Promise.all([
            supabase
              .from('device_types')
              .select('id, name')
              .order('name'),
            supabase
              .from('clients')
              .select('id, name, phone, email, address')
              .eq('user_id', user.id)
              .order('name')
          ]);

          // Processar tipos de dispositivo
          if (deviceTypesResult.error) {
            console.error('Erro ao carregar tipos de dispositivo:', deviceTypesResult.error);
            showError({ title: 'Erro ao carregar tipos de dispositivo' });
          } else {
            setDeviceTypes(deviceTypesResult.data || []);
          }

          // Processar clientes
          if (clientsResult.error) {
            console.error('Erro ao carregar clientes:', clientsResult.error);
            showError({ title: 'Erro ao carregar clientes' });
          } else {
            const clientsData: Client[] = (clientsResult.data || []).map((c: any) => ({
              id: c.id,
              name: c.name,
              phone: c.phone,
              ...(c.email ? { email: c.email } : {}),
              ...(c.address ? { address: c.address } : {})
            }));
            setClients(clientsData);
            setFilteredClients(clientsData);
          }

          // Configurar data de entrada padrão para nova ordem
          const now = new Date();
          setFormData(prev => ({
            ...prev,
            entryDate: now.toISOString().slice(0, 16)
          }));
        }
      } catch (error) {
        console.error('Erro no carregamento inicial:', error);
        showError({ title: 'Erro ao carregar dados' });
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [user, serviceOrderId, isEditMode, navigate]);

  // Função para buscar clientes
  const handleClientSearch = useCallback((searchTerm: string) => {
    setClientSearchTerm(searchTerm);
    
    if (!searchTerm.trim()) {
      setFilteredClients(clients);
      return;
    }

    const filtered = clients.filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    setFilteredClients(filtered);
  }, [clients]);

  // Função para selecionar cliente
  const handleSelectClient = useCallback((clientId: string) => {
    if (clientId === 'new') {
      setShowNewClientForm(true);
      setSelectedClientId('');
      updateFormData('clientId', '');
    } else {
      setSelectedClientId(clientId);
      updateFormData('clientId', clientId);
      setShowNewClientForm(false);
    }
  }, [updateFormData]);

  // Função para atualizar dados do novo cliente
  const handleNewClientDataChange = useCallback((field: keyof NewClientData, value: string) => {
    setNewClientData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Função para criar novo cliente
  const handleCreateNewClient = useCallback(async () => {
    if (!user) return;

    // Validação básica
    if (!newClientData.name.trim() || !newClientData.phone.trim()) {
      showError({ title: 'Nome e telefone são obrigatórios' });
      return;
    }

    try {
      setIsCreatingClient(true);
      
      const { data, error } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          name: newClientData.name.trim(),
          phone: newClientData.phone.trim(),
          email: newClientData.email.trim() || null,
          address: newClientData.address.trim() || null
        })
        .select('id, name, phone, email, address')
        .single();

      if (error) {
        throw error;
      }
      if (!data) {
        throw new Error('Falha ao criar cliente');
      }

      const newClient: Client = {
        id: data.id,
        name: data.name,
        phone: data.phone,
        ...(data.email ? { email: data.email } : {}),
        ...(data.address ? { address: data.address } : {}),
      };

      setClients(prev => [...prev, newClient]);
      setFilteredClients(prev => [...prev, newClient]);

      // Selecionar o novo cliente
      setSelectedClientId(newClient.id);
      updateFormData('clientId', newClient.id);
      
      // Limpar formulário e fechar
      setNewClientData(initialNewClientData);
      setShowNewClientForm(false);
      
      showSuccess({ title: 'Cliente criado com sucesso' });
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      showError({ title: 'Erro ao criar cliente' });
    } finally {
      setIsCreatingClient(false);
    }
  }, [user, newClientData, updateFormData]);

  // Função para cancelar criação de novo cliente
  const handleCancelNewClient = useCallback(() => {
    setNewClientData(initialNewClientData);
    setShowNewClientForm(false);
    setSelectedClientId('');
  }, []);

  // Função para submeter o formulário
  const handleSubmit = useCallback(async (e: React.FormEvent): Promise<string | null> => {
    e.preventDefault();
    
    if (!user) {
      showError({ title: 'Usuário não autenticado' });
      return null;
    }

    // Validar formulário
    const validationResult = validation.isFormValid(true);
    if (!validationResult.valid) {
      const missingLabels: Record<string, string> = {
        clientId: 'Cliente',
        deviceModel: 'Modelo do dispositivo',
        reportedIssue: 'Defeito relatado',
        totalPrice: 'Valor total',
      };
      const missing = validationResult.missingFields
        .map((f: string) => missingLabels[f] || f)
        .join(', ');
      const errorFields = validationResult.errorFields
        .map((f: string) => missingLabels[f] || f)
        .join(', ');
      
      let msg = '';
      if (missing) msg += `Campos obrigatórios: ${missing}`;
      if (errorFields) msg += `${msg ? '. ' : ''}Campos com erro: ${errorFields}`;
      
      showError({ title: msg || 'Por favor, corrija os erros no formulário' });
      return null;
    }

    try {
      setIsSubmitting(true);
      
      const submitData: any = {
        owner_id: user.id,
        client_id: formData.clientId,
        device_type: formData.deviceType,
        device_model: formData.deviceModel.trim() || null,
        imei_serial: formData.imeiSerial.trim() || null,
        reported_issue: formData.reportedIssue.trim(),
        priority: formData.priority,
        status: formData.status,
        warranty_months: formData.warrantyMonths ? parseInt(formData.warrantyMonths) : null,
        entry_date: formData.entryDate ? new Date(formData.entryDate).toISOString() : null,
        exit_date: formData.exitDate ? new Date(formData.exitDate).toISOString() : null,
        delivery_date: formData.deliveryDate ? new Date(formData.deliveryDate).toISOString() : null,
        total_price: formData.totalPrice ? parseToReais(formData.totalPrice) : null,
        labor_cost: formData.laborCost ? parseToReais(formData.laborCost) : null,
        parts_cost: formData.partsCost ? parseToReais(formData.partsCost) : null,
        is_paid: formData.isPaid,
        // Campos de senha do dispositivo
        device_password_type: formData.devicePassword.type,
        device_password_value: formData.devicePassword.value || null,
        device_password_metadata: (formData.devicePassword.metadata as any) || null,
        // Checklist de funcionamento do aparelho
        device_checklist: (formData.deviceChecklist as any) || null,
        notes: formData.notes.trim() || null
      };

      let targetId: string | null = null;

      if (isEditMode && formData.id) {
        // Atualizar ordem existente
        const { error } = await supabase
          .from('service_orders')
          .update(submitData)
          .eq('id', formData.id)
          .eq('owner_id', user.id);

        if (error) {
          console.error('Erro ao atualizar ordem de serviço:', error);
          showError({ title: 'Erro ao atualizar ordem de serviço' });
          return null;
        }

        targetId = formData.id;
        showSuccess({ title: 'Ordem de serviço atualizada com sucesso' });
      } else {
        // Criar nova ordem
        const { data, error } = await supabase
          .from('service_orders')
          .insert(submitData)
          .select('id')
          .single();

        if (error) {
          console.error('Erro ao criar ordem de serviço:', error);
          showError({ title: 'Erro ao criar ordem de serviço' });
          return null;
        }

        targetId = data?.id || null;
        showSuccess({ title: 'Ordem de serviço criada com sucesso' });
      }

      // Upload de fotos (se houver novas fotos)
      if (targetId && formData.photos && formData.photos.length > 0) {
        try {
          await Promise.all(formData.photos.map(async (file) => {
            const fileExt = file.name.split('.').pop() || 'jpg';
            const fileName = `${targetId}/${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
              .from('service-order-photos')
              .upload(fileName, file, { upsert: false });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from('service-order-photos')
              .getPublicUrl(fileName);

            await (supabase as any).from('service_order_photos').insert({
              service_order_id: targetId,
              photo_url: publicUrl,
              photo_type: 'other',
              created_by: user.id
            });
          }));
        } catch (photoError) {
          console.error('Erro ao enviar fotos:', photoError);
          showError({ title: 'Aviso: Erro ao salvar algumas fotos' });
        }
      }

      return targetId;
    } catch (error) {
      console.error('Erro ao submeter formulário:', error);
      showError({ title: 'Erro ao salvar ordem de serviço' });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [user, formData, validation, isEditMode]);

  return {
    // Estados principais
    formData,
    isLoading,
    isSubmitting,
    
    // Dados auxiliares
    deviceTypes,
    clients,
    filteredClients,
    
    // Estados de UI
    clientSearchTerm,
    selectedClientId,
    showNewClientForm,
    isCreatingClient,
    newClientData,
    
    // Validação
    validation,

    // Funções
    updateFormData,
    handleSelectClient,
    handleNewClientDataChange,
    handleCreateNewClient,
    handleCancelNewClient,
    handleClientSearch,
    handleSubmit
  };
}

export default useServiceOrderEdit;