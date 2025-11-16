import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  className, 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div 
      className={cn(
        'border-2 border-muted border-t-primary rounded-full animate-spin',
        sizeClasses[size],
        className
      )}
      style={{
        animationDuration: '1s',
        animationTimingFunction: 'linear'
      }}
    />
  );
};