import { Suspense, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  BookOpen,
  Eye,
  EyeOff,
  Headphones,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  Save,
  Settings,
  Shield,
  User,
} from 'lucide-react';
import { CompanyBrandingSettings } from '@/components/CompanyBrandingSettings';
import { ResetAppButton } from './ResetAppButton';
import { AccountDataSettingsLite } from '@/components/lite/AccountDataSettingsLite';
import { DataPrivacyTab } from '@/components/settings/DataPrivacyTab';
import { useAuth } from '@/hooks/useAuth';
import { useLicense } from '@/hooks/useLicense';
import { useResponsive } from '@/hooks/useResponsive';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';

const SECTIONS = [
  {
    id: 'empresa',
    label: 'Empresa',
    description: 'Logo, informações e identidade visual',
    icon: Building2,
  },
  {
    id: 'perfil',
    label: 'Perfil',
    description: 'Conta, segurança e preferências',
    icon: User,
  },
  {
    id: 'privacidade',
    label: 'Privacidade',
    description: 'Gerenciamento de dados e LGPD',
    icon: Shield,
  },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function useActiveSection(sectionIds: readonly string[]) {
  const [activeId, setActiveId] = useState(sectionIds[0] ?? '');

  useEffect(() => {
    if (!sectionIds.length) return;
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0));
        const next = visible[0]?.target instanceof HTMLElement ? visible[0].target.id : undefined;
        if (next) setActiveId(next);
      },
      {
        root: null,
        rootMargin: '-10% 0px -70% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionIds.join('|')]);

  return activeId;
}

export function ServiceOrdersSettingsHub() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isDesktop } = useResponsive();
  const [showLicenseCode, setShowLicenseCode] = useState(false);
  const { licenseStatus, isLoading: licenseLoading, daysUntilExpiry, isExpired } = useLicense();
  const [displayName, setDisplayName] = useState<string>(user?.user_metadata?.name || '');
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const sectionIds = useMemo(() => SECTIONS.map((s) => s.id), []);
  const activeSection = useActiveSection(sectionIds);
  const [mobileSection, setMobileSection] = useState<SectionId>(SECTIONS[0].id);

  useEffect(() => {
    const match = SECTIONS.find((s) => s.id === activeSection);
    if (match) setMobileSection(match.id);
  }, [activeSection]);

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
    <div className="min-h-[100dvh] bg-background">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50">
          <div className="flex items-center justify-between py-3 lg:py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => navigate('/chat')}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Drippy
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => navigate('/docs')}>
                <BookOpen className="h-4 w-4 mr-2" />
                Ajuda
              </Button>
            </div>
          </div>
        </header>

        <main className="py-6 lg:py-10 space-y-6 lg:space-y-10">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
                <Settings className="h-4 w-4" />
                Configurações
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                Ajustes da sua conta e do sistema
              </h1>
              <p className="text-sm lg:text-base text-muted-foreground max-w-2xl">
                Tudo fica organizado por seções, com o mesmo visual do painel.
              </p>
            </div>
          </div>

          <div className="lg:hidden">
            <Select
              value={mobileSection}
              onValueChange={(v) => {
                const next = v as SectionId;
                setMobileSection(next);
                scrollToSection(next);
              }}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Ir para..." />
              </SelectTrigger>
              <SelectContent>
                {SECTIONS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={isDesktop ? 'desktop-dashboard-layout' : 'space-y-6'}>
            <div className={isDesktop ? 'desktop-dashboard-main' : 'space-y-6'}>
              <section id="empresa" className="scroll-mt-28">
                <div className="desktop-card">
                  <div className="flex flex-col gap-1 mb-6">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-foreground">Empresa</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">Logo, informações e identidade visual</p>
                  </div>
                  <div className="space-y-6">
                    <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-muted" />}>
                      <CompanyBrandingSettings variant="embedded" />
                    </Suspense>
                    {user && (
                      <AccountDataSettingsLite userId={user.id} userEmail={user.email ?? ''} />
                    )}
                  </div>
                </div>
              </section>

              <section id="perfil" className="scroll-mt-28">
                <div className="desktop-card">
                  <div className="flex flex-col gap-1 mb-6">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold text-foreground">Perfil</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">Conta, segurança e preferências</p>
                  </div>

                  <div className="space-y-5">
                    {user ? (
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">E-mail</p>
                          <p className="text-foreground font-medium">{user.email}</p>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome</p>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Input
                              id="displayName"
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              placeholder="Seu nome de usuário"
                              className="flex-1"
                            />
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
                                    type="button"
                                    onClick={() => setShowLicenseCode(!showLicenseCode)}
                                    className="ml-2 w-7 h-7 flex items-center justify-center hover:bg-muted/50 rounded-lg transition-colors"
                                    title={showLicenseCode ? 'Ocultar código' : 'Mostrar código'}
                                    aria-label={showLicenseCode ? 'Ocultar código da licença' : 'Mostrar código da licença'}
                                  >
                                    {showLicenseCode ? (
                                      <EyeOff className="h-3.5 w-3.5 text-primary" />
                                    ) : (
                                      <Eye className="h-3.5 w-3.5 text-primary" />
                                    )}
                                  </button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {isExpired
                                    ? 'Licença expirada'
                                    : daysUntilExpiry !== null
                                      ? `Expira em ${daysUntilExpiry} dias`
                                      : 'Verificando...'}
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
                            <Headphones className="h-4 w-4 mr-2" /> Suporte
                          </Button>
                          <Button
                            variant="destructive"
                            className="h-11 w-full sm:w-auto rounded-xl"
                            onClick={async () => {
                              await signOut();
                              navigate('/');
                            }}
                          >
                            <LogOut className="h-4 w-4 mr-2" /> Sair da Conta
                          </Button>
                          <ResetAppButton variant="outline" size="default" className="h-11 w-full sm:w-auto text-xs rounded-xl" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section id="privacidade" className="scroll-mt-28">
                <div className="desktop-card">
                  <div className="flex flex-col gap-1 mb-6">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold text-foreground">Privacidade</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">Gerenciamento de dados e LGPD</p>
                  </div>
                  <div>
                    {user && <DataPrivacyTab userId={user.id} />}
                  </div>
                </div>
              </section>
            </div>

            {isDesktop && (
            <aside className="desktop-dashboard-sidebar">
              <div className="desktop-card">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Navegação</h3>
                </div>
                <div className="space-y-1">
                  {SECTIONS.map((s) => {
                    const Icon = s.icon;
                    const isActive = activeSection === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => scrollToSection(s.id)}
                        className={`w-full rounded-xl px-3 py-2 text-left transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-foreground'
                            : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span className="text-sm font-medium">{s.label}</span>
                        </div>
                        <div className="pl-6 text-xs text-muted-foreground">{s.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="desktop-card">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Ajuda</h3>
                </div>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => navigate('/docs')}>
                    <BookOpen className="h-4 w-4 mr-2" /> Central de Ajuda
                  </Button>
                  <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => navigate('/suporte')}>
                    <Headphones className="h-4 w-4 mr-2" /> Falar com Suporte
                  </Button>
                  <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => navigate('/chat')}>
                    <MessageCircle className="h-4 w-4 mr-2" /> Chat com Drippy
                  </Button>
                </div>
              </div>
            </aside>
            )}
          </div>

          <div className="pt-2 text-xs text-muted-foreground">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p>© {new Date().getFullYear()} OneDrip. Todos os direitos reservados.</p>
                <p className="text-[10px] text-muted-foreground/70">CNPJ: 64.797.431/0001-03</p>
              </div>
              <div className="flex items-center gap-3">
                <Link to="/terms" className="hover:text-foreground transition-colors">Termos</Link>
                <span>•</span>
                <Link to="/privacy" className="hover:text-foreground transition-colors">Privacidade</Link>
                <span>•</span>
                <Link to="/cookies" className="hover:text-foreground transition-colors">Cookies</Link>
              </div>
            </div>
          </div>
        </main>
      </div>

      <div className="lg:hidden px-4 pb-10">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ajuda</CardTitle>
            <CardDescription>Suporte e atalhos rápidos</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/docs')}>
              <BookOpen className="h-4 w-4 mr-2" /> Central de Ajuda
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/suporte')}>
              <Headphones className="h-4 w-4 mr-2" /> Falar com Suporte
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/chat')}>
              <MessageCircle className="h-4 w-4 mr-2" /> Chat com Drippy
            </Button>
          </CardContent>
        </Card>
      </div>

    </div>

  );
}

export default ServiceOrdersSettingsHub;
