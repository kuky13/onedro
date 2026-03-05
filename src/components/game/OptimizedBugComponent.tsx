import React, { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Bug } from '@/hooks/useDebugInvadersGame'
import { useDeviceDetection } from '@/hooks/useDeviceDetection'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { useOptimizedDebounce } from '@/hooks/useOptimizedGameLoop'

interface OptimizedBugProps {
  bug: Bug
  onClick: (bugId: string) => void
  animationQuality: 'low' | 'medium' | 'high'
  enableHaptics?: boolean
}

/**
 * Componente Bug otimizado com hitboxes expandidas e touch events
 * Otimizado para dispositivos móveis com feedback haptic
 */
export const OptimizedBugComponent = React.memo<OptimizedBugProps>(({ 
  bug, 
  onClick, 
  animationQuality,
  enableHaptics = false 
}) => {
  const { isMobile } = useDeviceDetection()
  const mobileDetection = useMobileDetection()
  
  const isMobileOrTablet = isMobile || mobileDetection.isMobile
  const hasTouch = mobileDetection.isMobile || window.matchMedia('(pointer: coarse)').matches

  // Calcular tamanho do hitbox baseado no dispositivo e tipo de bug
  const hitboxSize = useMemo(() => {
    const baseSize = isMobileOrTablet ? 48 : 32 // WCAG compliance - mínimo 44px para mobile
    const typeMultiplier = {
      'boss-bug': 1.5,
      'speed-bug': 1.3,
      'critical-bug': 1.2,
      'memory-leak': 1.2,
      'bug': 1.0
    }[bug.type] || 1.0
    
    return Math.max(baseSize * typeMultiplier, 44) // Garantir mínimo 44px
  }, [bug.type, isMobileOrTablet])

  // Obter emoji do bug
  const getBugEmoji = useCallback((type: Bug['type']) => {
    const emojis = {
      'boss-bug': '👾',
      'critical-bug': '🐛',
      'speed-bug': '🏃‍♂️',
      'memory-leak': '🧠',
      'bug': '🐞'
    }
    return emojis[type] || '🐞'
  }, [])

  // Otimizar animações baseado na qualidade
  const animationProps = useMemo(() => {
    switch (animationQuality) {
      case 'low':
        return {
          animate: false,
          transition: { duration: 0 }
        }
      case 'medium':
        return {
          animate: bug.type === 'boss-bug' ? { scale: [1, 1.05, 1] } : false,
          transition: { duration: 0.3, ease: 'easeInOut' }
        }
      case 'high':
      default:
        const animations: Record<string, any> = {
          'boss-bug': { 
            scale: [1, 1.1, 1],
            rotate: [0, 2, -2, 0]
          },
          'speed-bug': { 
            y: [0, -3, 0], 
            rotate: [0, 3, -3, 0] 
          },
          'critical-bug': {
            scale: [1, 1.05, 1],
            opacity: [1, 0.8, 1]
          },
          'memory-leak': {
            scale: [1, 0.95, 1],
            filter: ['hue-rotate(0deg)', 'hue-rotate(10deg)', 'hue-rotate(0deg)']
          },
          'bug': false
        }
        
        return {
          animate: animations[bug.type] ?? false,
          transition: { 
            duration: bug.type === 'boss-bug' ? 0.8 : 0.4,
            repeat: Infinity,
            ease: 'easeInOut'
          }
        }
    }
  }, [animationQuality, bug.type])

  // Handler otimizado com debounce para cliques/toques
  const debouncedClick = useOptimizedDebounce(() => {
    onClick(bug.id)
  }, 50) // 50ms debounce para evitar cliques duplos

  // Handler para touch events com haptic feedback
  const handleTouch = useCallback((e: React.TouchEvent) => {
    e.preventDefault() // Previne zoom duplo-toque
    e.stopPropagation()
    
    // Haptic feedback se disponível
    if (enableHaptics && 'vibrate' in navigator && hasTouch) {
      const vibrationPattern = {
        'boss-bug': [100, 50, 100], // Vibração mais intensa para boss
        'critical-bug': [80],
        'speed-bug': [40],
        'memory-leak': [60],
        'bug': [30]
      }[bug.type] || [50]
      
      navigator.vibrate(vibrationPattern)
    }
    
    debouncedClick()
  }, [enableHaptics, hasTouch, bug.type, debouncedClick])

  // Handler para mouse events (desktop)
  const handleMouseClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    debouncedClick()
  }, [debouncedClick])

  // Classes CSS adaptativas
  const bugClasses = useMemo(() => cn(
    'bug-component-optimized',
    `bug-${bug.type}`,
    'absolute flex items-center justify-center',
    'border-2 border-transparent rounded-lg',
    'transition-all duration-200 ease-out',
    'cursor-pointer select-none',
    'hover:scale-110 hover:border-green-400/50',
    'active:scale-95',
    isMobileOrTablet && 'mobile-optimized',
    // Cores específicas por tipo
    {
      'bg-red-500/20 text-red-400 hover:bg-red-500/30': bug.type === 'boss-bug',
      'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30': bug.type === 'critical-bug',
      'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30': bug.type === 'speed-bug',
      'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30': bug.type === 'memory-leak',
      'bg-green-500/20 text-green-400 hover:bg-green-500/30': bug.type === 'bug'
    }
  ), [bug.type, isMobileOrTablet])

  return (
    <motion.button
      className={bugClasses}
      style={{
        left: `${bug.x}%`,
        top: `${bug.y}%`,
        width: hitboxSize,
        height: hitboxSize,
        transform: 'translate(-50%, -50%) translate3d(0, 0, 0)',
        zIndex: 1000 + (parseInt(bug.id.slice(-3)) || 0),
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
        willChange: animationQuality !== 'low' ? 'transform' : 'auto'
      }}
      onClick={!hasTouch ? handleMouseClick : undefined}
      onTouchStart={hasTouch ? handleTouch : undefined}
      animate={animationProps.animate || false}
      transition={animationProps.transition as any}
      whileHover={animationQuality !== 'low' ? { scale: 1.1 } : {}}
      whileTap={animationQuality !== 'low' ? { scale: 0.95 } : {}}
    >
      {/* Emoji do bug */}
      <span 
        className="bug-emoji text-lg font-bold pointer-events-none"
        style={{
          fontSize: `${Math.min(hitboxSize * 0.6, 24)}px`,
          filter: bug.type === 'boss-bug' ? 'drop-shadow(0 0 4px currentColor)' : 'none'
        }}
      >
        {getBugEmoji(bug.type)}
      </span>
      
      {/* Timer para boss bugs */}
      {bug.type === 'boss-bug' && bug.bossTimer && (
        <div 
          className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-mono"
          style={{ fontSize: '10px' }}
        >
          {Math.ceil(bug.bossTimer / 1000)}
        </div>
      )}
      
      {/* Indicador de velocidade para speed bugs */}
      {bug.type === 'speed-bug' && (
        <div className="absolute -top-1 -left-1 text-yellow-400 text-xs">
          ⚡
        </div>
      )}
      
      {/* Indicador de criticidade */}
      {bug.type === 'critical-bug' && (
        <div className="absolute -bottom-1 -right-1 text-orange-400 text-xs">
          ⚠️
        </div>
      )}
      
      {/* Efeito de pulsação para memory leaks */}
      {bug.type === 'memory-leak' && animationQuality === 'high' && (
        <div 
          className="absolute inset-0 rounded-lg border border-purple-400/30"
          style={{
            animation: 'pulse 2s infinite'
          }}
        />
      )}
      
      {/* Hitbox visual para debug (apenas em desenvolvimento) */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          className="absolute inset-0 border border-red-500/20 rounded-lg pointer-events-none"
          title={`Hitbox: ${hitboxSize}px - Type: ${bug.type}`}
        />
      )}
    </motion.button>
  )
})

OptimizedBugComponent.displayName = 'OptimizedBugComponent'