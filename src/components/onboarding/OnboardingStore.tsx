import { Store } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

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

        <div className="bg-muted/20 border border-border/30 rounded-2xl p-6 text-center space-y-4">
          <p className="text-muted-foreground text-sm">
            A loja permite que seus clientes vejam serviços, orçamentos e acompanhem pedidos online.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" className="rounded-xl px-8" onClick={() => setWantsStore(false)}>
              Não agora
            </Button>
            <button
              onClick={() => setWantsStore(true)}
              className="btn-premium h-11 rounded-xl px-8 font-semibold"
            >
              Sim, criar loja
            </button>
          </div>
        </div>

        <div className="flex justify-center">
          <button onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Pular etapa →
          </button>
        </div>
      </motion.div>
    );
  }

  if (wantsStore === false) {
    // auto advance
    onNext(null);
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

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 rounded-xl" onClick={onSkip}>
          Pular
        </Button>
        <button
          onClick={() => onNext({ name, slug, description })}
          className="btn-premium flex-1 h-11 rounded-xl font-semibold"
          disabled={!name.trim() || !slug.trim()}
        >
          Continuar
        </button>
      </div>
    </motion.div>
  );
};
