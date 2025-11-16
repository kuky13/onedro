import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, CheckCircle, Loader2, Monitor } from 'lucide-react';
import { usePWASimple } from '@/hooks/usePWASimple';
import { PWAInstallModalSimple } from './PWAInstallModalSimple';
import { cn } from '@/lib/utils';

export interface PWAInstallButtonSimpleProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'md' | 'lg' | 'default';
  className?: string;
  children?: React.ReactNode;
  showText?: boolean;
}

export const PWAInstallButtonSimple: React.FC<PWAInstallButtonSimpleProps> = ({
  variant = 'default',
  size = 'sm',
  className,
  children,
  showText = true
}) => {
  const [showModal, setShowModal] = useState(false);
  const { isInstalled, isInstalling, canInstall, platform } = usePWASimple();

  const getButtonIcon = () => {
    if (isInstalling) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (isInstalled) return <CheckCircle className="h-4 w-4" />;
    
    switch (platform) {
      case 'android':
      case 'ios':
        return <Smartphone className="h-4 w-4" />;
      case 'desktop':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  const getButtonText = () => {
    if (isInstalling) return 'Instalando...';
    if (isInstalled) return 'App Instalado';
    return children || 'Baixar App';
  };

  const getButtonVariant = () => {
    if (isInstalled) return 'secondary';
    return variant;
  };

  const handleClick = () => {
    setShowModal(true);
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant={getButtonVariant()}
        size={size}
        disabled={isInstalling}
        className={cn(
          "flex items-center gap-2 transition-all duration-200",
          canInstall && !isInstalled && "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0",
          isInstalled && "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
          "hover:scale-105 hover:shadow-md",
          className
        )}
      >
        {getButtonIcon()}
        {showText && (
          <span className="font-medium">{getButtonText()}</span>
        )}
      </Button>
      
      <PWAInstallModalSimple 
        open={showModal} 
        onOpenChange={setShowModal}
      />
    </>
  );
};