import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PdfTemplate {
    id: string;
    user_id: string;
    template_name: string;
    service_section_template: string;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export const DEFAULT_PDF_SERVICE_TEMPLATE = `{nome_empresa} 
{num_or} 
{telefone_contato} 
Aparelho:{modelo_dispositivo} 
Serviço: {nome_reparo} 

{qualidades_inicio}{qualidade_nome} – {peca_garantia_meses} meses de garantia 
À vista {peca_preco_vista} ou {peca_preco_parcelado} no cartão em até {peca_parcelas}x de {peca_valor_parcela} no cartão 

{qualidades_fim} 
Observações: {observacoes} 

Valido até {data_validade}`;

export const usePdfTemplates = (userId: string | undefined) => {
    return useQuery({
        queryKey: ['pdf-templates', userId],
        queryFn: async () => {
            // Note: We allow userId to be undefined for pure global fetch, but usually we want both
            let query = supabase
                .from('pdf_templates')
                .select('*')
                .order('created_at', { ascending: false });

            if (userId) {
                // Fetch user templates OR global templates
                query = query.or(`user_id.eq.${userId},user_id.is.null`);
            } else {
                query = query.is('user_id', null);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data as PdfTemplate[];
        },
        enabled: true, // Always enabled to at least fetch global templates
    });
};

export const useDefaultPdfTemplate = (userId: string | undefined) => {
    return useQuery({
        queryKey: ['pdf-default-template', userId],
        queryFn: async () => {
            // Fetch default templates (user's or global)
            let query = supabase
                .from('pdf_templates')
                .select('*')
                .eq('is_default', true);

            if (userId) {
                query = query.or(`user_id.eq.${userId},user_id.is.null`);
            } else {
                query = query.is('user_id', null);
            }

            const { data, error } = await query;

            if (error) throw error;

            if (!data || data.length === 0) return null;

            // Prioritize user's own default template
            const templates = data as PdfTemplate[];
            const userDefault = templates.find(t => t.user_id === userId);
            return (userDefault || templates[0]) as PdfTemplate;
        },
        // Remove enabled check so it can fetch global default even without user
    });
};

export const useCreatePdfTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (template: Omit<PdfTemplate, 'id' | 'created_at' | 'updated_at'>) => {
            // DB Trigger handles setting other defaults to false now.
            const { data, error } = await supabase
                .from('pdf_templates')
                .insert(template)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data: any) => {
            const uId = data.user_id;
            if (uId) {
                queryClient.invalidateQueries({ queryKey: ['pdf-templates', uId] });
                queryClient.invalidateQueries({ queryKey: ['pdf-default-template', uId] });
            }
            toast.success('Template PDF criado com sucesso!');
        },
        onError: (error: any) => {
            console.error('Error creating PDF template:', error);
            toast.error('Erro ao criar template PDF');
        }
    });
};

export const useUpdatePdfTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, userId, updates }: {
            id: string;
            userId: string;
            updates: Partial<Omit<PdfTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
        }) => {
            // DB Trigger handles setting other defaults to false now.

            const { data, error } = await supabase
                .from('pdf_templates')
                .update(updates)
                .eq('id', id)
                .eq('user_id', userId) // Security: ensure owning user
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['pdf-templates', data.user_id] });
            queryClient.invalidateQueries({ queryKey: ['pdf-default-template', data.user_id] });
            toast.success('Template PDF atualizado com sucesso!');
        },
        onError: (error: any) => {
            console.error('Error updating PDF template:', error);
            toast.error('Erro ao atualizar template PDF');
        },
    });
};

export const useDeletePdfTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
            const { error } = await supabase
                .from('pdf_templates')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;
            return { id, userId };
        },
        onSuccess: (variables: any) => {
            queryClient.invalidateQueries({ queryKey: ['pdf-templates', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['pdf-default-template', variables.userId] });
            toast.success('Template PDF excluído com sucesso!');
        },
        onError: (error: any) => {
            console.error('Error deleting PDF template:', error);
            toast.error('Erro ao excluir template PDF');
        },
    });
};

export const useEnsureDefaultPdfTemplate = (userId: string | undefined) => {
    // This hook is now largely redundant if the DB has a global default,
    // but we can keep it to ensure a User Copy is created if preferred, 
    // OR just return null/noop since we rely on fallback.
    // For now, let's keep it but make it check for effective default.

    // Actually, if we use global default, we don't NEED to create a user row.
    // Let's degrade this to a no-op or just return true.
    // To minimize friction, let's just leave it as a mutation that does nothing if a default exists (local or global).
    // But since the signature expects a mutation...

    const createTemplate = useCreatePdfTemplate();
    const { data: currentDefault } = useDefaultPdfTemplate(userId);

    return useMutation({
        mutationFn: async () => {
            if (!userId) return null;
            if (currentDefault) return currentDefault;

            // If absolutely no default (not even global?), then create.
            // But we inserted global in migration. So this should rarely trigger unless migration failed.
            return createTemplate.mutateAsync({
                user_id: userId,
                template_name: 'Template Padrão',
                service_section_template: DEFAULT_PDF_SERVICE_TEMPLATE,
                is_default: true,
            });
        },
    });
};
