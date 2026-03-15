import { useMemo, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  Bell,
  Brush,
  Database,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useIOSDetection } from '@/hooks/useIOSDetection';
import { SettingsGroup, SettingsRow } from '@/components/lite/settings/SettingsLitePrimitives';
import { ProfileSettingsLite } from '@/components/lite/ProfileSettingsLite';
import { SecuritySettingsLite } from '@/components/lite/SecuritySettingsLite';
import { CompanySettingsLite } from '@/components/lite/CompanySettingsLite';
import { BudgetWarningSettingsLite } from '@/components/lite/BudgetWarningSettingsLite';
import { CacheClearSettingsLite } from '@/components/lite/CacheClearSettingsLite';
import { AccountDataSettingsLite } from '@/components/lite/AccountDataSettingsLite';

type SettingsLiteMode = 'route' | 'stack';

interface SettingsLiteProps {
  mode?: SettingsLiteMode;
  onBack?: () => void;
  userId?: string;
  profile?: any;
}

type SettingsItem = {
  key: string;
  group: string;
  title: string;
  description: string;
  icon: any;
  iconBgClassName: string;
  iconClassName: string;
  href?: string;
};

function getInitials(name?: string | null, email?: string | null) {
  const src = (name || '').trim() || (email || '').trim();
  if (!src) return 'U';
  const parts = src.split(/\s+/g).filter(Boolean);
  const a = parts[0]?.[0] ?? 'U';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1];
  return `${a}${b ?? ''}`.toUpperCase();
}

function SettingsMotionPage({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const variants = useMemo(
    () =>
      reduceMotion
        ? {
            initial: { opacity: 0 },
            animate: { opacity: 1, transition: { duration: 0.15 } },
            exit: { opacity: 0, transition: { duration: 0.15 } },
          }
        : {
            initial: { opacity: 0, x: 28 },
            animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: 'easeOut' } },
            exit: { opacity: 0, x: -28, transition: { duration: 0.18, ease: 'easeIn' } },
          },
    [reduceMotion]
  );

  return (
    <motion.div variants={variants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  );
}

