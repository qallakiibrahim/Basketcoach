
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Play, RotateCcw, Maximize2, Minimize2, Trash2, UserPlus, Move, Pencil, Check, X, ChevronRight, ChevronLeft, Route, Brush, Eraser, RefreshCw } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface PlayerMarker {
  id: string;
  number: number;
  team: 'home' | 'away';
  x: number;
  y: number;
  path: Point[];
}

interface StrategyBoardProps {
  id: string;
}

interface FreePath {
  id: string;
  points: Point[];
  color: string;
}

export const StrategyBoard: React.FC<StrategyBoardProps> = ({ id }) => {
  const [players, setPlayers] = useState<PlayerMarker[]>([]);
  const [freePaths, setFreePaths] = useState<FreePath[]>([]);
  const [mode, setMode] = useState<'place' | 'move' | 'draw' | 'freeDraw' | 'eraser'>('place');
  const [activeTeam, setActiveTeam] = useState<'home' | 'away'>('home');
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [currentFreePathId, setCurrentFreePathId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const isErasingRef = useRef(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const ignoreMouseRef = useRef(false);

  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');

  // Update orientation based on window size
  useEffect(() => {
    const checkOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Court dimensions based on orientation
  const COURT_WIDTH = orientation === 'landscape' ? 1000 : 600;
  const COURT_HEIGHT = orientation === 'landscape' ? 600 : 1000;

  const getRelativeCoords = (e: React.MouseEvent | React.TouchEvent): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    // Calculate the scale and offset of the SVG content within the rect
    // The SVG preserves aspect ratio (xMidYMid meet)
    const scaleX = rect.width / COURT_WIDTH;
    const scaleY = rect.height / COURT_HEIGHT;
    const scale = Math.min(scaleX, scaleY);

    const drawnWidth = COURT_WIDTH * scale;
    const drawnHeight = COURT_HEIGHT * scale;

    const offsetX = (rect.width - drawnWidth) / 2;
    const offsetY = (rect.height - drawnHeight) / 2;

    // Map client coordinates to SVG coordinates
    const x = (clientX - rect.left - offsetX) / scale;
    const y = (clientY - rect.top - offsetY) / scale;

    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent double-firing on touch devices (touch + emulated mouse)
    if (e.type === 'touchstart') {
      ignoreMouseRef.current = true;
      // Reset after 500ms to allow mouse usage again if needed (e.g. hybrid devices)
      setTimeout(() => { ignoreMouseRef.current = false; }, 500);
    } else if (e.type === 'mousedown' && ignoreMouseRef.current) {
      e.preventDefault();
      return;
    }

    if (isAnimating) return;
    const coords = getRelativeCoords(e);
    setMousePos(coords);

    if (mode === 'place') {
      setAnimationProgress(0);
      const teamPlayers = players.filter(p => p.team === activeTeam);
      if (teamPlayers.length >= 5) return;

      const newPlayer: PlayerMarker = {
        id: Math.random().toString(36).substring(2, 11),
        number: teamPlayers.length + 1,
        team: activeTeam,
        x: coords.x,
        y: coords.y,
        path: [{ x: coords.x, y: coords.y }]
      };
      setPlayers([...players, newPlayer]);
    } else if (mode === 'freeDraw') {
      const newPathId = Math.random().toString(36).substring(2, 11);
      const newPath: FreePath = {
        id: newPathId,
        points: [coords],
        color: activeTeam === 'home' ? '#f97316' : '#3b82f6'
      };
      setFreePaths([...freePaths, newPath]);
      setCurrentFreePathId(newPathId);
    } else if (mode === 'eraser') {
      isErasingRef.current = true;
      setFreePaths(prev => prev.filter(path => {
        const isNear = path.points.some(p => {
          const dist = Math.sqrt(Math.pow(p.x - coords.x, 2) + Math.pow(p.y - coords.y, 2));
          return dist < 20;
        });
        return !isNear;
      }));
    } else if (mode === 'move' || mode === 'draw') {
      setAnimationProgress(0);
      // Find closest player
      const closest = players.find(p => {
        const dist = Math.sqrt(Math.pow(p.x - coords.x, 2) + Math.pow(p.y - coords.y, 2));
        return dist < 40;
      });
      if (closest) {
        setSelectedPlayerId(closest.id);
        if (mode === 'draw') {
          setPlayers(players.map(p => p.id === closest.id ? { ...p, path: [{ x: p.x, y: p.y }] } : p));
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isAnimating) return;
    const coords = getRelativeCoords(e);
    setMousePos(coords);

    if (currentFreePathId) {
      setFreePaths(prev => prev.map(p => {
        if (p.id !== currentFreePathId) return p;
        const lastPoint = p.points[p.points.length - 1];
        if (lastPoint) {
          const dist = Math.sqrt(Math.pow(coords.x - lastPoint.x, 2) + Math.pow(coords.y - lastPoint.y, 2));
          if (dist < 5) return p;
        }
        return { ...p, points: [...p.points, coords] };
      }));
      return;
    }

    if (mode === 'eraser' && isErasingRef.current) {
      setFreePaths(prev => prev.filter(path => {
        // Check if any point in the path is near the eraser
        const isNear = path.points.some(p => {
          const dist = Math.sqrt(Math.pow(p.x - coords.x, 2) + Math.pow(p.y - coords.y, 2));
          return dist < 20;
        });
        return !isNear;
      }));
      return;
    }

    if (!selectedPlayerId) return;

    setPlayers(prev => prev.map(p => {
      if (p.id !== selectedPlayerId) return p;
      if (mode === 'move') {
        return { ...p, x: coords.x, y: coords.y, path: [{ x: coords.x, y: coords.y }] };
      }
      if (mode === 'draw') {
        // Throttle points: only add if distance > 5 units to prevent massive arrays/crashes
        const lastPoint = p.path[p.path.length - 1];
        if (lastPoint) {
            const dist = Math.sqrt(Math.pow(coords.x - lastPoint.x, 2) + Math.pow(coords.y - lastPoint.y, 2));
            if (dist < 5) return p;
        }
        return { ...p, path: [...p.path, coords] };
      }
      return p;
    }));
  };

  const handleMouseUp = () => {
    setSelectedPlayerId(null);
    setCurrentFreePathId(null);
    isErasingRef.current = false;
    setMousePos(null);
  };

  const startAnimation = () => {
    if (players.length === 0) return;
    setIsAnimating(true);
    setAnimationProgress(0);
    
    const startTime = performance.now();
    const duration = 3000; // 3 seconds for the whole play

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setAnimationProgress(progress);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const resetBoard = () => {
    setPlayers([]);
    setFreePaths([]);
    setAnimationProgress(0);
    setIsAnimating(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const clearPaths = () => {
    setPlayers(players.map(p => ({ ...p, path: [{ x: p.x, y: p.y }] })));
    setFreePaths([]);
    setAnimationProgress(0);
  };

  const getAnimatedPos = (player: PlayerMarker) => {
    if (!isAnimating && animationProgress === 0) return { x: player.x, y: player.y };
    if (!player.path || player.path.length < 2) return { x: player.x, y: player.y };

    const totalPoints = player.path.length;
    const index = Math.floor(animationProgress * (totalPoints - 1));
    const nextIndex = Math.min(index + 1, totalPoints - 1);
    const segmentProgress = (animationProgress * (totalPoints - 1)) - index;

    const p1 = player.path[index];
    const p2 = player.path[nextIndex];

    if (!p1 || !p2) return { x: player.x, y: player.y };

    return {
      x: p1.x + (p2.x - p1.x) * segmentProgress,
      y: p1.y + (p2.y - p1.y) * segmentProgress
    };
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const content = (
    <div 
      ref={containerRef}
      className={`bg-slate-950 flex flex-col select-none ${isFullscreen ? 'fixed inset-0 z-[9999] w-screen h-screen' : 'h-full w-full rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl'}`}
    >
      {/* HEADER / TOOLBAR */}
      <div className="flex flex-col gap-3 p-3 bg-slate-900 border-b border-slate-800 shrink-0">
        
        {/* TOP ROW: TOOLS & TEAM */}
        <div className="flex items-center justify-between gap-2">
          {/* TOOLS */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 flex-1 max-w-fit">
            <button 
              onClick={() => setMode('place')} 
              className={`p-2 md:px-4 rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'place' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              title="Placera"
            >
              <UserPlus size={18} className={mode === 'place' ? 'text-orange-500' : ''} /> 
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Placera</span>
            </button>
            <button 
              onClick={() => setMode('move')} 
              className={`p-2 md:px-4 rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'move' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              title="Flytta"
            >
              <Move size={18} className={mode === 'move' ? 'text-blue-500' : ''} /> 
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Flytta</span>
            </button>
            <button 
              onClick={() => setMode('draw')} 
              className={`p-2 md:px-4 rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'draw' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              title="Rita rörelse"
            >
              <Route size={18} className={mode === 'draw' ? 'text-purple-500' : ''} /> 
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Rörelse</span>
            </button>
            <button 
              onClick={() => setMode('freeDraw')} 
              className={`p-2 md:px-4 rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'freeDraw' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              title="Rita fritt"
            >
              <Brush size={18} className={mode === 'freeDraw' ? 'text-yellow-500' : ''} /> 
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Fritt</span>
            </button>
            <button 
              onClick={() => setMode('eraser')} 
              className={`p-2 md:px-4 rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'eraser' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              title="Suddgummi"
            >
              <Eraser size={18} className={mode === 'eraser' ? 'text-rose-500' : ''} /> 
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Sudd</span>
            </button>
          </div>

          {/* TEAM TOGGLE */}
          <button 
            onClick={() => setActiveTeam(activeTeam === 'home' ? 'away' : 'home')} 
            className={`h-10 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 ${activeTeam === 'home' ? 'bg-orange-900/20 border-orange-500/50 text-orange-500' : 'bg-blue-900/20 border-blue-500/50 text-blue-500'}`}
          >
            <div className={`w-2 h-2 rounded-full ${activeTeam === 'home' ? 'bg-orange-500' : 'bg-blue-500'}`} />
            {activeTeam === 'home' ? 'Hemma' : 'Borta'}
          </button>
        </div>

        {/* BOTTOM ROW: ACTIONS */}
        <div className="flex items-center justify-between gap-2">
           <div className="flex items-center gap-2">
              <button onClick={clearPaths} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Rensa rörelser">
                <RotateCcw size={18} />
              </button>
              <button onClick={resetBoard} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-rose-500 transition-colors" title="Nollställ allt">
                <Trash2 size={18} />
              </button>
           </div>

           <div className="flex items-center gap-2">
              <button 
                onClick={startAnimation} 
                disabled={isAnimating || players.length === 0}
                className={`px-6 py-2 ${animationProgress === 1 ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500'} disabled:opacity-50 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95`}
              >
                {animationProgress === 1 && !isAnimating ? (
                  <>
                    <RefreshCw size={14} /> Spela igen
                  </>
                ) : (
                  <>
                    <Play size={14} fill="currentColor" /> Spela
                  </>
                )}
              </button>
              <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all">
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
           </div>
        </div>
      </div>

      {/* COURT AREA */}
      <div className="flex-1 relative bg-[#2a1b12] overflow-hidden cursor-crosshair flex items-center justify-center">
        <svg 
          ref={svgRef}
          viewBox={`0 0 ${COURT_WIDTH} ${COURT_HEIGHT}`} 
          className="w-full h-full max-w-full max-h-full"
          preserveAspectRatio="xMidYMid meet"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            handleMouseUp();
            setMousePos(null);
          }}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        >
          {/* BASKETBALL COURT LINES */}
          <rect x="0" y="0" width={COURT_WIDTH} height={COURT_HEIGHT} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
          
          {orientation === 'landscape' ? (
            <>
                <line x1={COURT_WIDTH/2} y1="0" x2={COURT_WIDTH/2} y2={COURT_HEIGHT} stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                <circle cx={COURT_WIDTH/2} cy={COURT_HEIGHT/2} r="80" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                
                {/* Key areas */}
                <rect x="0" y={COURT_HEIGHT/2 - 100} width="150" height="200" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                <rect x={COURT_WIDTH - 150} y={COURT_HEIGHT/2 - 100} width="150" height="200" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                
                {/* Three point lines */}
                <path d={`M 0 ${COURT_HEIGHT/2 - 250} Q 350 ${COURT_HEIGHT/2} 0 ${COURT_HEIGHT/2 + 250}`} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                <path d={`M ${COURT_WIDTH} ${COURT_HEIGHT/2 - 250} Q ${COURT_WIDTH - 350} ${COURT_HEIGHT/2} ${COURT_WIDTH} ${COURT_HEIGHT/2 + 250}`} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            </>
          ) : (
            <>
                <line x1="0" y1={COURT_HEIGHT/2} x2={COURT_WIDTH} y2={COURT_HEIGHT/2} stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                <circle cx={COURT_WIDTH/2} cy={COURT_HEIGHT/2} r="80" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                
                {/* Key areas */}
                <rect x={COURT_WIDTH/2 - 100} y="0" width="200" height="150" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                <rect x={COURT_WIDTH/2 - 100} y={COURT_HEIGHT - 150} width="200" height="150" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                
                {/* Three point lines */}
                <path d={`M ${COURT_WIDTH/2 - 250} 0 Q ${COURT_WIDTH/2} 350 ${COURT_WIDTH/2 + 250} 0`} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                <path d={`M ${COURT_WIDTH/2 - 250} ${COURT_HEIGHT} Q ${COURT_WIDTH/2} ${COURT_HEIGHT - 350} ${COURT_WIDTH/2 + 250} ${COURT_HEIGHT}`} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            </>
          )}

          {/* FREE DRAWN PATHS */}
          {freePaths.map(path => (
            path.points.length > 1 && (
              <path
                key={`free-path-${path.id}`}
                d={`M ${path.points.map(p => `${p.x},${p.y}`).join(' L ')}`}
                fill="none"
                stroke={path.color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none"
              />
            )
          ))}

          {/* DRAWN PATHS */}
          {players.map(player => (
            player.path.length > 1 && (
              <path
                key={`path-${player.id}`}
                d={`M ${player.path.map(p => `${p.x},${p.y}`).join(' L ')}`}
                fill="none"
                stroke={player.team === 'home' ? 'rgba(249, 115, 22, 0.4)' : 'rgba(59, 130, 246, 0.4)'}
                strokeWidth="4"
                strokeDasharray="8,8"
                className="pointer-events-none"
              />
            )
          ))}

          {/* PLAYERS */}
          {players.map(player => {
            const pos = getAnimatedPos(player);
            return (
              <g key={player.id} className="cursor-pointer transition-transform duration-75">
                <circle 
                  cx={pos.x} 
                  cy={pos.y} 
                  r="25" 
                  fill={player.team === 'home' ? '#f97316' : '#3b82f6'} 
                  stroke="white" 
                  strokeWidth="2"
                  className="drop-shadow-lg"
                />
                <text 
                  x={pos.x} 
                  y={pos.y} 
                  fill="white" 
                  fontSize="16" 
                  fontWeight="black" 
                  textAnchor="middle" 
                  dominantBaseline="middle"
                >
                  {player.number}
                </text>
              </g>
            );
          })}

          {/* ERASER INDICATOR */}
          {mode === 'eraser' && mousePos && (
            <circle 
              cx={mousePos.x} 
              cy={mousePos.y} 
              r="20" 
              fill="rgba(255, 255, 255, 0.2)" 
              stroke="white" 
              strokeWidth="1" 
              strokeDasharray="4,4"
              className="pointer-events-none"
            />
          )}
        </svg>

      </div>
    </div>
  );

  if (isFullscreen) {
    return createPortal(content, document.body);
  }

  return content;
};
