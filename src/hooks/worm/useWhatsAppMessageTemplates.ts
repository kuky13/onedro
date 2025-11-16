import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WhatsAppTemplate {
  id: string;
  user_id: string;
  template_name: string;
  message_template: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Template padrão global solicitado (com placeholders dinâmicos e blocos de qualidades)
export const GLOBAL_DEFAULT_TEMPLATE = `📱 *{nome_empresa}* 

*Aparelho:* {modelo_dispositivo} 
*Serviço:* {nome_reparo} 

{qualidades_inicio}*{qualidade_nome}* – {peca_garantia_meses} meses de garantia 
💰 À vista {peca_preco_vista} ou {peca_preco_parcelado} no cartão em {peca_parcelas}x de {peca_valor_parcela} 

{qualidades_fim} 
*📦 Serviços Inclusos:* 
{servicos_inclusos} 

🚫 Não cobre danos por água ou molhado 

📝 *Observações:* 
{observacoes} 

📅 Válido até: {data_validade}`;

// Template com placeholders (mantido para uso futuro quando desejado)
const DEFAULT_TEMPLATE = `📱{nome_empresa}

*Aparelho:* {aparelho}
*Serviço:* {nome_reparo}

{detalhes_pecas}

*Serviços Adicionais:*
{servicos_inclusos}

*🛡️ Garantia até {garantia_meses} meses*
🚫 Não cobre danos por água ou quedas

📝 *OBSERVAÇÕES*
{observacoes}

📅 Válido até: {data_validade}`;

// Hook para buscar templates do usuário
export const useWhatsAppTemplates = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['whatsapp-templates', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('whatsapp_message_templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WhatsAppTemplate[];
    },
    enabled: !!userId,
  });
};

// Hook para buscar template padrão
export const useDefaultTemplate = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['whatsapp-default-template', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('whatsapp_message_templates')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as WhatsAppTemplate | null;
    },
    enabled: !!userId,
  });
};

// Hook para criar template
export const useCreateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<WhatsAppTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      // Verificar limite de 1 template por usuário
      const { data: existingTemplates, error: countError } = await supabase
        .from('whatsapp_message_templates')
        .select('id')
        .eq('user_id', template.user_id);

      if (countError) throw countError;
      
      if (existingTemplates && existingTemplates.length >= 1) {
        throw new Error('Limite de 1 template por usuário atingido');
      }

      // Se for definir como padrão, primeiro remover is_default de outros
      if (template.is_default) {
        await supabase
          .from('whatsapp_message_templates')
          .update({ is_default: false })
          .eq('user_id', template.user_id);
      }

      const { data, error } = await supabase
        .from('whatsapp_message_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onError: (error: any) => {
      if (error.message === 'Limite de 1 template por usuário atingido') {
        toast.error('Você já tem um template. Edite o existente ou exclua-o para criar um novo.');
      } else {
        toast.error('Erro ao criar template');
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates', data.user_id] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-default-template', data.user_id] });
      toast.success('Template criado com sucesso!');
    }
  });
};

// Hook para atualizar template
export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId, updates }: { 
      id: string; 
      userId: string;
      updates: Partial<Omit<WhatsAppTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>> 
    }) => {
      // Se for definir como padrão, primeiro remover is_default de outros
      if (updates.is_default === true) {
        await supabase
          .from('whatsapp_message_templates')
          .update({ is_default: false })
          .eq('user_id', userId);
      }

      const { data, error } = await supabase
        .from('whatsapp_message_templates')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates', data.user_id] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-default-template', data.user_id] });
      toast.success('Template atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating template:', error);
      toast.error('Erro ao atualizar template');
    },
  });
};

// Hook para deletar template
export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('whatsapp_message_templates')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return { id, userId };
    },
    onSuccess: (variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-default-template', variables.userId] });
      toast.success('Template excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting template:', error);
      toast.error('Erro ao excluir template');
    },
  });
};

// Hook para criar template padrão automático se não existir
export const useEnsureDefaultTemplate = (userId: string | undefined) => {
  const createTemplate = useCreateTemplate();

  return useMutation({
    mutationFn: async () => {
      if (!userId) return null;

      // Verificar se já existe um template padrão
      const { data: existing } = await supabase
        .from('whatsapp_message_templates')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single();

      if (existing) {
        // Atualizar para o template global caso esteja diferente
        if (existing.message_template !== GLOBAL_DEFAULT_TEMPLATE) {
          const { data, error } = await supabase
            .from('whatsapp_message_templates')
            .update({ message_template: GLOBAL_DEFAULT_TEMPLATE })
            .eq('id', existing.id)
            .eq('user_id', userId)
            .select()
            .single();
          if (error) throw error;
          return data;
        }
        return existing;
      }

      // Criar template padrão
      return createTemplate.mutateAsync({
        user_id: userId,
        template_name: 'Template Padrão',
        message_template: GLOBAL_DEFAULT_TEMPLATE,
        is_default: true,
      });
    },
  });
};

// Hook para resetar o template padrão do usuário para o DEFAULT_TEMPLATE
export const useResetDefaultTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!userId) return null;

      // Buscar template padrão existente
      const { data: existingDefault } = await supabase
        .from('whatsapp_message_templates')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .maybeSingle();

      if (existingDefault) {
        // Atualizar conteúdo do template padrão
        const { data, error } = await supabase
          .from('whatsapp_message_templates')
          .update({ message_template: GLOBAL_DEFAULT_TEMPLATE })
          .eq('id', existingDefault.id)
          .eq('user_id', userId)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      // Se não existir, criar um novo como padrão
      const { data, error } = await supabase
        .from('whatsapp_message_templates')
        .insert({
          user_id: userId,
          template_name: 'Template Padrão',
          message_template: GLOBAL_DEFAULT_TEMPLATE,
          is_default: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates', data.user_id] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-default-template', data.user_id] });
      toast.success('Template padrão restaurado com sucesso!');
    },
    onError: (error) => {
      console.error('Error resetting default template:', error);
      toast.error('Erro ao restaurar template padrão');
    },
  });
};
