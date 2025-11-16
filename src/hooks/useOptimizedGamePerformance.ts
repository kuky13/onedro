import React, { useState, useEffect, useMemo } from 'react'
import { useDeviceDetection } from './useDeviceDetection'
import { useMobileDetection } from './useMobileDetection'
import { useBatteryDetection, useBatteryOptimizedSettings } from './useBatteryDetection'
import { useIOSDetection } from './useIOSDetection'

export interface GamePerformanceConfig {
  animationQuality: 'low' | 'medium' | 'high'
  particleCount: number
  updateInterval: number
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
  const { isMobileDevice } = useMobileDetection()
  const batteryInfo = useBatteryDetection()
  const batterySettings = useBatteryOptimizedSettings()
  const { isIOS, isAndroid } = useIOSDetection()

  // Configuração adaptativa baseada no dispositivo e bateria
  const config = useMemo((): GamePerformanceConfig => {
    const isMobileOrTablet = isMobile || isMobileDevice
    const isLowPower = batteryInfo.level < 0.3 && !batteryInfo.charging
    const isVeryLowPower = batteryInfo.level < 0.15 && !batteryInfo.charging
    
    return {
      animationQuality: batterySettings.animationQuality,
      particleCount: batterySettings.maxParticles,
      updateInterval: batterySettings.updateInterval,
      enableShadows: batterySettings.enableShadows && !isMobileOrTablet,
      enableBlur: batterySettings.enableBlur && !isMobileOrTablet,
      enableGlow: batterySettings.enableGlow,
      batteryMode: isLowPower,
      enableHaptics: supportsHaptics && !isVeryLowPower && (isIOS || isAndroid),
      hitboxSize: isMobileOrTablet ? 48 : 32
    }
  }, [isMobile, isMobileDevice, batteryInfo, batterySettings, supportsHaptics, isIOS, isAndroid])

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
    const isMobileOrTablet = isMobile || isMobileDevice
    
    if (!isMobileOrTablet) return null
    
    return {
      preventZoom: true,
      preventScroll: true,
      enableHaptics: config.enableHaptics,
      expandedHitboxes: true,
      safeAreaSupport: isIOS,
      gesturePreventionLevel: isLowEnd ? 'aggressive' : 'normal'
    }
  }, [isMobile, isMobileDevice, config.enableHaptics, isIOS, isLowEnd])

  return {
    config,
    batteryInfo,
    batterySettings,
    shouldUseBatteryMode,
    adjustPerformance,
    isMobileOptimized: isMobile || isMobileDevice,
    isLowEndDevice: isLowEnd,
    hasTouchSupport: hasTouch,
    mobileConfig,
    deviceCapabilities: {
      supportsHaptics,
      isIOS,
      isAndroid,
      hasTouch,
      isMobile: isMobile || isMobileDevice
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