function SettingsTopBar({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  return (
    <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border/40">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
        {onBack ? (
          <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 rounded-xl">
            <span className="sr-only">Voltar</span>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : null}
        <div className="min-w-0">
          <div className="text-base font-semibold text-foreground truncate">{title}</div>
          {subtitle ? <div className="text-xs text-muted-foreground truncate">{subtitle}</div> : null}
        </div>
      </div>
    </div>
  );
}

function SettingsHome({
  userName,
  userEmail,
  avatarUrl,
  items,
  appVersion,
  onNavigate,
}: {
  userName?: string | null;
  userEmail?: string | null;
  avatarUrl?: string | null;
  items: SettingsItem[];
  appVersion: string;
  onNavigate: (item: SettingsItem) => void;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return items;
    return items.filter((it) => {
      const hay = `${it.title} ${it.description} ${it.group}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, q]);

  const groups = useMemo(() => {
    const map = new Map<string, SettingsItem[]>();
    filtered.forEach((it) => {
      const arr = map.get(it.group) ?? [];
      arr.push(it);
      map.set(it.group, arr);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14 ring-1 ring-border/40">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={userName ?? userEmail ?? 'Usuário'} /> : null}
          <AvatarFallback className="text-base font-semibold bg-muted/50">
            {getInitials(userName, userEmail)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="text-base font-semibold text-foreground truncate">{userName || 'Sua conta'}</div>
          <div className="text-xs text-muted-foreground truncate">{userEmail || '—'}</div>
        </div>
      </div>

      <div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar nas configurações"
          className="h-11 rounded-2xl bg-muted/30 backdrop-blur-sm border-border/30 focus-visible:ring-primary/35"
        />
      </div>

      {groups.length ? (
        <div className="space-y-5">
          {groups.map(([groupName, groupItems]) => (
            <SettingsGroup key={groupName} title={groupName}>
              {groupItems.map((it) => (
                <SettingsRow
                  key={it.key}
                  icon={it.icon}
                  title={it.title}
                  description={it.description}
                  iconBgClassName={it.iconBgClassName}
                  iconClassName={it.iconClassName}
                  onClick={() => onNavigate(it)}
                />
              ))}
            </SettingsGroup>
          ))}
        </div>
      ) : (
        <div className="bg-muted/20 border border-border/30 rounded-2xl p-5">
          <div className="text-sm font-medium text-foreground">Nenhum resultado</div>
          <div className="text-xs text-muted-foreground mt-1">Tente buscar por “perfil”, “empresa” ou “cache”.</div>
          <Button variant="outline" className="mt-4 rounded-xl" onClick={() => setQuery('')}>
            Limpar busca
          </Button>
        </div>
      )}

      <div className="pt-1" />
    </div>
  );
}

function SettingsLiteStack({
  userId,
  profile,
  userName,
  userEmail,
  avatarUrl,
  items,
  appVersion,
  onBack,
}: {
  userId: string;
  profile: any;
  userName?: string | null;
  userEmail?: string | null;
  avatarUrl?: string | null;
  items: SettingsItem[];
  appVersion: string;
  onBack?: () => void;
}) {
  const [stack, setStack] = useState<
    'home' | 'profile' | 'security' | 'company' | 'budget-warning' | 'cache-clear' | 'account-data'
  >('home');

  const titleMap: Record<string, { title: string; subtitle?: string }> = {
    home: { title: 'Configurações', subtitle: 'Gerencie preferências, segurança e dados' },
    profile: { title: 'Perfil' },
    security: { title: 'Segurança' },
    company: { title: 'Empresa' },
    'budget-warning': { title: 'Avisos de orçamento' },
    'cache-clear': { title: 'Limpar cache' },
    'account-data': { title: 'Dados da conta' },
  };

  const onNavigate = (item: SettingsItem) => {
    const key = item.key as any;
    if (
      key === 'profile' ||
      key === 'security' ||
      key === 'company' ||
      key === 'budget-warning' ||
      key === 'cache-clear' ||
      key === 'account-data'
    ) {
      setStack(key);
      return;
    }
    if (item.href) window.location.href = item.href;
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <SettingsTopBar
        title={titleMap[stack]?.title ?? 'Configurações'}
        subtitle={titleMap[stack]?.subtitle}
        onBack={stack !== 'home' ? () => setStack('home') : onBack}
      />
      <div className="max-w-3xl mx-auto">
        <AnimatePresence mode="wait" initial={false}>
          {stack === 'home' ? (
            <SettingsMotionPage key="home">
              <SettingsHome
                userName={userName}
                userEmail={userEmail}
                avatarUrl={avatarUrl}
                items={items}
                appVersion={appVersion}
                onNavigate={onNavigate}
              />
            </SettingsMotionPage>
          ) : (
            <SettingsMotionPage key={stack}>
              <div className={cn('max-w-3xl mx-auto px-4 py-5 space-y-4', stack === 'cache-clear' && 'pt-2')}>
                {stack === 'profile' ? <ProfileSettingsLite userId={userId} profile={profile} /> : null}
                {stack === 'security' ? <SecuritySettingsLite /> : null}
                {stack === 'company' ? <CompanySettingsLite userId={userId} profile={profile} /> : null}
                {stack === 'budget-warning' ? <BudgetWarningSettingsLite userId={userId} profile={profile} /> : null}
                {stack === 'cache-clear' ? <CacheClearSettingsLite /> : null}
                {stack === 'account-data' ? (
                  <AccountDataSettingsLite userId={userId} userEmail={userEmail ?? undefined} />
                ) : null}
              </div>
            </SettingsMotionPage>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SettingsLiteRoute({
  userId,
  profile,
  userName,
  userEmail,
  avatarUrl,
  items,
  appVersion,
}: {
  userId: string;
  profile: any;
  userName?: string | null;
  userEmail?: string | null;
  avatarUrl?: string | null;
  items: SettingsItem[];
  appVersion: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = () => {
    if (location.pathname !== '/settings') {
      navigate('/settings');
      return;
    }
    navigate('/dashboard');
  };

  const onNavigate = (item: SettingsItem) => {
    if (item.href) {
      navigate(item.href);
      return;
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <SettingsTopBar title="Configurações" subtitle="Gerencie preferências, segurança e dados" onBack={goBack} />
      <div className="max-w-3xl mx-auto">
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route
              index
              element={
                <SettingsMotionPage>
                  <SettingsHome
                    userName={userName}
                    userEmail={userEmail}
                    avatarUrl={avatarUrl}
                    items={items}
                    appVersion={appVersion}
                    onNavigate={onNavigate}
                  />
                </SettingsMotionPage>
              }
            />
            <Route
              path="profile"
              element={
                <SettingsMotionPage>
                  <div className="max-w-3xl mx-auto px-4 py-5">
                    <ProfileSettingsLite userId={userId} profile={profile} />
                  </div>
                </SettingsMotionPage>
              }
            />
            <Route
              path="security"
              element={
                <SettingsMotionPage>
                  <div className="max-w-3xl mx-auto px-4 py-5">
                    <SecuritySettingsLite />
                  </div>
                </SettingsMotionPage>
              }
            />
            <Route
              path="company"
              element={
                <SettingsMotionPage>
                  <div className="max-w-3xl mx-auto px-4 py-5">
                    <CompanySettingsLite userId={userId} profile={profile} />
                  </div>
                </SettingsMotionPage>
              }
            />
            <Route
              path="budget-warning"
              element={
                <SettingsMotionPage>
                  <div className="max-w-3xl mx-auto px-4 py-5">
                    <BudgetWarningSettingsLite userId={userId} profile={profile} />
                  </div>
                </SettingsMotionPage>
              }
            />
            <Route
              path="cache-clear"
              element={
                <SettingsMotionPage>
                  <div className="max-w-3xl mx-auto px-4 py-5">
                    <CacheClearSettingsLite />
                  </div>
                </SettingsMotionPage>
              }
            />
            <Route
              path="account-data"
              element={
                <SettingsMotionPage>
                  <div className="max-w-3xl mx-auto px-4 py-5">
                    <AccountDataSettingsLite userId={userId} userEmail={userEmail ?? undefined} />
                  </div>
                </SettingsMotionPage>
              }
            />
            <Route
              path="*"
              element={
                <SettingsMotionPage>
                  <div className="max-w-3xl mx-auto px-4 py-10">
                    <div className="bg-muted/20 border border-border/30 rounded-2xl p-5">
                      <div className="text-sm font-medium text-foreground">Página não encontrada</div>
                      <div className="text-xs text-muted-foreground mt-1">Volte para as configurações.</div>
                      <Button variant="outline" className="mt-4 rounded-xl" onClick={() => navigate('/settings')}>
                        Ir para /settings
                      </Button>
                    </div>
                  </div>
                </SettingsMotionPage>
              }
            />
          </Routes>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function SettingsLite(props: SettingsLiteProps) {
  const { user, profile } = useAuth();
  useIOSDetection();

  const mode = props.mode ?? 'route';
  const userId = props.userId ?? user?.id ?? '';
  const effectiveProfile = props.profile ?? profile;
  const userName = (effectiveProfile?.name as string | undefined) ?? (user?.user_metadata as any)?.name ?? null;
  const userEmail = user?.email ?? (effectiveProfile as any)?.email ?? null;
  const avatarUrl = (user?.user_metadata as any)?.avatar_url ?? (user?.user_metadata as any)?.picture ?? null;
  const appVersion = typeof __APP_VERSION__ === 'string' && __APP_VERSION__.trim() ? __APP_VERSION__ : 'dev';

  const items = useMemo<SettingsItem[]>(
    () => [
      {
        key: 'profile',
        group: 'Conta',
        title: 'Perfil',
        description: 'Nome e informações básicas',
        icon: User,
        iconBgClassName: 'bg-blue-500/15',
        iconClassName: 'text-blue-300',
        href: mode === 'route' ? '/settings/profile' : undefined,
      },
      {
        key: 'security',
        group: 'Conta',
        title: 'Segurança',
        description: 'Senha, e-mail e sessão',
        icon: Shield,
        iconBgClassName: 'bg-emerald-500/15',
        iconClassName: 'text-emerald-300',
        href: mode === 'route' ? '/settings/security' : undefined,
      },
      {
        key: 'company',
        group: 'Aplicação',
        title: 'Empresa',
        description: 'Logo, contato e informações',
        icon: Brush,
        iconBgClassName: 'bg-primary/15',
        iconClassName: 'text-primary',
        href: mode === 'route' ? '/settings/company' : undefined,
      },
      {
        key: 'budget-warning',
        group: 'Aplicação',
        title: 'Avisos de orçamento',
        description: 'Vencimentos e lembretes',
        icon: Bell,
        iconBgClassName: 'bg-amber-500/15',
        iconClassName: 'text-amber-300',
        href: mode === 'route' ? '/settings/budget-warning' : undefined,
      },
      {
        key: 'cache-clear',
        group: 'Sistema',
        title: 'Limpar cache',
        description: 'Resolver problemas e recarregar dados',
        icon: Trash2,
        iconBgClassName: 'bg-destructive/15',
        iconClassName: 'text-destructive',
        href: mode === 'route' ? '/settings/cache-clear' : undefined,
      },
      {
        key: 'account-data',
        group: 'Dados',
        title: 'Dados da conta',
        description: 'Exportar e solicitações LGPD',
        icon: Database,
        iconBgClassName: 'bg-purple-500/15',
        iconClassName: 'text-purple-300',
        href: mode === 'route' ? '/settings/account-data' : undefined,
      },
    ],
    [mode]
  );

  if (mode === 'stack') {
    return (
      <SettingsLiteStack
        userId={userId}
        profile={effectiveProfile}
        userName={userName}
        userEmail={userEmail}
        avatarUrl={avatarUrl}
        items={items}
        appVersion={appVersion}
        onBack={props.onBack}
      />
    );
  }

  return (
    <SettingsLiteRoute
      userId={userId}
      profile={effectiveProfile}
      userName={userName}
      userEmail={userEmail}
      avatarUrl={avatarUrl}
      items={items}
      appVersion={appVersion}
    />
  );
}
