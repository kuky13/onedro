import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type OsTemplateType = 'os_receipt' | 'thermal_label';

export interface OsPdfTemplate {
  id: string;
  user_id: string | null;
  template_name: string;
  template_type: OsTemplateType;
  template_content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = 'os-pdf-templates';

export const useOsPdfTemplates = (userId: string | undefined, type?: OsTemplateType) => {
  return useQuery({
    queryKey: [QUERY_KEY, userId, type],
    queryFn: async () => {
      let query = supabase
        .from('os_pdf_templates' as any)
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      } else {
        query = query.is('user_id', null);
      }

      if (type) {
        query = query.eq('template_type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as OsPdfTemplate[];
    },
  });
};

export const useDefaultOsPdfTemplate = (userId: string | undefined, type: OsTemplateType) => {
  return useQuery({
    queryKey: [QUERY_KEY, 'default', userId, type],
    queryFn: async () => {
      let query = supabase
        .from('os_pdf_templates' as any)
        .select('*')
        .eq('is_default', true)
        .eq('template_type', type);

      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) return null;

      const templates = data as unknown as OsPdfTemplate[];
      const userDefault = templates.find(t => t.user_id === userId);
      return userDefault || templates[0];
    },
  });
};

export const useCreateOsPdfTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (template: { user_id: string; template_name: string; template_type: OsTemplateType; template_content: string; is_default: boolean }) => {
      const { data, error } = await supabase
        .from('os_pdf_templates' as any)
        .insert(template)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as OsPdfTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Template criado com sucesso!');
    },
    onError: () => toast.error('Erro ao criar template'),
  });
};

export const useUpdateOsPdfTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userId, updates }: { id: string; userId: string; updates: Partial<Pick<OsPdfTemplate, 'template_name' | 'template_content' | 'is_default'>> }) => {
      const { data, error } = await supabase
        .from('os_pdf_templates' as any)
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as OsPdfTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Template atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar template'),
  });
};

export const useDeleteOsPdfTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('os_pdf_templates' as any)
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      return { id, userId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Template excluído!');
    },
    onError: () => toast.error('Erro ao excluir template'),
  });
};
