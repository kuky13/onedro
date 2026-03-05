// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, Mail } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HamsterLoader } from '@/components/ui/hamster-loader';
export const VerifyPage = () => {
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useAuth();
  const {
    showError,
    showSuccess
  } = useToast();
  const [timedOut, setTimedOut] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(true);

  // Lógica melhorada que verifica estado de autenticação e parâmetros da URL
  useEffect(() => {
    // Aguardar inicialização do auth
    if (authLoading) {
      console.log('🔄 [VerifyPage] Aguardando inicialização do auth...');
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    // Detectar tipo tanto nos query params quanto no hash
    const queryType = urlParams.get('type');
    const hashType = hashParams.get('type');
    const detectedType = queryType || hashType;
    
    console.log('🔍 [VerifyPage] Analisando parâmetros:', { 
      queryType, 
      hashType, 
      detectedType, 
      hasAccessToken: hashParams.has('access_token'),
      user: !!user 
    });

    // Determinar o tipo de verificação baseado nos parâmetros do Supabase
    const isPasswordReset = detectedType === 'recovery';
    const isEmailChange = detectedType === 'email_change';
    const isSignupVerification = detectedType === 'signup' || (!detectedType && hashParams.has('access_token'));
    
    console.log('📋 [VerifyPage] Tipos de verificação:', {
      isPasswordReset,
      isEmailChange, 
      isSignupVerification,
      isLoggedIn: !!user
    });

    // Redirecionamento direto para reset de senha
    if (isPasswordReset) {
      console.log('🔑 [VerifyPage] Detectado reset de senha, redirecionando para /reset-password');
      navigate('/reset-password', { replace: true });
      return;
    }

    // Redirecionamento direto para mudança de email
    if (isEmailChange) {
      console.log('📧 [VerifyPage] Detectado mudança de email, redirecionando para /reset-email com hash de sucesso');
      // Adiciona o hash para que a ResetEmailPage reconheça o sucesso
      navigate('/reset-email#type=email_change', { replace: true });
      return;
    }

    // Se usuário está logado E não é ação específica, redirecionar para dashboard
    if (user && !isPasswordReset && !isEmailChange) {
      console.log('✅ [VerifyPage] Usuário logado sem ação específica, redirecionando para dashboard');
      navigate('/dashboard', { replace: true });
      return;
    }

    // Processar verificação de email de cadastro (signup)
    if (isSignupVerification) {
      console.log('📧 [VerifyPage] Processando verificação de email de cadastro');
      setIsProcessing(false);
      
      const timer = setTimeout(() => {
        setIsSuccess(true);
        // Use setTimeout to avoid setState during render
        setTimeout(() => {
          showSuccess({
            title: 'Email verificado!',
            description: 'Sua conta foi confirmada com sucesso.'
          });
        }, 0);

        console.log('🏠 [VerifyPage] Redirecionando para dashboard após verificação');
        setTimeout(() => navigate('/dashboard'), 3000);
      }, 1000);
      return () => clearTimeout(timer);
    }

    // Se chegou até aqui sem parâmetros válidos, iniciar timeout
    console.log('⚠️ [VerifyPage] Nenhum parâmetro válido encontrado, iniciando timeout');
    setIsProcessing(false);
    
    const timer = setTimeout(() => {
      console.error('❌ [VerifyPage] Timeout: Link inválido ou expirado');
      // Use setTimeout to avoid setState during render
      setTimeout(() => {
        showError({
          title: 'Falha na Verificação',
          description: 'O link de verificação é inválido ou expirou. Por favor, tente novamente.'
        });
      }, 0);
      setTimedOut(true);
    }, 15000);

    return () => clearTimeout(timer);
  }, [authLoading, user, showError, showSuccess, navigate]);
  if (isSuccess) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg glass-card">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold text-success">
              Verificação Concluída!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Seu email foi verificado com sucesso. Você será redirecionado automaticamente.
            </p>
            <div className="flex justify-center space-x-4">
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Ir para Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>;
  }
  if (timedOut) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg glass-card">
          <CardHeader className="text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold text-destructive">
              Link Inválido
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">Não foi possível verificar seu link. Ele pode ter expirado ou já ter sido usado.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Se você não encontrou o email de verificação, verifique também a pasta de spam/lixo eletrônico antes de solicitar um novo link.
            </p>
            <div className="flex flex-col space-y-2">
              <Button onClick={() => navigate('/auth', {
              replace: true
            })} className="w-full">
                Voltar para o Login
              </Button>
              <Link to="/reset-password" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Solicitar novo link de redefinição
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>;
  }
  // Mostrar loading enquanto auth está carregando ou processando
  if (authLoading || isProcessing) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg glass-card">
          <CardHeader className="text-center">
            <Mail className="h-16 w-16 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold">
              {authLoading ? 'Carregando...' : 'Verificando Email'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <HamsterLoader size="md" className="mx-auto" />
            <p className="text-muted-foreground">
              {authLoading ? 'Inicializando sistema...' : 'Verificando seu link, por favor aguarde...'}
            </p>
            <p className="text-sm text-muted-foreground">Este processo pode levar alguns segundos.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Se você não recebeu o email de verificação, verifique também a pasta de spam/lixo eletrônico.
            </p>
          </CardContent>
        </Card>
      </div>;
  }

  // Fallback para casos não tratados
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg glass-card">
        <CardHeader className="text-center">
          <AlertCircle className="h-16 w-16 text-warning mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold">
            Link Processado
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            O link foi processado. Se você não foi redirecionado automaticamente, clique no botão abaixo.
          </p>
          <Button onClick={() => navigate('/dashboard')} className="w-full">
            Ir para Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>;
};