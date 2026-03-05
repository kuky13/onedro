/**
 * Componente UpdatePopup
 * OneDrip - Popup informativo para exibir atualizações no dashboard
 * Otimizado para dispositivos móveis e telas menores
 */

import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Info } from 'lucide-react';
import { usePopupState } from '@/hooks/usePopupState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface UpdatePopupProps {
  className?: string;
}

export const UpdatePopup: React.FC<UpdatePopupProps> = ({ className = '' }) => {
  const { popupState, dismissPopup, hidePopup, clearError } = usePopupState();
  const [isVisible, setIsVisible] = useState(false);

  // Controle de animação de entrada
  useEffect(() => {
    if (popupState.isVisible && popupState.currentUpdate) {
      // Pequeno delay para animação suave
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      return undefined;
    }
  }, [popupState.isVisible, popupState.currentUpdate]);

  // Não renderizar se não estiver visível ou não houver atualização
  if (!popupState.isVisible || !popupState.currentUpdate) {
    return null;
  }

  const { currentUpdate } = popupState;

  const handleDismiss = async () => {
    try {
      setIsVisible(false);
      // Aguardar animação antes de dismissar
      setTimeout(async () => {
        await dismissPopup();
      }, 200);
    } catch (error) {
      console.error('Erro ao dismissar popup:', error);
    }
  };

  const handleTemporaryClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      hidePopup();
    }, 200);
  };

  const handleClearError = () => {
    clearError();
  };

  // Keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleTemporaryClose();
    }
  };

  return (
    <>
      {/* Container do popup */}
      <div 
        className={`
          fixed z-[9999] transition-all duration-300 ease-out
          
          /* Animação base (Opacity/Scale) */
          ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
          
          /* Mobile: Topo da tela */
          top-4 left-4 right-4 w-auto max-w-sm mx-auto
          
          /* Tablet/Desktop: Animação de entrada vindo de cima + Posicionamento canto superior */
          sm:top-4 sm:right-4 sm:left-auto sm:translate-x-0 
          sm:${isVisible ? 'translate-y-0' : '-translate-y-2'}
          sm:w-auto sm:max-w-md
          
          /* Desktop: tamanho maior */
          lg:max-w-lg
          
          ${className}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-title"
        aria-describedby="popup-content"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <Card className="w-full bg-card border-border shadow-2xl sm:shadow-lg overflow-hidden">
          <CardContent className="p-4 sm:p-5 lg:p-6">
            {/* Cabeçalho otimizado para mobile */}
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg flex-shrink-0 mt-0.5">
                  <Info className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <Badge 
                    variant="secondary" 
                    className="bg-[#fec832] text-black font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm"
                  >
                    Nova Atualização
                  </Badge>
                  <h3 
                    id="popup-title"
                    className="font-semibold text-base sm:text-lg text-foreground leading-tight pr-2"
                  >
                    {currentUpdate.title}
                  </h3>
                </div>
              </div>
              
              {/* Botão de fechar otimizado para touch */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="
                  flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9 p-0 
                  text-muted-foreground hover:text-foreground 
                  hover:bg-secondary/80 rounded-full
                  transition-all duration-200 
                  focus:ring-2 focus:ring-primary/20 focus:outline-none
                  active:scale-95
                "
                aria-label="Fechar popup"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>

            {/* Conteúdo com melhor espaçamento */}
            <div 
              id="popup-content"
              className="text-muted-foreground mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base"
            >
              {currentUpdate.content.split('\n').map((line: string, index: number) => (
                <span key={index} className={index > 0 ? 'block mt-2' : 'block'}>
                  {line}
                </span>
              ))}
            </div>

            {/* Botões com melhor touch target */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                onClick={handleTemporaryClose}
                className="
                  flex-1 h-11 sm:h-10 bg-secondary text-secondary-foreground 
                  border-border hover:bg-secondary/80 hover:text-[#fec832]
                  transition-all duration-200 font-medium
                  focus:ring-2 focus:ring-primary/20 focus:outline-none
                  active:scale-[0.98]
                "
              >
                Mais tarde
              </Button>
              {currentUpdate.link_url && (
                <Button
                  asChild
                  className="
                    flex-1 h-11 sm:h-10 bg-primary text-primary-foreground 
                    hover:bg-primary/90 transition-all duration-200 font-medium
                    focus:ring-2 focus:ring-primary/20 focus:outline-none
                    active:scale-[0.98]
                  "
                >
                  <a 
                    href={currentUpdate.link_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    {currentUpdate.link_text || 'Detalhes'}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>

            {/* Exibir erro se houver */}
            {popupState.error && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs sm:text-sm text-red-700 dark:text-red-400 flex-1">
                    {popupState.error}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearError}
                    className="
                      h-6 w-6 p-0 text-red-500 hover:text-red-700 
                      dark:text-red-400 dark:hover:text-red-300
                      transition-colors flex-shrink-0
                      focus:ring-2 focus:ring-red-500/20 focus:outline-none
                    "
                    aria-label="Fechar erro"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Indicador de carregamento */}
            {popupState.isLoading && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#fec832]/20 border-t-[#fec832]"></div>
                <span className="text-xs sm:text-sm text-muted-foreground">Carregando...</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default UpdatePopup;