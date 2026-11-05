
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Eraser, Pencil, Maximize2, Minimize2, Check, User } from 'lucide-react';

interface TacticalWhiteboardProps {
  onSave?: (dataUrl: string) => void;
  id: string;
}

const COLORS = [
    { name: 'Vit', value: '#ffffff' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Blå', value: '#3b82f6' },
    { name: 'Grön', value: '#10b981' },
    { name: 'Rosa', value: '#f43f5e' },
    { name: 'Gul', value: '#eab308' },
    { name: 'Lila', value: '#a855f7' },
    { name: 'Cyan', value: '#06b6d4' }
];

export const TacticalWhiteboard: React.FC<TacticalWhiteboardProps> = ({ onSave, id }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [mode, setMode] = useState<'pencil' | 'eraser' | 'player'>('pencil');
  const [isPopup, setIsPopup] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState(1);

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    if (tempCtx && canvas.width > 0) {
        tempCtx.drawImage(canvas, 0, 0);
    }

    canvas.width = rect.width;
    canvas.height = rect.height;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.imageSmoothingEnabled = true;
      if (tempCanvas.width > 0) {
        ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, canvas.width, canvas.height);
      }
      ctx.strokeStyle = mode === 'eraser' ? '#000000' : color;
      ctx.lineWidth = mode === 'eraser' ? (isPopup ? 60 : 30) : (isPopup ? 6 : 4);
    }
  }, [color, mode, isPopup]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => window.requestAnimationFrame(updateCanvasSize));
    observer.observe(container);
    setTimeout(updateCanvasSize, 100);
    return () => observer.disconnect();
  }, [updateCanvasSize, isPopup]);

  useEffect(() => {
    if (isPopup) {
      document.body.style.overflow = 'hidden';
      const handleEsc = (e: KeyboardEvent) => { if(e.key === 'Escape') setIsPopup(false); };
      window.addEventListener('keydown', handleEsc);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleEsc);
      };
    }
  }, [isPopup]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, x: number, y: number, num: number) => {
    const size = isPopup ? 30 : 22;
    ctx.beginPath();
    ctx.arc(x, y, size + 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = (color === '#ffffff' || color === '#eab308') ? '#000000' : '#ffffff';
    ctx.font = `black ${isPopup ? '22px' : '15px'} Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num.toString(), x, y);
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    if (mode === 'player') {
        drawPlayer(ctx, x, y, selectedNumber);
        return;
    }
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || mode === 'player') return;
    if (e.cancelable) e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineWidth = mode === 'eraser' ? (isPopup ? 60 : 30) : (isPopup ? 6 : 4);
      ctx.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = color;
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const whiteboardContent = (
    <div 
      ref={containerRef} 
      className={`bg-slate-950 select-none overflow-hidden flex flex-col ${
        isPopup 
          ? 'fixed inset-0 z-[9999] w-screen h-screen' 
          : 'h-full w-full relative'
      }`}
      style={{ touchAction: 'none' }}
    >
      {/* TOOLBAR */}
      <div className="flex items-center justify-between px-2 py-1 md:px-4 md:py-2 bg-slate-900 border-b border-slate-800 gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button onClick={() => setMode('pencil')} className={`p-1.5 md:p-2 rounded-lg transition-all ${mode === 'pencil' ? 'bg-white text-black' : 'text-slate-500 hover:text-slate-300'}`}>
              <Pencil size={isPopup ? 24 : 18} />
            </button>
            <button onClick={() => setMode('player')} className={`p-1.5 md:p-2 rounded-lg transition-all ${mode === 'player' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              <User size={isPopup ? 24 : 18} />
            </button>
            <button onClick={() => setMode('eraser')} className={`p-1.5 md:p-2 rounded-lg transition-all ${mode === 'eraser' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              <Eraser size={isPopup ? 24 : 18} />
            </button>
          </div>

          {mode === 'player' && (
              <div className="hidden sm:flex bg-indigo-950/30 p-1 rounded-xl border border-indigo-500/20 gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => setSelectedNumber(n)} className={`w-8 h-8 rounded-lg font-black text-xs transition-all ${selectedNumber === n ? 'bg-indigo-600 text-white' : 'text-indigo-400'}`}>
                        {n}
                      </button>
                  ))}
              </div>
          )}

          <div className="flex items-center gap-1.5 px-1 overflow-x-auto hide-scrollbar border-l border-slate-800 ml-1 pl-2">
            {COLORS.map(c => (
                <button 
                    key={c.name}
                    onClick={() => { setColor(c.value); if(mode === 'eraser') setMode('pencil'); }}
                    className={`w-7 h-7 md:w-8 md:h-8 rounded-full border-2 shrink-0 transition-all ${color === c.value && mode !== 'eraser' ? 'border-white scale-110' : 'border-white/10 opacity-60'}`}
                    style={{ backgroundColor: c.value }}
                />
            ))}
            
            <button 
                onClick={clearCanvas} 
                className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-800 text-rose-500 flex items-center justify-center border border-slate-700 hover:bg-rose-500 hover:text-white transition-all ml-1 shrink-0" 
            >
                <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 border-l border-slate-800 pl-2">
          {onSave && (
              <button onClick={() => onSave(canvasRef.current!.toDataURL())} className="p-2 bg-emerald-600 text-white rounded-lg transition-all active:scale-95">
                <Check size={20} />
              </button>
          )}

          <button onClick={() => setIsPopup(!isPopup)} className="p-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-all shadow-lg">
            {isPopup ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
          </button>
        </div>
      </div>

      {/* CANVAS AREA */}
      <div className="flex-1 relative cursor-crosshair bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.12] flex items-center justify-center p-4">
          <div className="w-full h-full border-2 border-white relative max-w-[850px] aspect-[1/1.4]">
             <div className="absolute inset-1.5 border border-white/30"></div>
             <div className="absolute bottom-0 left-0 w-full h-px bg-white/80"></div>
             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 aspect-square border-2 border-white rounded-full translate-y-1/2"></div>
             <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[95%] aspect-square border-2 border-white rounded-full"></div>
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[35%] h-[30%] border-2 border-t-0 border-white bg-white/5"></div>
             <div className="absolute top-[22%] left-1/2 -translate-x-1/2 w-[35%] aspect-square border-2 border-white rounded-full"></div>
             <div className="absolute top-[6%] left-1/2 -translate-x-1/2 w-[22%] h-0.5 bg-white"></div>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 z-20 w-full h-full block touch-none"
        />
      </div>
    </div>
  );

  if (isPopup) {
    return createPortal(whiteboardContent, document.body);
  }

  return whiteboardContent;
};
