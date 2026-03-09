import { Suspense, useState } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Link, useNavigate } from 'react-router-dom';
import {
  Settings, Building2, User, Eye, EyeOff,
  ArrowLeft, Save, LogOut, HelpCircle, Lock, Mail, Menu, Home, BookOpen,
  Headphones, MessageCircle, Shield, CheckCircle2, Zap
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CompanyBrandingSettings } from '@/components/CompanyBrandingSettings';
import { ResetAppButton } from './ResetAppButton';
import { AccountDataSettingsLite } from '@/components/lite/AccountDataSettingsLite';
import { DataPrivacyTab } from '@/components/settings/DataPrivacyTab';
import { useAuth } from '@/hooks/useAuth';
import { useLicense } from '@/hooks/useLicense';
import { Input } from '@/components/ui/input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';


const SECTIONS = [
  {
    id: 'empresa',
    label: 'Marca da Empresa',
    description: 'Logo, informações e identidade visual',
    icon: Building2,
    color: 'bg-blue-500',
  },
  {
    id: 'perfil',
    label: 'Perfil Pessoal',
    description: 'Conta, segurança e preferências',
    icon: User,
    color: 'bg-violet-500',
  },
  {
    id: 'privacidade',
    label: 'Dados e Privacidade',
    description: 'Gerenciamento de dados e LGPD',
    icon: Shield,
    color: 'bg-emerald-500',
  },
] as const;

const TRUST_BADGES = [
  { icon: Shield, text: 'Dados seguros' },
  { icon: Zap, text: 'Salvamento automático' },
];

