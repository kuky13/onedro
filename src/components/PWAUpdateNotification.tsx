import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, X } from 'lucide-react';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { useToast } from '@/hooks/useToast';

export const PWAUpdateNotification: React.FC = () => {
  const { isDesktop } = useDeviceDetection();
  const { showInfo } = useToast();
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Desabilitar Service Worker temporariamente em desenvolvimento para resolver problemas de cache
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('[PWAUpdate] Service Worker desabilitado em desenvolvimento para resolver problemas de cache');
      return;
    }

    if ('serviceWorker' in navigator) {
      // Aguardar o DOM estar pronto antes de tentar acessar o Service Worker
      const initializeServiceWorker = async () => {
        try {
          // Verificar se o documento está em um estado válido
          if (document.readyState === 'loading') {
            await new Promise(resolve => {
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve, { once: true });
              } else {
                resolve(undefined);
              }
            });
          }

          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            setRegistration(reg);
            
            // Verificar se há uma nova versão esperando
            if (reg.waiting) {
              setShowUpdate(true);
            }
            
            // Listener para novas atualizações
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    setShowUpdate(true);
                    showInfo({ title: 'Nova versão disponível!', description: 'Uma nova versão do app está pronta para ser instalada.' });
                  }
                });
              }
            });
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'InvalidStateError') {
            console.warn('[PWAUpdate] Documento em estado inválido, tentando novamente...');
            // Tentar novamente após um delay
            setTimeout(() => {
              initializeServiceWorker().catch(retryError => {
                console.error('[PWAUpdate] Erro na segunda tentativa:', retryError);
              });
            }, 500);
          } else {
            console.error('[PWAUpdate] Erro ao obter registro do Service Worker:', error);
          }
        }
      };

      initializeServiceWorker();
    }
  }, [showInfo]);

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Aguardar o controllerchange e navegar
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.href = '/';
      });
      
      showInfo({ title: 'Atualizando...', description: 'A página será recarregada em breve.' });
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
    // Não mostrar novamente nesta sessão
    sessionStorage.setItem('update-dismissed', 'true');
  };

  // Não mostrar se foi dispensado nesta sessão
  if (sessionStorage.getItem('update-dismissed') === 'true') {
    return null;
  }

  // Não mostrar notificações de atualização em desktop
  if (isDesktop || !showUpdate) {
    return null;
  }

  return (
    <Card className="fixed top-4 left-4 right-4 z-50 border-primary shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                Atualização Disponível
              </h3>
              <p className="text-sm text-muted-foreground">
                Nova versão com melhorias e correções
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleUpdate}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Atualizar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PWAUpdateNotification;