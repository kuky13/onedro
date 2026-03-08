import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Brain, Settings, Key, Activity, AlertTriangle } from 'lucide-react';
import { useDrippySettings } from '@/hooks/useDrippySettings';
import { ProviderSelector } from './drippy/ProviderSelector';
import { ApiKeysManager } from './drippy/ApiKeysManager';
import { AiLogsViewer } from './drippy/AiLogsViewer';
import { DrippyConfigService } from '@/services/drippyConfigService';

export function DrippyManagement() {
  const { settings, isLoading, updateProvider, isUpdating } = useDrippySettings();

  const currentProviderInfo = settings
    ? DrippyConfigService.getProviderInfo(settings.active_provider)
    : null;
  const currentModelInfo =
    settings && currentProviderInfo
      ? DrippyConfigService.getModelInfo(settings.active_provider, settings.active_model)
      : null;

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl lg:text-3xl font-bold tracking-tight">Gerenciamento Drippy IA</h1>
        <p className="text-sm lg:text-base text-muted-foreground">
          Configure o modelo de IA e as chaves API utilizadas pela Drippy.
        </p>
      </div>

      {/* Current Config */}
      {!isLoading && settings && (
        <Card className="rounded-2xl border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Settings className="h-4 w-4 text-primary" />
              </div>
              Configuração Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Provedor</div>
                <Badge variant="secondary" className="text-sm px-2.5 py-0.5">
                  {currentProviderInfo?.name || settings.active_provider}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Modelo</div>
                <Badge variant="outline" className="text-sm px-2.5 py-0.5">
                  {currentModelInfo?.name || settings.active_model}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Temperatura</div>
                <div className="text-lg font-semibold">{settings.temperature}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Max Tokens</div>
                <div className="text-lg font-semibold">{settings.max_tokens}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="provider" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 rounded-xl">
          <TabsTrigger value="provider" className="gap-1.5 text-xs sm:text-sm rounded-lg">
            <Brain className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Provedor e</span> Modelo
          </TabsTrigger>
          <TabsTrigger value="keys" className="gap-1.5 text-xs sm:text-sm rounded-lg">
            <Key className="h-3.5 w-3.5" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs sm:text-sm rounded-lg">
            <Activity className="h-3.5 w-3.5" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="provider" className="space-y-4">
          {isLoading ? (
            <Card className="rounded-2xl border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                Carregando configurações...
              </CardContent>
            </Card>
          ) : settings ? (
            <ProviderSelector
              currentProvider={settings.active_provider}
              currentModel={settings.active_model}
              onSelect={(provider, model) => updateProvider({ provider: provider as any, model })}
              isUpdating={isUpdating}
            />
          ) : (
            <Card className="rounded-2xl border-border/50">
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

      {/* Info Card */}
      <Card className="rounded-2xl border-amber-200/50 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-amber-900 dark:text-amber-100">
            <AlertTriangle className="h-4 w-4" />
            Informações Importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs text-amber-800 dark:text-amber-200">
          <p>• <strong>Segurança:</strong> API keys nunca são expostas no frontend.</p>
          <p>• <strong>Lovable AI:</strong> Recomendado — pré-configurado, sem chaves adicionais.</p>
          <p>• <strong>Claude:</strong> Cadastre a chave como "anthropic" na aba API Keys.</p>
          <p>• <strong>Logs:</strong> Todas as chamadas de IA são registradas automaticamente.</p>
        </CardContent>
      </Card>
    </div>
  );
}
