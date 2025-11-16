import { useCallback, useEffect, useRef } from 'react'
import { useOptimizedGamePerformance } from './useOptimizedGamePerformance'

interface GameLoopOptions {
  isPlaying: boolean
  onUpdate: () => void
  onSpawn?: () => void
  spawnInterval?: number // em ms
}

/**
 * Hook otimizado para game loop usando requestAnimationFrame
 * Substitui setInterval para melhor performance e sincronização com o display
 */
export const useOptimizedGameLoop = ({
  isPlaying,
  onUpdate,
  onSpawn,
  spawnInterval = 2000
}: GameLoopOptions) => {
  const { config } = useOptimizedGamePerformance()
  const frameRef = useRef<number>()
  const lastFrameTime = useRef(0)
  const lastSpawnTime = useRef(0)
  const accumulatedTime = useRef(0)

  // Calcular intervalo de frame baseado no FPS alvo
  const targetFrameTime = 1000 / config.targetFPS

  const gameLoop = useCallback(() => {
    if (!isPlaying) return

    const currentTime = performance.now()
    const deltaTime = currentTime - lastFrameTime.current
    
    // Acumular tempo para manter FPS consistente
    accumulatedTime.current += deltaTime
    
    // Atualizar apenas quando atingir o tempo de frame alvo
    if (accumulatedTime.current >= targetFrameTime) {
      onUpdate()
      
      // Spawn de bugs baseado no intervalo configurado
      if (onSpawn && currentTime - lastSpawnTime.current >= spawnInterval) {
        onSpawn()
        lastSpawnTime.current = currentTime
      }
      
      // Resetar tempo acumulado, mantendo o excesso para próximo frame
      accumulatedTime.current = accumulatedTime.current % targetFrameTime
    }
    
    lastFrameTime.current = currentTime
    frameRef.current = requestAnimationFrame(gameLoop)
  }, [isPlaying, onUpdate, onSpawn, spawnInterval, targetFrameTime])

  // Iniciar/parar game loop
  useEffect(() => {
    if (isPlaying) {
      lastFrameTime.current = performance.now()
      lastSpawnTime.current = performance.now()
      accumulatedTime.current = 0
      frameRef.current = requestAnimationFrame(gameLoop)
    } else {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [isPlaying, gameLoop])

  // Função para pausar temporariamente o loop
  const pauseLoop = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
    }
  }, [])

  // Função para retomar o loop
  const resumeLoop = useCallback(() => {
    if (isPlaying) {
      lastFrameTime.current = performance.now()
      frameRef.current = requestAnimationFrame(gameLoop)
    }
  }, [isPlaying, gameLoop])

  return {
    pauseLoop,
    resumeLoop,
    currentFPS: config.targetFPS
  }
}

/**
 * Hook para debounce otimizado de cliques/toques
 */
export const useOptimizedDebounce = <T extends (...args: any[]) => void>(
  callback: T,
  delay: number = 100
) => {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const lastCallTime = useRef(0)

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    const now = performance.now()
    
    // Prevenir chamadas muito rápidas
    if (now - lastCallTime.current < delay) {
      return
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args)
      lastCallTime.current = performance.now()
    }, delay)
  }, [callback, delay])

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

/**
 * Hook para throttle otimizado de eventos
 */
export const useOptimizedThrottle = <T extends (...args: any[]) => void>(
  callback: T,
  limit: number = 16 // ~60fps
) => {
  const lastCallTime = useRef(0)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const throttledCallback = useCallback((...args: Parameters<T>) => {
    const now = performance.now()
    
    if (now - lastCallTime.current >= limit) {
      callback(...args)
      lastCallTime.current = now
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args)
        lastCallTime.current = performance.now()
      }, limit - (now - lastCallTime.current))
    }
  }, [callback, limit])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return throttledCallback
}