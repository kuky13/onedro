import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, AlertTriangle, ArrowLeft, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const ResetEmailPage = () => {
  const { updateEmail, user } = useAuth();
  const navigate = useNavigate();
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isConfirmation, setIsConfirmation] = useState(false);

  useEffect(() => {
    // Verifica tanto no hash quanto nos query params para maior robustez
    const hash = window.location.hash;
    const search = window.location.search;
    const isEmailChangeSuccess = hash.includes('type=email_change') || search.includes('type=email_change');
    
    if (isEmailChangeSuccess) {
      setIsConfirmation(true);
      setMessage({
        type: 'success',
        text: 'Seu endereço de e-mail foi alterado com sucesso! Redirecionando...'
      });

      // Limpa o hash e os query params da URL para evitar que a mensagem apareça novamente
      window.history.replaceState({}, document.title, window.location.pathname);
      
      setTimeout(() => {
        navigate('/dashboard/settings');
      }, 4000);
    }
  }, [navigate]);

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !user) return;
    if (newEmail === user.email) {
      setMessage({
        type: 'error',
        text: 'O novo email não pode ser igual ao atual.'
      });
      return;
    }
    setLoading(true);
    setMessage(null);
    const { error } = await updateEmail(newEmail);
    setLoading(false);
    if (error) {
      setMessage({
        type: 'error',
        text: `Erro: ${error.message}`
      });
    } else {
      setMessage({
        type: 'success',
        text: 'Um email de confirmação foi enviado para o seu novo endereço. Verifique sua caixa de entrada. Se não encontrar o email na caixa de entrada, verifique também a pasta de spam/lixo eletrônico.'
      });
      setNewEmail('');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-block mb-6">
            <img src="/lovable-uploads/logoo.png" alt="OneDrip Logo" className="w-16 h-16 lg:w-20 lg:h-20 mx-auto" />
          </Link>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
            {isConfirmation ? 'E-mail Alterado!' : 'Alterar Email'}
          </h1>
          <p className="text-sm lg:text-base text-muted-foreground">
            {isConfirmation 
              ? 'Seu novo endereço de e-mail foi confirmado e atualizado.'
              : <>Seu email atual é <strong className="text-foreground">{user?.email}</strong></>
            }
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 lg:p-8 shadow-sm">
          {/* Mensagem de Status */}
          {message && (
            <div className={`flex items-start gap-3 p-4 rounded-xl text-sm mb-6 ${
              message.type === 'success' 
                ? 'bg-green-500/10 border border-green-500/20 text-green-600' 
                : 'bg-destructive/10 border border-destructive/20 text-destructive'
            }`}>
              {message.type === 'success' 
                ? <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" /> 
                : <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              }
              <span>{message.text}</span>
            </div>
          )}

          {!isConfirmation && (
            <>
              <p className="text-sm text-muted-foreground mb-6 text-center">
                Digite o novo endereço e enviaremos um link de confirmação.
              </p>

              <form onSubmit={handleEmailChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Novo Endereço de Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="novo@email.com" 
                      value={newEmail} 
                      onChange={e => setNewEmail(e.target.value)} 
                      required 
                      className="h-12 pl-10 rounded-xl" 
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-primary hover:bg-primary/90 rounded-xl font-medium" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Link de Confirmação'
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Links */}
          <div className="mt-6 pt-6 border-t border-border">
            <Link 
              to={isConfirmation ? "/dashboard/settings" : "/dashboard"} 
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {isConfirmation ? 'Voltar para Configurações' : 'Voltar ao Dashboard'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
