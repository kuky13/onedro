import React from 'react';
import { HamsterLoader } from '@/components/ui/hamster-loader';
import { cn } from '@/lib/utils';

interface InlineSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Spinner compacto para uso dentro de botões, labels e linhas de lista.
 * Mantém o visual do hamster, mas sem mensagem e com layout inline.
 */
export const InlineSpinner: React.FC<InlineSpinnerProps> = ({ size = 'sm', className }) => {
  return (
    <span className={cn('inline-flex items-center justify-center align-middle', className)}>
      <HamsterLoader size={size} />
    </span>
  );
};

export default InlineSpinner;
