import { useState, Suspense, lazy, useEffect, useMemo, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Window } from './Window';
import { DesktopIcon } from './DesktopIcon';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  FileText, 
  BarChart3,
  MessageSquare,
  Calendar,
  Folder,
  Image,
  Music,
  Video,
  Calculator,
  Trash2
} from 'lucide-react';
import { OptimizedNotificationPanel } from '@/components/notifications/OptimizedNotificationPanel';

interface App {
  id: string;
  title: string;
  icon: any;
  component: React.ComponentType<any>;
  defaultSize?: { width: number; height: number };
}

interface OpenWindow extends App {
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  zIndex: number;
}

const apps: App[] = [
  { 
    id: 'usuarios', 
    title: 'Usuários', 
    icon: Users,
    component: lazy(() => import('@/components/lite/ClientsLite').then(m => ({ default: m.ClientsLite }))),
    defaultSize: { width: 800, height: 500 }
  },
  { 
    id: 'configuracoes', 
    title: 'Configurações', 
    icon: Settings,
    component: lazy(() => import('@/components/ServiceOrdersSettingsHub').then(m => ({ default: m.ServiceOrdersSettingsHub }))),
    defaultSize: { width: 700, height: 500 }
  },
  { 
    id: 'worm', 
    title: 'Orçamentos', 
    icon: Calculator,
    component: lazy(() => import('@/pages/WormPage')),
    defaultSize: { width: 900, height: 600 }
  },
  { 
    id: 'ordens', 
    title: 'Criar ordem', 
    icon: FileText,
    component: lazy(() => import('@/pages/ServiceOrdersPageSimple')),
    defaultSize: { width: 1000, height: 700 }
  },
  { 
    id: 'worm-trash', 
    title: 'Lixeira OR', 
    icon: Trash2,
    component: lazy(() => import('@/pages/WormTrashPage').then(m => ({ default: m.WormTrashPage }))),
    defaultSize: { width: 900, height: 600 }
  },
  { 
    id: 'ordens-trash', 
    title: 'Lixeira OS', 
    icon: Trash2,
    component: lazy(() => import('@/components/ServiceOrderTrash').then(m => ({ default: m.ServiceOrderTrash }))),
    defaultSize: { width: 1000, height: 700 }
  },
  // item 'relatorios' removido conforme solicitação
  { 
    id: 'mensagens', 
    title: 'Mensagens', 
    icon: MessageSquare,
    component: () => <div className="p-6"><OptimizedNotificationPanel isFullPage /></div>,
    defaultSize: { width: 600, height: 400 }
  },
  // calendário removido conforme solicitação
];

interface DesktopProps {
  profile: any;
  onWindowsChange?: (windows: { id: string; title: string; isMinimized: boolean }[]) => void;
  requestRestoreId?: string | null;
  requestOpenId?: string | null;
}

