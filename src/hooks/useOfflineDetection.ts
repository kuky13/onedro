import { useState, useEffect } from 'react';

export interface OfflineDetectionState {
  isOnline: boolean;
  isOffline: boolean;
  lastOnlineTime: number | null;
  connectionType: string | null;
}

export const useOfflineDetection = () => {
  const [state, setState] = useState<OfflineDetectionState>(() => ({
    isOnline: navigator.onLine,
    isOffline: !navigator.onLine,
    lastOnlineTime: navigator.onLine ? Date.now() : null,
    connectionType: null
  }));

  useEffect(() => {
    const updateConnectionInfo = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      
      return connection?.effectiveType || null;
    };

    const handleOnline = () => {
      setState(prev => ({
        ...prev,
        isOnline: true,
        isOffline: false,
        lastOnlineTime: Date.now(),
        connectionType: updateConnectionInfo()
      }));
    };

    const handleOffline = () => {
      setState(prev => ({
        ...prev,
        isOnline: false,
        isOffline: true,
        connectionType: null
      }));
    };

    const handleConnectionChange = () => {
      setState(prev => ({
        ...prev,
        connectionType: updateConnectionInfo()
      }));
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for connection changes if supported
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Initial connection type
    setState(prev => ({
      ...prev,
      connectionType: updateConnectionInfo()
    }));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return {
    ...state,
    // Helper methods
    hasBeenOfflineFor: (minutes: number) => {
      if (state.isOnline || !state.lastOnlineTime) return false;
      return (Date.now() - state.lastOnlineTime) > (minutes * 60 * 1000);
    },
    isSlowConnection: () => {
      return state.connectionType === 'slow-2g' || state.connectionType === '2g';
    }
  };
};

export default useOfflineDetection;