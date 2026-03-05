import { useState, useEffect } from 'react';
import { Desktop } from '@/components/sistema/Desktop';
import { Taskbar } from '@/components/sistema/Taskbar';
import { StartMenu } from '@/components/sistema/StartMenu';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';

// Mapa de rotas para IDs de apps
const routeToAppId: Record<string, string> = {
  '/supadmin': 'supadmin',
  '/chat': 'chat',
  '/p': 'peliculas',
  '/p/edit': 'peliculas',
  '/worm': 'worm',
  '/service-orders': 'ordens',
  '/settings': 'configuracoes',
  '/dashboard': 'usuarios',
  '/msg': 'mensagens'
};

export default function Sistema() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [showStartMenu, setShowStartMenu] = useState(false);
  const [time, setTime] = useState(new Date());
  const [taskbarApps, setTaskbarApps] = useState<{ id: string; title: string; isMinimized?: boolean }[]>([]);
  const [requestRestoreId, setRequestRestoreId] = useState<string | null>(null);
  const [requestOpenId, setRequestOpenId] = useState<string | null>(null);

  // Atualizar relógio
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Detectar subrota e abrir app correspondente
  useEffect(() => {
    const path = location.pathname.replace('/sistema', '') || '/';
    if (path !== '/') {
      const appId = routeToAppId[path];
      if (appId) {
        setRequestOpenId(appId);
        setTimeout(() => setRequestOpenId(null), 100);
      }
    }
  }, [location.pathname]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="h-screen w-full bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 overflow-hidden flex flex-col">
      <Desktop profile={profile} onWindowsChange={setTaskbarApps} requestRestoreId={requestRestoreId} requestOpenId={requestOpenId} />
      
      <Taskbar 
        onStartClick={() => setShowStartMenu(!showStartMenu)}
        time={time}
        profile={profile}
        apps={taskbarApps}
        onAppClick={(id) => {
          setRequestRestoreId(id);
          setTimeout(() => setRequestRestoreId(null), 0);
        }}
      />
      
      {showStartMenu && (
        <StartMenu 
          onClose={() => setShowStartMenu(false)}
          profile={profile}
          onLaunchApp={(id) => { setRequestOpenId(id); setTimeout(() => setRequestOpenId(null), 0); }}
        />
      )}
    </div>
  );
}
