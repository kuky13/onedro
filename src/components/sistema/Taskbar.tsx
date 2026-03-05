import { Menu, Wifi, Volume2, Battery, Folder } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TaskbarProps {
  onStartClick: () => void;
  time: Date;
  // Aceito para compatibilidade com Sistema/SistemaPage (não usado no componente)
  profile?: unknown;
  apps?: { id: string; title: string; isMinimized?: boolean; icon?: any }[];
  onAppClick?: (id: string) => void;
}

export function Taskbar({ onStartClick, time, apps = [], onAppClick }: TaskbarProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="h-12 bg-background/95 backdrop-blur-sm border-t border-border flex items-center px-2 gap-2 shadow-lg">
      {/* Botão Start */}
      <button
        onClick={onStartClick}
        className="h-10 px-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg flex items-center gap-2 transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1 flex gap-3 overflow-x-auto py-1">
        {apps.filter(app => app.isMinimized && app.icon).map(app => {
          const Icon = app.icon || Folder;
          return (
            <button
              key={app.id}
              onClick={() => onAppClick?.(app.id)}
              className="group flex flex-col items-center justify-center w-16 shrink-0 rounded-lg p-1 hover:bg-primary/10 transition-colors"
              title={app.title}
            >
              <div className="h-10 w-10 bg-primary/10 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-md group-hover:bg-primary/20 border border-border">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Bandeja do sistema */}
      <div className="flex items-center gap-3 px-3">
        <Wifi className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" />
        <Volume2 className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" />
        <Battery className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" />
      </div>

      {/* Relógio e usuário */}
      <div className="flex items-center gap-3 px-3 border-l border-border">
        <div className="text-right">
          <div className="text-sm font-semibold text-foreground">{formatTime(time)}</div>
          <div className="text-xs text-muted-foreground">{formatDate(time)}</div>
        </div>
        <Avatar className="h-8 w-8">
          <AvatarImage src="/icons/icon-48x48.png" />
          <AvatarFallback className="bg-transparent">
            <img src="/icons/icon-48x48.png" alt="logo" className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
