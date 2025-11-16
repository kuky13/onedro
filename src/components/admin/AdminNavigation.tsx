import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Shield, 
  Globe, 
  Key, 
  Bell,
  Monitor,
  MessageCircle,
  Wrench
} from 'lucide-react';

type ActiveSection = 'overview' | 'users' | 'licenses' | 'site' | 'tools' | 'notifications' | 'settings' | 'whatsapp' | 'security';

interface AdminNavigationProps {
  activeSection: ActiveSection;
  onSectionChange: (section: ActiveSection) => void;
}

export const AdminNavigation = ({ activeSection, onSectionChange }: AdminNavigationProps) => {
  const navigationItems = [
    {
      id: 'overview' as ActiveSection,
      label: 'Visão Geral',
      icon: Monitor,
      description: 'Dashboard principal',
      color: 'bg-primary/10 text-primary',
      count: null
    },
    {
      id: 'users' as ActiveSection,
      label: 'Usuários',
      icon: Users,
      description: 'Gerenciar contas',
      color: 'bg-green-500/10 text-green-600 dark:text-green-400',
      count: 147
    },
    {
      id: 'licenses' as ActiveSection,
      label: 'Licenças',
      icon: Key,
      description: 'Controle de acesso',
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      count: 128
    },
    {
      id: 'site' as ActiveSection,
      label: 'Site',
      icon: Globe,
      description: 'Configurações do site',
      color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
      count: null
    },
    {
      id: 'notifications' as ActiveSection,
      label: 'Notificações',
      icon: Bell,
      description: 'Envio de mensagens',
      color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
      count: null
    },
    {
      id: 'whatsapp' as ActiveSection,
      label: 'WhatsApp',
      icon: MessageCircle,
      description: 'Analytics do WhatsApp',
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      count: null
    },
    {
      id: 'security' as ActiveSection,
      label: 'Segurança',
      icon: Shield,
      description: 'Proteção do sistema',
      color: 'bg-red-500/10 text-red-600 dark:text-red-400',
      count: null
    },
    {
      id: 'tools' as ActiveSection,
      label: 'Ferramentas',
      icon: Wrench,
      description: 'Analytics & Configurações',
      color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
      count: null
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4">
      {navigationItems.map((item) => (
        <Button
          key={item.id}
          variant={activeSection === item.id ? "default" : "ghost"}
          className={`h-auto p-3 sm:p-4 flex flex-col items-center gap-2 sm:gap-3 text-center transition-all duration-300 hover:scale-[1.02] ${
            activeSection === item.id 
              ? 'bg-primary text-primary-foreground shadow-lg border-2 border-primary/30 ring-2 ring-primary/20' 
              : 'hover:bg-muted/80 border-2 border-transparent hover:border-border hover:shadow-md'
          }`}
          onClick={() => onSectionChange(item.id)}
        >
          <div className="w-full flex flex-col items-center gap-2">
            {/* Icon and Badge Row */}
            <div className="flex items-center justify-between w-full">
              <div className={`p-2 sm:p-3 rounded-xl transition-all duration-300 ${
                activeSection === item.id 
                  ? 'bg-primary-foreground/20 shadow-inner' 
                  : item.color
              }`}>
                <item.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              
              {item.count && (
                <Badge 
                  variant={activeSection === item.id ? "secondary" : "outline"}
                  className="text-xs font-semibold px-2 py-1"
                >
                  {item.count}
                </Badge>
              )}
            </div>
            
            {/* Label and Description */}
            <div className="space-y-1 w-full">
              <div className="font-semibold text-sm sm:text-base leading-tight">
                {item.label}
              </div>
              <div className={`text-xs leading-tight ${
                activeSection === item.id 
                  ? 'text-primary-foreground/80' 
                  : 'text-muted-foreground'
              }`}>
                {item.description}
              </div>
            </div>
          </div>
        </Button>
      ))}
    </div>
  );
};