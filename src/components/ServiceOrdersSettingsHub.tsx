import React, { Suspense, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import { Settings, Building2, User, FileText, Eye, EyeOff, Cookie as CookieIcon, ArrowLeft, Save, LogOut, HelpCircle, Lock, Mail, Menu, Home, BookOpen, Headphones, MessageCircle, Shield, Zap, CheckCircle2, Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CompanyBrandingSettings } from '@/components/CompanyBrandingSettings';
import { ResetAppButton } from './ResetAppButton';

const TermsPageLazy = React.lazy(() => import('@/pages/TermsPage').then((m) => ({
  default: m.TermsPage
})));
const PrivacyPageLazy = React.lazy(() => import('@/pages/PrivacyPage').then((m) => ({
  default: m.PrivacyPage
})));
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
// Removida integração de preferências de cookies
const CookiesPageLazy = React.lazy(() => import('@/pages/CookiesPage').then((m) => ({
  default: m.CookiesPage
})));
import { useLicense } from '@/hooks/useLicense';
import { Input } from '@/components/ui/input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
export function ServiceOrdersSettingsHub() {
  const navigate = useNavigate();
  const {
    user,
    signOut
  } = useAuth();
  const [activeTab, setActiveTab] = useState('empresa');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLicenseCode, setShowLicenseCode] = useState(false);
  const {
    licenseStatus,
    isLoading: licenseLoading,
    daysUntilExpiry,
    isExpired
  } = useLicense();
  const [displayName, setDisplayName] = useState<string>(user?.user_metadata?.name || '');
  const queryClient = useQueryClient();
  const {
    showSuccess,
    showError
  } = useToast();
  const updateProfileMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      const {
        data,
        error
      } = await supabase.from('user_profiles').update({
        name
      }).eq('id', user.id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['user-profile', user?.id]
      });
      showSuccess({
        title: 'Perfil atualizado',
        description: 'Seu nome foi atualizado com sucesso.'
      });
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      showError({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar seu nome.'
      });
    }
  });
  const handleSaveName = () => {
    if (!displayName.trim()) {
      showError({
        title: 'Campo obrigatório',
        description: 'O nome é obrigatório.'
      });
      return;
    }
    updateProfileMutation.mutate(displayName.trim());
  };

  // Preferências de cookies removidas; usaremos visualização da página completa

  const sections = [{
    id: 'empresa',
    label: 'Empresa',
    icon: Building2
  }, {
    id: 'perfil',
    label: 'Perfil Pessoal',
    icon: User
  }, {
    id: 'termos',
    label: 'Termos de Uso',
    icon: FileText
  }, {
    id: 'privacidade',
    label: 'Privacidade',
    icon: Eye
  }, {
    id: 'cookies',
    label: 'Cookies',
    icon: CookieIcon
  }] as const;
  return <div className="min-h-screen bg-background scroll-smooth pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-6xl mx-auto">
        {/* Header - iOS premium */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-2xl border-b border-border/30">
          <div className="flex items-center justify-between px-4 py-3">
            <Button variant="ghost" onClick={() => navigate(-1)} className="sm:hidden rounded-xl h-10 w-10 p-0" aria-label="Voltar">
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center space-x-3 cursor-pointer rounded-xl hover:bg-muted/40 active:scale-[0.99] transition-colors px-1.5 py-1" onClick={() => navigate('/settings')} role="button" tabIndex={0} aria-label="Ir para Configurações" onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/settings');
            }
          }}>
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Settings className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Configurações</h1>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" className="hidden sm:flex h-10 px-4 rounded-xl" onClick={() => navigate('/dashboard')} aria-label="Ir para Dashboard">
                <Home className="h-5 w-5" />
              </Button>
              <Button variant="outline" className="sm:hidden h-10 px-3 rounded-xl" onClick={() => setIsMenuOpen(true)} aria-label="Abrir menu de seções">
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tabs - iOS segmented control style */}
          <TabsList className="hidden sm:flex flex-wrap gap-1 bg-muted/30 p-1 rounded-2xl border border-border/30">
            <TabsTrigger value="empresa" className="flex items-center gap-2 h-10 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Building2 className="h-4 w-4" /> Empresa
            </TabsTrigger>
            <TabsTrigger value="perfil" className="flex items-center gap-2 h-10 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <User className="h-4 w-4" /> Perfil
            </TabsTrigger>
            <TabsTrigger value="termos" className="flex items-center gap-2 h-10 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <FileText className="h-4 w-4" /> Termos
            </TabsTrigger>
            <TabsTrigger value="privacidade" className="flex items-center gap-2 h-10 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Eye className="h-4 w-4" /> Privacidade
            </TabsTrigger>
            <TabsTrigger value="cookies" className="flex items-center gap-2 h-10 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <CookieIcon className="h-4 w-4" /> Cookies
            </TabsTrigger>
          </TabsList>

          {/* Indicador de seção atual em mobile */}
          <div className="sm:hidden flex items-center justify-between rounded-xl border border-border/30 bg-muted/10 p-3">
            <div className="text-sm text-muted-foreground">Seção: <span className="font-medium text-foreground">{sections.find((s) => s.id === activeTab)?.label}</span></div>
            <Button variant="outline" className="h-9 rounded-xl text-xs" onClick={() => setIsMenuOpen(true)}>
              <Menu className="h-4 w-4 mr-1.5" /> Trocar
            </Button>
          </div>

          {/* Empresa / Branding */}
          <TabsContent value="empresa" className="space-y-4">
            <Card className="rounded-2xl border-border/30">
              <CardContent className="pt-6">
                <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-muted" aria-busy="true" aria-live="polite" />}>
                  <CompanyBrandingSettings />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Perfil Pessoal */}
          <TabsContent value="perfil" className="space-y-4">
            <Card className="rounded-2xl border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Perfil Pessoal</CardTitle>
                <CardDescription>Informações da sua conta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {user ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">E-mail</p>
                      <p className="text-foreground font-medium">{user.email}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">Nome</p>
                      <div className="space-y-2">
                        <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Seu nome de usuário" />
                        <Button onClick={handleSaveName} disabled={updateProfileMutation.isPending} className="h-11 min-h-[44px]">
                          <Save className="h-4 w-4 mr-2" />
                          {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar nome'}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Licença </p>
                      <div className="text-foreground font-medium space-y-1">
                        {licenseLoading ? <span className="text-muted-foreground">Verificando licença...</span> : licenseStatus?.license_code ? <>
                            <div className="flex items-center gap-1">
                              <span className="font-mono tracking-wider">
                                {showLicenseCode ? licenseStatus.license_code : '***'}
                              </span>
                              <button
                            onClick={() => setShowLicenseCode(!showLicenseCode)}
                            className="ml-2 w-6 h-6 flex items-center justify-center hover:bg-muted/50 rounded transition-colors"
                            title={showLicenseCode ? 'Ocultar código' : 'Mostrar código'}
                            aria-label={showLicenseCode ? 'Ocultar código da licença' : 'Mostrar código da licença'}>
                            
                                {showLicenseCode ?
                            <EyeOff className="h-3 w-3 text-primary" /> :

                            <Eye className="h-3 w-3 text-primary" />
                            }
                              </button>
                            </div>
                            <div className="text-muted-foreground">
                              {isExpired ? 'Licença expirada' : daysUntilExpiry !== null ? `Expira daqui a ${daysUntilExpiry} dias` : 'Verificação em andamento'}
                            </div>
                          </> : <span className="text-muted-foreground">Sem licença ativa</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Função</p>
                      <p className="text-foreground font-medium">{user.app_metadata?.role || 'usuário'}</p>
                    </div>
                  </div> : <div className="text-muted-foreground">Você precisa estar logado para ver seu perfil.</div>}
                {user && <div className="space-y-3">
                    <Separator />
                    <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                      <Button variant="outline" onClick={() => navigate('/reset-password')} className="h-11 w-full sm:w-auto rounded-xl">
                        <Lock className="h-4 w-4 mr-2" />
                        Redefinir Senha
                      </Button>
                      <Button variant="outline" onClick={() => navigate('/reset-email')} className="h-11 w-full sm:w-auto rounded-xl">
                        <Mail className="h-4 w-4 mr-2" />
                        Atualizar E-mail
                      </Button>
                      <Button variant="outline" onClick={() => navigate('/suporte')} className="h-11 w-full sm:w-auto rounded-xl">
                        <HelpCircle className="h-4 w-4 mr-2" />
                        Suporte
                      </Button>
                      <Button variant="destructive" className="h-11 w-full sm:w-auto rounded-xl" onClick={async () => {
                      await signOut();
                      navigate('/');
                    }}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Sair da Conta
                       </Button>
                      <ResetAppButton variant="outline" size="default" className="h-11 w-full sm:w-auto text-xs rounded-xl" />
                    </div>
                  </div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Segurança removida */}

          {/* Termos de Uso */}
          <TabsContent value="termos" className="space-y-4">
            <Card className="rounded-2xl border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Termos de Uso</CardTitle>
                <CardDescription>Consulte os termos e condições de uso da plataforma</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button variant="outline" className="h-11 rounded-xl" onClick={() => navigate('/terms')}>Abrir página</Button>
                </div>
                <div className="max-h-[70vh] overflow-auto rounded-xl border border-border/30 bg-card">
                  <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-muted" aria-busy="true" aria-live="polite" />}> 
                    <TermsPageLazy />
                  </Suspense>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacidade */}
          <TabsContent value="privacidade" className="space-y-4">
            <Card className="rounded-2xl border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5" /> Política de Privacidade</CardTitle>
                <CardDescription>Saiba como protegemos e utilizamos seus dados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button variant="outline" className="h-11 rounded-xl" onClick={() => navigate('/privacy')}>Abrir página</Button>
                </div>
                <div className="max-h-[70vh] overflow-auto rounded-xl border border-border/30 bg-card">
                  <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-muted" aria-busy="true" aria-live="polite" />}> 
                    <PrivacyPageLazy />
                  </Suspense>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cookies */}
          <TabsContent value="cookies" className="space-y-4">
            <Card className="rounded-2xl border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CookieIcon className="h-5 w-5" /> Política de Cookies</CardTitle>
                <CardDescription>Entenda como utilizamos cookies em nosso site</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button variant="outline" className="h-11 rounded-xl" onClick={() => navigate('/cookies')}>Abrir página</Button>
                </div>
                <div className="max-h-[70vh] overflow-auto rounded-xl border border-border/30 bg-card">
                  <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-muted" aria-busy="true" aria-live="polite" />}> 
                    <CookiesPageLazy />
                  </Suspense>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-center">
          <Button variant="ghost" onClick={() => navigate(-1)} className="h-11 rounded-xl text-muted-foreground hover:text-foreground transition-colors" aria-label="Voltar" title="Voltar">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>
        </div>
      </div>

      {/* Drawer de seções para mobile */}
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="left" className="w-[85vw] sm:w-96">
          <SheetHeader>
            <SheetTitle className="text-lg font-bold">Configurações</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-1.5">
            <Button
            variant="ghost"
            className="w-full justify-start h-12 rounded-xl"
            onClick={() => {
              navigate('/dashboard');
              setIsMenuOpen(false);
            }}
            aria-label="Ir para Home">
            
              <Home className="h-5 w-5 mr-3" /> Home
            </Button>
            {sections.map(({
            id,
            label,
            icon: Icon
          }) => <Button key={id} variant={activeTab === id ? 'default' : 'ghost'} className="w-full justify-start h-12 rounded-xl" onClick={() => {
            setActiveTab(id);
            setIsMenuOpen(false);
          }}>
                <Icon className="h-5 w-5 mr-3" /> {label}
              </Button>)}
          </div>
        </SheetContent>
      </Sheet>
    </div>;
}
export default ServiceOrdersSettingsHub;