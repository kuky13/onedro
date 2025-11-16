import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ScrollIndicatorProps {
  containerRef: React.RefObject<HTMLDivElement>;
  className?: string;
}

export const ScrollIndicator: React.FC<ScrollIndicatorProps> = ({ 
  containerRef, 
  className 
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const totalScrollable = scrollHeight - clientHeight;
      
      if (totalScrollable > 0) {
        const progress = (scrollTop / totalScrollable) * 100;
        setScrollProgress(progress);
        setIsVisible(totalScrollable > 20); // Show only if there's significant scrollable content
      } else {
        setIsVisible(false);
      }
    };

    handleScroll(); // Initial check
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Check on resize
    const resizeObserver = new ResizeObserver(handleScroll);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed right-2 top-1/2 -translate-y-1/2 z-50",
      "w-1 h-20 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden",
      "opacity-60 hover:opacity-100 transition-opacity duration-200",
      className
    )}>
      <div 
        className="w-full bg-primary rounded-full transition-all duration-150 ease-out"
        style={{ height: `${scrollProgress}%` }}
      />
    </div>
  );
};

export default ScrollIndicator;