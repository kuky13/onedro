import { useQuery } from '@tanstack/react-query'
import { ApiKeyService } from '@/services/apiKeyService'

/**
 * Hook to fetch API keys from Supabase
 * Only works for authenticated users
 */
export function useDeepSeekApiKey() {
  return useQuery({
    queryKey: ['deepseek-api-key'],
    queryFn: () => ApiKeyService.getDeepSeekApiKey(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}