import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
      className={cn("relative h-10 w-10", className)}
      aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
    >
      <div className="flex flex-col items-center justify-center gap-1.5">
        <span
          className={cn(
            "block h-0.5 w-5 bg-foreground transition-all duration-300",
            isOpen && "translate-y-2 rotate-45"
          )}
        />
        <span
          className={cn(
            "block h-0.5 w-5 bg-foreground transition-all duration-300",
            isOpen && "opacity-0"
          )}
        />
        <span
          className={cn(
            "block h-0.5 w-5 bg-foreground transition-all duration-300",
            isOpen && "-translate-y-2 -rotate-45"
          )}
        />
      </div>
    </Button>
  );
};