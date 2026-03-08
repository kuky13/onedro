import { CheckCircle2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  onFinish: () => void;
  completedSteps: string[];
}

export const OnboardingComplete = ({ onFinish, completedSteps }: Props) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="text-center space-y-8"
    >
      <div className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Tudo pronto!</h1>
        <p className="text-muted-foreground text-base max-w-md mx-auto">
          Sua conta está configurada. Você pode alterar qualquer coisa depois em Configurações.
        </p>
      </div>

      {completedSteps.length > 0 && (
        <div className="bg-muted/20 border border-border/30 rounded-2xl p-5 max-w-sm mx-auto">
          <p className="text-sm font-medium text-foreground mb-3">O que foi configurado:</p>
          <ul className="space-y-2">
            {completedSteps.map((step) => (
              <li key={step} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onFinish}
        className="btn-premium h-12 w-full rounded-xl text-base font-semibold inline-flex items-center justify-center gap-2"
      >
        Ir para o Dashboard
        <ArrowRight className="h-5 w-5" />
      </button>
    </motion.div>
  );
};
