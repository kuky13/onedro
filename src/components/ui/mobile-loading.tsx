import { cn } from '@/lib/utils';
import { UnifiedSpinner } from './UnifiedSpinner';

interface MobileLoadingProps {
  message?: string;
  className?: string;
}

export const MobileLoading = ({ message = 'Carregando...', className }: MobileLoadingProps) => {
  return (
    <div
      className={cn(
        'min-h-screen flex items-center justify-center bg-background p-4',
        className
      )}
    >
      <div className="w-full max-w-sm mx-auto">
        <UnifiedSpinner message={message} className="w-full" />
      </div>
    </div>
  );
};