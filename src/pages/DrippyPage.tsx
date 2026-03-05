import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageCircle, Sparkles } from 'lucide-react';

export const DrippyPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <img 
                src="/lovable-uploads/e12ec9f1-06ab-4f49-8d81-78a481c5b4c0.png"
                alt="Drippy - Assistente Virtual OneDrip"
                className="w-32 h-32 rounded-full shadow-2xl border-4 border-primary/20"
              />
              <div className="absolute -bottom-2 -right-2 bg-primary rounded-full p-2">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Conheça a Drippy
          </h1>
          <p className="text-xl text-muted-foreground">
            Sua assistente virtual inteligente da OneDrip
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl p-8 mb-8 border">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                Quem é a Drippy?
              </h2>
              <p className="text-muted-foreground mb-4">
                A Drippy é uma jovem assistente virtual de 18 anos, profissional, 
                atenciosa e direta. Ela foi criada especialmente para ajudar você 
                com todas as suas dúvidas sobre a plataforma OneDrip.
              </p>
              <p className="text-muted-foreground mb-6">
                Com um jeitinho doce e moderno, a Drippy está sempre pronta para 
                responder suas perguntas de forma rápida e clara, destacando os 
                benefícios da plataforma e direcionando você para demos e planos.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <MessageCircle className="w-6 h-6 text-primary mb-2" />
                <h3 className="font-semibold text-foreground mb-2">Atendimento Inteligente</h3>
                <p className="text-sm text-muted-foreground">
                  Respostas rápidas e precisas sobre a OneDrip
                </p>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <Sparkles className="w-6 h-6 text-primary mb-2" />
                <h3 className="font-semibold text-foreground mb-2">Personalidade Única</h3>
                <p className="text-sm text-muted-foreground">
                  Uma assistente com personalidade própria e gostos únicos
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-primary/5 rounded-2xl p-8 text-center border border-primary/20">
          <h3 className="text-2xl font-semibold text-foreground mb-4">
            Experimente a Drippy agora!
          </h3>
          <p className="text-muted-foreground mb-6">
            Acesse a plataforma completa e converse com a Drippy sobre 
            todas as funcionalidades da OneDrip.
          </p>
          
          <Button 
            size="lg"
            className="px-8 py-3 text-lg"
            onClick={() => navigate('/chat')}
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Fale com a Drippy
          </Button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            A Drippy está disponível 24/7 para te ajudar com dúvidas sobre a plataforma OneDrip
          </p>
        </div>
      </div>
    </div>
  );
};