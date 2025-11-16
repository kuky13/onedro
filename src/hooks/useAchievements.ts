import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
}

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-bug',
    title: 'Primeiro Bug',
    description: 'Elimine seu primeiro bug',
    icon: '🐞',
    unlocked: false
  },
  {
    id: 'bug-hunter',
    title: 'Caçador de Bugs',
    description: 'Elimine 50 bugs',
    icon: '🎯',
    unlocked: false,
    progress: 0,
    maxProgress: 50
  },
  {
    id: 'critical-solver',
    title: 'Solucionador Crítico',
    description: 'Elimine 10 bugs críticos',
    icon: '🔥',
    unlocked: false,
    progress: 0,
    maxProgress: 10
  },
  {
    id: 'memory-master',
    title: 'Mestre da Memória',
    description: 'Corrija 5 vazamentos de memória',
    icon: '💀',
    unlocked: false,
    progress: 0,
    maxProgress: 5
  },
  {
    id: 'boss-slayer',
    title: 'Matador de Boss',
    description: 'Elimine seu primeiro boss bug',
    icon: '🐛',
    unlocked: false
  },
  {
    id: 'speed-demon',
    title: 'Demônio da Velocidade',
    description: 'Elimine 3 bugs ultrarrápidos',
    icon: '⚡',
    unlocked: false,
    progress: 0,
    maxProgress: 3
  },
  {
    id: 'survivor',
    title: 'Sobrevivente',
    description: 'Alcance o nível 5',
    icon: '🛡️',
    unlocked: false
  },
  {
    id: 'high-scorer',
    title: 'Pontuador',
    description: 'Alcance 5000 pontos',
    icon: '🏆',
    unlocked: false
  },
  {
    id: 'perfectionist',
    title: 'Perfeccionista',
    description: 'Complete um nível sem perder vidas',
    icon: '💎',
    unlocked: false
  },
  {
    id: 'veteran',
    title: 'Veterano',
    description: 'Jogue por 10 partidas',
    icon: '🎖️',
    unlocked: false,
    progress: 0,
    maxProgress: 10
  }
];

export const useAchievements = () => {
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [stats, setStats] = useState({
    totalBugs: 0,
    criticalBugs: 0,
    memoryLeaks: 0,
    bossBugs: 0,
    speedBugs: 0,
    gamesPlayed: 0,
    highestScore: 0,
    highestLevel: 0,
    perfectLevels: 0
  });

  // Load achievements from localStorage
  useEffect(() => {
    const savedAchievements = localStorage.getItem('debug-invaders-achievements');
    const savedStats = localStorage.getItem('debug-invaders-stats');
    
    if (savedAchievements) {
      try {
        setAchievements(JSON.parse(savedAchievements));
      } catch (error) {
        console.error('Erro ao carregar conquistas:', error);
      }
    }
    
    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats));
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      }
    }
  }, []);

  // Save achievements to localStorage
  const saveAchievements = useCallback((newAchievements: Achievement[]) => {
    localStorage.setItem('debug-invaders-achievements', JSON.stringify(newAchievements));
  }, []);

  // Save stats to localStorage
  const saveStats = useCallback((newStats: typeof stats) => {
    localStorage.setItem('debug-invaders-stats', JSON.stringify(newStats));
  }, []);

  // Unlock achievement
  const unlockAchievement = useCallback((achievementId: string) => {
    setAchievements(prev => {
      const updated = prev.map(achievement => {
        if (achievement.id === achievementId && !achievement.unlocked) {
          const unlockedAchievement = {
            ...achievement,
            unlocked: true,
            unlockedAt: new Date()
          };
          
          // Show toast notification
          toast({
            title: "🏆 Conquista Desbloqueada!",
            description: `${achievement.icon} ${achievement.title}`,
            duration: 4000,
          });
          
          return unlockedAchievement;
        }
        return achievement;
      });
      
      saveAchievements(updated);
      return updated;
    });
  }, [toast, saveAchievements]);

  // Update achievement progress
  const updateProgress = useCallback((achievementId: string, progress: number) => {
    setAchievements(prev => {
      const updated = prev.map(achievement => {
        if (achievement.id === achievementId && !achievement.unlocked) {
          const newProgress = Math.min(progress, achievement.maxProgress || 1);
          const updatedAchievement = {
            ...achievement,
            progress: newProgress
          };
          
          // Check if achievement should be unlocked
          if (newProgress >= (achievement.maxProgress || 1)) {
            return {
              ...updatedAchievement,
              unlocked: true,
              unlockedAt: new Date()
            };
          }
          
          return updatedAchievement;
        }
        return achievement;
      });
      
      saveAchievements(updated);
      return updated;
    });
  }, [saveAchievements]);

  // Track bug elimination
  const trackBugKill = useCallback((bugType: string) => {
    const newStats = { ...stats };
    newStats.totalBugs++;
    
    switch (bugType) {
      case 'critical-bug':
        newStats.criticalBugs++;
        updateProgress('critical-solver', newStats.criticalBugs);
        break;
      case 'memory-leak':
        newStats.memoryLeaks++;
        updateProgress('memory-master', newStats.memoryLeaks);
        break;
      case 'boss-bug':
        newStats.bossBugs++;
        if (newStats.bossBugs === 1) {
          unlockAchievement('boss-slayer');
        }
        break;
      case 'speed-bug':
        newStats.speedBugs++;
        updateProgress('speed-demon', newStats.speedBugs);
        break;
    }
    
    // Check first bug achievement
    if (newStats.totalBugs === 1) {
      unlockAchievement('first-bug');
    }
    
    // Update bug hunter progress
    updateProgress('bug-hunter', newStats.totalBugs);
    
    setStats(newStats);
    saveStats(newStats);
  }, [stats, updateProgress, unlockAchievement, saveStats]);

  // Track game completion
  const trackGameEnd = useCallback((score: number, level: number, livesLost: number) => {
    const newStats = { ...stats };
    newStats.gamesPlayed++;
    newStats.highestScore = Math.max(newStats.highestScore, score);
    newStats.highestLevel = Math.max(newStats.highestLevel, level);
    
    // Check perfect level (no lives lost in a level)
    if (livesLost === 0 && level > 1) {
      newStats.perfectLevels++;
      if (newStats.perfectLevels === 1) {
        unlockAchievement('perfectionist');
      }
    }
    
    // Check achievements
    if (level >= 5) {
      unlockAchievement('survivor');
    }
    
    if (score >= 5000) {
      unlockAchievement('high-scorer');
    }
    
    updateProgress('veteran', newStats.gamesPlayed);
    
    setStats(newStats);
    saveStats(newStats);
  }, [stats, unlockAchievement, updateProgress, saveStats]);

  // Get achievement progress percentage
  const getProgressPercentage = useCallback((achievement: Achievement) => {
    if (!achievement.maxProgress) return achievement.unlocked ? 100 : 0;
    return Math.round(((achievement.progress || 0) / achievement.maxProgress) * 100);
  }, []);

  // Get unlocked achievements count
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  return {
    achievements,
    stats,
    unlockedCount,
    totalCount,
    trackBugKill,
    trackGameEnd,
    getProgressPercentage,
    unlockAchievement
  };
};