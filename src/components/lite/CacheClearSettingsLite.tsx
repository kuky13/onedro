import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { SettingsGlassCard } from '@/components/lite/settings/SettingsLitePrimitives';

export const CacheClearSettingsLite = () => {
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();

  const clearSiteCache = async (): Promise<void> => {
    setIsClearing(true);
    try {
      localStorage.clear();
      sessionStorage.clear();

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      }

      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases?.();
          if (databases && databases.length > 0) {
            await Promise.all(
              databases.map(db => {
                if (db.name) {
                  return new Promise<void>((resolve) => {
                    const deleteReq = indexedDB.deleteDatabase(db.name!);
                    deleteReq.onsuccess = () => resolve();
                    deleteReq.onerror = () => resolve();
                    deleteReq.onblocked = () => resolve();
                    setTimeout(() => resolve(), 5000);
                  });
                }
                return Promise.resolve();
              })
            );
          }
        } catch (error) {
          console.warn('IndexedDB cleanup error:', error);
        }
      }

      try {
        document.cookie.split(";").forEach(function(c) {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      } catch (error) {
        console.warn('Cookie cleanup error:', error);
      }

      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(r => r.unregister()));
        } catch (error) {
          console.warn('Service Worker cleanup error:', error);
        }
      }

      toast({
        title: "Limpeza concluída",
        description: "Dados locais removidos. Recarregando...",
      });

      setTimeout(() => { window.location.href = '/'; }, 2000);
    } catch (error) {
      console.error('Error clearing all local data:', error);
      toast({
        title: "Erro na limpeza",
        description: "Erro ao remover todos os dados locais.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <SettingsGlassCard className="border-destructive/25">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-[18px] w-[18px] text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold text-foreground">Limpar cache</div>
            <div className="text-xs text-muted-foreground">
              Remove dados locais do navegador. Use quando algo estiver travando.
            </div>
          </div>
        </div>

        <div className="mt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 rounded-xl"
                disabled={isClearing}
              >
                {isClearing ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Limpar agora
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl max-w-[90vw]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg">Limpeza de dados locais</AlertDialogTitle>
                <AlertDialogDescription className="text-sm space-y-3">
                  <p className="font-medium text-foreground">Isso remove dados locais como:</p>
                  <ul className="text-xs space-y-1 bg-muted/30 p-3 rounded-xl border border-border/30">
                    <li>• cache do navegador</li>
                    <li>• armazenamento local</li>
                    <li>• registros do service worker</li>
                  </ul>
                  <p className="text-sm text-muted-foreground">Você pode precisar fazer login novamente.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel className="flex-1 rounded-xl">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={clearSiteCache}
                  className="flex-1 bg-destructive hover:bg-destructive/90 rounded-xl"
                  disabled={isClearing}
                >
                  {isClearing ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin mr-1" />
                      Limpando...
                    </>
                  ) : (
                    'Confirmar'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </SettingsGlassCard>
  );
};
