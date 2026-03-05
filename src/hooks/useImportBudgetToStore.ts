import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BudgetPart {
  id: string;
  name: string;
  part_type?: string | null;
  price: number;
  cash_price?: number | null;
  installment_price?: number | null;
  installment_count?: number | null;
  warranty_months?: number | null;
  quantity?: number | null;
}

export interface Budget {
  id: string;
  device_type?: string;
  device_model?: string;
  part_quality?: string;
  warranty_months?: number;
  installments?: number;
  sequential_number?: number;
}

interface ImportResult {
  success: boolean;
  brandId?: string;
  deviceId?: string;
  servicesCreated: number;
  errors: string[];
}

export function useImportBudgetToStore(storeId: string | undefined) {
  const [isImporting, setIsImporting] = useState(false);

  const findOrCreateBrand = async (brandName: string): Promise<string | null> => {
    if (!storeId || !brandName) return null;

    // Tentar encontrar marca existente (case insensitive)
    const { data: existingBrand } = await supabase
      .from('store_brands')
      .select('id')
      .eq('store_id', storeId)
      .ilike('name', brandName.trim())
      .maybeSingle();

    if (existingBrand) return existingBrand.id;

    // Criar nova marca
    const { data: newBrand, error } = await supabase
      .from('store_brands')
      .insert({ store_id: storeId, name: brandName.trim() })
      .select('id')
      .single();

    if (error) {
      console.error('Erro ao criar marca:', error);
      return null;
    }

    return newBrand.id;
  };

  const findOrCreateDevice = async (brandId: string, deviceName: string): Promise<string | null> => {
    if (!storeId || !brandId || !deviceName) return null;

    // Tentar encontrar modelo existente (case insensitive)
    const { data: existingDevice } = await supabase
      .from('store_devices')
      .select('id')
      .eq('brand_id', brandId)
      .ilike('name', deviceName.trim())
      .maybeSingle();

    if (existingDevice) return existingDevice.id;

    // Criar novo modelo
    const { data: newDevice, error } = await supabase
      .from('store_devices')
      .insert({ 
        store_id: storeId, 
        brand_id: brandId, 
        name: deviceName.trim() 
      })
      .select('id')
      .single();

    if (error) {
      console.error('Erro ao criar modelo:', error);
      return null;
    }

    return newDevice.id;
  };

  const checkServiceExists = async (deviceId: string, serviceName: string): Promise<boolean> => {
    const { data } = await supabase
      .from('store_services')
      .select('id')
      .eq('device_id', deviceId)
      .ilike('name', serviceName.trim())
      .maybeSingle();

    return !!data;
  };

  const createService = async (
    deviceId: string,
    part: BudgetPart,
    budgetSequentialNumber?: number
  ): Promise<boolean> => {
    if (!storeId || !deviceId) return false;

    // Converter preços de centavos para reais
    const priceInReais = (part.cash_price || part.price || 0) / 100;
    const installmentPriceInReais = (part.installment_price || part.cash_price || part.price || 0) / 100;
    
    // Converter garantia de meses para dias
    const warrantyDays = (part.warranty_months || 3) * 30;

    const payload = {
      store_id: storeId,
      device_id: deviceId,
      name: part.name || part.part_type || 'Serviço',
      category: part.part_type || 'Geral',
      price: priceInReais,
      installment_price: installmentPriceInReais,
      warranty_days: warrantyDays,
      max_installments: part.installment_count || 1,
      estimated_time_minutes: 60, // Padrão
      interest_rate: 0,
      description: budgetSequentialNumber 
        ? `Importado do orçamento #${budgetSequentialNumber}` 
        : 'Importado do sistema de orçamentos'
    };

    const { error } = await supabase.from('store_services').insert(payload);

    if (error) {
      console.error('Erro ao criar serviço:', error);
      return false;
    }

    return true;
  };

  const importBudgetParts = async (
    budget: Budget,
    parts: BudgetPart[],
    options: {
      skipDuplicates?: boolean;
      customBrandName?: string;
      customDeviceName?: string;
    } = {}
  ): Promise<ImportResult> => {
    setIsImporting(true);
    const result: ImportResult = {
      success: false,
      servicesCreated: 0,
      errors: []
    };

    try {
      // 1. Determinar nome da marca (device_type ou customizado)
      const brandName = options.customBrandName || budget.device_type;
      if (!brandName) {
        result.errors.push('Nome da marca não informado');
        return result;
      }

      // 2. Criar/encontrar marca
      const brandId = await findOrCreateBrand(brandName);
      if (!brandId) {
        result.errors.push('Não foi possível criar/encontrar a marca');
        return result;
      }
      result.brandId = brandId;

      // 3. Determinar nome do modelo (device_model ou customizado)
      const deviceName = options.customDeviceName || budget.device_model;
      if (!deviceName) {
        result.errors.push('Nome do modelo não informado');
        return result;
      }

      // 4. Criar/encontrar modelo
      const deviceId = await findOrCreateDevice(brandId, deviceName);
      if (!deviceId) {
        result.errors.push('Não foi possível criar/encontrar o modelo');
        return result;
      }
      result.deviceId = deviceId;

      // 5. Importar cada peça como serviço
      for (const part of parts) {
        const serviceName = part.name || part.part_type || 'Serviço';
        
        // Verificar duplicata
        if (options.skipDuplicates) {
          const exists = await checkServiceExists(deviceId, serviceName);
          if (exists) {
            result.errors.push(`Serviço "${serviceName}" já existe, pulando...`);
            continue;
          }
        }

        const created = await createService(deviceId, part, budget.sequential_number as number | undefined);
        if (created) {
          result.servicesCreated++;
        } else {
          result.errors.push(`Falha ao criar serviço "${serviceName}"`);
        }
      }

      result.success = result.servicesCreated > 0;
      return result;

    } catch (error) {
      console.error('Erro na importação:', error);
      result.errors.push('Erro inesperado durante a importação');
      return result;
    } finally {
      setIsImporting(false);
    }
  };

  return {
    importBudgetParts,
    findOrCreateBrand,
    findOrCreateDevice,
    checkServiceExists,
    isImporting
  };
}
