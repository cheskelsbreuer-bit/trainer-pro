import { useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
  height?: number;
  color?: string;
}

export function SignaturePad({ onChange, height = 160, color = '#0f172a' }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Fit canvas to container DPR-aware
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const parent = c.parentElement;
    if (!parent) return;
    const dpr = window.devicePixelRatio || 1;
    const w = parent.clientWidth;
    const h = height;
    c.width = w * dpr;
    c.height = h * dpr;
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
    }
  }, [height, color]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const ctx = c.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
    c.setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const c = canvasRef.current!;
    const ctx = c.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    if (!drawing) return;
    setDrawing(false);
    setIsEmpty(false);
    const c = canvasRef.current!;
    onChange(c.toDataURL('image/png'));
  }

  function clear() {
    const c = canvasRef.current!;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    setIsEmpty(true);
    onChange(null);
  }

  return (
    <div>
      <div className="bg-white border-2 border-dashed border-slate-300 rounded-lg overflow-hidden relative">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="block touch-none cursor-crosshair w-full"
          style={{ height }}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-sm pointer-events-none">
            Sign here
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-end">
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
        >
          <Eraser size={12} /> Clear
        </button>
      </div>
    </div>
  );
}
