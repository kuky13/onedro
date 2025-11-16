import React, { useMemo, useCallback, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Bug } from '@/hooks/useDebugInvadersGame'
import { useOptimizedGamePerformance } from '@/hooks/useOptimizedGamePerformance'
import { useDeviceDetection } from '@/hooks/useDeviceDetection'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { OptimizedBugComponent } from './OptimizedBugComponent'

interface OptimizedGameBoardProps {
  bugs: Bug[]
  onBugClick: (bugId: string) => void
  isPlaying: boolean
  gameArea: { width: number; height: number }
  showDebugInfo?: boolean
}

/**
 * GameBoard otimizado com React.memo e performance adaptativa
 * Reduz re-renders e otimiza para dispositivos móveis
 */
export const OptimizedGameBoard = React.memo<OptimizedGameBoardProps>(({ 
  bugs, 
  onBugClick, 
  isPlaying, 
  gameArea,
  showDebugInfo = false 
}) => {
  const { config, isLowEndDevice } = useOptimizedGamePerformance()
  const { isMobile } = useDeviceDetection()
  const { isMobileDevice } = useMobileDetection()
  const [visibleArea, setVisibleArea] = useState({ top: 0, bottom: 100 })

  const isMobileOrTablet = isMobile || isMobileDevice

  // Limitar número de bugs renderizados baseado na performance
  const visibleBugs = useMemo(() => {
    const maxBugs = config.maxBugs
    const sortedBugs = [...bugs]
      .sort((a, b) => {
        // Priorizar bugs críticos e boss bugs
        const priorityOrder = {
          'boss-bug': 0,
          'critical-bug': 1,
          'speed-bug': 2,
          'memory-leak': 3,
          'bug': 4
        }
        return (priorityOrder[a.type] || 5) - (priorityOrder[b.type] || 5)
      })
      .slice(0, maxBugs)
    
    return sortedBugs
  }, [bugs, config.maxBugs])

  // Filtrar bugs que estão na área visível (viewport culling)
  const bugsInView = useMemo(() => {
    if (!isMobileOrTablet) return visibleBugs
    
    return visibleBugs.filter(bug => 
      bug.y >= visibleArea.top - 10 && 
      bug.y <= visibleArea.bottom + 10
    )
  }, [visibleBugs, visibleArea, isMobileOrTablet])

  // Callback otimizado para clique em bugs
  const handleBugClick = useCallback((bugId: string) => {
    onBugClick(bugId)
  }, [onBugClick])

  // Detectar área visível para viewport culling
  useEffect(() => {
    if (!isMobileOrTablet) return

    const updateVisibleArea = () => {
      const gameBoard = document.querySelector('.game-board-optimized')
      if (gameBoard) {
        const rect = gameBoard.getBoundingClientRect()
        const viewportHeight = window.innerHeight
        
        setVisibleArea({
          top: Math.max(0, -rect.top / rect.height * 100),
          bottom: Math.min(100, (viewportHeight - rect.top) / rect.height * 100)
        })
      }
    }

    updateVisibleArea()
    window.addEventListener('scroll', updateVisibleArea, { passive: true })
    window.addEventListener('resize', updateVisibleArea, { passive: true })

    return () => {
      window.removeEventListener('scroll', updateVisibleArea)
      window.removeEventListener('resize', updateVisibleArea)
    }
  }, [isMobileOrTablet])

  // Contar bugs por tipo para alertas
  const bugCounts = useMemo(() => {
    return visibleBugs.reduce((acc, bug) => {
      acc[bug.type] = (acc[bug.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [visibleBugs])

  // Alertas para bugs críticos
  const showBossAlert = bugCounts['boss-bug'] > 0
  const showSpeedAlert = bugCounts['speed-bug'] >= 3

  // Classes CSS adaptativas
  const boardClasses = useMemo(() => cn(
    'game-board-optimized',
    'relative w-full bg-gradient-to-b from-gray-800 to-gray-900',
    'border border-green-500/30 rounded-lg overflow-hidden',
    'transition-all duration-300',
    isMobileOrTablet && 'mobile-optimized',
    config.batteryMode && 'battery-saving-mode',
    isLowEndDevice && 'low-end-device',
    !isPlaying && 'opacity-75'
  ), [isMobileOrTablet, config.batteryMode, isLowEndDevice, isPlaying])

  return (
    <div 
      className={boardClasses}
      style={{
        height: `${gameArea.height}px`,
        minHeight: isMobileOrTablet ? '60vh' : '400px',
        transform: 'translate3d(0, 0, 0)', // Force hardware acceleration
        willChange: isPlaying ? 'transform' : 'auto',
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
    >
      {/* Alertas de bugs críticos - REMOVIDOS conforme solicitação do usuário */}
      {/* {showBossAlert && (
        <motion.div
          className="absolute top-2 left-2 bg-red-500/20 border border-red-500 rounded px-2 py-1 text-red-400 text-xs font-mono z-50"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
        >
          ⚠️ BOSS BUG DETECTED!
        </motion.div>
      )} */}

      {/* {showSpeedAlert && (
        <motion.div
          className="absolute top-2 right-2 bg-yellow-500/20 border border-yellow-500 rounded px-2 py-1 text-yellow-400 text-xs font-mono z-50"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
        >
          ⚡ SPEED BUGS SWARM!
        </motion.div>
      )} */}

      {/* Debug info */}
      {showDebugInfo && (
        <div className="absolute bottom-2 left-2 bg-black/50 rounded px-2 py-1 text-green-400 text-xs font-mono z-50">
          <div>Bugs: {bugsInView.length}/{visibleBugs.length}/{bugs.length}</div>
          <div>FPS: {config.targetFPS}</div>
          <div>Quality: {config.animationQuality}</div>
          {config.batteryMode && <div className="text-yellow-400">🔋 Battery Mode</div>}
        </div>
      )}

      {/* Grid de fundo (apenas se não estiver em modo bateria) */}
      {!config.batteryMode && (
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />
      )}

      {/* Renderizar bugs otimizados */}
      {bugsInView.map(bug => (
        <OptimizedBugComponent
          key={bug.id}
          bug={bug}
          onClick={handleBugClick}
          animationQuality={config.animationQuality}
          enableHaptics={config.enableHaptics}
        />
      ))}

      {/* Efeito de scan (apenas em alta qualidade) */}
      {config.animationQuality === 'high' && isPlaying && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(34, 197, 94, 0.1) 50%, transparent 100%)'
          }}
          animate={{
            x: ['-100%', '100%']
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
      )}

      {/* Overlay quando jogo pausado */}
      {!isPlaying && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="text-green-400 font-mono text-lg">
            {bugs.length === 0 ? 'Waiting for bugs...' : 'Game Paused'}
          </div>
        </div>
      )}
    </div>
  )
})

OptimizedGameBoard.displayName = 'OptimizedGameBoard'