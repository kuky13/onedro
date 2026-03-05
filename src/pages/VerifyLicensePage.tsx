// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft, Clock, Calendar, Shield, MessageCircle, Phone, Mail, MapPin, Copy, Check, RefreshCw, AlertCircle, User, ShoppingCart } from 'lucide-react';
import { HamsterLoader } from '@/components/ui/hamster-loader';
import { useAuth } from '@/hooks/useAuth';
import { useLicenseVerificationOptimized } from '@/hooks/useLicenseVerificationOptimized';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/useToast';
export default function VerifyLicensePage() {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    showSuccess
  } = useToast();
  const [copiedLicense, setCopiedLicense] = useState(false);

  // Usar o hook otimizado para verificação de licença
  const {
    data: licenseData,
    isLoading,
    error,
    refetch
  } = useLicenseVerificationOptimized(user?.id || null, {
    skipCache: true,
    // Sempre buscar dados frescos na página de verificação
    enableRealtime: false // Desabilitar WebSocket na página de verificação
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
  const getStatusIcon = () => {
    if (isLoading) return <HamsterLoader size="md" className="mx-auto" />;
    if (!licenseData?.has_license) {
      return <XCircle className="h-8 w-8 text-red-600" />;
    }
    if (licenseData.is_valid) {
      return <CheckCircle className="h-8 w-8 text-green-600" />;
    }
    return;
  };
  const getStatusText = (isValid?: boolean, status?: string) => {
    if (isLoading) return 'Verificando licença...';
    if (!licenseData?.has_license) {
      return 'Sem licença';
    }
    if (isValid !== undefined) {
      if (isValid) return 'Válida';
      if (status === 'inativa') return 'Inativa';
      if (status === 'expirada') return 'Expirada';
      return 'Inválida';
    }
    if (licenseData.is_valid) {
      return 'Licença Ativa';
    }
    if (licenseData.expired_at) {
      return 'Licença Expirada';
    }
    return 'Licença Desativada';
  };
  const getStatusColor = (isValid?: boolean, status?: string) => {
    if (isLoading) return 'text-blue-600';
    if (!licenseData?.has_license) {
      return 'text-gray-600';
    }
    if (isValid !== undefined) {
      if (isValid) return 'text-emerald-600';
      if (status === 'inativa') return 'text-amber-600';
      if (status === 'expirada') return 'text-rose-600';
      return 'text-gray-600';
    }
    if (licenseData.is_valid) {
      return 'text-emerald-600';
    }
    return 'text-orange-600';
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
    return <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Faça Login para Verificar</h2>
            <p className="text-muted-foreground mb-4">Para verificar o status da sua licença, você precisa estar logado no sistema.</p>
            <div className="space-y-2">
              <Button onClick={() => navigate('/auth')} className="w-full">
                Fazer Login
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                Voltar ao Início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Header */}
        <div className="lg:col-span-3 text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Verificação de Licença</h1>
          <p className="text-muted-foreground">
            Informações sobre sua licença do sistema
          </p>
        </div>

        {/* License Status Card */}
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Status da Licença</CardTitle>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Status da Licença */}
            <div className="text-center mb-8">
              {getStatusIcon()}
              <h2 className={`text-2xl font-bold mt-4 mb-2 ${getStatusColor()}`}>
                {getStatusText()}
              </h2>
              <p className="text-muted-foreground">
                {licenseData?.message || 'Verificando status...'}
              </p>
            </div>

            {/* Detalhes da Licença */}
            {licenseData?.has_license && <div className="space-y-4 mb-6">
                {/* Código da Licença */}
                {licenseData.license_code && <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-primary" />
                      <span className="font-medium text-foreground">Licença:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-foreground bg-muted px-3 py-1 rounded border">
                        {licenseData.license_code}
                      </span>
                      <Button variant="outline" size="sm" onClick={handleCopyLicense} className="h-8 w-8 p-0">
                        {copiedLicense ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>}

                {/* Data de Ativação */}
                {licenseData.activated_at && <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-foreground">Ativada em:</span>
                    </div>
                    <span className="text-foreground">
                      {formatDate(licenseData.activated_at)}
                    </span>
                  </div>}

                {/* Data de Expiração */}
                {licenseData.expires_at && <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-orange-600" />
                      <span className="font-medium text-foreground">Expira em:</span>
                    </div>
                    <span className="text-foreground">
                      {formatDate(licenseData.expires_at)}
                    </span>
                  </div>}

                {/* Dias Restantes */}
                {licenseData.days_remaining !== null && licenseData.days_remaining !== undefined && <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-primary" />
                      <span className="font-medium text-foreground">Dias restantes:</span>
                    </div>
                    <span className={`font-semibold ${licenseData.days_remaining > 30 ? 'text-green-600' : licenseData.days_remaining > 7 ? 'text-orange-600' : 'text-red-600'}`}>
                      {licenseData.days_remaining}
                    </span>
                  </div>}

                {/* Status da Validação */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">Status:</span>
                  </div>
                  <span className={`font-semibold px-3 py-1 rounded-lg text-sm border ${licenseData.is_valid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : licenseData.status === 'inativa' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {getStatusText(licenseData.is_valid, licenseData.status)}
                  </span>
                </div>
              </div>}

            {/* Alerta para licenças inativas */}
            {licenseData?.has_license && !licenseData?.is_valid && <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription>
                  <strong className="text-orange-800">Licença Inativa</strong>
                  <p className="text-sm text-orange-700 mt-1">
                    {licenseData.requires_renewal ? 'Sua licença expirou e precisa ser renovada.' : 'Sua licença está desativada. Entre em contato com o suporte para reativá-la.'}
                  </p>
                </AlertDescription>
              </Alert>}

            {/* Alerta para usuários sem licença */}
            {!licenseData?.has_license && !isLoading && <Alert className="border-amber-200 bg-amber-50">
                <XCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription>
                  <strong className="text-amber-800">Nenhuma Licença Encontrada</strong>
                  <p className="text-sm text-amber-700 mt-1">
                    Você não possui uma licença ativa. Entre em contato com o suporte para adquirir uma licença.
                  </p>
                </AlertDescription>
              </Alert>}

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button variant="outline" onClick={() => navigate(-1)} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={() => navigate('/plans')} className="flex-1">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Ver Planos
              </Button>
              <Button onClick={refetch} disabled={isLoading} className="flex-1">
                {isLoading ? <HamsterLoader size="sm" className="mr-2" /> : 'Verificar Novamente'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Support Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Suporte e Contato
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Nossa equipe está pronta para ajudar você
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* WhatsApp */}
            <div className="space-y-3">
              <Button onClick={handleWhatsAppContact} className="w-full bg-green-600 hover:bg-green-700 text-white">
                <MessageCircle className="mr-2 h-4 w-4" />
                Suporte via WhatsApp
              </Button>
              <p className="text-xs text-center text-muted-foreground">Resposta em até 1 hora (horário comercial)</p>
            </div>

            <Separator />

            {/* Contact Info */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Outros Contatos:</h4>
              
              <Button onClick={handleEmailContact} variant="outline" className="w-full justify-start">
                <Mail className="mr-2 h-4 w-4" />
                suporte@onedrip.email
              </Button>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>(64) 99602-8022</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Mineiros, GO - Brasil</span>
              </div>
            </div>

            <Separator />

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="mr-1 h-3 w-3" />
                Suporte Ativo
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Shield className="mr-1 h-3 w-3" />
                Seguro
              </Badge>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Precisa de ajuda?</strong> Entre em contato via WhatsApp para suporte técnico ou renovação de licença.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>;
}