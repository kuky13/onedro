import { useGameSettings } from '@/hooks/useGameSettings';
import { useAuth } from '@/hooks/useAuth';
export const GameConfigDisplay: React.FC = () => {
  const {
    profile
  } = useAuth();
  const {
    settings,
    isLoading
  } = useGameSettings();

  // Só mostrar para admins
  if (!profile || profile.role !== 'admin' || isLoading || !settings) {
    return null;
  }
  return;
};