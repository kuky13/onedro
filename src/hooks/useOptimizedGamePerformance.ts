import { useState, useEffect, useMemo } from 'react'
import { useDeviceDetection } from './useDeviceDetection'
import { useBatteryDetection, useBatteryOptimizedSettings } from './useBatteryDetection'
import { useIOSDetection } from './useIOSDetection'

export interface GamePerformanceConfig {
  animationQuality: 'low' | 'medium' | 'high'
  particleCount: number
  updateInterval: number
  targetFPS: number
  enableShadows: boolean
  enableBlur: boolean
  enableGlow: boolean
  batteryMode: boolean
  enableHaptics: boolean
  hitboxSize: number
}

export interface BatteryInfo {
  level: number
  charging: boolean
}

/**
 * Hook para otimização adaptativa de performance do jogo
 * Detecta capacidades do dispositivo e ajusta configurações automaticamente
 */
export const useOptimizedGamePerformance = () => {
  const { isMobile, isLowEnd, hasTouch, supportsHaptics } = useDeviceDetection()
  const batteryInfo = useBatteryDetection()
  const batterySettings = useBatteryOptimizedSettings()
  const { isIOS, isAndroid } = useIOSDetection()

  // Configuração adaptativa baseada no dispositivo e bateria
  const config = useMemo((): GamePerformanceConfig => {
    const isMobileOrTablet = isMobile
    const isLowPower = batteryInfo.level < 0.3 && !batteryInfo.charging
    const isVeryLowPower = batteryInfo.level < 0.15 && !batteryInfo.charging

    const animationQuality = (batterySettings.animationQuality as GamePerformanceConfig['animationQuality']) || 'medium'

    const targetFPS = isVeryLowPower ? 24 : isMobileOrTablet ? 30 : 60

    return {
      animationQuality,
      particleCount: batterySettings.maxParticles,
      updateInterval: batterySettings.updateInterval,
      targetFPS,
      enableShadows: batterySettings.enableShadows && !isMobileOrTablet,
      enableBlur: batterySettings.enableBlur && !isMobileOrTablet,
      enableGlow: batterySettings.enableGlow,
      batteryMode: isLowPower,
      enableHaptics: supportsHaptics && !isVeryLowPower && (isIOS || isAndroid),
      hitboxSize: isMobileOrTablet ? 48 : 32
    }
  }, [isMobile, batteryInfo, batterySettings, supportsHaptics, isIOS, isAndroid])

  // Função para ajustar performance em tempo real
  const adjustPerformance = (adjustment: Partial<GamePerformanceConfig>) => {
    return { ...config, ...adjustment }
  }

  // Detectar se deve usar modo de economia
  const shouldUseBatteryMode = useMemo(() => {
    return config.batteryMode || (batteryInfo.level < 0.15 && !batteryInfo.charging)
  }, [config.batteryMode, batteryInfo])

  // Configurações específicas para mobile
  const mobileConfig = useMemo(() => {
    const isMobileOrTablet = isMobile

    if (!isMobileOrTablet) return null

    return {
      preventZoom: true,
      preventScroll: true,
      enableHaptics: config.enableHaptics,
      expandedHitboxes: true,
      safeAreaSupport: isIOS,
      gesturePreventionLevel: isLowEnd ? 'aggressive' : 'normal'
    }
  }, [isMobile, config.enableHaptics, isIOS, isLowEnd])

  return {
    config,
    batteryInfo,
    batterySettings,
    shouldUseBatteryMode,
    adjustPerformance,
    isMobileOptimized: isMobile,
    isLowEndDevice: isLowEnd,
    hasTouchSupport: hasTouch,
    mobileConfig,
    deviceCapabilities: {
      supportsHaptics,
      isIOS,
      isAndroid,
      hasTouch,
      isMobile
    }
  }
}

/**
 * Hook para monitorar performance em tempo real
 */
export const usePerformanceMonitor = () => {
  const [fps, setFps] = useState(0)
  const [memoryUsage, setMemoryUsage] = useState(0)

  useEffect(() => {
    let frameCount = 0
    let startTime = performance.now()
    let animationId: number

    const measureFPS = () => {
      frameCount++
      const currentTime = performance.now()
      
      if (currentTime - startTime >= 1000) {
        const currentFPS = Math.round((frameCount * 1000) / (currentTime - startTime))
        setFps(currentFPS)
        frameCount = 0
        startTime = currentTime
      }
      
      animationId = requestAnimationFrame(measureFPS)
    }

    animationId = requestAnimationFrame(measureFPS)

    // Monitorar uso de memória se disponível
    const memoryInterval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const usedMB = Math.round(memory.usedJSHeapSize / 1048576)
        setMemoryUsage(usedMB)
      }
    }, 2000)

    return () => {
      cancelAnimationFrame(animationId)
      clearInterval(memoryInterval)
    }
  }, [])

  return { fps, memoryUsage }
}