import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { usePWAConfig } from '@/hooks/useAppConfig';
import { useLocation } from 'react-router-dom';
import { PWAInstallModalSimple } from '@/components/ui/PWAInstallModalSimple';
import { usePWAContext } from '@/components/PWAProvider';

export const PWAInstallPrompt: React.FC = () => {
  const { isDesktop } = useDeviceDetection();
  const { installTitle, installDescription } = usePWAConfig();
  const { 
    isInstalled, 
    isInstallable, 
    installApp
  } = usePWAContext();
  
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const device = useDeviceDetection();
  const location = useLocation();

  useEffect(() => {
    // Verificar se usuário já recusou a instalação permanentemente
    const isDismissedPermanently = localStorage.getItem('pwa-install-dismissed') === 'true';
    if (isDismissedPermanently) {
      return undefined;
    }

    // Se já está instalado, não fazer nada
    if (isInstalled) {
      setShowPrompt(false);
      return undefined;
    }

    // Para iOS, mostrar instrução após algum tempo
    if (device.isIOS && !device.isStandalone) {
      const timer = setTimeout(() => {
        if (!sessionStorage.getItem('pwa-prompt-dismissed')) {
          setShowPrompt(true);
        }
      }, 5000);

      // Mostrar novamente a cada 30 minutos
      const intervalTimer = setInterval(() => {
        if (!sessionStorage.getItem('pwa-prompt-dismissed')) {
          setShowPrompt(true);
        }
      }, 30 * 60 * 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(intervalTimer);
      };
    }

    // Para Chrome/Android, mostrar se for instalável
    if (isInstallable) {
      // Mostrar prompt após 3 segundos
      const timer = setTimeout(() => {
        const lastDismissed = sessionStorage.getItem('pwa-prompt-last-dismissed');
        const now = Date.now();

        // Mostrar se nunca foi dispensado ou se foi dispensado há mais de 1 hora
        if (!lastDismissed || (now - parseInt(lastDismissed)) > 60 * 60 * 1000) {
          setShowPrompt(true);
        }
      }, 3000);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [device.isIOS, device.isStandalone, isInstalled, isInstallable]);

  const handleInstallClick = async () => {
    try {
      const success = await installApp();
      if (success) {
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('Erro ao instalar PWA:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Salvar no localStorage que o usuário não quer instalar (permanente)
    localStorage.setItem('pwa-install-dismissed', 'true');
    sessionStorage.setItem('pwa-prompt-last-dismissed', Date.now().toString());
  };

  // Verificar se usuário recusou permanentemente
  const isDismissedPermanently = localStorage.getItem('pwa-install-dismissed') === 'true';

  // Verificar se está na página de compartilhamento
  const isSharePage = location.pathname.includes('/share/service-order/');

  // Verificar se está na página da loja pública
  const isStorePage = location.pathname.includes('/loja/');

  // Verificar se está na página de teste de dispositivo
  const isDeviceTestPage = location.pathname.startsWith('/testar/');

  // Verificar se está na página de downloads
  const isDownloadsPage = location.pathname === '/downloads';

  // Não mostrar se já estiver instalado, recusado permanentemente ou em páginas públicas especiais
  if (isInstalled || !showPrompt || isDismissedPermanently || isSharePage || isStorePage || isDeviceTestPage || isDownloadsPage) {
    return null;
  }

  // Função para iOS - abrir modal ao clicar em instalar
  const handleIOSInstallClick = () => {
    setShowIOSModal(true);
  };

  // Componente para iOS - mesmo estilo do Android
  const IOSInstallPrompt = () => (
    <>
      <Card className="fixed bottom-4 left-4 right-4 z-50 border-primary shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {installTitle}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {installDescription}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
              >
                Não
              </Button>
              <Button
                size="sm"
                onClick={handleIOSInstallClick}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Instalar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <PWAInstallModalSimple 
        open={showIOSModal} 
        onOpenChange={setShowIOSModal} 
      />
    </>
  );

  // Componente para Chrome/Android
  const AndroidInstallPrompt = () => (
    <Card className="fixed bottom-4 left-4 right-4 z-50 border-primary shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {installTitle}
              </h3>
              <p className="text-sm text-muted-foreground">
                {installDescription}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
            >
              Não
            </Button>
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Instalar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Renderizar baseado na plataforma
  if (device.isIOS) {
    return <IOSInstallPrompt />;
  }

  // Não mostrar em dispositivos desktop
  if (isDesktop) {
    return null;
  }

  return <AndroidInstallPrompt />;
};

export default PWAInstallPrompt;