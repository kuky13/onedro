import React from 'react';
import { Button, ButtonProps } from './button';
import { cn } from '@/lib/utils';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { Loader2 } from 'lucide-react';

interface ResponsiveButtonProps extends ButtonProps {
  /** Texto do botão para dispositivos móveis (opcional) */
  mobileText?: string;
  /** Ícone do botão */
  icon?: React.ReactNode;
  /** Posição do ícone */
  iconPosition?: 'left' | 'right';
  /** Estado de carregamento */
  isLoading?: boolean;
  /** Texto durante carregamento */
  loadingText?: string;
  /** Feedback tátil em dispositivos móveis */
  hapticFeedback?: boolean;
  /** Tooltip para desktop */
  tooltip?: string;
  /** Variante responsiva baseada no dispositivo */
  responsiveVariant?: {
    mobile?: ButtonProps['variant'];
    tablet?: ButtonProps['variant'];
    desktop?: ButtonProps['variant'];
  };
  /** Tamanho responsivo baseado no dispositivo */
  responsiveSize?: {
    mobile?: ButtonProps['size'];
    tablet?: ButtonProps['size'];
    desktop?: ButtonProps['size'];
  };
}

export const ResponsiveButton = React.forwardRef<
  HTMLButtonElement,
  ResponsiveButtonProps
>((
  {
    children,
    mobileText,
    icon,
    iconPosition = 'left',
    isLoading = false,
    loadingText = 'Carregando...',
    hapticFeedback = true,
    tooltip,
    responsiveVariant,
    responsiveSize,
    className,
    onClick,
    disabled,
    variant,
    size,
    ...props
  },
  ref
) => {
  const { isMobile, isTablet, isDesktop, deviceCapabilities } = useDeviceDetection();

  // Determinar variante responsiva
  const getResponsiveVariant = () => {
    if (responsiveVariant) {
      if (isMobile && responsiveVariant.mobile) return responsiveVariant.mobile;
      if (isTablet && responsiveVariant.tablet) return responsiveVariant.tablet;
      if (isDesktop && responsiveVariant.desktop) return responsiveVariant.desktop;
    }
    return variant;
  };

  // Determinar tamanho responsivo
  const getResponsiveSize = () => {
    if (responsiveSize) {
      if (isMobile && responsiveSize.mobile) return responsiveSize.mobile;
      if (isTablet && responsiveSize.tablet) return responsiveSize.tablet;
      if (isDesktop && responsiveSize.desktop) return responsiveSize.desktop;
    }
    
    // Tamanhos padrão baseados no dispositivo
    if (isMobile) return size || 'lg';
    if (isTablet) return size || 'default';
    return size || 'default';
  };

  // Texto do botão baseado no dispositivo
  const getButtonText = () => {
    if (isLoading) return loadingText;
    if (isMobile && mobileText) return mobileText;
    return children;
  };

  // Feedback tátil para dispositivos móveis
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (hapticFeedback && deviceCapabilities.hasVibration && isMobile) {
      // Vibração leve para feedback tátil
      navigator.vibrate?.(10);
    }
    
    onClick?.(event);
  };

  // Classes responsivas
  const responsiveClasses = cn(
    // Classes base
    'transition-all duration-200 ease-in-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    
    // Classes para mobile
    isMobile && [
      'min-h-[44px]', // Altura mínima para toque
      'px-6 py-3',
      'text-base font-medium',
      'active:scale-95', // Feedback visual no toque
      'touch-manipulation', // Otimização para toque
    ],
    
    // Classes para tablet
    isTablet && [
      'min-h-[40px]',
      'px-5 py-2.5',
      'text-sm font-medium',
    ],
    
    // Classes para desktop
    isDesktop && [
      'min-h-[36px]',
      'px-4 py-2',
      'text-sm',
      'hover:scale-105', // Efeito hover sutil
    ],
    
    // Estado de carregamento
    isLoading && 'cursor-not-allowed opacity-70',
    
    className
  );

  const buttonContent = (
    <>
      {isLoading && (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      )}
      {!isLoading && icon && iconPosition === 'left' && (
        <span className="mr-2 flex-shrink-0">{icon}</span>
      )}
      <span className="truncate">{getButtonText()}</span>
      {!isLoading && icon && iconPosition === 'right' && (
        <span className="ml-2 flex-shrink-0">{icon}</span>
      )}
    </>
  );

  const button = (
    <Button
      ref={ref}
      variant={getResponsiveVariant()}
      size={getResponsiveSize()}
      className={responsiveClasses}
      onClick={handleClick}
      disabled={disabled || isLoading}
      {...props}
    >
      {buttonContent}
    </Button>
  );

  // Adicionar tooltip apenas em desktop
  if (tooltip && isDesktop) {
    return (
      <div className="group relative inline-block">
        {button}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    );
  }

  return button;
});

ResponsiveButton.displayName = 'ResponsiveButton';

// Componente especializado para botões de ação
export const ActionButton = React.forwardRef<
  HTMLButtonElement,
  ResponsiveButtonProps & {
    action: 'primary' | 'secondary' | 'danger' | 'success';
  }
>(({ action, ...props }, ref) => {
  const actionVariants = {
    primary: { mobile: 'default', tablet: 'default', desktop: 'default' },
    secondary: { mobile: 'outline', tablet: 'outline', desktop: 'outline' },
    danger: { mobile: 'destructive', tablet: 'destructive', desktop: 'destructive' },
    success: { mobile: 'default', tablet: 'default', desktop: 'default' },
  };

  return (
    <ResponsiveButton
      ref={ref}
      responsiveVariant={actionVariants[action]}
      {...props}
    />
  );
});

ActionButton.displayName = 'ActionButton';

// Componente especializado para botões de navegação
export const NavigationButton = React.forwardRef<
  HTMLButtonElement,
  ResponsiveButtonProps
>((props, ref) => {
  return (
    <ResponsiveButton
      ref={ref}
      responsiveVariant={{
        mobile: 'ghost',
        tablet: 'ghost',
        desktop: 'ghost'
      }}
      responsiveSize={{
        mobile: 'lg',
        tablet: 'default',
        desktop: 'sm'
      }}
      {...props}
    />
  );
});

NavigationButton.displayName = 'NavigationButton';

// Componente especializado para botões flutuantes (FAB)
export const FloatingActionButton = React.forwardRef<
  HTMLButtonElement,
  ResponsiveButtonProps
>((props, ref) => {
  const { isMobile } = useDeviceDetection();
  
  return (
    <ResponsiveButton
      ref={ref}
      variant="default"
      className={cn(
        'rounded-full shadow-lg hover:shadow-xl',
        isMobile ? 'h-14 w-14' : 'h-12 w-12',
        'fixed bottom-6 right-6 z-50',
        props.className
      )}
      {...props}
    />
  );
});

FloatingActionButton.displayName = 'FloatingActionButton';