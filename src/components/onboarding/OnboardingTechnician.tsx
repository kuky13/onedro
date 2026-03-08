import { Wrench, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export interface TechnicianData {
  name: string;
  commission_percentage: string;
}

interface Props {
  onNext: (data: TechnicianData) => void;
  onSkip: () => void;
}

export const OnboardingTechnician = ({ onNext, onSkip }: Props) => {
  const [name, setName] = useState('');
  const [commission, setCommission] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Wrench className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Primeiro Técnico</h2>
          <p className="text-sm text-muted-foreground">Cadastre seu primeiro técnico de reparos</p>
        </div>
      </div>

      <div className="bg-muted/20 border border-border/30 rounded-2xl p-5 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Nome do técnico *</label>
          <Input placeholder="Nome completo" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Comissão (%)</label>
          <Input
            type="number"
            placeholder="Ex: 10"
            min={0}
            max={100}
            value={commission}
            onChange={e => setCommission(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button
          onClick={() => onNext({ name, commission_percentage: commission })}
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
