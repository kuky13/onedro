import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, Loader2, CreditCard, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PLANS_CONTENT } from '../data/content';
interface DadosPlano {
  nome: string;
  descricao: string;
  preco: number;
  preco_original?: number;
  moeda: string;
  periodo: string;
  ciclo: 'monthly' | 'yearly';
  badge_popular: string;
  mostrar_badge: boolean;
  botao_texto: string;
  mostrar_suporte: boolean;
  texto_suporte: string;
  informacoes_extras: string;
  beneficios: string[];
}
interface PlanCardProps {
  plano: DadosPlano;
  aoSelecionarPlano?: () => void; // Manter compatibilidade
  userEmail?: string;
  isProcessing?: boolean;
}
export const PlanCard = ({
  plano,
  aoSelecionarPlano,
  userEmail = 'user@example.com',
  isProcessing = false
}: PlanCardProps) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const precoAtual = useMemo(() => {
    return plano.ciclo === 'yearly' ? PLANS_CONTENT.planos.anual.preco : PLANS_CONTENT.planos.mensal.preco;
  }, [plano.ciclo]);
  const precoOriginalAtual = useMemo(() => {
    return plano.ciclo === 'yearly' ? PLANS_CONTENT.planos.anual.preco_original : PLANS_CONTENT.planos.mensal.preco_original;
  }, [plano.ciclo]);
  const periodoAtual = useMemo(() => {
    return plano.ciclo === 'yearly' ? PLANS_CONTENT.planos.anual.periodo : PLANS_CONTENT.planos.mensal.periodo;
  }, [plano.ciclo]);
  const handlePayment = () => {
    setLoading(true);
    try {
      const planDetails = {
        plan: plano.nome,
        cycle: plano.ciclo,
        price: calculateTotalPrice()
      };
      console.log('Plano selecionado:', planDetails);

      // Redirecionar baseado no tipo de plano
      if (plano.ciclo === 'monthly') {
        navigate('/plans/m');
      } else if (plano.ciclo === 'yearly') {
        navigate('/plans/a');
      }
    } catch (error) {
      console.error('Erro ao processar:', error);
      alert('Erro ao processar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  const handleButtonClick = () => {
    if (aoSelecionarPlano) {
      // Usar função original se fornecida (compatibilidade)
      aoSelecionarPlano();
    } else {
      // Usar nova função de pagamento
      handlePayment();
    }
  };
  return <section className="animate-fade-in-up" style={{
    animationDelay: '0.4s'
  }}>
      <div className="max-w-md mx-auto">
        <div className="relative bg-card border border-border rounded-3xl p-8 glass backdrop-blur-xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl">
          
          {/* Badge Popular */}
          {plano.mostrar_badge && <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold">
                {plano.badge_popular}
              </span>
            </div>}
          
          {/* Cabeçalho do Plano */}
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-foreground mb-2">
              {plano.nome}
            </h3>
            <p className="text-muted-foreground mb-6">
              {plano.descricao}
            </p>
            
            {/* Preço */}
            <div className="flex flex-col items-center justify-center mb-6">
              {precoOriginalAtual && <div className="flex flex-col items-center space-y-1 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg text-muted-foreground line-through">
                      {plano.moeda}{precoOriginalAtual.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-semibold">
                      {Math.round((precoOriginalAtual - precoAtual) / precoOriginalAtual * 100)}% OFF
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-primary mb-1">Promoção</p>
                    <p className="text-xs font-bold text-red-600 animate-pulse">Termina em breve!</p>
                  </div>
                </div>}
              <div className="flex items-baseline justify-center">
                <span className="text-5xl font-bold text-foreground">
                  {plano.moeda}{precoAtual.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-xl text-muted-foreground ml-1">
                  {periodoAtual}
                </span>
              </div>

            </div>
          </div>
          
          {/* Lista de Benefícios */}
          <div className="space-y-4 mb-6">
            {plano.beneficios.map((beneficio, index) => <div key={index} className="flex items-start space-x-3">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground">{beneficio}</span>
              </div>)}
          </div>




          {/* Botão de Ação */}
          <Button onClick={handleButtonClick} disabled={loading || isProcessing} className="w-full text-lg py-4 mb-4 transition-all duration-300 btn-premium">
            {loading || isProcessing ? <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </> : <>                <CreditCard className="mr-2 h-4 w-4" />
                Comprar
              </>}
          </Button>


          
          {/* Informações de Suporte */}
          {plano.mostrar_suporte && <p className="text-center text-sm text-muted-foreground mb-4">
              {plano.texto_suporte}
            </p>}
          
          {/* Informações Extras */}
          <p className="text-center text-xs text-muted-foreground">
            {plano.informacoes_extras}
          </p>
        </div>
      </div>
    </section>;
};