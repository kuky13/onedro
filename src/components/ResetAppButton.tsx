import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import { cleanupAuthState, forceReload } from '@/utils/authCleanup';

interface ResetAppButtonProps {
  variant?: 'ghost' | 'outline' | 'destructive';
  size?: 'sm' | 'default';
  className?: string;
}

export function ResetAppButton({ variant = 'ghost', size = 'sm', className = '' }: ResetAppButtonProps) {
  const [isResetting, setIsResetting] = useState(false);

  const handleFullReset = () => {
    setIsResetting(true);
    cleanupAuthState();
    forceReload(1500);
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={`text-xs text-muted-foreground hover:text-destructive flex items-center gap-2 ${className}`}
      onClick={handleFullReset}
      disabled={isResetting}
    >
      <RefreshCcw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
      Limpar Cookies e Resetar App
    </Button>
  );
}
