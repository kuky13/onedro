import React from 'react';
import { cn } from '@/lib/utils';
import { HamsterLoader } from '@/components/ui/hamster-loader';

interface UnifiedSpinnerProps {
  /** Mensagem mostrada abaixo do hamster */
  message?: string;
  /** Ocupa a tela inteira, igual /hamster */
  fullScreen?: boolean;
  /** Tamanho do hamster */
  size?: 'sm' | 'md' | 'lg';
  /** Altura mínima opcional (para cards, seções) */
  minHeightClassName?: string;
  className?: string;
}

/**
 * Spinner padrão da aplicação: mesmo layout e estilo da tela /hamster.
 */
export const UnifiedSpinner: React.FC<UnifiedSpinnerProps> = ({
  message = 'Carregando...',
  fullScreen = false,
  size = 'md',
  minHeightClassName,
  className
}) => {
  const containerClasses = cn(
    fullScreen && 'min-h-[100dvh] bg-background flex items-center justify-center',
    !fullScreen && 'flex items-center justify-center',
    minHeightClassName,
    className
  );

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="flex items-center justify-center">
          <HamsterLoader size={size} />
        </div>
        {message && (
          <p className="text-sm text-muted-foreground font-medium text-center w-full">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default UnifiedSpinner;
