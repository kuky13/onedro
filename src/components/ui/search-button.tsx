import React, { forwardRef, useState, useEffect } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SearchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  showClear?: boolean;
  onClear?: () => void;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  isMobile?: boolean;
  hapticFeedback?: boolean;
}

export const SearchButton = forwardRef<HTMLButtonElement, SearchButtonProps>(
  ({
    className,
    variant = 'default',
    size = 'md',
    isLoading = false,
    showClear = false,
    onClear,
    icon,
    children,
    isMobile = false,
    hapticFeedback = true,
    ...props
  }, ref) => {
    const [isIOS, setIsIOS] = useState(false);
    const [isPressed, setIsPressed] = useState(false);

    useEffect(() => {
      setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    }, []);
    const handleTouchStart = () => {
      setIsPressed(true);
      if (hapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    };

    const handleTouchEnd = () => {
      setIsPressed(false);
    };

    const baseClasses = cn(
      'inline-flex items-center justify-center rounded-md text-sm font-medium',
      'transition-all duration-200 ease-in-out transform',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:pointer-events-none',
      'active:scale-95 hover:scale-[1.02]',
      // iOS specific optimizations
      isIOS && 'select-none',
      isPressed && 'scale-95',
      className
    );

    const variants = {
      default: cn(
        'bg-primary text-primary-foreground hover:bg-primary/90',
        'shadow-sm hover:shadow-md transition-shadow duration-200'
      ),
      ghost: cn(
        'hover:bg-accent hover:text-accent-foreground',
        'hover:shadow-sm transition-all duration-200'
      ),
      outline: cn(
        'border border-input hover:bg-accent hover:text-accent-foreground',
        'hover:border-accent-foreground/20 hover:shadow-sm transition-all duration-200'
      ),
      secondary: cn(
        'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        'shadow-sm hover:shadow-md transition-all duration-200'
      ),
    };

    const sizes = {
      sm: cn(
        'h-8 px-3 text-xs',
        isMobile && 'h-10 px-4 text-sm min-w-[44px]' // iOS minimum touch target
      ),
      md: cn(
        'h-10 px-4 py-2',
        isMobile && 'h-12 px-6 text-base min-w-[44px]'
      ),
      lg: cn(
        'h-12 px-6 text-base',
        isMobile && 'h-14 px-8 text-lg min-w-[44px]'
      ),
    };

    const iconSizes = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    };

    const renderIcon = () => {
      if (isLoading) {
        return <Loader2 className={cn('animate-spin', iconSizes[size])} />;
      }
      if (icon) {
        return React.cloneElement(icon as React.ReactElement, {
          className: cn(iconSizes[size], (icon as React.ReactElement).props?.className)
        });
      }
      return <Search className={iconSizes[size]} />;
    };

    return (
      <div className="relative inline-flex">
        <button
          className={cn(baseClasses, variants[variant], sizes[size])}
          ref={ref}
          disabled={isLoading}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          style={{
            touchAction: 'manipulation',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            WebkitTouchCallout: 'none',
            fontSize: isIOS && isMobile ? '16px' : undefined, // Prevent zoom on iOS
          }}
          {...props}
        >
          <span className="flex items-center justify-center">
            {isLoading ? (
              <Loader2 className={cn(
                'animate-spin',
                size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
              )} />
            ) : icon ? (
              <span className={cn(
                'flex items-center justify-center',
                size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
              )}>
                {icon}
              </span>
            ) : (
              <Search className={cn(
                size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
              )} />
            )}
            {children && (
              <span className={cn(
                'ml-2 transition-opacity duration-200',
                isLoading && 'opacity-70'
              )}>
                {children}
              </span>
            )}
          </span>
        </button>
        
        {showClear && onClear && (
          <button
            onClick={onClear}
            className={cn(
              'absolute -top-1 -right-1 rounded-full bg-destructive text-destructive-foreground',
              'flex items-center justify-center hover:bg-destructive/90',
              'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-1',
              'active:scale-90 hover:scale-110',
              size === 'sm' ? 'h-4 w-4 text-xs' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'
            )}
            style={{
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <X className={cn(
              size === 'sm' ? 'h-2 w-2' : size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'
            )} />
          </button>
        )}
      </div>
    );
  }
);

SearchButton.displayName = 'SearchButton';

export { SearchButton };