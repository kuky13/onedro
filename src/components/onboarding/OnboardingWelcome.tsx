import { Settings, Store, Wrench, Building2, Bot, Headphones, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  onNext: () => void;
  onSkipAll: () => void;
}

export const OnboardingWelcome = ({ onNext, onSkipAll }: Props) => {
  const features = [
    { icon: Bot, label: 'Conheça a Drippy' },
    { icon: Headphones, label: 'Suporte & Ajuda' },
    { icon: Settings, label: 'Perfil pessoal' },
    { icon: Building2, label: 'Marca da empresa' },
    { icon: Wrench, label: 'Primeiro técnico' },
    { icon: Store, label: 'Loja virtual' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center space-y-8"
    >
      <div className="flex justify-center">
        <img
          src="/lovable-uploads/logoo.png"
          alt="Logo"
          className="h-20 w-20 rounded-full object-contain"
        />
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Bem-vindo ao sistema!
        </h1>
        <p className="text-muted-foreground text-base max-w-md mx-auto">
          Vamos configurar tudo para você começar. São apenas algumas etapas rápidas — você pode pular qualquer uma.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
        {features.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2.5 rounded-xl bg-muted/30 border border-border/30 p-3 text-left"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">{label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button
          onClick={onNext}
          className="btn-premium w-full h-12 rounded-xl text-base font-semibold inline-flex items-center justify-center gap-2"
        >
          Começar configuração
          <ChevronRight className="h-5 w-5" />
        </button>
        <button
          onClick={onSkipAll}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Pular tudo e ir para o Dashboard →
        </button>
      </div>
    </motion.div>
  );
};
