import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, BounceBadge } from '@/components/ui/animations/micro-interactions';
import { AdvancedSkeleton } from '@/components/ui/animations/loading-states';
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
  const [loading] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };
  if (loading) {
    return <GlassCard className="p-6 mb-6">
        <AdvancedSkeleton lines={3} avatar />
      </GlassCard>;
  }
  return <div className={`mb-6 ${isDesktop ? 'desktop-page-content' : 'space-y-6'}`} style={{
    paddingTop: device.hasDynamicIsland ? '70px' : device.hasNotch ? '60px' : '20px',
    paddingBottom: device.isIPhone ? '34px' : '20px',
    paddingLeft: insets.left,
    paddingRight: insets.right
  }}>
      {/* NOVO: Barra de pesquisa Drippy */}
      <DrippySearchBar className="mb-4" />
      
      {/* Header com saudação */}
      <GlassCard className={`${isDesktop ? 'desktop-card' : 'p-6'}`}>
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.5
      }} style={{
        marginTop: device.hasDynamicIsland ? '10px' : '0px'
      }}>
          <div className="flex flex-row justify-between items-center text-left mb-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {getGreeting()}, {profile?.name || 'usuário'}!
              </h2>
              <p className="text-muted-foreground">Seja bem-vindo(a) de volta</p>
              <div className="flex items-center gap-2 mt-2">
                <span style={{
                color: '#ffffff'
              }}>🫐 v2.9.0</span>
                
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {profile && <BounceBadge variant="default" className="bg-primary/20 text-primary font-semibold">
                  {profile.role.toUpperCase()}
                </BounceBadge>}
            </div>
          </div>
        </motion.div>
      </GlassCard>

      {/* Banner de instalação PWA */}
      <PWAInstallBanner />
    </div>;
};