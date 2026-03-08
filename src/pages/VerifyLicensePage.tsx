// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft, Clock, Calendar, Shield, MessageCircle, Phone, Mail, MapPin, Copy, Check, RefreshCw, Key, Eye, EyeOff, ShoppingCart, LifeBuoy, Search } from 'lucide-react';
import { HamsterLoader } from '@/components/ui/hamster-loader';
import { useAuth } from '@/hooks/useAuth';
import { useLicenseVerificationOptimized } from '@/hooks/useLicenseVerificationOptimized';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';

export default function VerifyLicensePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const [copiedLicense, setCopiedLicense] = useState(false);
  const [showLicenseCode, setShowLicenseCode] = useState(false);

  const {
    data: licenseData,
    isLoading,
    error,
    refetch
  } = useLicenseVerificationOptimized(user?.id || null, {
    skipCache: true,
    enableRealtime: false
  });

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Não informado';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Data inválida';
    }
  };

  const getStatusConfig = () => {
    if (isLoading) return {
      icon: <RefreshCw className="h-5 w-5 text-primary animate-spin" />,
      title: 'Verificando licença...',
      description: 'Aguarde enquanto verificamos o status.',
      accentClass: 'border-primary/20',
      iconBg: 'bg-primary/10',
      titleColor: 'text-primary',
    };
    if (!licenseData?.has_license) return {
      icon: <XCircle className="h-5 w-5 text-destructive" />,
      title: 'Sem Licença',
      description: 'Você não possui uma licença ativa no momento.',
      accentClass: 'border-destructive/30',
      iconBg: 'bg-destructive/10',
      titleColor: 'text-destructive',
    };
    if (licenseData.is_valid) return {
      icon: <Shield className="h-5 w-5 text-primary" />,
      title: 'Licença Ativa',
      description: licenseData.message || 'Sua licença está válida e funcionando.',
      accentClass: 'border-primary/20',
      iconBg: 'bg-primary/10',
      titleColor: 'text-primary',
    };
    if (licenseData.status === 'expirada') return {
      icon: <Clock className="h-5 w-5 text-destructive" />,
      title: 'Licença Expirada',
      description: 'Sua licença expirou. Renove para continuar usando.',
      accentClass: 'border-destructive/30',
      iconBg: 'bg-destructive/10',
      titleColor: 'text-destructive',
    };
    return {
      icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
      title: 'Licença Inativa',
      description: 'Sua licença está desativada. Entre em contato com o suporte.',
      accentClass: 'border-yellow-500/30',
      iconBg: 'bg-yellow-500/10',
      titleColor: 'text-yellow-600',
    };
  };

  const handleCopyLicense = () => {
    if (licenseData?.license_code) {
      navigator.clipboard.writeText(licenseData.license_code);
      setCopiedLicense(true);
      showSuccess({
        title: 'Copiado!',
        description: 'Código da licença copiado para a área de transferência.'
      });
      setTimeout(() => setCopiedLicense(false), 2000);
    }
  };

  const handleWhatsAppContact = () => {
    const licenseCode = licenseData?.license_code || 'Não informado';
    let message = `Olá! Preciso de ajuda com minha licença do OneDrip.\n\nMeu email: ${user?.email || 'Não informado'}`;
    if (licenseData?.license_code) {
      message += `\n\nCódigo da licença atual: ${licenseCode}`;
    }
    const whatsappUrl = `https://wa.me/5564996028022?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleEmailContact = () => {
    const licenseCode = licenseData?.license_code || 'Não informado';
    const subject = 'Suporte - Licença OneDrip';
    let body = `Olá!\n\nPreciso de ajuda com minha licença do OneDrip.\n\nMeu email: ${user?.email || 'Não informado'}`;
    if (licenseData?.license_code) {
      body += `\n\nCódigo da licença atual: ${licenseCode}`;
    }
    const mailtoUrl = `mailto:suporte@onedrip.email?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Faça Login para Verificar</h2>
          <p className="text-sm text-muted-foreground">Para verificar o status da sua licença, você precisa estar logado no sistema.</p>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/auth')}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 px-4 rounded-xl text-sm font-medium transition-colors"
            >
              Fazer Login
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full border border-border/60 bg-background hover:bg-muted/50 text-foreground py-2.5 px-4 rounded-xl text-sm font-medium transition-colors"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      </div>
    );
  }

  const status = getStatusConfig();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-10 space-y-6">
        
        {/* Hero Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl border border-border/60 bg-card flex items-center justify-center hover:bg-muted/50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            Verificação de Licença
          </h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            Informações completas sobre sua licença do sistema
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          
          {/* License Status Card */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Status principal */}
            <div className={`rounded-2xl border ${status.accentClass} bg-card p-5 space-y-4`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${status.iconBg} flex items-center justify-center flex-shrink-0`}>
                  {status.icon}
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${status.titleColor}`}>{status.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{status.description}</p>
                </div>
              </div>
            </div>

            {/* Detalhes da Licença */}
            {licenseData?.has_license && (
              <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  Detalhes da Licença
                </h3>

                {/* Código da Licença */}
                {licenseData.license_code && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Key className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Código:</span>
                    <div className="flex-1 bg-muted/20 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-foreground">
                        {showLicenseCode ? licenseData.license_code : '••••••••••••'}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setShowLicenseCode(!showLicenseCode)}
                          className="w-6 h-6 rounded-lg border border-border/60 bg-background/80 flex items-center justify-center hover:bg-muted/50 transition-colors"
                        >
                          {showLicenseCode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={handleCopyLicense}
                          className="w-6 h-6 rounded-lg bg-primary/90 text-primary-foreground flex items-center justify-center hover:bg-primary transition-colors"
                        >
                          {copiedLicense ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ativação */}
                {licenseData.activated_at && (
                  <div className="flex items-center justify-between rounded-xl bg-muted/20 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="h-3.5 w-3.5 text-primary" />
                      <span>Ativada em</span>
                    </div>
                    <span className="text-xs font-medium text-foreground">{formatDate(licenseData.activated_at)}</span>
                  </div>
                )}

                {/* Expiração */}
                {licenseData.expires_at && (
                  <div className="flex items-center justify-between rounded-xl bg-muted/20 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 text-yellow-500" />
                      <span>Expira em</span>
                    </div>
                    <span className="text-xs font-medium text-foreground">{formatDate(licenseData.expires_at)}</span>
                  </div>
                )}

                {/* Dias restantes */}
                {licenseData.days_remaining !== null && licenseData.days_remaining !== undefined && (
                  <div className="flex items-center justify-between rounded-xl bg-muted/20 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span>Dias restantes</span>
                    </div>
                    <span className={`text-xs font-bold ${
                      licenseData.days_remaining > 30 ? 'text-primary' : 
                      licenseData.days_remaining > 7 ? 'text-yellow-600' : 'text-destructive'
                    }`}>
                      {licenseData.days_remaining}
                    </span>
                  </div>
                )}

                {/* Status badge */}
                <div className="flex items-center justify-between rounded-xl bg-muted/20 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3.5 w-3.5" />
                    <span>Status</span>
                  </div>
                  <Badge variant={licenseData.is_valid ? 'default' : 'destructive'} className="text-[10px] rounded-lg">
                    {licenseData.is_valid ? 'Válida' : licenseData.status === 'inativa' ? 'Inativa' : licenseData.status === 'expirada' ? 'Expirada' : 'Inválida'}
                  </Badge>
                </div>
              </div>
            )}

            {/* Alerta */}
            {licenseData?.has_license && !licenseData?.is_valid && (
              <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Licença Inativa</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {licenseData.requires_renewal
                      ? 'Sua licença expirou e precisa ser renovada.'
                      : 'Sua licença está desativada. Entre em contato com o suporte para reativá-la.'}
                  </p>
                </div>
              </div>
            )}

            {!licenseData?.has_license && !isLoading && (
              <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <XCircle className="h-4 w-4 text-yellow-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Nenhuma Licença Encontrada</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Você não possui uma licença ativa. Entre em contato com o suporte para adquirir uma.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/plans')}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 px-4 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Ver Planos
              </button>
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="flex-1 border border-border/60 bg-card hover:bg-muted/50 text-foreground py-2.5 px-4 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Verificar Novamente
              </button>
            </div>
          </div>

          {/* Support Sidebar */}
          <div className="space-y-4">
            
            {/* Suporte Card */}
            <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Suporte e Contato</h3>
                  <p className="text-xs text-muted-foreground">Estamos prontos para ajudar</p>
                </div>
              </div>

              {/* WhatsApp */}
              <button
                onClick={handleWhatsAppContact}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Suporte via WhatsApp
              </button>
              <p className="text-[10px] text-center text-muted-foreground -mt-2">Resposta em até 1 hora (horário comercial)</p>

              {/* Email */}
              <button
                onClick={handleEmailContact}
                className="w-full border border-border/60 bg-background hover:bg-muted/50 text-foreground py-2.5 px-4 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                suporte@onedrip.email
              </button>

              {/* Contato Info */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span>(64) 99602-8022</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Mineiros, GO - Brasil</span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 pt-1">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/20 rounded-lg px-2 py-1">
                  <CheckCircle className="h-3 w-3 text-primary" />
                  Suporte Ativo
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/20 rounded-lg px-2 py-1">
                  <Shield className="h-3 w-3 text-primary" />
                  Seguro
                </div>
              </div>
            </div>

            {/* Dica */}
            <div className="rounded-2xl border border-border/50 bg-card p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <LifeBuoy className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground">Precisa de ajuda?</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Entre em contato via WhatsApp para suporte técnico ou renovação de licença.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
