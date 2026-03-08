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
    <button
      onClick={onClick}
      className={cn(
        "h-12 w-12 relative flex items-center justify-center rounded-xl",
        "touch-manipulation select-none",
        "transition-all duration-200 ease-out",
        "bg-primary/10 hover:bg-primary/20 active:scale-90",
        "focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none",
        isOpen && "bg-primary/20",
        className
      )}
      aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
      aria-expanded={isOpen}
    >
      <div className="relative w-5 h-4 flex flex-col justify-between items-center">
        <span 
          className={cn(
            "block h-[2.5px] bg-primary rounded-full",
            "transition-all duration-200 ease-out origin-center",
            isOpen ? "w-5 rotate-45 translate-y-[7px]" : "w-5"
          )}
        />
        <span 
          className={cn(
            "block w-3.5 h-[2.5px] bg-primary rounded-full",
            "transition-all duration-200 ease-out",
            isOpen ? "opacity-0 scale-x-0" : "opacity-100 scale-x-100"
          )}
        />
        <span 
          className={cn(
            "block h-[2.5px] bg-primary rounded-full",
            "transition-all duration-200 ease-out origin-center",
            isOpen ? "w-5 -rotate-45 -translate-y-[7px]" : "w-4"
          )}
        />
      </div>
    </button>
  );
};