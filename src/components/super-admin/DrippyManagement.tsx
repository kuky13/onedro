import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Brain, Settings, Key, Activity } from 'lucide-react';
import { useDrippySettings } from '@/hooks/useDrippySettings';
import { ProviderSelector } from './drippy/ProviderSelector';
import { ApiKeysManager } from './drippy/ApiKeysManager';
import { AiLogsViewer } from './drippy/AiLogsViewer';
import { DrippyConfigService } from '@/services/drippyConfigService';

export function DrippyManagement() {
  const {
    settings,
    isLoading,
    updateProvider,
    isUpdating,
  } = useDrippySettings();

  const currentProviderInfo = settings
    ? DrippyConfigService.getProviderInfo(settings.active_provider)
    : null;

  const currentModelInfo =
    settings && currentProviderInfo
      ? DrippyConfigService.getModelInfo(settings.active_provider, settings.active_model)
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            Gerenciamento Drippy IA
          </h1>
          <p className="text-muted-foreground">
            Configure o modelo de IA e as chaves API utilizadas pela Drippy
          </p>
        </div>
      </div>

      {/* Current Configuration Card */}
      {!isLoading && settings && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuração Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Provedor</div>
                <Badge
                  variant="secondary"
                  className="text-base px-3 py-1"
                  style={{ borderColor: currentProviderInfo?.color }}
                >
                  {currentProviderInfo?.name || settings.active_provider}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Modelo</div>
                <Badge variant="outline" className="text-base px-3 py-1">
                  {currentModelInfo?.name || settings.active_model}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Temperatura</div>
                <div className="text-lg font-semibold">{settings.temperature}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Max Tokens</div>
                <div className="text-lg font-semibold">{settings.max_tokens}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="provider" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="provider" className="gap-2">
            <Brain className="h-4 w-4" />
            Provedor e Modelo
          </TabsTrigger>
          <TabsTrigger value="keys" className="gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Activity className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="provider" className="space-y-6">
          {isLoading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Carregando configurações...
              </CardContent>
            </Card>
          ) : settings ? (
            <ProviderSelector
              currentProvider={settings.active_provider}
              currentModel={settings.active_model}
              onSelect={(provider, model) =>
                updateProvider({ provider: provider as any, model })
              }
              isUpdating={isUpdating}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Erro ao carregar configurações
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="keys">
          <ApiKeysManager />
        </TabsContent>

        <TabsContent value="logs">
          <AiLogsViewer />
        </TabsContent>
      </Tabs>

      {/* Information Card */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
        <CardHeader>
          <CardTitle className="text-amber-900 dark:text-amber-100">
            ⚠️ Informações Importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-amber-900 dark:text-amber-100">
          <p>
            • <strong>Segurança:</strong> As API keys nunca são expostas no frontend. Todas as
            chamadas passam pela edge function.
          </p>
          <p>
            • <strong>Lovable AI:</strong> Recomendado por ser pré-configurado e não exigir chaves
            adicionais.
          </p>
          <p>
            • <strong>Claude (Anthropic):</strong> Cadastre a chave como "anthropic" na aba API Keys.
          </p>
          <p>
            • <strong>Outros provedores:</strong> Necessitam que você cadastre as API keys
            correspondentes na tabela api_keys.
          </p>
          <p>
            • <strong>Logs:</strong> Todas as chamadas de IA (chat, WhatsApp, análise, triagem) são
            registradas automaticamente na aba Logs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