export function Desktop({ profile, onWindowsChange, requestRestoreId, requestOpenId }: DesktopProps) {
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>([]);

  const openApp = (app: App) => {
    setOpenWindows(prev => {
      const existing = prev.find(w => w.id === app.id);
      if (existing) {
        const maxZ = Math.max(100, ...prev.map(w => w.zIndex));
        return prev.map(w =>
          w.id === app.id
            ? { ...w, isMinimized: false, zIndex: maxZ + 1 }
            : w
        );
      }
      const maxZ = Math.max(100, ...prev.map(w => w.zIndex));
      const newWindow: OpenWindow = {
        ...app,
        x: 100 + (prev.length * 30),
        y: 80 + (prev.length * 30),
        width: app.defaultSize?.width || 800,
        height: app.defaultSize?.height || 500,
        isMinimized: false,
        zIndex: maxZ + 1
      };
      return [...prev, newWindow];
    });
  };

  const closeWindow = (id: string) => {
    setOpenWindows(prev => prev.filter(w => w.id !== id));
  };

  const toggleMinimize = (id: string) => {
    setOpenWindows(prev => prev.map(w =>
      w.id === id ? { ...w, isMinimized: !w.isMinimized } : w
    ));
  };

  const bringToFront = (id: string) => {
    setOpenWindows(prev => {
      const maxZ = Math.max(100, ...prev.map(w => w.zIndex));
      return prev.map(w => (w.id === id ? { ...w, zIndex: maxZ + 1 } : w));
    });
  };

  const updateWindowPosition = (id: string, x: number, y: number) => {
    setOpenWindows(prev => prev.map(w => (w.id === id ? { ...w, x, y } : w)));
  };

  const updateWindowSize = (id: string, width: number, height: number) => {
    setOpenWindows(prev => prev.map(w => (w.id === id ? { ...w, width, height } : w)));
  };

  useEffect(() => {
    if (onWindowsChange) {
      const data = openWindows.map(w => ({ id: w.id, title: w.title, isMinimized: w.isMinimized, icon: w.icon }));
      onWindowsChange(data);
    }
  }, [openWindows, onWindowsChange]);

  useEffect(() => {
    if (requestRestoreId) {
      const existing = openWindows.find(w => w.id === requestRestoreId);
      if (existing) {
        bringToFront(existing.id);
        if (existing.isMinimized) {
          toggleMinimize(existing.id);
        }
      }
    }
  }, [requestRestoreId, openWindows]);

  useEffect(() => {
    if (requestOpenId) {
      const app = apps.find(a => a.id === requestOpenId);
      if (app) {
        openApp(app);
      }
    }
  }, [requestOpenId]);

  return (
    <div className="flex-1 relative overflow-hidden">
      <DesktopIconsArea apps={apps} onOpenApp={openApp} />

      <AnimatePresence>
        {openWindows.some(w => !w.isMinimized) && (
          <motion.div
            key="win-overlay"
            className="absolute inset-0 pointer-events-none bg-background/10 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {openWindows.map(window => (
          !window.isMinimized && (
            <Window
              key={window.id}
              id={window.id}
              title={window.title}
              x={window.x}
              y={window.y}
              width={window.width}
              height={window.height}
              isMinimized={window.isMinimized}
              zIndex={window.zIndex}
              onClose={() => closeWindow(window.id)}
              onMinimize={() => toggleMinimize(window.id)}
              onFocus={() => bringToFront(window.id)}
              onMove={updateWindowPosition}
              onResize={updateWindowSize}
            >
              <window.component />
            </Window>
          )
        ))}
      </AnimatePresence>
    </div>
  );
}

