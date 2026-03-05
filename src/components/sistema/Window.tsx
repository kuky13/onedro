import { useRef, useState, useEffect, Suspense } from 'react';
import { X, Minus, Maximize2, Minimize2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface WindowProps {
  id: string;
  title: string;
  children: React.ReactNode;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  zIndex: number;
  onClose: () => void;
  onMinimize: () => void;
  onFocus: () => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, width: number, height: number) => void;
}

export function Window({
  id,
  title,
  children,
  x,
  y,
  width,
  height,
  isMinimized,
  zIndex,
  onClose,
  onMinimize,
  onFocus,
  onMove,
  onResize
}: WindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [savedSize, setSavedSize] = useState({ x, y, width, height });
  const [resizingDir, setResizingDir] = useState<null | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'>(null);
  const [resizeStart, setResizeStart] = useState<{ startX: number; startY: number; x: number; y: number; width: number; height: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.window-controls')) return;
    onFocus();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - x,
      y: e.clientY - y
    });
  };

  const handleMaximize = () => {
    if (isMaximized) {
      setIsMaximized(false);
      onMove(id, savedSize.x, savedSize.y);
      onResize(id, savedSize.width, savedSize.height);
    } else {
      setSavedSize({ x, y, width, height });
      setIsMaximized(true);
      onMove(id, 0, 0);
      const parent = windowRef.current?.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        onResize(id, rect.width, rect.height);
      } else {
        onResize(id, window.innerWidth, window.innerHeight);
      }
    }
  };

  const handleResizeMouseDown = (dir: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw', e: React.MouseEvent) => {
    if (isMaximized) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizingDir(dir);
    setResizeStart({ startX: e.clientX, startY: e.clientY, x, y, width, height });
    onFocus();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && !isMaximized) {
        const parent = windowRef.current?.parentElement;
        const rect = parent?.getBoundingClientRect();
        let newX = e.clientX - dragStart.x;
        let newY = e.clientY - dragStart.y;
        if (rect) {
          newX = Math.max(0, Math.min(newX, rect.width - width));
          newY = Math.max(0, Math.min(newY, rect.height - height));
        } else {
          newX = Math.max(0, Math.min(newX, window.innerWidth - width));
          newY = Math.max(0, Math.min(newY, window.innerHeight - height));
        }
        onMove(id, newX, newY);
      }
      if (isResizing && !isMaximized && resizeStart && resizingDir) {
        const dx = e.clientX - resizeStart.startX;
        const dy = e.clientY - resizeStart.startY;
        let newX = resizeStart.x;
        let newY = resizeStart.y;
        let newW = resizeStart.width;
        let newH = resizeStart.height;
        if (resizingDir.includes('e')) newW = resizeStart.width + dx;
        if (resizingDir.includes('s')) newH = resizeStart.height + dy;
        if (resizingDir.includes('w')) {
          newW = resizeStart.width - dx;
          newX = resizeStart.x + dx;
        }
        if (resizingDir.includes('n')) {
          newH = resizeStart.height - dy;
          newY = resizeStart.y + dy;
        }
        const minW = 360;
        const minH = 240;
        const parent = windowRef.current?.parentElement;
        const rect = parent?.getBoundingClientRect();
        const availW = rect ? rect.width : window.innerWidth;
        const availH = rect ? rect.height : window.innerHeight;
        const maxW = Math.max(minW, availW - newX);
        const maxH = Math.max(minH, availH - newY);
        newW = Math.min(Math.max(newW, minW), maxW);
        newH = Math.min(Math.max(newH, minH), maxH);
        onMove(id, Math.max(0, Math.min(newX, availW - newW)), Math.max(0, Math.min(newY, availH - newH)));
        onResize(id, newW, newH);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizingDir(null);
      setResizeStart(null);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, isMaximized, resizeStart, resizingDir, id, onMove, onResize, width, height]);

  if (isMinimized) return null;

  return (
    <motion.div
      ref={windowRef}
      initial={{ opacity: 0, scale: 0.94, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      transition={{ type: 'spring', stiffness: 180, damping: 24, mass: 0.9 }}
      className="absolute bg-background border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col"
      style={{
        left: x,
        top: y,
        width,
        height,
        zIndex,
        cursor: isDragging ? 'move' : 'default'
      }}
      onClick={onFocus}
    >
      {/* Barra de título */}
      <div
        className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-2 flex items-center justify-between cursor-move select-none"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleMaximize}
      >
        <span className="font-semibold truncate">{title}</span>
        <div className="window-controls flex gap-2">
          <button
            onClick={onMinimize}
            className="hover:bg-primary-foreground/20 p-1 rounded transition-colors"
            aria-label="Minimizar"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={handleMaximize}
            className="hover:bg-primary-foreground/20 p-1 rounded transition-colors"
            aria-label={isMaximized ? "Restaurar" : "Maximizar"}
          >
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={onClose}
            className="hover:bg-destructive hover:text-destructive-foreground p-1 rounded transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-background">
        <Suspense fallback={<div className="h-full w-full flex items-center justify-center"><div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" /></div>}>
          {children}
        </Suspense>
      </div>
      <div onMouseDown={(e) => handleResizeMouseDown('n', e)} className="absolute top-0 left-2 right-2 h-1 cursor-n-resize" />
      <div onMouseDown={(e) => handleResizeMouseDown('s', e)} className="absolute bottom-0 left-2 right-2 h-1 cursor-s-resize" />
      <div onMouseDown={(e) => handleResizeMouseDown('e', e)} className="absolute top-2 bottom-2 right-0 w-1 cursor-e-resize" />
      <div onMouseDown={(e) => handleResizeMouseDown('w', e)} className="absolute top-2 bottom-2 left-0 w-1 cursor-w-resize" />
      <div onMouseDown={(e) => handleResizeMouseDown('nw', e)} className="absolute top-0 left-0 w-2 h-2 cursor-nw-resize" />
      <div onMouseDown={(e) => handleResizeMouseDown('ne', e)} className="absolute top-0 right-0 w-2 h-2 cursor-ne-resize" />
      <div onMouseDown={(e) => handleResizeMouseDown('sw', e)} className="absolute bottom-0 left-0 w-2 h-2 cursor-sw-resize" />
      <div onMouseDown={(e) => handleResizeMouseDown('se', e)} className="absolute bottom-0 right-0 w-2 h-2 cursor-se-resize" />
    </motion.div>
  );
}
