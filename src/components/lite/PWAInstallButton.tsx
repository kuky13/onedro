import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, CheckCircle, Sparkles, Loader2 } from 'lucide-react';
import { usePWASimple } from '@/hooks/usePWASimple';
import { PWAInstallModalSimple } from '@/components/ui/PWAInstallModalSimple';
import { cn } from '@/lib/utils';

export const PWAInstallButton: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const { isInstalled, canInstall, isInstalling, platform } = usePWASimple();

  const handleClick = () => {
    setShowModal(true);
  };

  const getButtonIcon = () => {
    if (isInstalling) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (isInstalled) return <CheckCircle className="h-4 w-4" />;
    if (platform === 'android' || platform === 'ios') return <Smartphone className="h-4 w-4" />;
    return <Download className="h-4 w-4" />;
  };

  const getButtonText = () => {
    if (isInstalling) return 'Instalando...';
    if (isInstalled) return 'App Instalado';
    return 'Baixar App';
  };

  const getButtonVariant = () => {
    if (isInstalled) return 'secondary' as const;
    return 'default' as const;
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant={getButtonVariant()}
        size="sm"
        disabled={isInstalling}
        className={cn(
          "flex items-center gap-2 transition-all duration-200",
          canInstall && !isInstalled && "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0",
          isInstalled && "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
          "hover:scale-105 hover:shadow-md"
        )}
      >
        {getButtonIcon()}
        <span className="font-medium">{getButtonText()}</span>
        {canInstall && !isInstalled && !isInstalling && (
          <Sparkles className="h-3 w-3 animate-pulse" />
        )}
      </Button>
      
      <PWAInstallModalSimple 
        open={showModal} 
        onOpenChange={setShowModal} 
      />
    </>
  );
};
