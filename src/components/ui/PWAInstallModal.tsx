import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Share, 
  Plus, 
  Smartphone, 
  Monitor, 
  Tablet,
  CheckCircle,
  ExternalLink,
  Copy,
  Bell,
  RefreshCw,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Chrome,
  Globe
} from 'lucide-react';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { usePWAEnhanced } from '@/hooks/usePWAEnhanced';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface PWAInstallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  open,
  onOpenChange
}) => {
  const device = useDeviceDetection();
  const { showInfo, showError, showWarning } = useToast();
  const [showTutorial, setShowTutorial] = useState(false);
  const {
    isInstalled,
    isInstallable,
    isLoading,
    platform,
    canShare,
    supportsNotifications,
    installApp,
    shareApp,
    showInstallInstructions,
    requestNotificationPermission,
    resetPWAInstallState,
    forceStateRefresh
  } = usePWAEnhanced();

  const handleInstall = async () => {
    if (isInstallable) {
      const success = await installApp();
      // Removido o fechamento automático para permitir que o usuário veja o resultado
      // e escolha quando fechar o modal
    } else {
      showInstallInstructions();
    }
  };

  // Nova função que sempre tenta mostrar o popup nativo com melhor tratamento de erro
  const handleNativeInstall = async () => {
    console.log('[PWAInstallModal] Tentando instalação nativa...', {
      isInstallable,
      platform,
      isInstalled
    });

    if (isInstalled) {
      showInfo({
        title: 'App já instalado!',
        description: 'O OneDrip já está instalado no seu dispositivo.'
      });
      return;
    }

    if (!isInstallable) {
      console.log('[PWAInstallModal] InstallPrompt não disponível');
      
      if (platform === 'android') {
        showWarning({
          title: 'Popup não disponível',
          description: 'O popup de instalação foi rejeitado anteriormente. Opções: 1) Use o botão "Resetar Configurações" abaixo, 2) Limpe os dados do site: Chrome &gt; Configurações &gt; Privacidade &gt; Limpar dados de navegação &gt; Dados do site, 3) Use o menu Chrome (⋮) &gt; "Instalar app".',
          duration: 15000
        });
      } else if (platform === 'ios') {
        showInfo({
          title: 'Instalação no iOS',
          description: 'No iOS, use o botão de compartilhar do Safari e selecione "Adicionar à Tela Inicial". Se não aparecer a opção, limpe o cache do Safari nas configurações do iOS.',
          duration: 10000
        });
      } else {
        showInfo({
          title: 'Instalação manual',
          description: 'Use o ícone de instalação na barra de endereços ou limpe os dados do site nas configurações do navegador para resetar as permissões de instalação.',
          duration: 10000
        });
      }
      return;
    }

    try {
      const success = await installApp();
      if (!success) {
        showError({
          title: 'Instalação cancelada',
          description: 'A instalação foi cancelada. Você pode tentar novamente quando quiser.'
        });
      }
    } catch (error) {
      console.error('[PWAInstallModal] Erro na instalação:', error);
      showError({
        title: 'Erro na instalação',
        description: 'Ocorreu um erro durante a instalação. Tente usar o menu do navegador para instalar o app.'
      });
    }
  };

  const handleShare = async () => {
    await shareApp();
  };

  const handleNotifications = async () => {
    await requestNotificationPermission();
  };

  const handleResetPWAState = async () => {
    try {
      // Mostrar feedback de carregamento
      showInfo({
        title: 'Resetando configurações...',
        description: 'Limpando dados salvos e verificando novamente o estado de instalação.',
        duration: 3000
      });

      const success = await resetPWAInstallState();
      
      if (success) {
        // Forçar atualização do estado sem recarregar a página
        await forceStateRefresh();
        
        // Mostrar feedback de sucesso
        showInfo({
          title: 'Configurações resetadas!',
          description: 'Tente usar o botão "Instalação automática" novamente. Se o popup não aparecer, use as instruções manuais.',
          duration: 8000
        });
      }
    } catch (error) {
      console.error('[PWAInstallModal] Erro ao resetar estado:', error);
      showError({
        title: 'Erro no reset',
        description: 'Não foi possível resetar completamente. Tente recarregar a página manualmente.'
      });
    }
  };

  // Auto-executar instalação no Android quando o modal abrir
  useEffect(() => {
    if (open && platform === 'android' && isInstallable && !isLoading) {
      // Pequeno delay para garantir que o modal seja renderizado
      const timer = setTimeout(() => {
        handleInstall();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [open, platform, isInstallable, isLoading]);

  const getDeviceIcon = () => {
    if (device.isMobile) return <Smartphone className="h-5 w-5" />;
    if (device.isTablet) return <Tablet className="h-5 w-5" />;
    return <Monitor className="h-5 w-5" />;
  };

  const getPlatformBadge = () => {
    switch (platform) {
      case 'ios':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700">iOS</Badge>;
      case 'android':
        return <Badge variant="secondary" className="bg-green-100 text-green-700">Android</Badge>;
      case 'standalone':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-700">Instalado</Badge>;
      default:
        return <Badge variant="secondary" className="bg-gray-100 text-gray-700">Web</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-w-lg w-full mx-4",
        showTutorial && "max-w-2xl",
        "max-h-[90vh] overflow-hidden flex flex-col"
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getDeviceIcon()}
            Instalar OneDrip
            {getPlatformBadge()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Status atual */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            {isInstalled ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">App já está instalado</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">
                  {isInstallable ? 'Pronto para instalar' : 'Instalação manual disponível'}
                </span>
              </>
            )}
          </div>

          {/* Opções de instalação */}
          <div className="space-y-3">

            {/* Adicionar à tela inicial (iOS) */}
            {device.isIOS && (
              <Button
                onClick={showInstallInstructions}
                variant="outline"
                className="w-full justify-start gap-3 h-auto p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Plus className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Adicionar à Tela Inicial</div>
                    <div className="text-xs text-muted-foreground">
                      Acesso rápido via Safari
                    </div>
                  </div>
                </div>
              </Button>
            )}

            <Separator />

            {/* Compartilhar */}
            {canShare && (
              <Button
                onClick={handleShare}
                variant="outline"
                className="w-full justify-start gap-3 h-auto p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Share className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Compartilhar App</div>
                    <div className="text-xs text-muted-foreground">
                      Enviar para amigos e colegas
                    </div>
                  </div>
                </div>
              </Button>
            )}

            {/* Notificações */}
            {supportsNotifications && (
              <Button
                onClick={handleNotifications}
                variant="outline"
                className="w-full justify-start gap-3 h-auto p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Bell className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Ativar Notificações</div>
                    <div className="text-xs text-muted-foreground">
                      Receber atualizações importantes
                    </div>
                  </div>
                </div>
              </Button>
            )}

            {/* Resetar configurações PWA */}
            {!isInstallable && !isInstalled && (
              <>
                <Separator />
                <Button
                  onClick={handleResetPWAState}
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto p-4 border-red-200 hover:bg-red-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 rounded-lg">
                      <RotateCcw className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-red-700">Resetar Configurações</div>
                      <div className="text-xs text-red-600">
                        Limpar dados salvos e tentar novamente
                      </div>
                    </div>
                  </div>
                </Button>
              </>
            )}
          </div>

          {/* Benefícios */}
          <div className="p-3 bg-black rounded-lg border">
            <h4 className="font-medium text-sm mb-2 text-white">Benefícios do App:</h4>
            <ul className="text-xs space-y-1 text-white">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Acesso offline aos seus dados
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Carregamento mais rápido
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Ícone na tela inicial
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Experiência nativa
              </li>
            </ul>
          </div>

          {/* Tutorial de Instalação Manual */}
          <div className="border rounded-lg overflow-hidden">
            <Button
              onClick={() => setShowTutorial(!showTutorial)}
              variant="ghost"
              className="w-full justify-between p-4 h-auto hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Tutorial de Instalação Manual</div>
                  <div className="text-xs text-muted-foreground">
                    Instruções passo a passo para cada navegador
                  </div>
                </div>
              </div>
              {showTutorial ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {showTutorial && (
              <div className="p-4 pt-0 space-y-4 border-t bg-muted/20">
                {/* Chrome/Edge Desktop */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Chrome className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">Chrome/Edge (Desktop)</span>
                  </div>
                  <ol className="text-xs space-y-1 ml-6 text-muted-foreground">
                    <li>1. Clique nos 3 pontos (⋮) no canto superior direito</li>
                    <li>2. Selecione "Instalar OneDrip" ou "Adicionar à tela inicial"</li>
                    <li>3. Confirme a instalação</li>
                  </ol>
                </div>

                <Separator />

                {/* Safari iOS */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Share className="h-4 w-4 text-gray-600" />
                    <span className="font-medium text-sm">Safari (iOS)</span>
                  </div>
                  <ol className="text-xs space-y-1 ml-6 text-muted-foreground">
                    <li>1. Toque no ícone de compartilhar (□↗)</li>
                    <li>2. Role para baixo e toque em "Adicionar à Tela de Início"</li>
                    <li>3. Toque em "Adicionar"</li>
                  </ol>
                </div>

                <Separator />

                {/* Chrome Android */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-sm">Chrome (Android)</span>
                  </div>
                  <ol className="text-xs space-y-1 ml-6 text-muted-foreground">
                    <li>1. Toque nos 3 pontos (⋮) no menu</li>
                    <li>2. Selecione "Adicionar à tela inicial"</li>
                    <li>3. Confirme tocando em "Adicionar"</li>
                  </ol>
                </div>

                <Separator />

                {/* Firefox Desktop */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-sm">Firefox (Desktop)</span>
                  </div>
                  <ol className="text-xs space-y-1 ml-6 text-muted-foreground">
                    <li>1. Clique no ícone de casa com + na barra de endereços</li>
                    <li>2. Ou vá em Menu &gt; Instalar aplicativo</li>
                  </ol>
                </div>

                <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                  💡 <strong>Dica:</strong> Se não conseguir instalar, tente limpar os dados do navegador ou usar o botão "Resetar Configurações" acima.
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};