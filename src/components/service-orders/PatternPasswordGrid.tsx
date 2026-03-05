import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react';
export interface PatternPasswordGridProps {
  value: string;
  onChange: (value: string, metadata?: any) => void;
  disabled?: boolean;
  metadata?: any;
}
interface Point {
  x: number;
  y: number;
}
interface GridDot {
  id: number;
  x: number;
  y: number;
  isActive: boolean;
  isConnected: boolean;
  isHovered: boolean;
}
export const PatternPasswordGrid: React.FC<PatternPasswordGridProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pattern, setPattern] = useState<number[]>([]);
  const [dots, setDots] = useState<GridDot[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const DOT_RADIUS = 20;
  const GRID_SIZE = 3;
  const CANVAS_DEFAULT_SIZE = 300;
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState(CANVAS_DEFAULT_SIZE);

  // Atualizar tamanho do canvas conforme o tamanho do container/tela
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // Usa o menor lado do container com um limite máximo para evitar ficar gigante em telas muito grandes
      const size = Math.max(200, Math.min(rect.width, 360));
      setCanvasSize(size || CANVAS_DEFAULT_SIZE);
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => {
      observer.disconnect();
    };
  }, []);

  // Inicializar os pontos do grid com base no tamanho atual do canvas
  useEffect(() => {
    const initialDots: GridDot[] = [];
    const gridSpacing = canvasSize / (GRID_SIZE + 1);
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const id = row * GRID_SIZE + col + 1;
        const x = (col + 1) * gridSpacing;
        const y = (row + 1) * gridSpacing;
        initialDots.push({
          id,
          x,
          y,
          isActive: false,
          isConnected: false,
          isHovered: false
        });
      }
    }
    setDots(initialDots);
  }, [canvasSize]);

  // Carregar padrão existente
  useEffect(() => {
    if (value && value !== pattern.join(',')) {
      const existingPattern = value.split(',').map(Number).filter(n => !isNaN(n));
      setPattern(existingPattern);
      updateDotsFromPattern(existingPattern);
    }
  }, [value]);

  // Validar padrão
  const validatePattern = (patternArray: number[]): {
    isValid: boolean;
    error: string;
  } => {
    if (patternArray.length === 0) {
      return {
        isValid: true,
        error: ''
      }; // Campo opcional
    }
    if (patternArray.length < 4) {
      return {
        isValid: false,
        error: 'Padrão deve conectar pelo menos 4 pontos'
      };
    }
    if (patternArray.length > 9) {
      return {
        isValid: false,
        error: 'Padrão não pode conectar mais de 9 pontos'
      };
    }

    // Verificar se todos os pontos são únicos
    const uniquePoints = new Set(patternArray);
    if (uniquePoints.size !== patternArray.length) {
      return {
        isValid: false,
        error: 'Cada ponto pode ser usado apenas uma vez'
      };
    }

    // Verificar se todos os pontos são válidos (1-9)
    const invalidPoints = patternArray.filter(p => p < 1 || p > 9);
    if (invalidPoints.length > 0) {
      return {
        isValid: false,
        error: 'Pontos inválidos detectados'
      };
    }
    return {
      isValid: true,
      error: ''
    };
  };

  // Atualizar validação
  useEffect(() => {
    const validation = validatePattern(pattern);
    setIsValid(validation.isValid);
    setError(validation.error);
  }, [pattern]);
  const updateDotsFromPattern = (patternArray: number[]) => {
    setDots(prevDots => prevDots.map(dot => ({
      ...dot,
      isActive: patternArray.includes(dot.id),
      isConnected: patternArray.includes(dot.id)
    })));
  };
  const getDotAt = (x: number, y: number): GridDot | null => {
    return dots.find(dot => {
      const distance = Math.sqrt((x - dot.x) ** 2 + (y - dot.y) ** 2);
      return distance <= DOT_RADIUS;
    }) || null;
  };
  const getCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return {
      x: 0,
      y: 0
    };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };
  const getTouchCoordinates = (event: React.TouchEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return {
        x: 0,
        y: 0,
      };
    }
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0] || event.changedTouches[0];
    if (!touch) {
      return {
        x: 0,
        y: 0,
      };
    }
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  };

  // Função unificada para obter coordenadas de mouse ou touch
  const getEventCoordinates = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point => {
    if ('touches' in event) {
      return getTouchCoordinates(event);
    } else {
      return getCanvasCoordinates(event);
    }
  };

  // Função unificada para início do desenho (mouse down / touch start)
  const handleDrawStart = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;

    // Prevenir comportamento padrão para touch events
    if ('touches' in event) {
      event.preventDefault();
    }
    const coords = getEventCoordinates(event);
    const dot = getDotAt(coords.x, coords.y);
    if (dot) {
      setIsDrawing(true);
      setPattern([dot.id]);
      setCurrentPath([{
        x: dot.x,
        y: dot.y
      }]);
      updateDotsFromPattern([dot.id]);
    }
  };

  // Função unificada para movimento durante o desenho (mouse move / touch move)
  const handleDrawMove = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Prevenir comportamento padrão para touch events
    if ('touches' in event) {
      event.preventDefault();
    }
    const coords = getEventCoordinates(event);
    const dot = getDotAt(coords.x, coords.y);

    // Atualizar estado hover dos pontos (apenas para mouse)
    if (!('touches' in event)) {
      setDots(prevDots => prevDots.map(dotItem => {
        const isHovered = dotItem === dot && !dotItem.isConnected;
        return {
          ...dotItem,
          isHovered
        };
      }));
    }
    if (!isDrawing || disabled) return;
    if (dot && !pattern.includes(dot.id)) {
      const newPattern = [...pattern, dot.id];
      setPattern(newPattern);
      setCurrentPath(prev => [...prev, {
        x: dot.x,
        y: dot.y
      }]);
      updateDotsFromPattern(newPattern);
      setPreviewPoint(null); // Remove preview quando conecta um ponto
    } else {
      // Mostrar linha de preview do último ponto conectado até a posição atual
      setPreviewPoint(coords);
    }
    drawCanvas();
  };

  // Função unificada para fim do desenho (mouse up / touch end)
  const handleDrawEnd = (event?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    // Prevenir comportamento padrão para touch events
    if (event && 'touches' in event) {
      event.preventDefault();
    }
    setIsDrawing(false);
    setPreviewPoint(null);
    const patternString = pattern.join(',');
    onChange(patternString, {
      coordinates: currentPath,
      dotCount: pattern.length
    });
    drawCanvas();
  };

  // Handlers específicos para mouse
  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    handleDrawStart(event);
  };
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    handleDrawMove(event);
  };
  const handleMouseUp = () => {
    handleDrawEnd();
  };

  // Handlers específicos para touch
  const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
    handleDrawStart(event);
  };
  const handleTouchMove = (event: React.TouchEvent<HTMLCanvasElement>) => {
    handleDrawMove(event);
  };
  const handleTouchEnd = (event: React.TouchEvent<HTMLCanvasElement>) => {
    handleDrawEnd(event);
  };
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpar canvas
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Desenhar linhas conectoras (retas entre pontos)
    if (currentPath.length > 1) {
      const firstPoint = currentPath[0];
      if (firstPoint && firstPoint.x !== undefined && firstPoint.y !== undefined) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(firstPoint.x, firstPoint.y);
        for (let i = 1; i < currentPath.length; i++) {
          const point = currentPath[i];
          if (point && point.x !== undefined && point.y !== undefined) {
            ctx.lineTo(point.x, point.y);
          }
        }
        ctx.stroke();
      }
    }

    // Desenhar linha de preview durante o desenho
    if (isDrawing && previewPoint && currentPath.length > 0) {
      const lastPoint = currentPath[currentPath.length - 1];
      if (!lastPoint) return;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.setLineDash([5, 5]); // Linha tracejada para preview

      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(previewPoint.x, previewPoint.y);
      ctx.stroke();
      ctx.setLineDash([]); // Reset para linha sólida
    }

    // Desenhar pontos
    dots.forEach(dot => {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, DOT_RADIUS, 0, 2 * Math.PI);
      if (dot.isActive) {
        ctx.fillStyle = '#10b981';
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 3;
      } else if (dot.isHovered) {
        ctx.fillStyle = '#f3f4f6';
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 3;
      } else {
        ctx.fillStyle = '#e5e7eb';
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 2;
      }
      ctx.fill();
      ctx.stroke();

      // Desenhar número do ponto
      ctx.fillStyle = dot.isActive ? 'white' : '#6b7280';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(dot.id.toString(), dot.x, dot.y);
    });
  };

  // Redesenhar quando dots, currentPath ou previewPoint mudarem
  useEffect(() => {
    drawCanvas();
  }, [dots, currentPath, previewPoint, isDrawing]);
  const handleReset = () => {
    setPattern([]);
    setCurrentPath([]);
    setPreviewPoint(null);
    setIsDrawing(false);
    updateDotsFromPattern([]);
    onChange('', {
      coordinates: [],
      dotCount: 0
    });
  };
  return <div className="space-y-4">
      <div className="flex flex-col items-center space-y-4">
        <div ref={containerRef} className="relative w-full max-w-xs sm:max-w-sm mx-auto">
          <canvas ref={canvasRef} width={canvasSize} height={canvasSize} className={`border-2 rounded-lg w-full h-auto aspect-square ${disabled ? 'opacity-50 cursor-not-allowed border-border' : 'border-border hover:border-muted-foreground cursor-crosshair'}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd} style={{
          touchAction: 'none'
        }} />
          
          {pattern.length > 0 && <div className="absolute -top-2 -right-2">
              {isValid ? <CheckCircle className="h-6 w-6 text-emerald-500 bg-background rounded-full shadow-sm" /> : <XCircle className="h-6 w-6 text-destructive bg-background rounded-full shadow-sm" />}
            </div>}
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleReset} disabled={disabled || pattern.length === 0} className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Limpar
          </Button>
          
          {pattern.length > 0}
        </div>
      </div>

      {error}

      {pattern.length > 0 && isValid && <div className="text-center space-y-2">
          <p className="text-sm text-green-600">
            Padrão válido: {pattern.join(' → ')}
          </p>
          <p className="text-xs text-gray-500">
            Sequência: {pattern.length} pontos conectados
          </p>
        </div>}

      <div className="space-y-2 text-center">
        
        
      </div>
    </div>;
};