export function ServiceOrdersSettingsHub() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('empresa');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLicenseCode, setShowLicenseCode] = useState(false);
  const { licenseStatus, isLoading: licenseLoading, daysUntilExpiry, isExpired } = useLicense();
  const [displayName, setDisplayName] = useState<string>(user?.user_metadata?.name || '');
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const updateProfileMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      const { data, error } = await supabase.from('user_profiles').update({ name }).eq('id', user.id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] });
      showSuccess({ title: 'Perfil atualizado', description: 'Seu nome foi atualizado com sucesso.' });
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      showError({ title: 'Erro ao salvar', description: 'Não foi possível atualizar seu nome.' });
    },
  });

  const handleSaveName = () => {
    if (!displayName.trim()) {
      showError({ title: 'Campo obrigatório', description: 'O nome é obrigatório.' });
      return;
    }
    updateProfileMutation.mutate(displayName.trim());
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="flex items-center justify-between px-4 h-14 max-w-7xl mx-auto lg:px-8">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="sm:hidden h-9 w-9 rounded-xl" onClick={() => navigate(-1)} aria-label="Voltar">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span className="font-semibold text-foreground">OneDrip</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:flex text-muted-foreground" onClick={() => navigate('/dashboard')}>
              <Home className="h-4 w-4 mr-1.5" /> Dashboard
            </Button>
            <Button variant="outline" size="icon" className="sm:hidden h-9 w-9 rounded-xl" onClick={() => setIsMenuOpen(true)} aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ===== HERO SECTION ===== */}
        <section className="px-4 py-8 lg:py-12">
          <div className="max-w-7xl mx-auto">
            <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
              {/* Left - Text */}
              <div className="text-center lg:text-left space-y-4 lg:space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  <Settings className="w-4 h-4" />
                  Configurações
                </div>

                <h1 className="text-3xl lg:text-5xl font-bold text-foreground leading-tight">
                  Gerencie sua <span className="text-primary">conta</span>
                </h1>

                <p className="text-muted-foreground text-base lg:text-lg max-w-lg mx-auto lg:mx-0">
                  Personalize sua experiência, ajuste configurações da empresa e gerencie seu perfil em um só lugar.
                </p>

                {/* Trust badges */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                  {TRUST_BADGES.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <item.icon className="w-3.5 h-3.5 text-primary" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right - Drippy Card (Desktop) */}
              <div className="hidden lg:block">
                <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5 border border-border/60 rounded-2xl p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <img
                        src="/lovable-uploads/e12ec9f1-06ab-4f49-8d81-78a481c5b4c0.png"
                        alt="Drippy"
                        className="w-16 h-16 rounded-full border-2 border-primary/30"
                      />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-background" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">Drippy - Assistente IA</h3>
                      <p className="text-sm text-muted-foreground">Ajuda inteligente 24/7</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Precisa de ajuda com as configurações? A Drippy pode te guiar passo a passo.
                  </p>
                  <Button className="w-full font-semibold" onClick={() => navigate('/chat')}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Conversar com Drippy
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Drippy Card Mobile */}
        <section className="px-4 pb-6 lg:hidden">
          <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5 border border-border/60 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <img
                  src="/lovable-uploads/e12ec9f1-06ab-4f49-8d81-78a481c5b4c0.png"
                  alt="Drippy"
                  className="w-12 h-12 rounded-full border-2 border-primary/30"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Drippy - IA</h3>
                <p className="text-xs text-muted-foreground">Ajuda 24/7</p>
              </div>
            </div>
            <Button className="w-full font-semibold" size="sm" onClick={() => navigate('/chat')}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Conversar com Drippy
            </Button>
          </div>
        </section>

        {/* ===== SECTION NAVIGATION CARDS ===== */}
        <section className="px-4 py-6 lg:py-10 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-6 lg:mb-10">
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">Seções</h2>
              <p className="text-muted-foreground">Escolha a seção que deseja configurar</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {SECTIONS.map((section) => {
                const IconComp = section.icon;
                const isActive = activeTab === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveTab(section.id)}
                    className={`group bg-card border rounded-xl p-4 lg:p-5 text-left transition-all duration-300 ${
                      isActive
                        ? 'border-primary/50 shadow-lg ring-1 ring-primary/20'
                        : 'border-border/60 hover:border-primary/40 hover:shadow-lg'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-11 h-11 lg:w-12 lg:h-12 rounded-xl ${section.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md`}
                      >
                        <IconComp className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground mb-0.5">{section.label}</h3>
                        <p className="text-xs text-muted-foreground">{section.description}</p>
                      </div>
                      {isActive && (
                        <div className="flex-shrink-0 mt-1">
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== TAB CONTENT ===== */}
        <section className="px-4 py-6 lg:py-10">
          <div className="max-w-7xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* Empresa / Branding */}
              <TabsContent value="empresa" className="mt-0">
                <Card className="!border-0 !bg-muted/30 !rounded-2xl !shadow-none">
                  <CardContent className="pt-6">
                    <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-muted" />}>
                      <CompanyBrandingSettings />
                    </Suspense>
                  </CardContent>
                </Card>

                {user && (
                  <AccountDataSettingsLite 
                    userId={user.id} 
                    userEmail={user.email ?? ''} 
                    className="!border-0 !bg-muted/30 !rounded-2xl !shadow-none"
                  />
                )}
              </TabsContent>

              {/* Perfil Pessoal */}
              <TabsContent value="perfil" className="mt-0 space-y-6">
                <Card className="!border-0 !bg-muted/30 !rounded-2xl !shadow-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" /> Perfil Pessoal
                    </CardTitle>
                    <CardDescription>Gerencie suas informações pessoais e preferências de conta</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {user ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">E-mail</p>
                          <p className="text-foreground font-medium">{user.email}</p>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome</p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Seu nome de usuário" className="flex-1" />
                            <Button onClick={handleSaveName} disabled={updateProfileMutation.isPending} className="h-11 rounded-xl">
                              <Save className="h-4 w-4 mr-2" />
                              {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar'}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Licença</p>
                          <div className="text-foreground font-medium space-y-1">
                            {licenseLoading ? (
                              <span className="text-muted-foreground">Verificando licença...</span>
                            ) : licenseStatus?.license_code ? (
                              <>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono tracking-wider">
                                    {showLicenseCode ? licenseStatus.license_code : '•••••••'}
                                  </span>
                                  <button
                                    onClick={() => setShowLicenseCode(!showLicenseCode)}
                                    className="ml-2 w-7 h-7 flex items-center justify-center hover:bg-muted/50 rounded-lg transition-colors"
                                    title={showLicenseCode ? 'Ocultar código' : 'Mostrar código'}
                                    aria-label={showLicenseCode ? 'Ocultar código da licença' : 'Mostrar código da licença'}
                                  >
                                    {showLicenseCode ? <EyeOff className="h-3.5 w-3.5 text-primary" /> : <Eye className="h-3.5 w-3.5 text-primary" />}
                                  </button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {isExpired ? 'Licença expirada' : daysUntilExpiry !== null ? `Expira em ${daysUntilExpiry} dias` : 'Verificando...'}
                                </p>
                              </>
                            ) : (
                              <span className="text-muted-foreground">Sem licença ativa</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Função</p>
                          <p className="text-foreground font-medium">{user.app_metadata?.role || 'usuário'}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Você precisa estar logado para ver seu perfil.</p>
                    )}

                    {user && (
                      <div className="space-y-4">
                        <Separator />
                        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                          <Button variant="outline" onClick={() => navigate('/reset-password')} className="h-11 w-full sm:w-auto rounded-xl">
                            <Lock className="h-4 w-4 mr-2" /> Redefinir Senha
                          </Button>
                          <Button variant="outline" onClick={() => navigate('/reset-email')} className="h-11 w-full sm:w-auto rounded-xl">
                            <Mail className="h-4 w-4 mr-2" /> Atualizar E-mail
                          </Button>
                          <Button variant="outline" onClick={() => navigate('/suporte')} className="h-11 w-full sm:w-auto rounded-xl">
                            <HelpCircle className="h-4 w-4 mr-2" /> Suporte
                          </Button>
                          <Button variant="destructive" className="h-11 w-full sm:w-auto rounded-xl" onClick={async () => { await signOut(); navigate('/'); }}>
                            <LogOut className="h-4 w-4 mr-2" /> Sair da Conta
                          </Button>
                          <ResetAppButton variant="outline" size="default" className="h-11 w-full sm:w-auto text-xs rounded-xl" />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Dados e Privacidade */}
              <TabsContent value="privacidade" className="mt-0">
                <Card className="!border-0 !bg-muted/30 !rounded-2xl !shadow-none">
                  <CardContent className="pt-6">
                    <Dat{user && <DataPrivacyTab userId={user.id} />}               </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </div>
        </section>

        {/* ===== QUICK LINKS ===== */}
        <section className="px-4 py-6 lg:py-10 bg-gradient-to-b from-background to-muted/30">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-2">Precisa de mais ajuda?</h2>
              <p className="text-sm text-muted-foreground">Acesse nossos canais de suporte</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" className="h-12 rounded-xl justify-start sm:justify-center flex-1 max-w-xs" onClick={() => navigate('/help')}>
                <BookOpen className="h-4 w-4 mr-2 text-primary" /> Central de Ajuda
              </Button>
              <Button variant="outline" className="h-12 rounded-xl justify-start sm:justify-center flex-1 max-w-xs" onClick={() => navigate('/suporte')}>
                <Headphones className="h-4 w-4 mr-2 text-primary" /> Falar com Suporte
              </Button>
              <Button variant="outline" className="h-12 rounded-xl justify-start sm:justify-center flex-1 max-w-xs" onClick={() => navigate('/chat')}>
                <MessageCircle className="h-4 w-4 mr-2 text-primary" /> Chat com Drippy
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span>Resposta rápida</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span>Suporte em português</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span>Disponível 24/7</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="py-6 px-4 border-t border-border/40">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} OneDrip. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link to="/terms" className="hover:text-foreground transition-colors">Termos</Link>
              <span>•</span>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacidade</Link>
              <span>•</span>
              <Link to="/cookies" className="hover:text-foreground transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ===== MOBILE DRAWER ===== */}
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="left" className="w-[85vw] sm:w-96">
          <SheetHeader>
            <SheetTitle className="text-lg font-bold flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" /> Configurações
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start h-12 rounded-xl"
              onClick={() => { navigate('/dashboard'); setIsMenuOpen(false); }}
            >
              <Home className="h-5 w-5 mr-3" /> Home
            </Button>

            <Separator className="my-2" />

            {SECTIONS.map((section) => {
              const IconComp = section.icon;
              const isActive = activeTab === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => { setActiveTab(section.id); setIsMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                    isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg ${section.color} flex items-center justify-center shadow-sm`}>
                    <IconComp className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{section.label}</p>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </button>
              );
            })}

            <Separator className="my-2" />

            <Button variant="ghost" className="w-full justify-start h-12 rounded-xl text-primary" onClick={() => { navigate('/chat'); setIsMenuOpen(false); }}>
              <MessageCircle className="h-5 w-5 mr-3" /> Drippy IA
            </Button>
            <Button variant="ghost" className="w-full justify-start h-12 rounded-xl" onClick={() => { navigate('/help'); setIsMenuOpen(false); }}>
              <BookOpen className="h-5 w-5 mr-3" /> Central de Ajuda
            </Button>
            <Button variant="ghost" className="w-full justify-start h-12 rounded-xl" onClick={() => { navigate('/suporte'); setIsMenuOpen(false); }}>
              <Headphones className="h-5 w-5 mr-3" /> Suporte
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default ServiceOrdersSettingsHub;
