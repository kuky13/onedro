import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellOff, 
  Smartphone, 
  Settings, 
  Shield, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/useToast';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { motion } from 'framer-motion';

interface PermissionStatusProps {
  permission: NotificationPermission;
  isSupported: boolean;
}

const PermissionStatus: React.FC<PermissionStatusProps> = ({ permission, isSupported }) => {
  if (!isSupported) {
    return (
      <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800 dark:text-orange-200">
          Seu navegador não suporta notificações push. Considere atualizar para uma versão mais recente.
        </AlertDescription>
      </Alert>
    );
  }

  switch (permission) {
    case 'granted':
      return (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Notificações habilitadas. Você receberá notificações push neste dispositivo.
          </AlertDescription>
        </Alert>
      );
    case 'denied':
      return (
        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            Notificações bloqueadas. Para receber notificações, você precisa habilitar nas configurações do navegador.
          </AlertDescription>
        </Alert>
      );
    default:
      return (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Clique em "Habilitar Notificações" para receber notificações push neste dispositivo.
          </AlertDescription>
        </Alert>
      );
  }
};

interface DeviceInfoProps {
  userAgent: string;
}

const DeviceInfo: React.FC<DeviceInfoProps> = ({ userAgent }) => {
  const getDeviceInfo = () => {
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isChrome = /Chrome/i.test(userAgent);
    const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);
    const isFirefox = /Firefox/i.test(userAgent);

    let deviceType = 'Desktop';
    let browserName = 'Desconhecido';
    let supportLevel = 'full';

    if (isAndroid) deviceType = 'Android';
    if (isIOS) deviceType = 'iOS';

    if (isChrome) browserName = 'Chrome';
    if (isSafari) browserName = 'Safari';
    if (isFirefox) browserName = 'Firefox';

    // iOS Safari tem suporte limitado
    if (isIOS && isSafari) {
      supportLevel = 'limited';
    }

    return { deviceType, browserName, supportLevel };
  };

  const { deviceType, browserName, supportLevel } = getDeviceInfo();

  const getSupportBadge = () => {
    switch (supportLevel) {
      case 'full':
        return <Badge variant="default" className="bg-green-100 text-green-800">Suporte Completo</Badge>;
      case 'limited':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Suporte Limitado</Badge>;
      default:
        return <Badge variant="destructive">Sem Suporte</Badge>;
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center space-x-3">
        <Smartphone className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="font-medium text-sm">{deviceType} • {browserName}</p>
          <p className="text-xs text-muted-foreground">Dispositivo atual</p>
        </div>
      </div>
      {getSupportBadge()}
    </div>
  );
};

interface SubscriptionItemProps {
  subscription: any;
  onUnsubscribe: (id: string) => void;
  isLoading: boolean;
}

