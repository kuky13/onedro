import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';

interface MobileHamburgerButtonProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

export const MobileHamburgerButton = ({
  isOpen,
  onClick,
  className
}: MobileHamburgerButtonProps) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn("h-10 w-10", className)}
      aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
    >
      {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </Button>
  );


























};