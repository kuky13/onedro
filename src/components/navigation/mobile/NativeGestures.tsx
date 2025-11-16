import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { RefreshCw, ArrowLeft } from 'lucide-react';

interface NativeGesturesProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
  enableSwipeBack?: boolean;
  enablePullToRefresh?: boolean;
  enable3DTouch?: boolean;
  className?: string;
}

interface TouchForceEvent extends TouchEvent {
  touches: TouchList & {
    [index: number]: Touch & {
      force?: number;
    };
  };
}

export const NativeGestures: React.FC<NativeGesturesProps> = ({
  children,
  onRefresh,
  enableSwipeBack = true,
  enablePullToRefresh = true,
  enable3DTouch = true,
  className = ''
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSwipeIndicator, setShowSwipeIndicator] = useState(false);
  const [force3DTouch, setForce3DTouch] = useState(0);
  
  // Motion values for gestures
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const opacity = useTransform(x, [0, 100], [1, 0.8]);
  const scale = useTransform(y, [0, 100], [1, 0.95]);
  const rotateY = useTransform(x, [0, 300], [0, -15]);
  
  // Pull to refresh transform
  const refreshOpacity = useTransform(y, [0, 80], [0, 1]);
  const refreshScale = useTransform(y, [0, 80], [0.5, 1]);
  const refreshRotate = useTransform(y, [0, 80], [0, 360]);

  // Haptic feedback helper
  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [30],
        heavy: [50]
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  // Swipe back gesture handler
  const handleSwipeBack = useCallback((info: PanInfo) => {
    const { offset, velocity } = info;
    
    if (enableSwipeBack && offset.x > 100 && velocity.x > 500) {
      hapticFeedback('medium');
      
      // Check if we can go back
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        // Navigate to dashboard if no history
        navigate('/painel');
      }
    }
  }, [enableSwipeBack, navigate, hapticFeedback]);

  // Pull to refresh handler
  const handlePullToRefresh = useCallback(async (info: PanInfo) => {
    const { offset } = info;
    
    if (enablePullToRefresh && offset.y > 80 && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      hapticFeedback('heavy');
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [enablePullToRefresh, onRefresh, isRefreshing, hapticFeedback]);

  // Pan gesture handler
  const handlePan = useCallback((event: any, info: PanInfo) => {
    const { offset } = info;
    
    // Show swipe indicator
    if (enableSwipeBack && offset.x > 20) {
      setShowSwipeIndicator(true);
    } else {
      setShowSwipeIndicator(false);
    }
  }, [enableSwipeBack]);

  // Pan end handler
  const handlePanEnd = useCallback((event: any, info: PanInfo) => {
    const { offset } = info;
    
    setShowSwipeIndicator(false);
    
    // Handle swipe back
    if (offset.x > 0) {
      handleSwipeBack(info);
    }
    
    // Handle pull to refresh
    if (offset.y > 0) {
      handlePullToRefresh(info);
    }
    
    // Reset motion values
    x.set(0);
    y.set(0);
  }, [handleSwipeBack, handlePullToRefresh, x, y]);

  // 3D Touch / Force Touch handler
  useEffect(() => {
    if (!enable3DTouch || !containerRef.current) return;

    const handleTouchStart = (event: Event) => {
      const touchEvent = event as TouchForceEvent;
      if (touchEvent.touches.length === 1) {
        const touch = touchEvent.touches[0];
        if (touch.force !== undefined) {
          setForce3DTouch(touch.force);
          
          // Trigger haptic feedback on force increase
          if (touch.force > 0.5) {
            hapticFeedback('light');
          }
          if (touch.force > 0.8) {
            hapticFeedback('heavy');
          }
        }
      }
    };

    const handleTouchMove = (event: Event) => {
      const touchEvent = event as TouchForceEvent;
      if (touchEvent.touches.length === 1) {
        const touch = touchEvent.touches[0];
        if (touch.force !== undefined) {
          setForce3DTouch(touch.force);
        }
      }
    };

    const handleTouchEnd = () => {
      setForce3DTouch(0);
    };

    const container = containerRef.current;
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enable3DTouch, hapticFeedback]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {/* Swipe Back Indicator */}
      {showSwipeIndicator && enableSwipeBack && (
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="
            absolute top-1/2 left-4 transform -translate-y-1/2
            z-50 bg-black/20 backdrop-blur-sm
            rounded-full p-3
          "
        >
          <ArrowLeft size={24} className="text-white" />
        </motion.div>
      )}

      {/* Pull to Refresh Indicator */}
      {enablePullToRefresh && (
        <motion.div
          style={{
            opacity: refreshOpacity,
            scale: refreshScale
          }}
          className="
            absolute top-4 left-1/2 transform -translate-x-1/2
            z-50 bg-white/90 backdrop-blur-sm
            rounded-full p-3 shadow-lg
          "
        >
          <motion.div
            style={{ rotate: isRefreshing ? 360 : refreshRotate }}
            animate={isRefreshing ? { rotate: 360 } : {}}
            transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
          >
            <RefreshCw size={20} className="text-blue-600" />
          </motion.div>
        </motion.div>
      )}

      {/* 3D Touch Force Indicator */}
      {enable3DTouch && force3DTouch > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: force3DTouch,
            scale: 1 + (force3DTouch * 0.1)
          }}
          className="
            absolute inset-0 pointer-events-none
            bg-gradient-to-r from-blue-500/10 to-purple-500/10
            backdrop-blur-sm
          "
        />
      )}

      {/* Main Content with Gesture Support */}
      <motion.div
        drag
        dragConstraints={{ left: 0, right: 300, top: 0, bottom: 100 }}
        dragElastic={0.2}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        style={{
          x,
          y,
          opacity,
          scale,
          rotateY,
          transformStyle: 'preserve-3d'
        }}
        className="h-full"
      >
        {children}
      </motion.div>

      {/* iOS-style Edge Swipe Zones */}
      {enableSwipeBack && (
        <>
          {/* Left edge swipe zone */}
          <div 
            className="
              absolute left-0 top-0 w-4 h-full
              z-40 cursor-pointer
            "
            onTouchStart={(e) => {
              // Enhance edge swipe sensitivity
              const touch = e.touches[0];
              if (touch.clientX < 20) {
                hapticFeedback('light');
              }
            }}
          />
        </>
      )}

      {/* Visual feedback for gestures */}
      <style jsx>{`
        @media (hover: none) and (pointer: coarse) {
          /* iOS-specific touch optimizations */
          * {
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -webkit-tap-highlight-color: transparent;
          }
        }
      `}</style>
    </div>
  );
};

export default NativeGestures;