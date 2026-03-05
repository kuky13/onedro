import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import { useAchievements } from '@/hooks/useAchievements';

export interface Bug {
  id: string;
  x: number;
  y: number;
  speed: number;
  type: 'bug' | 'critical-bug' | 'memory-leak' | 'boss-bug' | 'speed-bug';
  bossTimer?: number; // Para controlar o tempo do boss
}

export interface GameLog {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

export type GameState = 'idle' | 'playing' | 'paused' | 'gameOver';

export const useDebugInvadersGame = () => {
  const { toast } = useToast();
  const { trackBugKill, trackGameEnd } = useAchievements();
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(5);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [gameSettings, setGameSettings] = useState({ speed_bug_spawn_rate: 0.008, speed_bug_speed_multiplier: 1.5, boss_bug_spawn_rate: 0.001, boss_bug_points: 1000, boss_bug_timer: 12000, boss_bug_damage: 3 });
  const [particles, setParticles] = useState<Array<{id: string, x: number, y: number, type: Bug['type']}>>([]);
  
  const gameLoopRef = useRef<NodeJS.Timeout>();
  const spawnTimerRef = useRef<NodeJS.Timeout>();
  const lastSpawnRef = useRef(0);

  const isPlaying = gameState === 'playing';
  const isGameOver = gameState === 'gameOver';

  // Add log entry
  const addLog = useCallback((type: GameLog['type'], message: string) => {
    const newLog: GameLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message
    };
    setLogs(prev => [newLog, ...prev.slice(0, 9)]); // Keep last 10 logs
  }, []);

  // Generate random bug
  const createBug = useCallback((): Bug => {
    // Speed bug - chance baseada na configuração
    if (Math.random() < gameSettings.speed_bug_spawn_rate) {
      addLog('error', '⚡ BUG CRÍTICO: Processo ultrarrápido detectado!');
      return {
        id: `speed-${Date.now()}-${Math.random()}`,
        x: Math.random() * 85 + 5, // Evitar bordas
        y: -5,
        speed: (0.5 + (level * 0.05)) * gameSettings.speed_bug_speed_multiplier, // Mais controlável
        type: 'speed-bug'
      };
    }
    
    // Boss bug - chance baseada na configuração
    if (Math.random() < gameSettings.boss_bug_spawn_rate) {
      addLog('warning', 'ALERTA: Sistema crítico comprometido! Boss detectado!');
      return {
        id: `boss-${Date.now()}-${Math.random()}`,
        x: Math.random() * 80 + 10, // Centro da tela
        y: -5,
        speed: 0.15 + (level * 0.03), // Mais lento e previsível
        type: 'boss-bug',
        bossTimer: gameSettings.boss_bug_timer // 12 segundos para clicar
      };
    }
    
    const bugTypes: Bug['type'][] = ['bug', 'critical-bug', 'memory-leak'];
    const type = bugTypes[Math.floor(Math.random() * bugTypes.length)] ?? 'bug';

    return {
      id: `bug-${Date.now()}-${Math.random()}`,
      x: Math.random() * 85 + 5, // Evitar bordas
      y: -5,
      speed: 0.2 + (level * 0.05) + Math.random() * 0.2, // Velocidade mais controlada
      type,
    };
  }, [level, addLog, gameSettings]);

  // Spawn bugs - Velocidade mais equilibrada
  const spawnBug = useCallback(() => {
    if (!isPlaying) return;
    
    const now = Date.now();
    // Spawn rate mais equilibrado - progressão mais suave
    const spawnRate = Math.max(2200 - (level * 80), 1000);
    
    if (now - lastSpawnRef.current > spawnRate) {
      setBugs(prev => [...prev, createBug()]);
      lastSpawnRef.current = now;
    }
  }, [isPlaying, level, createBug]);

  // Move bugs down and handle boss timer
  const updateBugs = useCallback(() => {
    if (!isPlaying) return;

    setBugs(prev => {
      const updatedBugs = prev.map(bug => {
        if (bug.type === 'boss-bug' && bug.bossTimer) {
          // Decrease boss timer
          const newTimer = bug.bossTimer - 50;
          if (newTimer <= 0) {
            // Boss timeout - deal damage
            addLog('error', `FALHA CRÍTICA: Sistema comprometido! -${gameSettings.boss_bug_damage} vidas`);
            setLives(current => {
              const newLives = current - gameSettings.boss_bug_damage;
              if (newLives <= 0) {
                setGameState('gameOver');
              }
              return newLives;
            });
            return null; // Remove boss
          }
          return { ...bug, y: bug.y + bug.speed, bossTimer: newTimer };
        }
        return { ...bug, y: bug.y + bug.speed };
      }).filter(Boolean) as Bug[];
      
      // Verificar se speed-bug passou - se sim, retirar 1 vida
      const speedBugPassed = updatedBugs.filter(bug => 
        bug.type === 'speed-bug' && bug.y >= 100 && (bug.y - bug.speed) < 100
      ).length;
      
      if (speedBugPassed > 0) {
        addLog('error', '⚡ Bug crítico passou! Sistema comprometido -1 vida');
        setLives(current => {
          const newLives = current - 1;
          if (newLives <= 0) {
            setGameState('gameOver');
          }
          return newLives;
        });
      }
      
      // Count regular bugs that passed the bottom line
      const bugsPassedCount = updatedBugs.filter(bug => 
        bug.type !== 'boss-bug' && bug.type !== 'speed-bug' && bug.y >= 100 && (bug.y - bug.speed) < 100
      ).length;
      
      // Remove life for each regular bug that passed
      if (bugsPassedCount > 0) {
        addLog('warning', `${bugsPassedCount} processo(s) não tratado(s). Sistema comprometido.`);
        setLives(current => {
          const newLives = current - bugsPassedCount;
          if (newLives <= 0) {
            setGameState('gameOver');
            // Track game end for achievements
            trackGameEnd(score, level, 5 - newLives);
          }
          return newLives;
        });
      }

      // Remove bugs that passed the bottom (except boss bugs handled above)
      return updatedBugs.filter(bug => bug.type === 'boss-bug' || bug.y < 100);
    });
  }, [isPlaying, addLog]);

