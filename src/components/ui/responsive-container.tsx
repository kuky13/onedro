import React from 'react';
import { cn } from '@/lib/utils';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';

interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Variante do container */
  variant?: 'default' | 'card' | 'section' | 'grid' | 'flex' | 'list';
  /** Padding responsivo */
  padding?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
  /** Margin responsivo */
  margin?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
  /** Gap responsivo para layouts flex/grid */
  gap?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
  /** Número de colunas para grid responsivo */
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  /** Direção do flex responsiva */
  flexDirection?: {
    mobile?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    tablet?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    desktop?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  };
  /** Altura mínima responsiva */
  minHeight?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
  /** Máxima largura responsiva */
  maxWidth?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
  /** Habilitar scroll horizontal em mobile */
  horizontalScroll?: boolean;
  /** Habilitar animações de entrada */
  animated?: boolean;
  /** Delay da animação */
  animationDelay?: number;
  /** Habilitar feedback tátil */
  interactive?: boolean;
  /** Callback para interação */
  onInteract?: () => void;
}

export const ResponsiveContainer = React.forwardRef<
  HTMLDivElement,
  ResponsiveContainerProps
>((
  {
    children,
    variant = 'default',
    padding,
    margin,
    gap,
    columns,
    flexDirection,
    minHeight,
    maxWidth,
    horizontalScroll = false,
    animated = false,
    animationDelay = 0,
    interactive = false,
    onInteract,
    className,
    onClick,
    ...props
  },
  ref
) => {
  const { isMobile, isTablet, isDesktop, deviceCapabilities } = useDeviceDetection();
  const [isVisible, setIsVisible] = React.useState(!animated);

  // Observador de interseção para animações
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    if (!animated) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), animationDelay);
        }
      },
      { threshold: 0.1 }
    );
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => observer.disconnect();
  }, [animated, animationDelay]);

  // Combinar refs
  const combinedRef = React.useCallback(
    (node: HTMLDivElement) => {
      containerRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref]
  );

  // Obter classes responsivas de padding
  const getPaddingClasses = () => {
    if (!padding) return '';
    
    const classes = [];
    if (isMobile && padding.mobile) classes.push(padding.mobile);
    else if (isTablet && padding.tablet) classes.push(padding.tablet);
    else if (isDesktop && padding.desktop) classes.push(padding.desktop);
    
    return classes.join(' ');
  };

  // Obter classes responsivas de margin
  const getMarginClasses = () => {
    if (!margin) return '';
    
    const classes = [];
    if (isMobile && margin.mobile) classes.push(margin.mobile);
    else if (isTablet && margin.tablet) classes.push(margin.tablet);
    else if (isDesktop && margin.desktop) classes.push(margin.desktop);
    
    return classes.join(' ');
  };

  // Obter classes responsivas de gap
  const getGapClasses = () => {
    if (!gap) return '';
    
    const classes = [];
    if (isMobile && gap.mobile) classes.push(gap.mobile);
    else if (isTablet && gap.tablet) classes.push(gap.tablet);
    else if (isDesktop && gap.desktop) classes.push(gap.desktop);
    
    return classes.join(' ');
  };

  // Obter classes de grid responsivo
  const getGridClasses = () => {
    if (!columns || variant !== 'grid') return '';
    
    const classes = [];
    if (isMobile && columns.mobile) {
      classes.push(`grid-cols-${columns.mobile}`);
    } else if (isTablet && columns.tablet) {
      classes.push(`md:grid-cols-${columns.tablet}`);
    } else if (isDesktop && columns.desktop) {
      classes.push(`lg:grid-cols-${columns.desktop}`);
    }
    
    return classes.join(' ');
  };

  // Obter classes de flex direction
  const getFlexDirectionClasses = () => {
    if (!flexDirection || variant !== 'flex') return '';
    
    const classes = [];
    if (isMobile && flexDirection.mobile) {
      classes.push(`flex-${flexDirection.mobile}`);
    } else if (isTablet && flexDirection.tablet) {
      classes.push(`md:flex-${flexDirection.tablet}`);
    } else if (isDesktop && flexDirection.desktop) {
      classes.push(`lg:flex-${flexDirection.desktop}`);
    }
    
    return classes.join(' ');
  };

  // Obter classes de altura mínima
  const getMinHeightClasses = () => {
    if (!minHeight) return '';
    
    const classes = [];
    if (isMobile && minHeight.mobile) classes.push(minHeight.mobile);
    else if (isTablet && minHeight.tablet) classes.push(minHeight.tablet);
    else if (isDesktop && minHeight.desktop) classes.push(minHeight.desktop);
    
    return classes.join(' ');
  };

  // Obter classes de largura máxima
  const getMaxWidthClasses = () => {
    if (!maxWidth) return '';
    
    const classes = [];
    if (isMobile && maxWidth.mobile) classes.push(maxWidth.mobile);
    else if (isTablet && maxWidth.tablet) classes.push(maxWidth.tablet);
    else if (isDesktop && maxWidth.desktop) classes.push(maxWidth.desktop);
    
    return classes.join(' ');
  };

  // Classes base por variante
  const getVariantClasses = () => {
    switch (variant) {
      case 'card':
        return cn(
          'bg-card border border-border rounded-lg shadow-sm',
          isMobile && 'rounded-xl shadow-md',
          isDesktop && 'hover:shadow-md transition-shadow duration-200'
        );
      case 'section':
        return 'w-full';
      case 'grid':
        return cn(
          'grid',
          getGridClasses(),
          getGapClasses()
        );
      case 'flex':
        return cn(
          'flex',
          getFlexDirectionClasses(),
          getGapClasses()
        );
      case 'list':
        return cn(
          'space-y-2',
          isMobile && 'space-y-3',
          horizontalScroll && isMobile && 'flex space-y-0 space-x-4 overflow-x-auto pb-4'
        );
      default:
        return '';
    }
  };

  // Manipular clique com feedback tátil
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (interactive && deviceCapabilities.hasVibration && isMobile) {
      navigator.vibrate?.(5);
    }
    
    onInteract?.();
    onClick?.(event);
  };

  // Classes finais
  const containerClasses = cn(
    // Classes base
    'transition-all duration-200 ease-in-out',
    
    // Classes de variante
    getVariantClasses(),
    
    // Classes responsivas
    getPaddingClasses(),
    getMarginClasses(),
    getMinHeightClasses(),
    getMaxWidthClasses(),
    
    // Scroll horizontal
    horizontalScroll && isMobile && [
      'overflow-x-auto',
      'scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent',
      'scroll-smooth',
    ],
    
    // Interatividade
    interactive && [
      'cursor-pointer',
      isMobile && 'active:scale-98',
      isDesktop && 'hover:scale-101',
    ],
    
    // Animações
    animated && [
      'transform transition-all duration-500',
      !isVisible && 'opacity-0 translate-y-4',
      isVisible && 'opacity-100 translate-y-0',
    ],
    
    // Otimizações para toque
    isMobile && [
      'touch-manipulation',
      interactive && 'select-none',
    ],
    
    className
  );

  return (
    <div
      ref={combinedRef}
      className={containerClasses}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  );
});

