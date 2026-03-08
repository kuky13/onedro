import { Sparkles, MessageSquare, Search } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  onNext: () => void;
  onSkip: () => void;
}

export const OnboardingDrippy = ({ onNext, onSkip }: Props) => {
  const features = [
    { icon: Search, title: "Barra de pesquisa", desc: "Pergunte qualquer coisa direto no Dashboard" },
    { icon: MessageSquare, title: "Orçamentos", desc: "Drippy pesquisa sobre orçamentos e OS para você" },
    { icon: Sparkles, title: "Suporte 24/7", desc: "Disponível a qualquer hora para te ajudar" },
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
          src="/lovable-uploads/e12ec9f1-06ab-4f49-8d81-78a481c5b4c0.png"
          alt="Drippy - Assistente IA"
          className="h-20 w-20 rounded-full border-2 border-primary/30 object-cover"
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Conheça a Drippy</h2>
        <p className="text-muted-foreground text-base max-w-md mx-auto">
          Sua assistente de IA integrada. Ela te ajuda com orçamentos, atendimento ao cliente e muito mais.
        </p>
      </div>

      <div className="space-y-3 max-w-sm mx-auto">
        {features.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex items-start gap-3 rounded-xl bg-muted/30 border border-border/30 p-4 text-left"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
              <Icon className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button onClick={onNext} className="btn-premium w-full h-12 rounded-xl text-base font-semibold">
          Continuar
        </button>
        <button onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Pular →
        </button>
      </div>
    </motion.div>
  );
};
