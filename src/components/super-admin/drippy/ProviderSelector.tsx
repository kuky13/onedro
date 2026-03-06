import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Sparkles, Zap, Check, MessageSquare } from 'lucide-react';
import { AVAILABLE_PROVIDERS, ProviderInfo } from '@/services/drippyConfigService';
import { useState } from 'react';

interface ProviderSelectorProps {
  currentProvider: string;
  currentModel: string;
  onSelect: (provider: string, model: string) => void;
  isUpdating: boolean;
}

const providerIcons: Record<string, any> = {
  lovable: Sparkles,
  deepseek: Zap,
  gemini: Bot,
  claude: MessageSquare,
};

const providerServiceNameMap: Record<string, string[]> = {
  claude: ['claude', 'anthropic'],
  deepseek: ['deepseek'],
  gemini: ['gemini'],
};

export function ProviderSelector({
  currentProvider,
  currentModel,
  onSelect,
  isUpdating,
}: ProviderSelectorProps) {
  const [selectedProvider, setSelectedProvider] = useState(currentProvider);
  const [selectedModel, setSelectedModel] = useState(currentModel);

  const handleProviderChange = (provider: ProviderInfo) => {
    setSelectedProvider(provider.id);
    setSelectedModel(provider.models[0]?.id ?? '');
  };

  const handleApply = async () => {
    // Validar se API Key existe para providers externos
    if (selectedProvider !== 'lovable') {
      const { supabase } = await import('@/integrations/supabase/client');
      const { toast } = await import('sonner');

      const serviceNamesToCheck = providerServiceNameMap[selectedProvider] ?? [selectedProvider];

      const { data: keyMatches, error } = await supabase
        .from('api_keys')
        .select('id')
        .in('service_name', serviceNamesToCheck)
        .eq('is_active', true)
        .limit(1);

      if (error) {
        toast.error('Erro ao validar API Key', { description: error.message });
        return;
      }

      if (!keyMatches?.length) {
        const providerName = AVAILABLE_PROVIDERS.find(p => p.id === selectedProvider)?.name || selectedProvider;

        toast.error(`⚠️ Nenhuma API Key ativa encontrada para ${providerName}`, {
          description: 'Adicione uma chave na aba "API Keys" antes de ativar este provedor.',
          duration: 5000,
        });
        return;
      }
    }

    onSelect(selectedProvider, selectedModel);
  };

  const hasChanges = selectedProvider !== currentProvider || selectedModel !== currentModel;
  const currentProviderInfo = AVAILABLE_PROVIDERS.find(p => p.id === selectedProvider);

  return (
    <div className="space-y-6">
      {/* Provider Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {AVAILABLE_PROVIDERS.map((provider) => {
          const Icon = providerIcons[provider.id as keyof typeof providerIcons];
          const isActive = selectedProvider === provider.id;
          const isCurrent = currentProvider === provider.id;

          return (
            <Card
              key={provider.id}
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                isActive ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleProviderChange(provider)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Icon className="h-6 w-6" style={{ color: provider.color }} />
                  {isCurrent && (
                    <Badge variant="secondary" className="gap-1">
                      <Check className="h-3 w-3" />
                      Ativo
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg">{provider.name}</CardTitle>
                <CardDescription>{provider.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {provider.models.length} {provider.models.length === 1 ? 'modelo' : 'modelos'}{' '}
                  disponível{provider.models.length === 1 ? '' : 'is'}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Model Selection */}
      {currentProviderInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Modelo</CardTitle>
            <CardDescription>
              Escolha o modelo de IA para {currentProviderInfo.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um modelo" />
              </SelectTrigger>
              <SelectContent>
                {currentProviderInfo.models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-xs text-muted-foreground">{model.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasChanges && (
              <Button
                onClick={handleApply}
                disabled={isUpdating}
                className="w-full"
              >
                {isUpdating ? 'Aplicando...' : 'Aplicar Configuração'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
