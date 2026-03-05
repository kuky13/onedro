import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export default function IAPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="h-16 w-16 rounded-xl bg-muted/50 flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8 text-foreground/60" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Em Desenvolvimento</h1>
          <p className="text-muted-foreground text-base">
            Esta seção está sendo aprimorada e em breve estará disponível.
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  );
}
