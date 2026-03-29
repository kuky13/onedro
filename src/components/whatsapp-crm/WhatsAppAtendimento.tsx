import { useWhatsAppConnectionStatus } from '@/hooks/useWhatsAppConnectionStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WebChat } from '@/components/whatsapp/WebChat';
import { Loader2, QrCode } from 'lucide-react';

export function WhatsAppAtendimento() {
  const { data: connectionStatus, isLoading } = useWhatsAppConnectionStatus({ pollMs: 10000 });

  if (isLoading) {
    return (
      <div className=”flex items-center justify-center py-20”>
        <Loader2 className=”h-6 w-6 animate-spin text-muted-foreground” />
      </div>
    );
  }

  // Mostrar WebChat se tiver instance_id — mesmo que status ainda não seja “open”
  // (Evolution pode estar conectado mas o DB ainda não atualizou via webhook)
  if (!connectionStatus?.instance_id) {
    return (
      <Card className=”max-w-md mx-auto mt-8”>
        <CardHeader>
          <CardTitle className=”flex items-center gap-2”>
            <QrCode className=”h-5 w-5 text-muted-foreground” />
            WhatsApp não conectado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className=”text-sm text-muted-foreground”>
            Vá na aba <strong>Conectar</strong> acima e escaneie o QR Code para vincular seu WhatsApp.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <WebChat instanceName={connectionStatus.instance_id} onBack={() => {}} />;
}
