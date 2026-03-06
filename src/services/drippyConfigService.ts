import { supabase } from '@/integrations/supabase/client';

export interface DrippySettings {
  id: string;
  active_provider: 'lovable' | 'deepseek' | 'gemini' | 'claude';
  active_model: string;
  temperature: number;
  max_tokens: number;
  updated_at: string;
  updated_by: string | null;
}

export interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  models: { id: string; name: string; description: string }[];
  color: string;
}

export const AVAILABLE_PROVIDERS: ProviderInfo[] = [
  {
    id: 'lovable',
    name: 'Lovable AI',
    description: 'Gateway para Gemini e GPT-5 (Recomendado)',
    models: [
      { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)', description: 'Mais recente, rápido (Recomendado)' },
      { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)', description: 'Próxima geração, máxima qualidade' },
      { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Equilibrado e rápido' },
      { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Alta qualidade' },
      { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Ultra rápido e econômico' },
      { id: 'openai/gpt-5', name: 'GPT-5', description: 'Máxima qualidade OpenAI' },
      { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', description: 'Rápido e eficiente' },
      { id: 'openai/gpt-5-nano', name: 'GPT-5 Nano', description: 'Ultra rápido e barato' },
      { id: 'openai/gpt-5.2', name: 'GPT-5.2', description: 'Mais recente OpenAI, raciocínio avançado' },
    ],
    color: 'hsl(var(--primary))',
  },
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    description: 'API direta Anthropic Claude',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Mais recente, equilíbrio performance/custo' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Máxima qualidade e raciocínio' },
      { id: 'claude-3-7-sonnet-latest', name: 'Claude 3.7 Sonnet', description: 'Raciocínio avançado' },
      { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku', description: 'Ultra rápido e barato' },
    ],
    color: 'hsl(25, 95%, 53%)',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'API direta DeepSeek',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3', description: 'Modelo principal, conversação e código' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1', description: 'Raciocínio avançado (chain-of-thought)' },
    ],
    color: 'hsl(142, 76%, 36%)',
  },
  {
    id: 'gemini',
    name: 'Gemini Direct',
    description: 'API direta Google Gemini',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Rápido e eficiente' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Alta performance' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Estável e rápido' },
    ],
    color: 'hsl(217, 91%, 60%)',
  },
];

export class DrippyConfigService {
  static async getDrippySettings(): Promise<DrippySettings | null> {
    try {
      const { data, error } = await supabase
        .from('drippy_settings')
        .select('*')
        .single();

      if (error) {
        console.error('Error fetching drippy settings:', error);
        return null;
      }

      return data as unknown as DrippySettings;
    } catch (error) {
      console.error('Exception fetching drippy settings:', error);
      return null;
    }
  }

  static async updateActiveProvider(
    provider: DrippySettings['active_provider'],
    model: string,
    temperature?: number,
    maxTokens?: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      const settings = await this.getDrippySettings();
      if (!settings?.id) {
        return { success: false, error: 'Configurações não encontradas' };
      }

      const updates: Partial<DrippySettings> & { active_provider: DrippySettings['active_provider']; active_model: string } = {
        active_provider: provider,
        active_model: model,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        ...(temperature !== undefined ? { temperature } : {}),
        ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
      };

      const { error } = await supabase
        .from('drippy_settings')
        .update(updates)
        .eq('id', settings.id);

      if (error) {
        console.error('Error updating drippy settings:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception updating drippy settings:', error);
      return { success: false, error: 'Erro ao atualizar configurações' };
    }
  }

  static async testConnection(message: string): Promise<{ success: boolean; response?: string; error?: string; time?: number }> {
    try {
      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: { 
          message,
          conversation_id: 'drippy-test-' + Date.now()
        }
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (error) {
        return { success: false, error: error.message, time: responseTime };
      }

      return { 
        success: true, 
        response: data?.response || data?.message || 'Conexão estabelecida com sucesso!',
        time: responseTime
      };
    } catch (error) {
      console.error('Exception testing connection:', error);
      return { success: false, error: 'Erro ao testar conexão' };
    }
  }

  static getProviderInfo(providerId: string): ProviderInfo | undefined {
    return AVAILABLE_PROVIDERS.find(p => p.id === providerId);
  }

  static getModelInfo(providerId: string, modelId: string) {
    const provider = this.getProviderInfo(providerId);
    return provider?.models.find(m => m.id === modelId);
  }
}
