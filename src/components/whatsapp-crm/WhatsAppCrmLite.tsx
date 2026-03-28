import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConversationsHub } from './ConversationsHub';
import { SettingsManager } from './SettingsManager';
import { WebhookEventsViewer } from './WebhookEventsViewer';
import { WhatsAppConnector } from './WhatsAppConnector';
import { IAConfigManager } from './IAConfigManager';
import { AnalyticsDashboard } from './AnalyticsDashboard';

export function WhatsAppCrmLite() {
  return (
    <div className="p-4 space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground">WhatsApp CRM</h2>
        <p className="text-sm text-muted-foreground">Gerencie modelos, conversas e auditoria do WhatsApp.</p>
      </header>

      <Tabs defaultValue="connector" className="w-full">
        <TabsList className="w-full justify-start flex-wrap">
          <TabsTrigger value="connector">Conectar</TabsTrigger>
          <TabsTrigger value="conversations">Atendimento</TabsTrigger>
          <TabsTrigger value="ia-config">Personalizar IA</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="events">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="connector" className="mt-4">
          <WhatsAppConnector />
        </TabsContent>

        <TabsContent value="conversations" className="mt-4">
          <ConversationsHub />
        </TabsContent>

        <TabsContent value="ia-config" className="mt-4">
          <IAConfigManager />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <SettingsManager />
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <WebhookEventsViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