const SubscriptionItem: React.FC<SubscriptionItemProps> = ({ subscription, onUnsubscribe, isLoading }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDeviceIcon = (userAgent: string) => {
    if (/Android/i.test(userAgent)) return '📱';
    if (/iPhone|iPad|iPod/i.test(userAgent)) return '📱';
    return '💻';
  };

  const getDeviceName = (userAgent: string) => {
    if (/Android/i.test(userAgent)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
    if (/Windows/i.test(userAgent)) return 'Windows';
    if (/Mac/i.test(userAgent)) return 'macOS';
    return 'Dispositivo';
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center space-x-3">
        <span className="text-2xl">{getDeviceIcon(subscription.user_agent || '')}</span>
        <div>
          <p className="font-medium">{getDeviceName(subscription.user_agent || '')}</p>
          <p className="text-sm text-muted-foreground">
            Registrado em {formatDate(subscription.created_at)}
          </p>
          {subscription.last_used && (
            <p className="text-xs text-muted-foreground">
              Último uso: {formatDate(subscription.last_used)}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Badge variant={subscription.is_active ? "default" : "secondary"}>
          {subscription.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUnsubscribe(subscription.id)}
          disabled={isLoading}
        >
          {isLoading ? (
            <LoadingSpinner className="h-4 w-4" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

export const NotificationSettings: React.FC = () => {
  const {
    permission,
    isSubscribed,
    isLoading,
    userSubscriptions,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
    loadUserSubscriptions
  } = usePushNotifications();

  const { showSuccess, showError } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isTestLoading, setIsTestLoading] = useState(false);

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window);
  }, []);

  const handleEnableNotifications = async () => {
    try {
      const granted = await requestPermission();
      if (granted) {
        await subscribe();
        showSuccess({ title: 'Notificações habilitadas com sucesso!' });
      }
    } catch (error) {
      console.error('Erro ao habilitar notificações:', error);
      showError({ title: 'Erro ao habilitar notificações. Tente novamente.' });
    }
  };

  const handleDisableNotifications = async () => {
    try {
      await unsubscribe();
      showSuccess({ title: 'Notificações desabilitadas com sucesso!' });
    } catch (error) {
      console.error('Erro ao desabilitar notificações:', error);
      showError({ title: 'Erro ao desabilitar notificações. Tente novamente.' });
    }
  };

  const handleSendTest = async () => {
    setIsTestLoading(true);
    try {
      await sendTestNotification();
      showSuccess({ title: 'Notificação de teste enviada!' });
    } catch (error) {
      console.error('Erro ao enviar teste:', error);
      showError({ title: 'Erro ao enviar notificação de teste.' });
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleUnsubscribeDevice = async (subscriptionId: string) => {
    try {
      // Aqui você implementaria a lógica para remover uma subscription específica
      // Por enquanto, vamos usar a função unsubscribe geral
      await unsubscribe();
      await loadUserSubscriptions();
      showSuccess({ title: 'Dispositivo removido com sucesso!' });
    } catch (error) {
      console.error('Erro ao remover dispositivo:', error);
      showError({ title: 'Erro ao remover dispositivo.' });
    }
  };

  const handleRefreshSubscriptions = async () => {
    try {
      await loadUserSubscriptions();
      showSuccess({ title: 'Lista de dispositivos atualizada!' });
    } catch (error) {
      console.error('Erro ao atualizar lista:', error);
      showError({ title: 'Erro ao atualizar lista de dispositivos.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center space-x-3 mb-2">
          <Bell className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Configurações de Notificação</h2>
        </div>
        <p className="text-muted-foreground">
          Gerencie como você recebe notificações push do OneDrip
        </p>
      </motion.div>

      {/* Status das Permissões */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Status das Notificações
            </CardTitle>
            <CardDescription>
              Verifique o status atual das notificações push neste dispositivo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PermissionStatus permission={permission} isSupported={isSupported} />
            
            {isSupported && (
              <DeviceInfo userAgent={navigator.userAgent} />
            )}

            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="notifications"
                  checked={isSubscribed}
                  disabled={!isSupported || permission === 'denied' || isLoading}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleEnableNotifications();
                    } else {
                      handleDisableNotifications();
                    }
                  }}
                />
                <Label htmlFor="notifications" className="font-medium">
                  Receber notificações push
                </Label>
              </div>

              {isSubscribed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendTest}
                  disabled={isTestLoading}
                >
                  {isTestLoading ? (
                    <>
                      <LoadingSpinner className="mr-2 h-4 w-4" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Bell className="mr-2 h-4 w-4" />
                      Testar
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Dispositivos Registrados */}
      {isSubscribed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Smartphone className="mr-2 h-5 w-5" />
                    Dispositivos Registrados
                  </CardTitle>
                  <CardDescription>
                    Gerencie os dispositivos que recebem suas notificações
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshSubscriptions}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <LoadingSpinner className="h-4 w-4" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userSubscriptions && userSubscriptions.length > 0 ? (
                  userSubscriptions.map((subscription) => (
                    <SubscriptionItem
                      key={subscription.id}
                      subscription={subscription}
                      onUnsubscribe={handleUnsubscribeDevice}
                      isLoading={isLoading}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum dispositivo registrado</p>
                    <p className="text-sm">Habilite as notificações para ver seus dispositivos</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Informações Adicionais */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="mr-2 h-5 w-5" />
              Sobre as Notificações Push
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              • As notificações push funcionam mesmo quando o OneDrip não está aberto
            </p>
            <p>
              • Você pode desabilitar as notificações a qualquer momento
            </p>
            <p>
              • No iOS Safari, as notificações só funcionam se o OneDrip for adicionado à tela inicial
            </p>
            <p>
              • Suas preferências são sincronizadas entre todos os seus dispositivos
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};