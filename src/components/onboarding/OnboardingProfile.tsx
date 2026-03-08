import { User, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface Props {
  onNext: (data: { name: string }) => void;
  onSkip: () => void;
  defaultName?: string;
}

export const OnboardingProfile = ({ onNext, onSkip, defaultName = '' }: Props) => {
  const [name, setName] = useState(defaultName);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Perfil Pessoal</h2>
          <p className="text-sm text-muted-foreground">Como você quer ser chamado?</p>
        </div>
      </div>

      <div className="bg-muted/20 border border-border/30 rounded-2xl p-5 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Nome completo</label>
          <Input
            placeholder="Seu nome"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button
          onClick={() => onNext({ name })}
          className="btn-premium w-full h-12 rounded-xl text-base font-semibold inline-flex items-center justify-center gap-2"
          disabled={!name.trim()}
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
