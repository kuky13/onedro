import { useEffect, useRef, useCallback } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  preventScrollOnSwipe?: boolean;
  element?: HTMLElement | null;
}

interface TouchPosition {
  x: number;
  y: number;
}

export const useSwipeGesture = (options: SwipeGestureOptions = {}) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventScrollOnSwipe = false,
    element
  } = options;

  const touchStartRef = useRef<TouchPosition | null>(null);
  const touchEndRef = useRef<TouchPosition | null>(null);
  const isSwipingRef = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY
    };
    touchEndRef.current = null;
    isSwipingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // Determine if this is a swipe gesture
    if (deltaX > threshold || deltaY > threshold) {
      isSwipingRef.current = true;
      
      if (preventScrollOnSwipe && deltaX > deltaY) {
        e.preventDefault();
      }
    }

    touchEndRef.current = {
      x: touch.clientX,
      y: touch.clientY
    };
  }, [threshold, preventScrollOnSwipe]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current || !touchEndRef.current || !isSwipingRef.current) {
      return;
    }

    const deltaX = touchEndRef.current.x - touchStartRef.current.x;
    const deltaY = touchEndRef.current.y - touchStartRef.current.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine swipe direction based on the larger delta
    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (absDeltaX > threshold) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
    } else {
      // Vertical swipe
      if (absDeltaY > threshold) {
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    }

    // Reset refs
    touchStartRef.current = null;
    touchEndRef.current = null;
    isSwipingRef.current = false;
  }, [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  useEffect(() => {
    const targetElement = element || document;
    
    // Add passive: false to allow preventDefault
    const touchMoveOptions = { passive: !preventScrollOnSwipe };
    
    targetElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    targetElement.addEventListener('touchmove', handleTouchMove, touchMoveOptions);
    targetElement.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      targetElement.removeEventListener('touchstart', handleTouchStart);
      targetElement.removeEventListener('touchmove', handleTouchMove);
      targetElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [element, handleTouchStart, handleTouchMove, handleTouchEnd, preventScrollOnSwipe]);

  return {
    isSwipingRef
  };
};

export default useSwipeGesture;