  // Game loop - Otimizado para evitar memory leaks
  useEffect(() => {
    if (isPlaying) {
      gameLoopRef.current = setInterval(() => {
        updateBugs();
        spawnBug();
      }, 50); // 20 FPS

      return () => {
        if (gameLoopRef.current) {
          clearInterval(gameLoopRef.current);
          gameLoopRef.current = undefined;
        }
      };
    }

    // Limpar timer quando não está jogando
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = undefined;
    }

    return undefined;
  }, [isPlaying, updateBugs, spawnBug]);

  // Level progression - progressão mais equilibrada
  useEffect(() => {
    const newLevel = Math.floor(score / 300) + 1; // Precisa de mais pontos para subir de nível
    if (newLevel > level) {
      setLevel(newLevel);
    }
  }, [score, level]);

  // Click bug handler com debounce para evitar cliques perdidos
  const clickBug = useCallback((bugId: string) => {
    if (!isPlaying) return;

    const clickedBug = bugs.find(bug => bug.id === bugId);
    if (!clickedBug) return;

    // Previne multiple clicks no mesmo bug
    setBugs(prev => {
      const exists = prev.find(bug => bug.id === bugId);
      if (!exists) return prev; // Bug já foi removido
      return prev; // Continua processamento
    });

    // Create particle effect
    const particleId = `particle-${Date.now()}-${Math.random()}`;
    setParticles(prev => [...prev, {
      id: particleId,
      x: clickedBug.x,
      y: clickedBug.y,
      type: clickedBug.type
    }]);

    // Score based on bug type
    let points = 10;
    let logMessage = '';
    
    switch (clickedBug.type) {
      case 'critical-bug':
        points = 25;
        logMessage = 'Erro crítico resolvido. Sistema estabilizado.';
        break;
      case 'memory-leak':
        points = 50;
        logMessage = 'Vazamento de memória corrigido. Performance otimizada.';
        break;
      case 'boss-bug':
        points = 1000;
        logMessage = 'EXCELENTE! Boss eliminado! Sistema seguro novamente.';
        addLog('success', logMessage);
        break;
      case 'speed-bug':
        points = 200;
        logMessage = '⚡ INCRÍVEL! Bug ultrarrápido eliminado! Reflexos perfeitos!';
        addLog('success', logMessage);
        break;
      default:
        logMessage = 'Bug comum resolvido. Código limpo.';
    }

    if (clickedBug.type !== 'boss-bug' && clickedBug.type !== 'speed-bug') {
      addLog('info', logMessage);
    }

    // Track achievement progress
    trackBugKill(clickedBug.type);
    
    // Update score and remove bug
    setScore(current => current + points);
    setBugs(prev => prev.filter(bug => bug.id !== bugId));
  }, [isPlaying, bugs, addLog, toast]);

  // Game controls
  const startGame = useCallback(() => {
    // Limpar timers existentes antes de iniciar
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = undefined;
    }
    if (spawnTimerRef.current) {
      clearInterval(spawnTimerRef.current);
      spawnTimerRef.current = undefined;
    }
    
    setGameState('playing');
    setScore(0);
    setLevel(1);
    setLives(5);
    setBugs([]);
    setLogs([]);
    setParticles([]);
    lastSpawnRef.current = Date.now();
    addLog('info', 'Sistema iniciado. Caçador de bugs ativo.');
  }, [addLog]);

  const restartGame = useCallback(() => {
    setGameState('idle');
    setTimeout(startGame, 100);
  }, [startGame]);

  const pauseGame = useCallback(() => {
    if (isPlaying) {
      // Limpar timers ao pausar
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = undefined;
      }
      setGameState('paused');
    } else if (gameState === 'paused') {
      setGameState('playing');
    }
  }, [isPlaying, gameState]);

  // Load game settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await supabase
          .from('game_settings')
          .select('*')
          .limit(1)
          .single();
        
        if (data) {
          setGameSettings({
            speed_bug_spawn_rate: data.speed_bug_spawn_rate,
            speed_bug_speed_multiplier: data.speed_bug_speed_multiplier,
            boss_bug_spawn_rate: data.boss_bug_spawn_rate || 0.002,
            boss_bug_points: data.boss_bug_points || 1000,
            boss_bug_timer: data.boss_bug_timer || 7000,
            boss_bug_damage: data.boss_bug_damage || 5
          });
        }
      } catch (error) {
        console.log('Usando configurações padrão do jogo');
      }
    };
    
    loadSettings();
  }, []);

  // Cleanup on unmount - Melhorado para evitar memory leaks
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = undefined;
      }
      if (spawnTimerRef.current) {
        clearInterval(spawnTimerRef.current);
        spawnTimerRef.current = undefined;
      }
    };
  }, []);

  // Remove particle after animation
  const removeParticle = useCallback((particleId: string) => {
    setParticles(prev => prev.filter(p => p.id !== particleId));
  }, []);

  return {
    gameState,
    score,
    level,
    lives,
    bugs,
    logs,
    particles,
    isPlaying,
    isGameOver,
    startGame,
    restartGame,
    pauseGame,
    clickBug,
    removeParticle
  };
};