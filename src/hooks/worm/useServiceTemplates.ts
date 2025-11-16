import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ServiceTemplateFilters {
  deviceModel?: string;
  serviceName?: string;
}

export const useServiceTemplates = (userId: string | undefined, filters: ServiceTemplateFilters = {}) => {
  return useQuery({
    queryKey: ['service-templates', userId, filters],
    queryFn: async () => {
      if (!userId) return [];

      let query = supabase
        .from('budgets')
        .select('*')
        .eq('owner_id', userId)
        .eq('client_name', 'TEMPLATE')
        .eq('workflow_status', 'template')
        .is('deleted_at', null)
        .order('device_model')
        .order('part_quality')
        .order('cash_price');

      if (filters.deviceModel) {
        query = query.eq('device_model', filters.deviceModel);
      }

      if (filters.serviceName) {
        query = query.eq('part_quality', filters.serviceName);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

// Hook para buscar dispositivos únicos dos templates
export const useTemplateDevices = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['template-devices', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('budgets')
        .select('device_model, device_type')
        .eq('owner_id', userId)
        .eq('client_name', 'TEMPLATE')
        .eq('workflow_status', 'template')
        .is('deleted_at', null);

      if (error) throw error;

      // Agrupar dispositivos únicos
      const uniqueDevices = data?.reduce((acc: any[], curr) => {
        const exists = acc.find(
          d => d.device_model === curr.device_model && d.device_type === curr.device_type
        );
        if (!exists && curr.device_model && curr.device_type) {
          acc.push({
            device_model: curr.device_model,
            device_type: curr.device_type
          });
        }
        return acc;
      }, []) || [];

      return uniqueDevices;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
};

// Hook para buscar serviços de um dispositivo específico
export const useDeviceServices = (userId: string | undefined, deviceModel: string | undefined) => {
  return useQuery({
    queryKey: ['device-services', userId, deviceModel],
    queryFn: async () => {
      if (!userId || !deviceModel) return [];

      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('owner_id', userId)
        .eq('device_model', deviceModel)
        .eq('client_name', 'TEMPLATE')
        .eq('workflow_status', 'template')
        .is('deleted_at', null)
        .order('part_quality')
        .order('cash_price');

      if (error) throw error;

      // Agrupar por serviço (part_quality)
      const services = data?.reduce((acc: any, template) => {
        const serviceName = template.part_quality || 'Serviço';
        
        if (!acc[serviceName]) {
          acc[serviceName] = {
            serviceName,
            deviceModel: template.device_model,
            deviceType: template.device_type,
            options: []
          };
        }
        
        acc[serviceName].options.push(template);
        
        return acc;
      }, {}) || {};

      return Object.values(services);
    },
    enabled: !!userId && !!deviceModel,
    staleTime: 1000 * 60 * 5,
  });
};
