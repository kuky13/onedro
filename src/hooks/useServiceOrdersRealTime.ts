/**
 * Real-time Service Orders List Hook
 * Provides real-time updates for service orders list using Supabase Realtime with polling fallback
 * Sistema OneDrip - Real-time Customer Experience
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface RealTimeStatus {
  isConnected: boolean;
  lastUpdate: Date | null;
  connectionType: 'realtime' | 'polling' | 'offline';
  errorCount: number;
  updatesCount: number;
}

interface UseServiceOrdersRealTimeOptions {
  enablePolling?: boolean;
  pollingInterval?: number;
  enableNotifications?: boolean;
  enableToasts?: boolean;
}

export function useServiceOrdersRealTime(options: UseServiceOrdersRealTimeOptions = {}) {
  const {
    enablePolling = true,
    pollingInterval = 30000, // 30 seconds
    enableNotifications = true,
    enableToasts = false // Discreto por padrão
  } = options;

  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  const [status, setStatus] = useState<RealTimeStatus>({
    isConnected: false,
    lastUpdate: null,
    connectionType: 'offline',
    errorCount: 0,
    updatesCount: 0
  });

  const subscriptionRef = useRef<any>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<Date | null>(null);

  // Invalidate service orders queries
  const invalidateServiceOrders = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    
    setStatus(prev => ({
      ...prev,
      lastUpdate: new Date(),
      updatesCount: prev.updatesCount + 1,
      errorCount: 0
    }));

    lastUpdateRef.current = new Date();

    if (enableToasts) {
      toast.info('Lista de ordens atualizada', {
        duration: 2000,
        position: 'bottom-right'
      });
    }
  }, [queryClient, enableToasts]);

  // Setup polling fallback
  const setupPolling = useCallback(() => {
    if (!enablePolling || !profile?.id) return;

    // Clear existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(() => {
      console.log('🔄 [ServiceOrders] Polling for updates...');
      invalidateServiceOrders();
      
      setStatus(prev => ({
        ...prev,
        connectionType: 'polling',
        isConnected: true
      }));
    }, pollingInterval);

    console.log('📊 [ServiceOrders] Polling setup with interval:', pollingInterval);
  }, [enablePolling, profile?.id, pollingInterval, invalidateServiceOrders]);

  // Setup Supabase Realtime subscription
  const setupRealTimeSubscription = useCallback(() => {
    if (!profile?.id) {
      console.log('❌ [ServiceOrders] No user profile, skipping realtime setup');
      return;
    }

    try {
      // Clean up existing subscription
      if (subscriptionRef.current) {
        console.log('🧹 [ServiceOrders] Cleaning up existing subscription');
        subscriptionRef.current.unsubscribe();
      }

      console.log('🚀 [ServiceOrders] Setting up realtime subscription for user:', profile.id);

      // Create channel for service orders
      const serviceOrdersChannel = supabase
        .channel('service-orders-list')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'service_orders',
            filter: `owner_id=eq.${profile.id}`
          },
          (payload) => {
            console.log('📦 [ServiceOrders] Realtime update received:', {
              event: payload.eventType,
              table: payload.table,
              new: payload.new,
              old: payload.old
            });

            // Invalidate queries to refresh the list
            invalidateServiceOrders();

            // Show notification based on event type
            if (enableNotifications) {
              let message = '';
              switch (payload.eventType) {
                case 'INSERT':
                  message = 'Nova ordem de serviço criada';
                  break;
                case 'UPDATE':
                  message = 'Ordem de serviço atualizada';
                  break;
                case 'DELETE':
                  message = 'Ordem de serviço removida';
                  break;
                default:
                  message = 'Lista de ordens atualizada';
              }

              if (enableToasts) {
                toast.success(message, {
                  duration: 3000,
                  position: 'bottom-right'
                });
              }
            }

            setStatus(prev => ({
              ...prev,
              lastUpdate: new Date(),
              connectionType: 'realtime',
              isConnected: true,
              errorCount: 0,
              updatesCount: prev.updatesCount + 1
            }));
          }
        )
        .subscribe((status) => {
          console.log('🔗 [ServiceOrders] Subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            setStatus(prev => ({
              ...prev,
              isConnected: true,
              connectionType: 'realtime',
              errorCount: 0
            }));
            
            // Clear polling since realtime is working
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            
            console.log('✅ [ServiceOrders] Realtime subscription active');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.log('❌ [ServiceOrders] Realtime failed, falling back to polling');
            setStatus(prev => ({
              ...prev,
              connectionType: 'polling',
              errorCount: prev.errorCount + 1
            }));
            setupPolling();
          }
        });

      subscriptionRef.current = serviceOrdersChannel;

    } catch (error) {
      console.error('❌ [ServiceOrders] Error setting up realtime subscription:', error);
      setStatus(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1,
        connectionType: 'offline'
      }));
      
      // Fallback to polling
      if (enablePolling) {
        setupPolling();
      }
    }
  }, [profile?.id, invalidateServiceOrders, enableNotifications, enableToasts, setupPolling, enablePolling]);

  // Setup retry mechanism
  const setupRetry = useCallback(() => {
    if (status.errorCount > 0 && status.errorCount < 5) {
      const retryDelay = Math.min(1000 * Math.pow(2, status.errorCount), 30000); // Exponential backoff, max 30s
      
      console.log(`🔄 [ServiceOrders] Retrying connection in ${retryDelay}ms (attempt ${status.errorCount + 1})`);
      
      retryTimeoutRef.current = setTimeout(() => {
        setupRealTimeSubscription();
      }, retryDelay);
    }
  }, [status.errorCount, setupRealTimeSubscription]);

  // Initialize subscription when user is available
  useEffect(() => {
    if (profile?.id) {
      console.log('👤 [ServiceOrders] User profile available, initializing realtime');
      setupRealTimeSubscription();
    }

    return () => {
      console.log('🧹 [ServiceOrders] Cleaning up subscriptions');
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [profile?.id, setupRealTimeSubscription]);

  // Setup retry when there are errors
  useEffect(() => {
    setupRetry();
    
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [setupRetry]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Manual refresh function
  const refresh = useCallback(() => {
    console.log('🔄 [ServiceOrders] Manual refresh triggered');
    invalidateServiceOrders();
  }, [invalidateServiceOrders]);

  // Reconnect function
  const reconnect = useCallback(() => {
    console.log('🔄 [ServiceOrders] Manual reconnect triggered');
    setStatus(prev => ({ ...prev, errorCount: 0 }));
    setupRealTimeSubscription();
  }, [setupRealTimeSubscription]);

  return {
    status,
    refresh,
    reconnect,
    isConnected: status.isConnected,
    connectionType: status.connectionType,
    lastUpdate: status.lastUpdate,
    updatesCount: status.updatesCount
  };
}