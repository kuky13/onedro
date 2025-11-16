import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  MessageCircle, 
  Share, 
  Mail, 
  Copy, 
  ExternalLink,
  Smartphone,
  X,
  Check
} from 'lucide-react';

export interface ShareOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  action: () => void | Promise<void>;
  description?: string;
  isPreferred?: boolean;
  isAvailable?: boolean;
}

export interface ShareSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  options: ShareOption[];
  className?: string;
}

export const ShareSelector: React.FC<ShareSelectorProps> = ({
  isOpen,
  onClose,
  title = "Compartilhar Orçamento",
  description = "Escolha como deseja compartilhar este orçamento",
  options,
  className
}) => {
  const [isSharing, setIsSharing] = useState<string | null>(null);
  const [sharedOptions, setSharedOptions] = useState<Set<string>>(new Set());

  const handleShare = async (option: ShareOption) => {
    if (isSharing) return;
    
    setIsSharing(option.id);
    
    try {
      await option.action();
      setSharedOptions(prev => new Set([...prev, option.id]));
      
      // Auto-close after successful share (except for copy actions)
      if (!option.id.includes('copy')) {
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    } finally {
      setIsSharing(null);
    }
  };

  if (!isOpen) return null;

  const preferredOptions = options.filter(opt => opt.isPreferred && opt.isAvailable !== false);
  const regularOptions = options.filter(opt => !opt.isPreferred && opt.isAvailable !== false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 animate-in fade-in-0 duration-200">
      <div className={cn(
        "bg-background rounded-t-3xl w-full max-w-md mx-4 mb-0",
        "animate-in slide-in-from-bottom-4 duration-300",
        "shadow-2xl border-t border-border",
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full hover:bg-muted/80"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Preferred Options */}
          {preferredOptions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 bg-primary rounded-full" />
                <span className="text-xs font-medium text-primary uppercase tracking-wide">
                  Recomendado
                </span>
              </div>
              {preferredOptions.map((option) => (
                <ShareOptionButton
                  key={option.id}
                  option={option}
                  isSharing={isSharing === option.id}
                  isShared={sharedOptions.has(option.id)}
                  onShare={handleShare}
                  isPreferred
                />
              ))}
            </div>
          )}

          {/* Regular Options */}
          {regularOptions.length > 0 && (
            <div className="space-y-3">
              {preferredOptions.length > 0 && (
                <div className="flex items-center gap-2 mt-6">
                  <div className="h-1 w-1 bg-muted-foreground rounded-full" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Outras opções
                  </span>
                </div>
              )}
              {regularOptions.map((option) => (
                <ShareOptionButton
                  key={option.id}
                  option={option}
                  isSharing={isSharing === option.id}
                  isShared={sharedOptions.has(option.id)}
                  onShare={handleShare}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full h-12 rounded-xl"
            disabled={!!isSharing}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
};

interface ShareOptionButtonProps {
  option: ShareOption;
  isSharing: boolean;
  isShared: boolean;
  onShare: (option: ShareOption) => void;
  isPreferred?: boolean;
}

const ShareOptionButton: React.FC<ShareOptionButtonProps> = ({
  option,
  isSharing,
  isShared,
  onShare,
  isPreferred = false
}) => {
  return (
    <button
      onClick={() => onShare(option)}
      disabled={isSharing}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200",
        "hover:bg-muted/50 active:scale-[0.98] disabled:opacity-50",
        "border border-border/50 hover:border-border",
        isPreferred && "bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/30",
        isShared && "bg-success/10 border-success/30"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "flex items-center justify-center w-12 h-12 rounded-xl transition-colors",
        isPreferred ? "bg-primary/10" : "bg-muted/50",
        isShared && "bg-success/20"
      )}>
        {isSharing ? (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" />
        ) : isShared ? (
          <Check className="h-5 w-5 text-success" />
        ) : (
          <div className={cn(
            "transition-colors",
            isPreferred ? "text-primary" : "text-muted-foreground"
          )}>
            {option.icon}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-medium transition-colors",
            isPreferred ? "text-primary" : "text-foreground",
            isShared && "text-success"
          )}>
            {option.name}
          </span>
          {isPreferred && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
              Recomendado
            </span>
          )}
        </div>
        {option.description && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {option.description}
          </p>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center">
        {isShared && (
          <span className="text-xs text-success font-medium">
            Compartilhado
          </span>
        )}
        {!isSharing && !isShared && (
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </button>
  );
};

export default ShareSelector;