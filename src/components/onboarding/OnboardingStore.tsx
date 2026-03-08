import { Store, ShoppingBag, XCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';

export interface StoreData {
  name: string;
  slug: string;
  description: string;
}

interface Props {
  onNext: (data: StoreData | null) => void;
  onSkip: () => void;
}

export const OnboardingStore = ({ onNext, onSkip }: Props) => {
  const [wantsStore, setWantsStore] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  const generateSlug = (val: string) =>
    val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(generateSlug(val));
  };

  // Handle "no" selection with useEffect to avoid calling onNext during render
  useEffect(() => {
    if (wantsStore === false) {
      onNext(null);
    }
  }, [wantsStore, onNext]);

  if (wantsStore === null) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Loja Virtual</h2>
            <p className="text-sm text-muted-foreground">Deseja criar uma loja virtual para seus clientes?</p>
          </div>
        </div>

        <p className="text-muted-foreground text-sm">
          A loja permite que seus clientes vejam serviços, orçamentos e acompanhem pedidos online.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setWantsStore(true)}
            className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-border/40 bg-muted/20 p-5 text-center transition-all hover:border-primary/60 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
              <ShoppingBag className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Sim, criar loja</p>
              <p className="text-xs text-muted-foreground mt-0.5">Configurar agora</p>
            </div>
          </button>

          <button
            onClick={() => setWantsStore(false)}
            className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-border/40 bg-muted/20 p-5 text-center transition-all hover:border-muted-foreground/40 hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-muted-foreground/30"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40 transition-colors group-hover:bg-muted/60">
              <XCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Não agora</p>
              <p className="text-xs text-muted-foreground mt-0.5">Configurar depois</p>
            </div>
          </button>
        </div>

        <div className="flex justify-center pt-1">
          <button onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Pular etapa →
          </button>
        </div>
      </motion.div>
    );
  }

  if (wantsStore === false) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Store className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Criar Loja</h2>
          <p className="text-sm text-muted-foreground">Configure os dados da sua loja virtual</p>
        </div>
      </div>

      <div className="bg-muted/20 border border-border/30 rounded-2xl p-5 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Nome da loja *</label>
          <Input placeholder="Minha Loja" value={name} onChange={e => handleNameChange(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Slug (URL)</label>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span>/loja/</span>
            <Input placeholder="minha-loja" value={slug} onChange={e => setSlug(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Descrição</label>
          <Input placeholder="Breve descrição da loja" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button
          onClick={() => onNext({ name, slug, description })}
          className="btn-premium w-full h-12 rounded-xl text-base font-semibold inline-flex items-center justify-center gap-2"
          disabled={!name.trim() || !slug.trim()}
        >
          Continuar
          <ArrowRight className="h-5 w-5" />
        </button>
        <button
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Pular etapa →
        </button>
      </div>
    </motion.div>
  );
};
