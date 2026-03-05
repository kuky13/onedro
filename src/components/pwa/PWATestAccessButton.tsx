import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import { isStandalone } from '@/utils/pwaDetection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export const PWATestAccessButton = () => {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  if (!isStandalone()) return null;

  const handleStart = () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setOpen(false);
    navigate(`/testar/${trimmed}`);
  };

  return (
    <>
      <div className="w-full px-4 pt-4">
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 transition-all"
        >
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/15">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm text-foreground">Testar meu aparelho</p>
            <p className="text-xs text-muted-foreground">Insira o código para iniciar</p>
          </div>
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Iniciar Teste</DialogTitle>
            <DialogDescription>
              Cole ou digite o código que você recebeu para testar seu aparelho.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Input
              placeholder="Cole o código aqui"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              autoFocus
            />
            <Button onClick={handleStart} disabled={!code.trim()}>
              Iniciar Teste
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
