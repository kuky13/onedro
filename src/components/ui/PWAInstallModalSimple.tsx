import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Smartphone, Monitor, CheckCircle, Loader2, Share, ChevronDown, ChevronUp, X, Apple, Chrome, Zap, Shield, Wifi, Bell, Star, ArrowDown } from 'lucide-react';
import { usePWASimple, type InstallResult } from '@/hooks/usePWASimple';
import { cn } from '@/lib/utils';
interface PWAInstallModalSimpleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstallComplete?: () => void;
}
export const PWAInstallModalSimple: React.FC<PWAInstallModalSimpleProps> = ({
  open,
  onOpenChange,
  onInstallComplete
}) => {
  const [showInstructions, setShowInstructions] = useState(false);
  const {
    isInstalled,
    isInstalling,
    platform,
    canInstall,
    promptAvailable,
    installApp,
    getInstallInstructions
  } = usePWASimple();
  const handleInstall = async () => {
    const result = await installApp();
    if (result.requiresInstructions) {
      setShowInstructions(true);
    }
    if (!result.requiresInstructions && result.success) {
      // Fechar modal após instalação bem-sucedida
      setTimeout(() => onOpenChange(false), 1500);
      onInstallComplete?.();
    }
  };
  const getInstallStatusMessage = () => {
    if (isInstalled) return 'App já instalado';
    if (promptAvailable) return 'Pronto para instalar';
    return 'Pronto para instalar';
  };
  const getInstallStatusDescription = () => {
    if (isInstalled) return 'One Drip está instalado no seu dispositivo';
    if (promptAvailable) return 'Tenha acesso rápido e offline ao One Drip';
    return 'Tenha acesso rápido e offline ao One Drip';
  };
  const getPlatformBadge = () => {
    switch (platform) {
      case 'android':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1 px-2 py-1 text-xs">
            <Chrome className="h-3 w-3" />
            <span className="hidden sm:inline">Android</span>
          </Badge>;
      case 'ios':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1 px-2 py-1 text-xs">
            <Apple className="h-3 w-3" />
            <span className="hidden sm:inline">iOS</span>
          </Badge>;
      case 'desktop':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200 flex items-center gap-1 px-2 py-1 text-xs">
            <Monitor className="h-3 w-3" />
            <span className="hidden sm:inline">Desktop</span>
          </Badge>;
      default:
        return null;
    }
  };
  const getDeviceIcon = () => {
    switch (platform) {
      case 'android':
        return <Chrome className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />;
      case 'ios':
        return <Apple className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />;
      case 'desktop':
        return <Monitor className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />;
      default:
        return <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />;
    }
  };
  const instructions = getInstallInstructions();
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs sm:max-w-sm md:max-w-md w-full mx-2 sm:mx-4 p-0 overflow-hidden rounded-xl sm:rounded-2xl border-0 shadow-lg sm:shadow-2xl max-h-[90vh] overflow-y-auto bg-background">
        {/* Header moderno com gradiente usando a cor do dashboard */}
        <div className="relative bg-gradient-to-br from-[#fec832] via-[#f5b800] to-[#e6a600] p-4 sm:p-6 text-black overflow-hidden">
          {/* Efeito de brilho sutil removido para melhor performance */}
          
          <DialogHeader className="relative z-10">
            <DialogTitle className="flex items-center justify-between text-black">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                {getDeviceIcon()}
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-lg font-bold truncate">Instalar One Drip</h2>
                  <p className="text-xs text-black/80 font-normal hidden sm:block">App nativo para seu dispositivo</p>
                </div>
              </div>
              {getPlatformBadge()}
            </DialogTitle>
          </DialogHeader>
          
          {/* Decoração geométrica simplificada */}
          <div className="absolute -top-4 -right-4 w-16 sm:w-20 h-16 sm:h-20 bg-white/15 rounded-full blur-xl" />
          <div className="absolute -bottom-2 -left-2 w-12 sm:w-16 h-12 sm:h-16 bg-white/10 rounded-full blur-lg" />
        </div>
        
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 bg-background">
          {/* Status card moderno */}
          <div className={cn("relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-colors duration-200", "shadow-sm", isInstalled ? "bg-background border-green-500/30" : "bg-gradient-to-r from-[#fec832]/10 to-[#f5b800]/10 border-[#fec832]/30")}>
            <div className={cn("flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center", isInstalled ? "bg-green-500/20 text-green-400" : "bg-[#fec832]/20 text-[#e6a600]")}>
              {isInstalled ? <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" /> : <Download className="h-5 w-5 sm:h-6 sm:w-6" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{getInstallStatusMessage()}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{getInstallStatusDescription()}</p>
            </div>
            
            {/* Indicador de status */}
            <div className={cn("w-3 h-3 rounded-full flex-shrink-0", isInstalled ? "bg-green-400" : "bg-[#fec832]")} />
          </div>

          {/* Botão de instalação principal */}
          {!isInstalled && <Button onClick={handleInstall} disabled={isInstalling} className={cn("w-full h-12 sm:h-14 text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl transition-colors duration-200", "bg-gradient-to-r from-[#fec832] to-[#f5b800] hover:from-[#e6b52e] hover:to-[#e6a600]", "text-black border-0 shadow-md hover:shadow-lg", "disabled:opacity-70")}>
              {isInstalling ? <div className="flex items-center gap-2 sm:gap-3">
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  <span>Instalando...</span>
                </div> : <div className="flex items-center gap-2 sm:gap-3">
                  <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>{promptAvailable ? 'Instalar App' : 'Baixar App'}</span>
                </div>}
            </Button>}

          {/* Seção de instruções melhorada */}
          {instructions && showInstructions && <div className="bg-card border border-border rounded-lg sm:rounded-xl p-4 sm:p-5 space-y-3 sm:space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#fec832]/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Share className="h-4 w-4 sm:h-5 sm:w-5 text-[#e6a600]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-sm truncate">{instructions.title}</h4>
                    <p className="text-xs text-muted-foreground hidden sm:block">Siga os passos abaixo</p>
                  </div>
                </div>
                <Button onClick={() => setShowInstructions(false)} variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-muted flex-shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                {instructions.steps.map((step, index) => <div key={index} className="flex items-start gap-2 sm:gap-3">
                    <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-[#fec832] to-[#f5b800] text-black rounded-full text-xs flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{step}</p>
                  </div>)}
              </div>
            </div>}

          {/* Toggle para instruções */}
          {instructions && !showInstructions && !isInstalled && <Button onClick={() => setShowInstructions(true)} variant="outline" className="w-full justify-between h-10 sm:h-12 rounded-lg sm:rounded-xl border-2 hover:bg-muted transition-colors duration-200">
              <span className="font-medium text-sm text-white">Ver instruções de instalação</span>
              <ChevronDown className="h-4 w-4 text-white" />
            </Button>}

          {/* Lista de benefícios redesenhada */}
          <div className="bg-card border border-border rounded-lg sm:rounded-xl p-4 sm:p-5 shadow-sm">
            <h4 className="font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#fec832]/20 rounded-full flex items-center justify-center">
                <Star className="h-3 w-3 sm:h-4 sm:w-4 text-[#e6a600]" />
              </div>
              <span className="text-sm sm:text-base">Benefícios do App</span>
            </h4>
            
            <div className="grid grid-cols-1 gap-2 sm:gap-3">
              
              
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-card/50 rounded-lg border border-border/30">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#fec832]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-[#e6a600]" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-foreground">Carregamento mais rápido</span>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-card/50 rounded-lg border border-border/30">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Smartphone className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-foreground">Ícone na tela inicial</span>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-card/50 rounded-lg border border-border/30">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bell className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-foreground">Notificações em tempo real</span>
              </div>
            </div>
          </div>

          {/* Botão de fechar se já instalado */}
          {isInstalled && <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full h-10 sm:h-12 rounded-lg sm:rounded-xl border-2 font-medium hover:bg-muted transition-colors duration-200">
              Fechar
            </Button>}
        </div>
      </DialogContent>
    </Dialog>;
};