/**
 * Real-time Service Order Hook
 * Provides real-time updates for service orders using Supabase Realtime with polling fallback
 * Sistema OneDrip - Real-time Customer Experience
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ServiceOrderRealTimeData {
  id: string;
  formatted_id: string;
  device_type: string;
  device_model: string;
  reported_issue: string;
  status: string;
  payment_status: string;
  estimated_completion: string | null;
  actual_completion: string | null;
  customer_notes: string | null;
  delivery_date: string | null;
  last_customer_update: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceOrderEvent {
  id: string;
  event_type: string;
  customer_message: string | null;
  customer_visible: boolean;
  created_at: string;
  payload: any;
}

export interface RealTimeStatus {
  isConnected: boolean;
  lastUpdate: Date | null;
  connectionType: 'realtime' | 'polling' | 'offline';
  errorCount: number;
}

interface UseServiceOrderRealTimeOptions {
  shareToken?: string;
  formattedId?: string;
  serviceOrderId?: string;
  enablePolling?: boolean;
  pollingInterval?: number;
  enableNotifications?: boolean;
}

export function useServiceOrderRealTime(options: UseServiceOrderRealTimeOptions) {
  const {
    shareToken,
    formattedId,
    serviceOrderId,
    enablePolling = true,
    pollingInterval = 30000, // 30 seconds
    enableNotifications = true
  } = options;

  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealTimeStatus>({
    isConnected: false,
    lastUpdate: null,
    connectionType: 'offline',
    errorCount: 0
  });

  const [events, setEvents] = useState<ServiceOrderEvent[]>([]);
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Query for service order data
  const queryIdentifier = formattedId || shareToken || serviceOrderId;

  const serviceOrderQuery = useQuery({
    queryKey: ['service-order-realtime', queryIdentifier],
    queryFn: async (): Promise<ServiceOrderRealTimeData | null> => {
      if (formattedId) {
        const { data, error } = await supabase
          .rpc('get_service_order_by_formatted_id' as any, {
            p_formatted_id: formattedId
          });

        if (error) throw error;
        return (data as any)?.[0] || null;
      } else if (shareToken) {
        const { data, error } = await supabase
          .rpc('get_service_order_by_share_token', {
            p_share_token: shareToken
          });

        if (error) throw error;
        return data?.[0] || null;
      } else if (serviceOrderId) {
        const { data, error } = await supabase
          .from('service_orders')
          .select(`
            id,
            sequential_number,
            device_type,
            device_model,
            reported_issue,
            status,
            payment_status,
            estimated_completion,
            actual_completion,
            customer_notes,
            delivery_date,
            last_customer_update,
            created_at,
            updated_at
          `)
          .eq('id', serviceOrderId)
          .eq('customer_visible', true)
          .single();

        if (error) throw error;

        const seq = (data as any)?.sequential_number as number | null | undefined;
        const formatted_id = seq != null ? `OS: ${String(seq).padStart(4, '0')}` : data.id.slice(-8);

        return { ...(data as any), formatted_id } as ServiceOrderRealTimeData;
      }
      return null;
    },
    enabled: !!(formattedId || shareToken || serviceOrderId),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });

  // Query for events
  const eventsQuery = useQuery({
    queryKey: ['service-order-events-realtime', shareToken || serviceOrderId],
    queryFn: async (): Promise<ServiceOrderEvent[]> => {
      if (!serviceOrderQuery.data?.id) return [];

      const { data, error } = await supabase
        .from('service_order_events')
        .select('id, event_type, customer_message, customer_visible, created_at, payload')
        .eq('service_order_id', serviceOrderQuery.data.id)
        .eq('customer_visible', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map((e: any) => ({
        id: e.id,
        event_type: e.event_type,
        customer_message: e.customer_message ?? null,
        customer_visible: !!e.customer_visible,
        created_at: e.created_at ?? new Date().toISOString(),
        payload: e.payload,
      }));
    },
    enabled: !!serviceOrderQuery.data?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Update events state when query data changes
  useEffect(() => {
    if (eventsQuery.data) {
      setEvents(eventsQuery.data);
      if (eventsQuery.data.length > 0) {
        setLastEventId(eventsQuery.data[0]!.id);
      }
    }
  }, [eventsQuery.data]);

  // Handle new events and notifications
  const handleNewEvent = useCallback((newEvent: ServiceOrderEvent) => {
    setEvents(prev => {
      // Check if event already exists
      if (prev.some(e => e.id === newEvent.id)) {
        return prev;
      }
      
      // Add new event to the beginning
      const updated = [newEvent, ...prev].slice(0, 50); // Keep only last 50 events
      
      // Show notification for new customer-visible events
      if (enableNotifications && newEvent.customer_visible && newEvent.customer_message) {
        toast.info(newEvent.customer_message, {
          duration: 5000,
          action: {
            label: 'Ver detalhes',
            onClick: () => {
              // Scroll to timeline or show details
              const timelineElement = document.getElementById('service-order-timeline');
              if (timelineElement) {
                timelineElement.scrollIntoView({ behavior: 'smooth' });
              }
            }
          }
        });
      }
      
      return updated;
    });
    
    setLastEventId(newEvent.id);
    setStatus(prev => ({
      ...prev,
      lastUpdate: new Date(),
      errorCount: 0
    }));
  }, [enableNotifications]);

  // Setup Supabase Realtime subscription
  const setupRealTimeSubscription = useCallback(() => {
    if (!serviceOrderQuery.data?.id) return;

    try {
      // Clean up existing subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }

      // Subscribe to service order changes
      const serviceOrderChannel = supabase
        .channel(`service-order-${serviceOrderQuery.data.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'service_orders',
            filter: `id=eq.${serviceOrderQuery.data.id}`
          },
          (payload) => {
            console.log('Service order updated:', payload);
            // Invalidate and refetch service order data
            queryClient.invalidateQueries({
              queryKey: ['service-order-realtime', queryIdentifier]
            });
            
            setStatus(prev => ({
              ...prev,
              lastUpdate: new Date(),
              connectionType: 'realtime',
              errorCount: 0
            }));
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'service_order_events',
            filter: `service_order_id=eq.${serviceOrderQuery.data.id}`
          },
          (payload) => {
            console.log('New event:', payload);
            const raw = (payload as any).new as any;
            const newEvent: ServiceOrderEvent = {
              id: raw.id,
              event_type: raw.event_type,
              customer_message: raw.customer_message ?? null,
              customer_visible: !!raw.customer_visible,
              created_at: raw.created_at ?? new Date().toISOString(),
              payload: raw.payload,
            };

            // Only handle customer-visible events
            if (newEvent.customer_visible) {
              handleNewEvent(newEvent);
            }
          }
        )
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);
          
          setStatus(prev => ({
            ...prev,
            isConnected: status === 'SUBSCRIBED',
            connectionType: status === 'SUBSCRIBED' ? 'realtime' : 'offline'
          }));

          // If subscription fails, fall back to polling
          if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.log('Realtime failed, falling back to polling');
            setupPolling();
          }
        });

      subscriptionRef.current = serviceOrderChannel;

    } catch (error) {
      console.error('Error setting up realtime subscription:', error);
      setStatus(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1,
        connectionType: 'offline'
      }));
      
      // Fall back to polling
      setupPolling();
    }
  }, [serviceOrderQuery.data?.id, queryIdentifier, queryClient, handleNewEvent]);

  // Setup polling fallback
  const setupPolling = useCallback(() => {
    if (!enablePolling || pollingIntervalRef.current) return;

    console.log('Setting up polling fallback');
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        // Refetch service order data
        await queryClient.invalidateQueries({
          queryKey: ['service-order-realtime', queryIdentifier]
        });

        // Check for new events
        if (serviceOrderQuery.data?.id) {
          const { data: newEvents } = await supabase
            .from('service_order_events')
            .select('id, event_type, customer_message, customer_visible, created_at, payload')
            .eq('service_order_id', serviceOrderQuery.data.id)
            .eq('customer_visible', true)
            .gt(
              'created_at',
              lastEventId
                ? events.find(e => e.id === lastEventId)?.created_at || new Date().toISOString()
                : new Date(Date.now() - pollingInterval).toISOString()
            )
            .order('created_at', { ascending: false });

          if (newEvents && newEvents.length > 0) {
            newEvents
              .slice()
              .reverse()
              .forEach((e: any) =>
                handleNewEvent({
                  id: e.id,
                  event_type: e.event_type,
                  customer_message: e.customer_message ?? null,
                  customer_visible: !!e.customer_visible,
                  created_at: e.created_at ?? new Date().toISOString(),
                  payload: e.payload,
                })
              );
          }
        }

        setStatus(prev => ({
          ...prev,
          lastUpdate: new Date(),
          connectionType: 'polling',
          errorCount: 0
        }));

      } catch (error) {
        console.error('Polling error:', error);
        setStatus(prev => ({
          ...prev,
          errorCount: prev.errorCount + 1
        }));
      }
    }, pollingInterval);

    setStatus(prev => ({
      ...prev,
      connectionType: 'polling'
    }));
  }, [enablePolling, pollingInterval, serviceOrderQuery.data?.id, queryIdentifier, queryClient, lastEventId, events, handleNewEvent]);

  // Initialize real-time connection
  useEffect(() => {
    if (serviceOrderQuery.data?.id) {
      setupRealTimeSubscription();
      
      // Set up retry mechanism for failed connections
      if (status.errorCount > 0 && status.errorCount < 3) {
        retryTimeoutRef.current = setTimeout(() => {
          setupRealTimeSubscription();
        }, Math.pow(2, status.errorCount) * 1000); // Exponential backoff
      }
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [serviceOrderQuery.data?.id, setupRealTimeSubscription, status.errorCount]);

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
  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['service-order-realtime', shareToken || serviceOrderId]
      }),
      queryClient.invalidateQueries({
        queryKey: ['service-order-events-realtime', shareToken || serviceOrderId]
      })
    ]);
  }, [queryClient, shareToken, serviceOrderId]);

  // Log customer view
  useEffect(() => {
    if (serviceOrderQuery.data?.id && shareToken) {
      const soId = serviceOrderQuery.data.id;

      // Log that customer viewed the service order
      const logCustomerView = async () => {
        try {
          const { error } = await supabase.rpc('log_customer_view', {
            p_service_order_id: soId,
            p_share_token: shareToken
          });

          if (error) {
            console.error('Error logging customer view:', error);
          }
        } catch (err) {
          console.error('Failed to log customer view:', err);
        }
      };

      logCustomerView();
    }
  }, [serviceOrderQuery.data?.id, shareToken]);

  return {
    serviceOrder: serviceOrderQuery.data,
    events,
    status,
    isLoading: serviceOrderQuery.isLoading || eventsQuery.isLoading,
    error: serviceOrderQuery.error || eventsQuery.error,
    refresh
  };
}