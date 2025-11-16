/**
 * Componente de Aviso para Detecção de DevTools
 * Exibe avisos visuais quando ferramentas de desenvolvedor são detectadas
 */

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Shield, X, Eye, EyeOff } from 'lucide-react';
import { useDevToolsWarning } from '../../hooks/useDevToolsDetection';

interface DevToolsWarningProps {
  enabled?: boolean;
  showDetectionCount?: boolean;
  allowDismiss?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
  severity?: 'low' | 'medium' | 'high';
  customMessage?: string;
  onDismiss?: () => void;
  onBlock?: () => void;
}

export const DevToolsWarning: React.FC<DevToolsWarningProps> = ({
  enabled = true,
  showDetectionCount = true,
  allowDismiss = true,
  autoHide = false,
  autoHideDelay = 5000,
  severity = 'medium',
  customMessage,
  onDismiss,
  onBlock
}) => {
  const {
    showWarning,
    isBlocked,
    dismissWarning,
    unblock,
    detectionCount,
    isDevToolsOpen
  } = useDevToolsWarning(enabled);

  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Controla visibilidade do aviso
  useEffect(() => {
    if (showWarning || isBlocked) {
      setIsVisible(true);
      setIsMinimized(false);

      // Auto-hide se habilitado
      if (autoHide && !isBlocked) {
        const timer = setTimeout(() => {
          setIsVisible(false);
        }, autoHideDelay);

        return () => clearTimeout(timer);
      }
    }
  }, [showWarning, isBlocked, autoHide, autoHideDelay]);

  // Handler para dismissal
  const handleDismiss = () => {
    setIsVisible(false);
    dismissWarning();
    if (onDismiss) {
      onDismiss();
    }
  };

  // Handler para unblock
  const handleUnblock = () => {
    unblock();
    setIsVisible(false);
    if (onBlock) {
      onBlock();
    }
  };

  // Não renderiza se não estiver visível
  if (!isVisible) return null;

  // Determina estilo baseado na severidade
  const getSeverityStyles = () => {
    switch (severity) {
      case 'low':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          text: 'text-yellow-800',
          icon: 'text-yellow-600',
          button: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800'
        };
      case 'high':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-800',
          icon: 'text-red-600',
          button: 'bg-red-100 hover:bg-red-200 text-red-800'
        };
      default: // medium
        return {
          bg: 'bg-orange-50 border-orange-200',
          text: 'text-orange-800',
          icon: 'text-orange-600',
          button: 'bg-orange-100 hover:bg-orange-200 text-orange-800'
        };
    }
  };

  const styles = getSeverityStyles();

  // Mensagem baseada no estado
  const getMessage = () => {
    if (customMessage) return customMessage;
    
    if (isBlocked) {
      return 'Acesso restrito devido ao uso excessivo de ferramentas de desenvolvedor. Por favor, feche as ferramentas e clique em "Desbloquear" para continuar.';
    }
    
    if (isDevToolsOpen) {
      return 'Ferramentas de desenvolvedor detectadas. Por favor, feche-as para garantir a segurança da aplicação.';
    }
    
    return 'Atividade suspeita detectada. Verifique se não há ferramentas de desenvolvedor abertas.';
  };

  // Renderização minimizada
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className={`p-3 rounded-full shadow-lg transition-all duration-300 ${styles.bg} ${styles.text} border-2`}
          title="Expandir aviso de segurança"
        >
          <Shield className="w-5 h-5" />
          {showDetectionCount && detectionCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {detectionCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className={`rounded-lg border-2 shadow-lg transition-all duration-300 ${styles.bg}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-current border-opacity-20">
          <div className="flex items-center space-x-2">
            <AlertTriangle className={`w-5 h-5 ${styles.icon}`} />
            <h3 className={`font-semibold ${styles.text}`}>
              {isBlocked ? 'Acesso Bloqueado' : 'Aviso de Segurança'}
            </h3>
          </div>
          
          <div className="flex items-center space-x-1">
            {/* Contador de detecções */}
            {showDetectionCount && detectionCount > 0 && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles.button}`}>
                {detectionCount}
              </span>
            )}
            
            {/* Botão minimizar */}
            <button
              onClick={() => setIsMinimized(true)}
              className={`p-1 rounded transition-colors ${styles.button}`}
              title="Minimizar"
            >
              <EyeOff className="w-4 h-4" />
            </button>
            
            {/* Botão fechar */}
            {allowDismiss && !isBlocked && (
              <button
                onClick={handleDismiss}
                className={`p-1 rounded transition-colors ${styles.button}`}
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-4">
          <p className={`text-sm ${styles.text} mb-4`}>
            {getMessage()}
          </p>

          {/* Status indicators */}
          <div className="flex items-center space-x-4 mb-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${isDevToolsOpen ? 'bg-red-500' : 'bg-green-500'}`} />
              <span className={styles.text}>
                DevTools: {isDevToolsOpen ? 'Aberto' : 'Fechado'}
              </span>
            </div>
            
            {showDetectionCount && (
              <div className="flex items-center space-x-1">
                <Eye className="w-3 h-3" />
                <span className={styles.text}>
                  Detecções: {detectionCount}
                </span>
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex space-x-2">
            {isBlocked ? (
              <button
                onClick={handleUnblock}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${styles.button}`}
              >
                Desbloquear
              </button>
            ) : (
              allowDismiss && (
                <button
                  onClick={handleDismiss}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${styles.button}`}
                >
                  Entendi
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente simplificado para casos básicos
export const SimpleDevToolsWarning: React.FC<{ enabled?: boolean }> = ({ enabled = true }) => {
  return (
    <DevToolsWarning
      enabled={enabled}
      severity="medium"
      allowDismiss={true}
      autoHide={false}
      showDetectionCount={true}
    />
  );
};

export default DevToolsWarning;