import { motion } from 'framer-motion';
import { useResponsive } from '@/hooks/useResponsive';
import { useSafeArea } from '@/components/SafeAreaProvider';
import { DrippySearchBar } from '@/components/dashboard/DrippySearchBar';
import { PWAInstallBanner } from '@/components/ui/PWAInstallBanner';

interface DashboardLiteStatsEnhancedProps {
  profile: any;
}

export const DashboardLiteStatsEnhanced = ({ profile }: DashboardLiteStatsEnhancedProps) => {
  const { isDesktop } = useResponsive();
  const { insets, device } = useSafeArea();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div
      className={`space-y-4 ${isDesktop ? '' : ''}`}
      style={{
        paddingTop: device.hasDynamicIsland ? '60px' : device.hasNotch ? '50px' : '8px',
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {/* Search bar */}
      <DrippySearchBar className="mb-2" />

      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-row justify-between items-start"
      >
        <div className="space-y-1">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            {getGreeting()},{' '}
            <span className="text-primary">{profile?.name?.split(' ')[0] || 'usuário'}</span>!
          </h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            Seja bem-vindo(a) de volta
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 pt-1">
          {profile?.role && (
            <span className="inline-flex items-center rounded-xl bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {profile.role.toUpperCase()}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/60 font-mono">
            v2.9.0
          </span>
        </div>
      </motion.div>

      {/* PWA Install Banner */}
      <PWAInstallBanner />
    </div>
  );
};
