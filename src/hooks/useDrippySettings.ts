import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DrippyConfigService, DrippySettings } from '@/services/drippyConfigService';
import { toast } from 'sonner';

export function useDrippySettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error, refetch } = useQuery<DrippySettings | null>({
    queryKey: ['drippy-settings'],
    queryFn: () => DrippyConfigService.getDrippySettings(),
    staleTime: 5 * 60 * 1000,
  });

  const updateProviderMutation = useMutation({
    mutationFn: ({ provider, model, temperature, maxTokens }: {
      provider: 'deepseek' | 'gemini' | 'lovable';
      model: string;
      temperature?: number;
      maxTokens?: number;
    }) => DrippyConfigService.updateActiveProvider(provider, model, temperature, maxTokens),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Configuração atualizada com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['drippy-settings'] });
      } else {
        toast.error(result.error || 'Erro ao atualizar configuração');
      }
    },
    onError: () => {
      toast.error('Erro ao atualizar configuração');
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: (message: string) => DrippyConfigService.testConnection(message),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Teste bem-sucedido! Tempo: ${result.time}ms`);
      } else {
        toast.error(result.error || 'Falha no teste de conexão');
      }
    },
  });

  return {
    settings,
    isLoading,
    error,
    refetch,
    updateProvider: updateProviderMutation.mutate,
    isUpdating: updateProviderMutation.isPending,
    testConnection: testConnectionMutation.mutate,
    isTesting: testConnectionMutation.isPending,
    testResult: testConnectionMutation.data,
  };
}
