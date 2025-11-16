/**
 * Hook React para Detecção de Ferramentas do Desenvolvedor
 * Integra o sistema de detecção com componentes React
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { devToolsDetector, DevToolsEvent, DevToolsConfig } from '../services/devToolsDetector';

export interface UseDevToolsDetectionOptions {
  enabled?: boolean;
  config?: Partial<DevToolsConfig>;
  onDetection?: (event: DevToolsEvent) => void;
  onWarning?: (count: number) => void;
  onBlock?: (count: number) => void;
}

export interface DevToolsDetectionState {
  isDetectionActive: boolean;
  detectionCount: number;
  lastDetectionTime: number;
  isDevToolsOpen: boolean;
  warningLevel: 'none' | 'low' | 'medium' | 'high';
}

export const useDevToolsDetection = (options: UseDevToolsDetectionOptions = {}) => {
  const {
    enabled = true,
    config,
    onDetection,
    onWarning,
    onBlock
  } = options;

  const [state, setState] = useState<DevToolsDetectionState>({
    isDetectionActive: false,
    detectionCount: 0,
    lastDetectionTime: 0,
    isDevToolsOpen: false,
    warningLevel: 'none'
  });

  // Use refs para callbacks para evitar re-renders
  const onDetectionRef = useRef(onDetection);
  const onWarningRef = useRef(onWarning);
  const onBlockRef = useRef(onBlock);

  // Atualiza refs quando callbacks mudam
  useEffect(() => {
    onDetectionRef.current = onDetection;
    onWarningRef.current = onWarning;
    onBlockRef.current = onBlock;
  }, [onDetection, onWarning, onBlock]);

  // Atualiza estado baseado nas estatísticas do detector
  const updateState = useCallback(() => {
    const stats = devToolsDetector.getStats();
    const warningLevel = getWarningLevel(stats.detectionCount);
    
    setState(prev => ({
      ...prev,
      isDetectionActive: stats.isActive,
      detectionCount: stats.detectionCount,
      lastDetectionTime: stats.lastDetection,
      isDevToolsOpen: stats.detectionCount > 0 && (Date.now() - stats.lastDetection) < 5000,
      warningLevel
    }));
  }, []);

  // Determina nível de aviso baseado no número de detecções
  const getWarningLevel = (count: number): 'none' | 'low' | 'medium' | 'high' => {
    if (count === 0) return 'none';
    if (count <= 2) return 'low';
    if (count <= 5) return 'medium';
    return 'high';
  };

  // Handler para eventos de detecção
  const handleDetection = useCallback((event: DevToolsEvent) => {
    updateState();
    
    // Chama callback personalizado se fornecido
    if (onDetectionRef.current) {
      onDetectionRef.current(event);
    }

    // Chama callbacks baseados no nível de severidade
    const stats = devToolsDetector.getStats();
    
    if (stats.detectionCount === 3 && onWarningRef.current) {
      onWarningRef.current(stats.detectionCount);
    }
    
    if (stats.detectionCount >= 6 && onBlockRef.current) {
      onBlockRef.current(stats.detectionCount);
    }
  }, [updateState]);

  // Inicia/para detecção baseado nas opções
  useEffect(() => {
    if (!enabled) {
      devToolsDetector.stopDetection();
      return;
    }

    // Configura detector se config foi fornecido
    if (config) {
      // Recria detector com nova configuração
      const newDetector = new (devToolsDetector.constructor as any)(config);
      Object.setPrototypeOf(devToolsDetector, newDetector);
    }

    // Adiciona listener para eventos
    devToolsDetector.onDetection(handleDetection);

    // Inicia detecção
    devToolsDetector.startDetection();
    updateState();

    // Atualiza estado periodicamente
    const interval = setInterval(updateState, 1000);

    return () => {
      clearInterval(interval);
      devToolsDetector.stopDetection();
    };
  }, [enabled, config]); // Removidas dependências problemáticas

  // Métodos de controle
  const startDetection = useCallback(() => {
    devToolsDetector.startDetection();
    updateState();
  }, [updateState]);

  const stopDetection = useCallback(() => {
    devToolsDetector.stopDetection();
    updateState();
  }, [updateState]);

  const resetDetection = useCallback(() => {
    devToolsDetector.stopDetection();
    setTimeout(() => {
      devToolsDetector.startDetection();
      updateState();
    }, 100);
  }, [updateState]);

  return {
    ...state,
    startDetection,
    stopDetection,
    resetDetection,
    // Métodos de utilidade
    isWarningLevel: state.warningLevel !== 'none',
    isCriticalLevel: state.warningLevel === 'high',
    shouldShowWarning: state.warningLevel === 'medium' || state.warningLevel === 'high',
    shouldBlock: state.warningLevel === 'high' && state.detectionCount >= 6
  };
};

// Hook simplificado para casos básicos
export const useDevToolsWarning = (enabled = true) => {
  const [showWarning, setShowWarning] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const detection = useDevToolsDetection({
    enabled,
    onWarning: () => setShowWarning(true),
    onBlock: () => setIsBlocked(true)
  });

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
  }, []);

  const unblock = useCallback(() => {
    setIsBlocked(false);
    detection.resetDetection();
  }, [detection.resetDetection]);

  return {
    showWarning,
    isBlocked,
    dismissWarning,
    unblock,
    detectionCount: detection.detectionCount,
    isDevToolsOpen: detection.isDevToolsOpen
  };
};

export default useDevToolsDetection;