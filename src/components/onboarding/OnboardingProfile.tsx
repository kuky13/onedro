import { User } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  onNext: (data: { name: string; username: string }) => void;
  onSkip: () => void;
  defaultName?: string;
  defaultUsername?: string;
}

export const OnboardingProfile = ({ onNext, onSkip, defaultName = '', defaultUsername = '' }: Props) => {
  const [name, setName] = useState(defaultName);
  const [username, setUsername] = useState(defaultUsername);

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
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Username</label>
          <Input
            placeholder="@seuusuario"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 rounded-xl" onClick={onSkip}>
          Pular
        </Button>
        <button
          onClick={() => onNext({ name, username })}
          className="btn-premium flex-1 h-11 rounded-xl font-semibold"
          disabled={!name.trim()}
        >
          Continuar
        </button>
      </div>
    </motion.div>
  );
};
