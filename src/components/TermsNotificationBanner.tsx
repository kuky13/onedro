import { Shield, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface TermsNotificationBannerProps {
  onAccept: () => void;
  onDismiss: () => void;
  declined?: boolean;
}

export const TermsNotificationBanner = ({ onAccept, onDismiss, declined }: TermsNotificationBannerProps) => {
  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] sm:left-auto sm:right-4 sm:max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-2xl border border-border/60 bg-card/95 backdrop-blur-lg shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm font-semibold leading-tight text-foreground">
                Aceite os termos para continuar
              </h2>
              <button
                onClick={onDismiss}
                className="text-muted-foreground hover:text-foreground transition-colors -mt-0.5"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Para criar uma conta, aceite nossos{' '}
              <Link to="/terms" className="text-primary hover:underline">Termos de Uso</Link>,{' '}
              <Link to="/privacy" className="text-primary hover:underline">Privacidade</Link>{' '}
              e{' '}
              <Link to="/cookies" className="text-primary hover:underline">Cookies</Link>.
            </p>
            {declined && (
              <p className="text-xs text-destructive mt-1">
                Você recusou anteriormente. Aceite para poder criar sua conta.
              </p>
            )}
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="flex-1 h-8 text-xs" onClick={onAccept}>
                Aceitar
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onDismiss}>
                Depois
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
