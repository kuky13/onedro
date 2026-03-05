import { useWhatsAppConnectionStatus } from '@/hooks/useWhatsAppConnectionStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WebChat } from '@/components/whatsapp/WebChat';

export function WhatsAppAtendimento() {
  const { data: connectionStatus, isLoading } = useWhatsAppConnectionStatus();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Atendimento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Verificando conexão...</p>
        </CardContent>
      </Card>
    );
  }

  if (!connectionStatus?.connected || !connectionStatus.instance_id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Atendimento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">Você precisa conectar seu WhatsApp para atender por aqui.</p>
          <p className="text-xs text-muted-foreground">Vá na aba “Conectar” e gere um QR Code.</p>
        </CardContent>
      </Card>
    );
  }

  return <WebChat instanceName={connectionStatus.instance_id} onBack={() => {}} />;
}
