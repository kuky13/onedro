import { useState, useEffect } from 'react';
import { Desktop } from '@/components/sistema/Desktop';
import { Taskbar } from '@/components/sistema/Taskbar';
import { StartMenu } from '@/components/sistema/StartMenu';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

export default function Sistema() {
  const { user, profile } = useAuth();
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
