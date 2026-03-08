import { Headphones, HelpCircle, MessageCircle, Mail, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  onNext: () => void;
  onSkip: () => void;
}

export const OnboardingSupport = ({ onNext, onSkip }: Props) => {
  const channels = [
    { icon: HelpCircle, title: "Central de Ajuda", desc: "Tutoriais e guias completos em /central-de-ajuda" },
    { icon: MessageCircle, title: "Suporte via WhatsApp", desc: "Fale com nosso time diretamente pelo WhatsApp" },
    { icon: Headphones, title: "Página de Suporte", desc: "Abra um chamado ou veja FAQs em /suporte" },
    { icon: Mail, title: "E-mail", desc: "Entre em contato por e-mail quando precisar" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center space-y-8"
    >
      <div className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Headphones className="h-10 w-10 text-primary" />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Suporte & Central de Ajuda</h2>
        <p className="text-muted-foreground text-base max-w-md mx-auto">
          Você nunca está sozinho. Temos vários canais prontos para te ajudar a qualquer momento.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
        {channels.map(({ icon: Icon, title, desc }) => (
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
        <button
          onClick={onNext}
          className="btn-premium w-full h-12 rounded-xl text-base font-semibold inline-flex items-center justify-center gap-2"
        >
          Continuar
          <ChevronRight className="h-5 w-5" />
        </button>
        <button onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Pular →
        </button>
      </div>
    </motion.div>
  );
};
