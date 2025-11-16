import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardLiteStatsProps {
  profile: any;
  userId?: string;
}

export const DashboardLiteStats = ({ profile, userId }: DashboardLiteStatsProps) => {
  const [weeklyGrowth, setWeeklyGrowth] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchWeeklyGrowth = async () => {
      try {
        setLoading(true);
        
        const today = new Date();
        const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const { error, count } = await supabase
          .from('budgets')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', userId)
          .gte('created_at', weekStart.toISOString());

        if (!error) {
          setWeeklyGrowth(count || 0);
        }
      } catch (error) {
        console.error('Error fetching weekly growth:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyGrowth();
  }, [userId]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="bg-card/80 border border-border/50 rounded-2xl shadow-lg transition-all duration-300 ease-in-out hover:bg-card/90 hover:border-border/70 hover:shadow-xl desktop-card p-4 mb-4">
      <div style={{ opacity: 1, transform: 'none' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {getGreeting()}, {profile?.name || 'usuário'}!
            </h2>
            <p className="text-muted-foreground">
              Seja bem-vindo(a) de volta
            </p>
          </div>
          {profile && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs transition-opacity duration-300 bg-primary/20 text-primary font-semibold">
              {profile.role.toUpperCase()}
            </span>
          )}
        </div>
        
        {/* Version Display with Mini Logo */}
        <div className="flex items-center gap-2 mb-4 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200/50 dark:border-purple-700/50">
          {/* Mini Logo */}
          <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Crown */}
              <svg className="w-3 h-3 text-white absolute top-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 16L3 3l5.5 5L12 4l3.5 4L21 3l-2 13H5z"/>
              </svg>
              {/* Purple Circle */}

              {/* Yellow Rings */}
              <div className="w-6 h-1.5 bg-yellow-400 rounded-full absolute top-3 transform rotate-12"></div>

            </div>
          </div>
          <span style={{ color: '##ffffff' }} className="text-sm font-bold tracking-wide">
            Blue Berry 2.8.3
          </span>
        </div>
       </div>
      
      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-green-500" />
        </div>
        <span className="text-sm font-medium text-foreground">
          {loading ? 'Carregando...' : `${weeklyGrowth} orçamentos esta semana`}
        </span>
      </div>
    </div>
  );
};