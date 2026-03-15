import React, { useState, useEffect } from 'react';
import { getSecureItem, setSecureItem } from '@/utils/secureStorage';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, ArrowLeft, Gift, CheckCircle2, Shield, Smartphone, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';

export const SignPage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isFormValid = 
    formData.name.trim() && 
    formData.email.trim() && 
    formData.password.length >= 6 && 
    formData.password === formData.confirmPassword;

  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return { text: 'Mínimo 6 caracteres', color: 'text-red-500' };
    if (password.length < 8) return { text: 'Boa', color: 'text-yellow-500' };
    if (password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)) {
      return { text: 'Forte', color: 'text-green-500' };
    }
    return { text: 'Média', color: 'text-yellow-500' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handleSocialSignUp = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch {
      showError({
        title: 'Erro',
        description: 'Não foi possível conectar com Google.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { name: formData.name }
        }
      });

      if (error) {
        if (error.message?.includes('User already registered')) {
          showError({
            title: 'Email já cadastrado',
            description: 'Tente fazer login ou use outro email.'
          });
        } else {
          throw error;
        }
        return;
      }

      showSuccess({
        title: 'Conta criada!',
        description: 'Verifique seu email para confirmar.'
      });

      setTimeout(() => navigate('/auth'), 2000);
    } catch {
      showError({
        title: 'Erro ao criar conta',
        description: 'Tente novamente.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header simples */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            <span className="font-semibold text-foreground">OneDrip</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/suporte">
              <Button variant="ghost" size="sm" className="text-muted-foreground font-medium">
                Suporte
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-primary font-medium">
                Já tenho conta
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 flex flex-col justify-center px-4 py-6">
        <div className="w-full max-w-sm mx-auto space-y-5">
          
          {/* Badge de trial */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-600 rounded-full text-sm font-medium">
              <Gift className="w-4 h-4" />
              7 dias grátis para testar
            </div>
          </div>

          {/* Título */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Criar sua conta
            </h1>
            <p className="text-sm text-muted-foreground">
              Comece a usar o sistema de orçamentos
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

          {/* Botão Google */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base font-medium border-border/60 hover:bg-muted/50"
            onClick={handleSocialSignUp}
            disabled={isLoading}
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

          {/* Form de cadastro */}
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Seu nome
              </Label>
              <Input
                type="text"
                id="name"
                placeholder="Nome completo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-12 text-base"
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                type="email"
                id="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-12 text-base"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="Crie uma senha"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="h-12 text-base pr-12"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.password && (
                <p className={`text-xs ${passwordStrength.color}`}>
                  Senha: {passwordStrength.text}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmar senha
              </Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  placeholder="Repita a senha"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="h-12 text-base pr-12"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-500">As senhas não coincidem</p>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password.length >= 6 && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Senhas coincidem
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? 'Criando conta...' : 'Criar conta grátis'}
            </Button>
          </form>

          {/* Benefícios rápidos */}
          <div className="space-y-2 pt-2">
            <p className="text-xs text-muted-foreground text-center">
              Ao criar sua conta você ganha:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                <span>7 dias grátis</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                <span>Sem cartão</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                <span>Suporte WhatsApp</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                <span>Cancele quando quiser</span>
              </div>
            </div>
          </div>

          {/* Link para login */}
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link to="/auth" className="text-primary font-medium hover:underline">
              Fazer login
            </Link>
          </p>
        </div>
      </main>

      {/* Footer simples */}
      <footer className="py-4 px-4 border-t border-border/40">
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">Termos</Link>
          <span>•</span>
          <Link to="/privacy" className="hover:text-foreground">Privacidade</Link>
          <span>•</span>
          <a 
            href="https://wa.me/556496028022" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            Suporte
          </a>
        </div>
      </footer>
    </div>
  );
};
