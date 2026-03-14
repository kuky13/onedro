import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Shield, Settings, FileText, Cookie, Home, Building2, Bell, Database, Trash2 } from 'lucide-react';
import { useIOSDetection } from '@/hooks/useIOSDetection';
import { ProfileSettingsLite } from '@/components/lite/ProfileSettingsLite';
import { SecuritySettingsLite } from '@/components/lite/SecuritySettingsLite';
import { AccountDataSettingsLite } from '@/components/lite/AccountDataSettingsLite';
import { CompanySettingsLite } from '@/components/lite/CompanySettingsLite';
import { BudgetWarningSettingsLite } from '@/components/lite/BudgetWarningSettingsLite';
import { AdvancedFeaturesSettingsLite } from '@/components/lite/AdvancedFeaturesSettingsLite';
import { CacheClearSettingsLite } from '@/components/lite/CacheClearSettingsLite';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsLiteProps {
  userId: string;
  profile: any;
  onBack: () => void;
}

const sections = [
  {
    id: 'account',
    name: 'Conta',
    description: 'Perfil e segurança',
    icon: User,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'app',
    name: 'Aplicação',
    description: 'Empresa e preferências',
    icon: Settings,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    id: 'menu',
    name: 'Menu',
    description: 'Navegação rápida',
    icon: Home,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  {
    id: 'policies',
    name: 'Políticas',
    description: 'Termos e privacidade',
    icon: FileText,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
];

export const SettingsLite = ({
  userId,
  profile,
  onBack
}: SettingsLiteProps) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  useIOSDetection();

  const renderContent = () => {
    switch (activeSection) {
      case 'account':
        return (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            <ProfileSettingsLite userId={userId} profile={profile} />
            <SecuritySettingsLite />
            <AccountDataSettingsLite userId={userId} userEmail={profile?.email} />
          </motion.div>
        );
      case 'app':
        return (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            <BudgetWarningSettingsLite userId={userId} profile={profile} />
            <CompanySettingsLite userId={userId} profile={profile} />
            <CacheClearSettingsLite />
          </motion.div>
        );
      case 'menu':
        return (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-3"
          >
            <Card
              className="cursor-pointer hover:bg-secondary/50 transition-all duration-200 rounded-2xl border-border/50"
              onClick={() => { window.location.href = '/dashboard'; }}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Home className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Menu Principal</p>
                  <p className="text-xs text-muted-foreground">Acessar o dashboard principal</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      case 'policies':
        return (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-3"
          >
            {[
              { label: 'Termos de Uso', desc: 'Consulte os termos e condições', icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10', url: '/terms' },
              { label: 'Política de Privacidade', desc: 'Como protegemos seus dados', icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10', url: '/privacy' },
              { label: 'Política de Cookies', desc: 'Como utilizamos cookies', icon: Cookie, color: 'text-amber-400', bg: 'bg-amber-500/10', url: '/cookies' },
            ].map((item) => (
              <Card
                key={item.url}
                className="cursor-pointer hover:bg-secondary/50 transition-all duration-200 rounded-2xl border-border/50"
                onClick={() => window.open(item.url, '_blank')}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`h-10 w-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        );
      case 'advanced':
        return (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            <AdvancedFeaturesSettingsLite userId={userId} profile={profile} />
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={activeSection ? () => setActiveSection(null) : onBack}
          className="h-9 w-9 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-foreground">
            {activeSection
              ? sections.find(s => s.id === activeSection)?.name || 'Configurações'
              : 'Configurações'}
          </h1>
          {activeSection && (
            <p className="text-xs text-muted-foreground">
              {sections.find(s => s.id === activeSection)?.description}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <AnimatePresence mode="wait">
          {!activeSection ? (
            <motion.div
              key="nav"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 gap-3"
            >
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <Card
                    key={section.id}
                    className="cursor-pointer hover:bg-secondary/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 rounded-2xl border-border/50"
                    onClick={() => setActiveSection(section.id)}
                  >
                    <CardContent className="flex flex-col items-center justify-center gap-3 p-5 text-center">
                      <div className={`h-12 w-12 rounded-2xl ${section.bgColor} flex items-center justify-center`}>
                        <Icon className={`h-6 w-6 ${section.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{section.name}</p>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{section.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </motion.div>
          ) : (
            <motion.div key={activeSection}>
              {renderContent()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