ResponsiveContainer.displayName = 'ResponsiveContainer';

// Componente especializado para cards
export const ResponsiveCard = React.forwardRef<
  HTMLDivElement,
  ResponsiveContainerProps
>((props, ref) => {
  return (
    <ResponsiveContainer
      ref={ref}
      variant="card"
      padding={{
        mobile: 'p-4',
        tablet: 'p-5',
        desktop: 'p-6'
      }}
      {...props}
    />
  );
});

ResponsiveCard.displayName = 'ResponsiveCard';

// Componente especializado para seções
export const ResponsiveSection = React.forwardRef<
  HTMLDivElement,
  ResponsiveContainerProps
>((props, ref) => {
  return (
    <ResponsiveContainer
      ref={ref}
      variant="section"
      padding={{
        mobile: 'px-4 py-6',
        tablet: 'px-6 py-8',
        desktop: 'px-8 py-10'
      }}
      {...props}
    />
  );
});

ResponsiveSection.displayName = 'ResponsiveSection';

// Componente especializado para grids responsivos
export const ResponsiveGrid = React.forwardRef<
  HTMLDivElement,
  ResponsiveContainerProps & {
    defaultColumns?: { mobile: number; tablet: number; desktop: number };
  }
>(({ defaultColumns = { mobile: 1, tablet: 2, desktop: 3 }, ...props }, ref) => {
  return (
    <ResponsiveContainer
      ref={ref}
      variant="grid"
      columns={defaultColumns}
      gap={{
        mobile: 'gap-4',
        tablet: 'gap-5',
        desktop: 'gap-6'
      }}
      {...props}
    />
  );
});

ResponsiveGrid.displayName = 'ResponsiveGrid';

// Componente especializado para listas horizontais em mobile
export const ResponsiveList = React.forwardRef<
  HTMLDivElement,
  ResponsiveContainerProps
>((props, ref) => {
  return (
    <ResponsiveContainer
      ref={ref}
      variant="list"
      horizontalScroll={true}
      {...props}
    />
  );
});

ResponsiveList.displayName = 'ResponsiveList';