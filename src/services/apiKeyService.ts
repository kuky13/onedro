import { supabase } from '@/integrations/supabase/client'

/**
 * Service to fetch API keys from Supabase
 * Only authenticated users can access this service
 */
export class ApiKeyService {
  /**
   * Get API key for a specific service
   * @param serviceName - Name of the service (e.g., 'deepseek')
   * @returns API key or null if not found/inactive
   */
  static async getApiKey(serviceName: string): Promise<string | null> {
    try {
      console.log(`Fetching API key for service: ${serviceName}`)
      
      // First try direct query as fallback
      const { data: directData, error: directError } = await supabase
        .from('api_keys')
        .select('api_key')
        .eq('service_name', serviceName)
        .eq('is_active', true)
        .single()

      console.log(`Direct query - Data:`, directData, 'Error:', directError)

      if (directData?.api_key) {
        return directData.api_key
      }

      // Try RPC function
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_api_key', { service_name: serviceName })

      console.log(`RPC Response - Data:`, rpcData, 'Error:', rpcError)

      if (rpcData) {
        return rpcData
      }

      if (rpcError) {
        console.error(`RPC Error fetching API key for ${serviceName}:`, rpcError)
      }

      return null
    } catch (error) {
      console.error(`Exception fetching API key for ${serviceName}:`, error)
      return null
    }
  }

  /**
   * Get DeepSeek API key
   * @returns DeepSeek API key or null if not found/inactive
   */
  static async getDeepSeekApiKey(): Promise<string | null> {
    return this.getApiKey('deepseek')
  }
}