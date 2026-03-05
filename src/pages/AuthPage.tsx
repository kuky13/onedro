import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Eye, EyeOff, ArrowLeft, Shield, Smartphone, Lock, RefreshCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLicenseVerification } from '@/hooks/useLicenseVerification';
import { LicenseActivationSection } from '@/components/auth/LicenseActivationSection';
import { LicenseActivationIOS } from '@/components/auth/LicenseActivationIOS';
import { useIOSDetection } from '@/hooks/useIOSDetection';
import { cleanupAuthState, forceReload } from '@/utils/authCleanup';

export const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // ... rest of the code

  const handleFullReset = () => {
    setIsResetting(true);
    cleanupAuthState();
    showSuccess({
      title: 'Sistema Resetado',
      description: 'Cookies e cache limpos. Recarregando...'
    });
    forceReload(1500);
  };
  const {
    signIn,
    requestPasswordReset,
    loading,
    user
  } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const { data: licenseData } = useLicenseVerification(user?.id ?? null);
  const isLicenseValid = licenseData?.is_valid || false;
  const isIOS = useIOSDetection();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showError({
        title: 'Campos obrigatórios',
        description: 'Preencha email e senha.'
      });
      return;
    }
    await signIn(email, password);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showError({
        title: 'Email obrigatório',
        description: 'Digite seu email para recuperar a senha.'
      });
      return;
    }
    await requestPasswordReset(email);
    showSuccess({
      title: 'Email enviado',
      description: 'Verifique sua caixa de entrada e spam.'
    });
    setShowResetForm(false);
  };

  const handleSocialLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) {
        showError({
          title: 'Erro no login',
          description: error.message === 'Provider is not enabled' 
            ? 'Google não configurado.' 
            : error.message
        });
      }
    } catch {
      showError({
        title: 'Erro',
        description: 'Tente novamente.'
      });
    }
  };

  const handleLicenseActivated = () => {
    navigate('/dashboard');
  };

  // Se usuário logado mas sem licença válida
  if (user && isLicenseValid === false) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4">
          {isIOS ? (
            <LicenseActivationIOS user={user} onLicenseActivated={handleLicenseActivated} />
          ) : (
            <LicenseActivationSection user={user} onLicenseActivated={handleLicenseActivated} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header simples */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/landing" className="flex items-center gap-2">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            <span className="font-semibold text-foreground">OneDrip</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/suporte">
              <Button variant="ghost" size="sm" className="text-muted-foreground font-medium">
                Suporte
              </Button>
            </Link>
            <Link to="/sign">
              <Button variant="ghost" size="sm" className="text-primary font-medium">
                Criar conta
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 flex flex-col justify-center px-4 py-8">
        <div className="w-full max-w-sm mx-auto space-y-6">
          
          {/* Título */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              {showResetForm ? 'Recuperar senha' : 'Entrar na sua conta'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {showResetForm 
                ? 'Digite seu email para receber o link de recuperação'
                : 'Acesse seu painel de orçamentos'
              }
            </p>
          </div>

          {/* Badges de confiança */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-green-600" />
              <span>Seguro</span>
            </div>
            <div className="flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span>Mobile</span>
            </div>
            <div className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-purple-600" />
              <span>Criptografado</span>
            </div>
          </div>

          {!showResetForm ? (
            <>
              {/* Botão Google */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base font-medium border-border/60 hover:bg-muted/50"
                onClick={handleSocialLogin}
                disabled={loading || isResetting}
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continuar com Google
              </Button>

              {/* Divisor */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-3 text-xs text-muted-foreground uppercase">
                    ou com email
                  </span>
                </div>
              </div>

              {/* Form de login */}
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 text-base"
                    autoComplete="email"
                    disabled={isResetting}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Senha
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowResetForm(true)}
                      className="text-xs text-primary hover:underline"
                      disabled={isResetting}
                    >
                      Esqueci a senha
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      placeholder="Sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 text-base pr-12"
                      autoComplete="current-password"
                      disabled={isResetting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      disabled={isResetting}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={loading || isResetting}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>

              {/* Link para criar conta */}
              <div className="space-y-4 pt-2">
                <p className="text-center text-sm text-muted-foreground">
                  Não tem conta?{' '}
                  <Link to="/sign" className="text-primary font-medium hover:underline">
                    Criar conta grátis
                  </Link>
                </p>

                <div className="flex justify-center">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-2"
                    onClick={handleFullReset}
                    disabled={isResetting}
                  >
                    <RefreshCcw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
                    Limpar Cookies e Resetar App
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Form de recuperação */}
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    type="email"
                    id="reset-email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 text-base"
                    autoComplete="email"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={loading}
                >
                  {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                </Button>

                <button
                  type="button"
                  onClick={() => setShowResetForm(false)}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  Voltar para o login
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      {/* Footer simples */}
      <footer className="py-4 px-4 border-t border-border/40">
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">Termos</Link>
          <span>•</span>
          <Link to="/privacy" className="hover:text-foreground">Privacidade</Link>
          <span>•</span>
          <Link to="/suporte" className="hover:text-foreground">Suporte</Link>
        </div>
      </footer>
    </div>
  );
};
