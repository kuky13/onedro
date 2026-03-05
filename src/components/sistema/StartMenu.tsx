import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Settings, 
  FileText, 
  MessageSquare,
  Home,
  Calculator,
  Trash2,
  Shield,
  Smartphone,
  Bot
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

interface StartMenuProps {
  onClose: () => void;
  profile: any;
  onLaunchApp?: (id: string) => void;
}

const menuApps = [
  { id: 'usuarios', title: 'Usuários', icon: Users },
  { id: 'configuracoes', title: 'Configurações', icon: Settings },
  { id: 'worm', title: 'Orçamentos', icon: Calculator },
  { id: 'ordens', title: 'Criar ordem', icon: FileText },
  { id: 'worm-trash', title: 'Lixeira OR', icon: Trash2 },
  { id: 'ordens-trash', title: 'Lixeira OS', icon: Trash2 },
  { id: 'mensagens', title: 'Mensagens', icon: MessageSquare },
  { id: 'supadmin', title: 'Super Admin', icon: Shield, route: '/supadmin' },
  { id: 'peliculas', title: 'Películas', icon: Smartphone, route: '/p' },
  { id: 'chat', title: 'IA Chat', icon: Bot, route: '/chat' },
];

export function StartMenu({ onClose, profile, onLaunchApp }: StartMenuProps) {
  const navigate = useNavigate();

  const handleNavigate = (route?: string) => {
    if (route) {
      navigate(route);
      onClose();
    }
  };

  const handleLaunch = (id: string, route?: string) => {
    if (route) {
      // Se houver rota, navegue para ela primeiro
      handleNavigate(route);
    } else if (onLaunchApp) {
      // Se não houver rota, use onLaunchApp
      onLaunchApp(id);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Menu */}
      <div className="fixed bottom-14 left-2 z-50 w-96 bg-background/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header do usuário */}
        <div className="bg-gradient-to-r from-primary to-primary/80 p-4 text-primary-foreground">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-white/20">
              <AvatarImage src={profile?.avatar_url || '/icons/icon-128x128.png'} />
              <AvatarFallback className="bg-transparent">
                <img src="/icons/icon-128x128.png" alt="logo" className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{profile?.name || profile?.full_name || 'Usuário'}</div>
              <div className="text-xs opacity-90">{profile?.email}</div>
            </div>
          </div>
        </div>

        {/* Grid de aplicativos */}
        <div className="p-4">
          <div className="grid grid-cols-3 gap-3">
            {menuApps.map(app => (
              <button
                key={app.id}
                onClick={() => handleLaunch(app.id, app.route)}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors group"
              >
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <app.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="text-[11px] text-center text-foreground font-medium">
                  {app.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Ações rápidas */}
        <div className="p-2">
          <button
            onClick={() => handleNavigate('/dashboard')}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-muted transition-colors text-left"
          >
            <Home className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Voltar ao Dashboard</span>
          </button>
        </div>
      </div>
    </>
  );
}
