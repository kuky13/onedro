// @ts-nocheck
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { WormBudgetForm } from '@/components/worm/WormBudgetForm';
import { useWormBudgetById } from '@/hooks/worm/useWormBudgetById';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const goBackToWorm = (navigate: ReturnType<typeof useNavigate>) => {
  navigate('/worm', { replace: true });
};

export const WormAIBudgetEditPage = () => {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const location = useLocation() as {
    state?: {
      budget?: any;
    };
  };
  const initialBudget = location.state?.budget;
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const {
    data: queryResult,
    isLoading
  } = useWormBudgetById({
    id,
    skipBudgetFetch: !!initialBudget
  });
  const budget = initialBudget ?? (queryResult && 'id' in (queryResult as any) ? queryResult as any : null);
  const isAiBudget = (queryResult as any)?._isAiBudget ?? false;
  if (!user) {
    return null;
  }
  if (isLoading && !budget) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <span>Carregando orçamento...</span>
      </div>;
  }
  if (!budget) {
    return <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
        <p>Orçamento não encontrado.</p>
        <Button variant="outline" onClick={() => goBackToWorm(navigate)}>
          Voltar para os orçamentos
        </Button>
      </div>;
  }
  if (!isAiBudget) {
    return <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4 px-4 text-center">
        <p>Este orçamento não foi criado pela IA. Apenas orçamentos criados pela IA podem ser editados nesta tela.</p>
        <Button variant="outline" onClick={() => goBackToWorm(navigate)}>
          Voltar para os orçamentos
        </Button>
      </div>;
  }
  return <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goBackToWorm(navigate)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
        
        <div className="bg-card text-card-foreground shadow-sm border border-border p-4 sm:p-6 rounded-2xl">
          <WormBudgetForm budget={budget} onSuccess={() => goBackToWorm(navigate)} onCancel={() => goBackToWorm(navigate)} className="rounded-3xl" />
        </div>
      </div>
    </div>;
};
export default WormAIBudgetEditPage;