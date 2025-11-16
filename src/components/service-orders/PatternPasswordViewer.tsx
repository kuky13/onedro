import React, { useEffect, useRef } from 'react';

export interface PatternPasswordViewerProps {
  pattern: string;
  size?: number;
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
}

export const PatternPasswordViewer: React.FC<PatternPasswordViewerProps> = ({
  pattern,
  size = 200
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const DOT_RADIUS = 12;
  const GRID_SIZE = 3;
  const CANVAS_SIZE = size;
  const GRID_SPACING = CANVAS_SIZE / (GRID_SIZE + 1);

  // Criar os pontos do grid
  const createGridDots = (patternArray: number[]): GridDot[] => {
    const dots: GridDot[] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const id = row * GRID_SIZE + col + 1;
        const x = (col + 1) * GRID_SPACING;
        const y = (row + 1) * GRID_SPACING;
        dots.push({
          id,
          x,
          y,
          isActive: patternArray.includes(id)
        });
      }
    }
    return dots;
  };

  // Desenhar o padrão no canvas
  const drawPattern = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpar canvas
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Parsear o padrão
    const patternArray = pattern
      ? pattern.split(',').map(Number).filter(n => !isNaN(n) && n >= 1 && n <= 9)
      : [];

    if (patternArray.length === 0) {
      // Se não há padrão, desenhar apenas os pontos inativos
      const dots = createGridDots([]);
      drawDots(ctx, dots);
      return;
    }

    const dots = createGridDots(patternArray);
    const activeDots = dots.filter(dot => dot.isActive);

    // Desenhar linhas conectoras
    if (activeDots.length > 1) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      
      // Ordenar os pontos ativos pela sequência do padrão
      const orderedDots = patternArray.map(id => 
        dots.find(dot => dot.id === id)
      ).filter(Boolean) as GridDot[];

      if (orderedDots.length > 0) {
        ctx.moveTo(orderedDots[0].x, orderedDots[0].y);
        for (let i = 1; i < orderedDots.length; i++) {
          ctx.lineTo(orderedDots[i].x, orderedDots[i].y);
        }
        ctx.stroke();
      }
    }

    // Desenhar pontos
    drawDots(ctx, dots);
  };

  const drawDots = (ctx: CanvasRenderingContext2D, dots: GridDot[]) => {
    dots.forEach(dot => {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, DOT_RADIUS, 0, 2 * Math.PI);

      if (dot.isActive) {
        ctx.fillStyle = '#10b981';
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 2;
      } else {
        ctx.fillStyle = '#e5e7eb';
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 1;
      }

      ctx.fill();
      ctx.stroke();

      // Desenhar número do ponto
      ctx.fillStyle = dot.isActive ? 'white' : '#6b7280';
      ctx.font = `bold ${Math.max(10, DOT_RADIUS - 2)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(dot.id.toString(), dot.x, dot.y);
    });
  };

  // Redesenhar quando o padrão mudar
  useEffect(() => {
    drawPattern();
  }, [pattern, size]);

  // Desenhar inicialmente
  useEffect(() => {
    drawPattern();
  }, []);

  return (
    <div className="flex justify-center">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="border border-border rounded-lg bg-background"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
};

export default PatternPasswordViewer;