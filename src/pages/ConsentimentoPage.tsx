import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { 
  ShieldCheck, 
  User, 
  Mail, 
  Check, 
  X, 
  Shield,
  Lock,
  ExternalLink,
} from "lucide-react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";

export const ConsentimentoPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Parâmetros comuns de OAuth
  const clientId = searchParams.get("client_id") || "App Desconhecido";
  const redirectUri = searchParams.get("redirect_uri");
  const scope = searchParams.get("scope") || "profile email";
  const state = searchParams.get("state");

  // Simulação de detalhes do app (em um cenário real viria de uma tabela 'oauth_clients')
  const appDetails = {
    name: clientId === "App Desconhecido" ? "Aplicação de Terceiros" : clientId,
    icon: <div className="p-3 rounded-2xl bg-primary/10 mb-4"><ShieldCheck className="h-10 w-10 text-primary" /></div>,
    verified: true,
    description: "Esta aplicação solicita permissão para acessar seus dados básicos e integrar-se com o ecossistema OneDrip.",
    website: "https://onedrip.com.br"
  };

  const scopesList = scope.split(" ").map(s => {
    switch(s) {
      case "profile": return { id: s, label: "Acessar seu nome e foto de perfil", icon: <User className="h-4 w-4" /> };
      case "email": return { id: s, label: "Ver seu endereço de e-mail", icon: <Mail className="h-4 w-4" /> };
      case "read": return { id: s, label: "Ler seus dados de orçamentos", icon: <Check className="h-4 w-4" /> };
      case "write": return { id: s, label: "Criar novos orçamentos em seu nome", icon: <Check className="h-4 w-4" /> };
      default: return { id: s, label: `Permissão personalizada: ${s}`, icon: <Check className="h-4 w-4" /> };
    }
  });

  const handleAuthorize = async () => {
    if (!user) {
      navigate(`/auth?redirect=/consentimento?${searchParams.toString()}`);
      return;
    }

    setIsLoading(true);
    try {
      // Aqui seria a lógica de gerar o code/token e redirecionar
      showSuccess({
        title: "Autorização concedida",
        description: `Redirecionando para ${appDetails.name}...`
      });

      // Simulação de sucesso
      setTimeout(() => {
        if (redirectUri) {
          const url = new URL(redirectUri);
          url.searchParams.set("code", "auth_code_simulated_" + Math.random().toString(36).substring(7));
          if (state) url.searchParams.set("state", state);
          window.location.href = url.toString();
        } else {
          navigate("/dashboard");
        }
      }, 1500);

    } catch (error) {
      showError({
        title: "Erro ao autorizar",
        description: "Ocorreu um problema ao processar sua solicitação."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (redirectUri) {
      const url = new URL(redirectUri);
      url.searchParams.set("error", "access_denied");
      if (state) url.searchParams.set("state", state);
      window.location.href = url.toString();
    } else {
      navigate(-1);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-gradient-to-br from-primary/15 to-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-gradient-to-tr from-secondary/10 to-primary/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Logo/Brand */}
          <div className="flex justify-center mb-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold text-xl shadow-lg shadow-primary/20">
                O
              </div>
              <span className="text-2xl font-bold tracking-tight">OneDrip</span>
            </Link>
          </div>

          <Card className="backdrop-blur-sm bg-card/95 border-primary/20 shadow-2xl overflow-hidden">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center">
                {appDetails.icon}
              </div>
              <CardTitle className="text-2xl font-bold">
                Autorizar {appDetails.name}
              </CardTitle>
              <div className="flex items-center justify-center gap-1.5 mt-2 text-sm text-muted-foreground">
                <Shield className="h-3.5 w-3.5 text-green-500" />
                <span>Aplicação Verificada pela KukySolutions™</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              <div className="text-center text-muted-foreground">
                <p>O aplicativo <span className="font-semibold text-foreground">{appDetails.name}</span> está solicitando acesso à sua conta OneDrip.</p>
              </div>

              {/* Scopes Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">
                  Permissões solicitadas:
                </h3>
                <div className="space-y-2 bg-muted/30 p-4 rounded-xl border border-border/50">
                  {scopesList.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-1 p-1 rounded-full bg-primary/10 text-primary">
                        {s.icon}
                      </div>
                      <span className="text-sm text-foreground/90">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Identity */}
              {user && (
                <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/10 rounded-xl">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Logado como</p>
                    <p className="text-sm font-medium truncate">{user.email}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="text-xs">
                    Trocar
                  </Button>
                </div>
              )}

              {/* Security Info */}
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  Sua senha nunca será compartilhada com o aplicativo. Você pode revogar este acesso a qualquer momento nas configurações da sua conta.
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 p-6 pt-2">
              <div className="flex w-full gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 h-11" 
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 h-11 shadow-lg shadow-primary/20" 
                  onClick={handleAuthorize}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin rounded-full"></div>
                      Processando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Check className="h-4 w-4 mr-2" />
                      Autorizar
                    </span>
                  )}
                </Button>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-[10px] text-muted-foreground">
                  Ao autorizar, você concorda com os <Link to="/terms" className="underline hover:text-primary">Termos de Serviço</Link> e a <Link to="/privacy" className="underline hover:text-primary">Política de Privacidade</Link> da KukySolutions™.
                </p>
              </div>
            </CardFooter>
          </Card>

          {/* Additional Info Link */}
          <div className="mt-8 text-center">
            <a 
              href={appDetails.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <span>Saiba mais sobre {appDetails.name}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-6 px-4 border-t border-border/40 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 OneDrip - KukySolutions™ | Todos os direitos reservados</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">CNPJ: 64.797.431/0001-03</p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-foreground">Termos</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacidade</Link>
            <Link to="/cookies" className="hover:text-foreground">Cookies</Link>
            <a href="https://wa.me/5564996028022" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Suporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