function DesktopIconsArea({ apps, onOpenApp }: { apps: App[]; onOpenApp: (app: App) => void }) {
  const { profile } = useAuth();
  const icons = useMemo(() => (
    apps.filter(a => a.id !== 'relatorios' && a.id !== 'dashboard' && a.id !== 'calendario').slice(0, 12)
  ), [apps]);
  const cols = 3;
  const cellW = 100;
  const cellH = 110;
  const padX = 24;
  const padY = 24;
  const [positions, setPositions] = useState<Record<string, { col: number; row: number }>>({});
  const debouncedPositions = useDebounce(positions, 400);
  const [editMode, setEditMode] = useState(false);
  const longPressRef = useRef<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [draggingSelectRect, setDraggingSelectRect] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [selectRect, setSelectRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [draggingSelected, setDraggingSelected] = useState(false);
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [snapshotPositions, setSnapshotPositions] = useState<Record<string, { col: number; row: number }>>({});
  const [anchorStart, setAnchorStart] = useState<{ col: number; row: number } | null>(null);

  useEffect(() => {
    const savedLocal = localStorage.getItem('desktop-grid-positions');
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        setPositions(parsed);
        return;
      } catch {}
    }
    const defaults: Record<string, { col: number; row: number }> = {};
    icons.forEach((app, i) => {
      defaults[app.id] = { col: i % cols, row: Math.floor(i / cols) };
    });
    setPositions(defaults);
  }, [icons]);

  useEffect(() => {
    const persist = async (payload: typeof positions) => {
      try {
        localStorage.setItem('desktop-grid-positions', JSON.stringify(payload));
      } catch {}
      if (profile?.id) {
        const { error } = await supabase
          .from('desktop_icon_positions')
          .upsert(
            { user_id: profile.id, positions: payload },
            { onConflict: 'user_id', returning: 'minimal' }
          );
        if (error) {
          console.warn('[desktop] falha ao salvar posições no supabase', error);
        }
      }
    };

    if (!draggingSelected && Object.keys(debouncedPositions).length) {
      persist(debouncedPositions);
    }
  }, [debouncedPositions, draggingSelected, profile?.id]);

  const cellToXY = (col: number, row: number) => ({ x: padX + col * cellW, y: padY + row * cellH });
  const xyToCell = (x: number, y: number) => ({ col: Math.max(0, Math.min(cols - 1, Math.round((x - padX) / cellW))), row: Math.max(0, Math.round((y - padY) / cellH)) });
  const isOccupied = (col: number, row: number, ignore: Set<string>) => Object.entries(positions).some(([id, p]) => !ignore.has(id) && p.col === col && p.row === row);
  const getOccupantId = (col: number, row: number, ignore: Set<string>) => {
    for (const [id, p] of Object.entries(positions)) {
      if (!ignore.has(id) && p.col === col && p.row === row) return id;
    }
    return null;
  };
  const findFree = (startCol: number, startRow: number, ignore: Set<string>) => {
    for (let r = startRow; r < startRow + 50; r++) {
      for (let c = startCol; c < cols; c++) {
        if (!isOccupied(c, r, ignore)) return { col: c, row: r };
      }
    }
    return { col: startCol, row: startRow };
  };

  return (
    <div
      className="absolute inset-y-0 left-0 w-[360px] sm:w-[400px]"
      onMouseDown={e => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const target = e.target as HTMLElement;
        if (editMode) {
          return;
        }
        if (target === e.currentTarget) {
          if (selected.size > 0) {
            const ids = Array.from(selected);
            let anchor = ids[0];
            ids.forEach(id => {
              const p = positions[id];
              const pa = positions[anchor];
              if (!pa || (p && (p.row < pa.row || (p.row === pa.row && p.col < pa.col)))) {
                anchor = id;
              }
            });
            const snap: Record<string, { col: number; row: number }> = {};
            selected.forEach(id => (snap[id] = positions[id]));
            setSnapshotPositions(snap);
            setAnchorId(anchor);
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            const startCell = xyToCell(cx, cy);
            setAnchorStart({ col: startCell.col, row: startCell.row });
            setDraggingSelected(true);
            return;
          }
          setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          setSelectRect({ x: e.clientX - rect.left, y: e.clientY - rect.top, w: 0, h: 0 });
          setSelected(new Set());
          setDraggingSelectRect(true);
        }
      }}
      onMouseMove={e => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        if (draggingSelected && anchorId && anchorStart) {
          const cx = e.clientX - rect.left;
          const cy = e.clientY - rect.top;
          const targetCell = xyToCell(cx, cy);
          const ignore = new Set<string>(selected);
          const finalAnchor = isOccupied(targetCell.col, targetCell.row, ignore) ? findFree(targetCell.col, targetCell.row, ignore) : targetCell;
          const dcol = finalAnchor.col - anchorStart.col;
          const drow = finalAnchor.row - anchorStart.row;
          const next: Record<string, { col: number; row: number }> = {};
          selected.forEach(id => {
            const base = snapshotPositions[id];
            if (!base) return;
            const desired = { col: Math.max(0, Math.min(cols - 1, base.col + dcol)), row: Math.max(0, base.row + drow) };
            if (isOccupied(desired.col, desired.row, ignore)) {
              if (selected.size === 1) {
                const occId = getOccupantId(desired.col, desired.row, ignore);
                if (occId) {
                  next[occId] = { col: base.col, row: base.row };
                  next[id] = desired;
                }
              } else {
                const free = findFree(desired.col, desired.row, ignore);
                next[id] = free;
              }
            } else {
              next[id] = desired;
            }
          });
          setPositions(prev => ({ ...prev, ...next }));
          return;
        }
        if (!draggingSelectRect || !dragStart) return;
        const x1 = Math.min(dragStart.x, e.clientX - rect.left);
        const y1 = Math.min(dragStart.y, e.clientY - rect.top);
        const x2 = Math.max(dragStart.x, e.clientX - rect.left);
        const y2 = Math.max(dragStart.y, e.clientY - rect.top);
        setSelectRect({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
        const next = new Set<string>();
        icons.forEach(app => {
          const pos = positions[app.id];
          if (!pos) return;
          const xy = cellToXY(pos.col, pos.row);
          const ix1 = xy.x;
          const iy1 = xy.y;
          const ix2 = xy.x + cellW;
          const iy2 = xy.y + cellH;
          if (ix2 >= x1 && ix1 <= x2 && iy2 >= y1 && iy1 <= y2) next.add(app.id);
        });
        setSelected(next);
      }}
      onMouseUp={e => {
        setDraggingSelectRect(false);
        setDragStart(null);
        setSelectRect(null);
        if (draggingSelected) {
          setDraggingSelected(false);
          setAnchorId(null);
          setSnapshotPositions({});
          setAnchorStart(null);
        }
      }}
    >
      <div className="relative w-full h-full px-6 py-6">
        <div className="absolute" style={{ left: padX, top: padY, width: cols * cellW }}>
          {icons.map(app => {
            const pos = positions[app.id] || { col: 0, row: 0 };
            const xy = cellToXY(pos.col, pos.row);
            return (
              <div
                key={app.id}
                className={`absolute ${editMode ? 'cursor-move' : ''}`}
                style={{ left: xy.x, top: xy.y, width: cellW, height: cellH }}
                onMouseDown={e => {
                  e.stopPropagation();
                  if (editMode) {
                    const onlySel = new Set<string>();
                    onlySel.add(app.id);
                    setSelected(onlySel);
                    setDraggingSelected(true);
                    setAnchorId(app.id);
                    const snap: Record<string, { col: number; row: number }> = {};
                    snap[app.id] = positions[app.id];
                    setSnapshotPositions(snap);
                    setAnchorStart({ col: pos.col, row: pos.row });
                    return;
                  }
                  longPressRef.current = window.setTimeout(() => {
                    const onlySel = new Set<string>();
                    onlySel.add(app.id);
                    setSelected(onlySel);
                    setEditMode(true);
                    setDraggingSelected(true);
                    setAnchorId(app.id);
                    const snap: Record<string, { col: number; row: number }> = {};
                    snap[app.id] = positions[app.id];
                    setSnapshotPositions(snap);
                    setAnchorStart({ col: pos.col, row: pos.row });
                  }, 500);
                }}
                onMouseMove={() => {}}
                onMouseUp={e => {
                  e.stopPropagation();
                  if (longPressRef.current) {
                    clearTimeout(longPressRef.current);
                    longPressRef.current = null;
                  }
                }}
                onDragStart={e => e.preventDefault()}
                onMouseLeave={() => {
                  if (longPressRef.current) {
                    clearTimeout(longPressRef.current);
                    longPressRef.current = null;
                  }
                }}
                onDoubleClick={() => !editMode && onOpenApp(app)}
              >
                <button
                  className="w-full h-full flex items-center justify-center"
                  onMouseDown={e => {
                    e.stopPropagation();
                  }}
                  onMouseUp={e => {
                    e.stopPropagation();
                  }}
                  onMouseMove={() => {}}
                >
                  <DesktopIcon icon={app.icon} label={app.title} onClick={() => onOpenApp(app)} />
                </button>
              </div>
            );
          })}
        </div>
        {selectRect && (
          <div className="absolute bg-primary/16 border border-primary/40" style={{ left: selectRect.x, top: selectRect.y, width: selectRect.w, height: selectRect.h }} />
        )}
      </div>
    </div>
  );
}
