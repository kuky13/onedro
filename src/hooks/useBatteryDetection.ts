import { useState, useEffect } from 'react'

export interface BatteryInfo {
  level: number // 0-1 (0% to 100%)
  charging: boolean
  chargingTime: number | null // seconds until charged
  dischargingTime: number | null // seconds until discharged
  supported: boolean
}

export interface BatteryManager extends EventTarget {
  charging: boolean
  chargingTime: number
  dischargingTime: number
  level: number
  addEventListener(type: string, listener: EventListener): void
  removeEventListener(type: string, listener: EventListener): void
}

/**
 * Hook para detectar informações da bateria do dispositivo
 * Suporta Battery Status API quando disponível
 */
export const useBatteryDetection = (): BatteryInfo => {
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo>({
    level: 1,
    charging: false,
    chargingTime: null,
    dischargingTime: null,
    supported: false
  })

  useEffect(() => {
    let battery: BatteryManager | null = null
    let mounted = true

    const updateBatteryInfo = (batteryManager: BatteryManager) => {
      if (!mounted) return

      setBatteryInfo({
        level: batteryManager.level,
        charging: batteryManager.charging,
        chargingTime: batteryManager.chargingTime === Infinity ? null : batteryManager.chargingTime,
        dischargingTime: batteryManager.dischargingTime === Infinity ? null : batteryManager.dischargingTime,
        supported: true
      })
    }

    const handleBatteryChange = () => {
      if (battery) {
        updateBatteryInfo(battery)
      }
    }

    // Tentar obter informações da bateria
    const initBattery = async () => {
      try {
        // Battery Status API (experimental)
        if ('getBattery' in navigator) {
          battery = (await (navigator as any).getBattery()) as BatteryManager
          updateBatteryInfo(battery)

          // Adicionar listeners para mudanças
          battery.addEventListener('chargingchange', handleBatteryChange)
          battery.addEventListener('levelchange', handleBatteryChange)
          battery.addEventListener('chargingtimechange', handleBatteryChange)
          battery.addEventListener('dischargingtimechange', handleBatteryChange)
        }
        // Fallback para dispositivos que não suportam Battery API
        else {
          // Tentar detectar se está carregando através de outras APIs
          const isCharging = await detectChargingStatus()
          setBatteryInfo(prev => ({
            ...prev,
            charging: isCharging,
            supported: false
          }))
        }
      } catch (error) {
        console.warn('Battery API not supported:', error)
        setBatteryInfo(prev => ({ ...prev, supported: false }))
      }
    }

    initBattery()

    return () => {
      mounted = false
      if (battery) {
        battery.removeEventListener('chargingchange', handleBatteryChange)
        battery.removeEventListener('levelchange', handleBatteryChange)
        battery.removeEventListener('chargingtimechange', handleBatteryChange)
        battery.removeEventListener('dischargingtimechange', handleBatteryChange)
      }
    }
  }, [])

  return batteryInfo
}

/**
 * Função auxiliar para detectar status de carregamento
 * quando Battery API não está disponível
 */
const detectChargingStatus = async (): Promise<boolean> => {
  try {
    // Tentar usar Network Information API para inferir se está carregando
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      // Se a conexão é muito rápida, provavelmente está conectado à energia
      if (connection && connection.downlink > 10) {
        return true
      }
    }

    // Tentar usar Device Memory API
    if ('deviceMemory' in navigator) {
      const deviceMemory = (navigator as any).deviceMemory
      // Dispositivos com mais memória geralmente têm melhor gestão de energia
      return deviceMemory >= 4
    }

    // Fallback: assumir que não está carregando
    return false
  } catch {
    return false
  }
}

/**
 * Hook para determinar se o dispositivo está em modo de economia de bateria
 */
export const useBatterySaver = (threshold: number = 0.2): boolean => {
  const { level, charging, supported } = useBatteryDetection()
  
  // Se não suporta Battery API, assumir que não está em modo economia
  if (!supported) return false
  
  // Modo economia se bateria baixa e não carregando
  return level < threshold && !charging
}

/**
 * Hook para obter configurações de performance baseadas na bateria
 */
export const useBatteryOptimizedSettings = () => {
  const { level, charging, supported } = useBatteryDetection()
  const isBatterySaver = useBatterySaver()
  
  return {
    // Reduzir qualidade de animação quando bateria baixa
    animationQuality: isBatterySaver ? 'low' : level < 0.5 && !charging ? 'medium' : 'high',
    
    // Reduzir taxa de atualização quando bateria baixa
    updateInterval: isBatterySaver ? 100 : level < 0.3 && !charging ? 50 : 16,
    
    // Desabilitar efeitos visuais quando bateria muito baixa
    enableEffects: !isBatterySaver && (level > 0.3 || charging),
    
    // Reduzir número de partículas
    maxParticles: isBatterySaver ? 10 : level < 0.5 && !charging ? 25 : 50,
    
    // Configurações de renderização
    enableShadows: level > 0.5 || charging,
    enableBlur: level > 0.3 || charging,
    enableGlow: level > 0.4 || charging,
    
    // Status da bateria para debug
    batteryInfo: supported ? { level, charging } : null
  }
}