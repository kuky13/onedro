import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Loader } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

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
        title: "Limpeza concluída! 🧹",
        description: "Cache removido. Dados de login preservados.",
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
    <Card className="rounded-2xl border-destructive/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-8 w-8 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Trash2 className="h-4 w-4 text-destructive" />
          </div>
          Limpeza de Dados
        </CardTitle>
        <CardDescription className="text-xs">
          Remove todos os dados salvos localmente no dispositivo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 border-destructive/20 text-destructive hover:bg-destructive/5 rounded-xl"
              disabled={isClearing}
            >
              {isClearing ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Limpeza Total
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl max-w-[90vw]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg">⚠️ Limpeza Total de Dados</AlertDialogTitle>
              <AlertDialogDescription className="text-sm space-y-3">
                <p className="font-medium text-destructive">Esta ação irá remover TODOS os dados locais:</p>
                <ul className="text-xs space-y-1 bg-secondary/30 p-3 rounded-xl">
                  <li>• localStorage e sessionStorage</li>
                  <li>• Bancos IndexedDB</li>
                  <li>• Caches do Service Worker</li>
                  <li>• Cookies do domínio</li>
                </ul>
                <p className="font-medium text-destructive text-sm">Você precisará fazer login novamente.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="flex-1 rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={clearSiteCache}
                className="flex-1 bg-destructive hover:bg-destructive/90 rounded-xl"
                disabled={isClearing}
              >
                {isClearing ? <><Loader className="h-4 w-4 animate-spin mr-1" />Limpando...</> : 'Confirmar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
