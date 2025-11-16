/**
 * Hook para gerenciamento de edição de ordens de serviço
 * Centraliza toda a lógica de estado, validação e operações
 * Sistema OneDrip
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useServiceOrderValidation } from '@/hooks/useFormValidation';
import { useFormAutoSave } from '@/hooks/useAutoSave';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import { parseToReais, formatCurrencyFromReais } from '@/utils/currency';
import type { DeviceChecklistData } from '@/components/service-orders/DeviceChecklist';

import type { Enums } from '@/integrations/supabase/types';

type ServiceOrderStatus = Enums<'service_order_status'>;
type ServiceOrderPriority = Enums<'service_order_priority'>;

// Tipos para senha do dispositivo
export type DevicePasswordType = 'pin' | 'abc' | 'pattern' | null;

export interface DevicePasswordData {
  type: DevicePasswordType;
  value: string;
  metadata?: {
    grid_size?: string;
    connections?: Array<{from: number; to: number}>;
  };
}

interface FormData {
  id?: string;
  formatted_id?: string;
  clientId: string;
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
  // Senha do dispositivo
  devicePassword: DevicePasswordData;
  // Checklist de funcionamento do aparelho
  deviceChecklist: DeviceChecklistData | null;
  // Observações
  notes: string;
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

const initialFormData: FormData = {
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
  // Senha do dispositivo
  devicePassword: {
    type: null,
    value: ''
  },
  // Checklist de funcionamento do aparelho
  deviceChecklist: null,
  // Observações
  notes: ''
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
  const [formData, setFormData] = useState<FormData>(initialFormData);
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
  const validation = useServiceOrderValidation(formData);

  // Hook de auto-save (apenas para modo de criação)
  const autoSave = useFormAutoSave(
    formData,
    `service-order-${serviceOrderId || 'new'}`,
    {
      enabled: !isEditMode, // Apenas para novas ordens
      interval: 30000 // 30 segundos
    }
  );

  // Função para atualizar dados do formulário
  const updateFormData = useCallback((field: keyof FormData, value: any) => {
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
            const clientsData = clientsResult.data || [];
            setClients(clientsData);
            setFilteredClients(clientsData);
          }
          
          if (serviceOrder) {
            setFormData({
              id: serviceOrder.id,
              formatted_id: serviceOrder.formatted_id,
              clientId: serviceOrder.client_id,
              deviceType: serviceOrder.device_type || '',
              deviceModel: serviceOrder.device_model || '',
              imeiSerial: serviceOrder.imei_serial || '',
              reportedIssue: serviceOrder.reported_issue || '',
              priority: serviceOrder.priority,
              status: serviceOrder.status,
              // Garantia
              warrantyMonths: serviceOrder.warranty_months?.toString() || '12',
              // Datas
              entryDate: serviceOrder.entry_date ? new Date(serviceOrder.entry_date).toISOString().slice(0, 16) : '',
              exitDate: serviceOrder.exit_date ? new Date(serviceOrder.exit_date).toISOString().slice(0, 16) : '',
              deliveryDate: serviceOrder.delivery_date ? new Date(serviceOrder.delivery_date).toISOString().slice(0, 10) : '',
              // Payment and Progress Information
              totalPrice: serviceOrder.total_price ? formatCurrencyFromReais(serviceOrder.total_price, { showSymbol: false }) : '',
              laborCost: serviceOrder.labor_cost ? formatCurrencyFromReais(serviceOrder.labor_cost, { showSymbol: false }) : '',
              partsCost: serviceOrder.parts_cost ? formatCurrencyFromReais(serviceOrder.parts_cost, { showSymbol: false }) : '',
              isPaid: serviceOrder.is_paid || false,
              // Senha do dispositivo
              devicePassword: {
                type: serviceOrder.device_password_type as DevicePasswordType,
                value: serviceOrder.device_password_value || '',
                metadata: serviceOrder.device_password_metadata || undefined
              },
              // Checklist de funcionamento do aparelho
              deviceChecklist: serviceOrder.device_checklist || null,
              // Observações
              notes: serviceOrder.notes || '',
              created_at: serviceOrder.created_at,
              updated_at: serviceOrder.updated_at
            });
            setSelectedClientId(serviceOrder.client_id);
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
            const clientsData = clientsResult.data || [];
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
        console.error('Erro ao criar cliente:', error);
        showError({ title: 'Erro ao criar cliente' });
        return;
      }

      // Atualizar lista de clientes
      const newClient = data;
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
    if (!validation.isFormValid()) {
      showError({ title: 'Por favor, corrija os erros no formulário' });
      return null;
    }

    try {
      setIsSubmitting(true);
      
      const submitData = {
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
        device_password_metadata: formData.devicePassword.metadata || null,
        // Checklist de funcionamento do aparelho
        device_checklist: formData.deviceChecklist,
        notes: formData.notes.trim() || null
      };

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

        showSuccess({ title: 'Ordem de serviço atualizada com sucesso' });
        return formData.id; // Retornar o ID da ordem atualizada
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

        showSuccess({ title: 'Ordem de serviço criada com sucesso' });
        return data?.id || null; // Retornar o ID da nova ordem
      }
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
    
    // Auto-save
    autoSave,
    
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