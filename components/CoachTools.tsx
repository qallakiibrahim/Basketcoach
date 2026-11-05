
import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Plus, Minus, Wrench, Clock, Hash, Timer, MonitorPlay, Bot, ArrowRight, User, AlertTriangle, ShieldAlert, PencilRuler, UserCheck, ChevronRight, ArrowLeftRight, BellRing, MessageSquareText, Radio, Loader2, QrCode, Share2, Check, X, CloudOff, Info, ExternalLink } from 'lucide-react';
import { View, Player } from '../types';
import { dataService } from '../services/dataService';
import { liveMatchService } from '../services/liveMatchService';
import { TacticalWhiteboard } from './TacticalWhiteboard';
import { StrategyBoard } from './StrategyBoard';
import { SupportModal } from './SupportModal';
import { CoachLiveDashboard } from './CoachLiveDashboard';
import { VideoAnalysis } from './VideoAnalysis';
import { AICoach } from './AICoach';

interface CoachToolsProps {
  onNavigate?: (view: View) => void;
  initialTool?: 'scoreboard' | 'timer' | 'live' | 'video' | 'ai' | 'support';
}

export const CoachTools: React.FC<CoachToolsProps> = ({ onNavigate, initialTool }) => {
  const [activeTool, setActiveTool] = useState<'scoreboard' | 'timer' | 'live' | 'video' | 'ai' | 'support'>(initialTool || 'scoreboard');
  const [showSupport, setShowSupport] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  
  // Live Match State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [startingLive, setStartingLive] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const isGuest = dataService.getStorageMode() !== 'CLOUD';

  // Scoreboard State (Local Manual)
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [period, setPeriod] = useState(1);
  const [homeFouls, setHomeFouls] = useState(0);
  const [awayFouls, setAwayFouls] = useState(0);
  const [homeTimeouts, setHomeTimeouts] = useState(3);
  const [awayTimeouts, setAwayTimeouts] = useState(3);
  const [possession, setPossession] = useState<'home' | 'away'>('home');

  // Player Foul Tracking (Local Manual)
  const [playerFouls, setPlayerFouls] = useState<Record<string, number>>({});
  const [showFoulPanel, setShowFoulPanel] = useState(false);

  // Stopwatch State
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const loadPlayers = async () => {
      const p = await dataService.getPlayers();
      setPlayers(p);
      const initialFouls: Record<string, number> = {};
      p.forEach(player => initialFouls[player.id] = 0);
      setPlayerFouls(initialFouls);
    };

    const checkExisting = async () => {
        if (!isGuest) {
            try {
                const existing = await liveMatchService.getExistingMatch();
                if (existing) {
                    setMatchId(existing.id);
                    setIsLiveActive(true);
                }
            } catch (e) {
                console.warn("Could not check existing match", e);
            }
        }
        setCheckingExisting(false);
    };

    loadPlayers();
    checkExisting();
  }, [isGuest]);

  useEffect(() => {
    let interval: number;
    if (isRunning) {
      interval = window.setInterval(() => {
        setTime(prev => prev + 10);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStartLive = async () => {
      if (isGuest) return;
      
      const opponent = prompt("Ange motståndarlaget:", "Motståndare");
      if (opponent === null) return; 
      
      setStartingLive(true);
      try {
          const id = await liveMatchService.startMatch("Orion HU14", opponent || "Gäster", players);
          setMatchId(id);
          setIsLiveActive(true);
          setShowOnboarding(true); 
      } catch (err: any) {
          console.error("Live match error:", err);
          alert("Kunde inte starta live-session.\n\nFelsökning:\n1. Gå till 'Mitt Konto'\n2. Kopiera reglerna under 'Databas-regler'\n3. Klistra in dem i Firebase Console -> Firestore -> Rules.");
      } finally {
          setStartingLive(false);
      }
  };

  const handleStopLive = async () => {
      if(!confirm("Avsluta live-matchen? All realtidsdata raderas.")) return;
      if(matchId) await liveMatchService.finishMatch(matchId);
      setIsLiveActive(false);
      setMatchId(null);
      setShowOnboarding(false);
  };

  const updatePlayerFoul = (playerId: string, delta: number) => {
    setPlayerFouls(prev => {
      const current = prev[playerId] || 0;
      const newVal = Math.max(0, Math.min(5, current + delta));
      if (delta > 0 && newVal > current) setHomeFouls(h => h + 1);
      else if (delta < 0 && newVal < current) setHomeFouls(h => Math.max(0, h - 1));
      return { ...prev, [playerId]: newVal };
    });
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  const getMatchLink = (id: string) => `${window.location.origin}?match=${id}`;

  const getQrUrl = (id: string) => {
    const link = getMatchLink(id);
    // qzone=4 ger en vit ram runt koden som hjälper skannern
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}&bgcolor=ffffff&qzone=4&ecc=M`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 animate-in fade-in duration-500 pb-24 px-1 h-full flex flex-col">
      {showSupport && <SupportModal userRole="coach" onClose={() => setShowSupport(false)} />}
      
      {showOnboarding && matchId && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300">
              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[3rem] p-8 md:p-10 shadow-2xl space-y-8 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5"><QrCode size={120}/></div>
                  
                  <div>
                      <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Skanna för att Scouta</h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">Öppna kameran och rikta den mot koden för att öppna scout-panelen direkt.</p>
                  </div>
                  
                  <div className="flex flex-col items-center gap-6">
                      <div className="p-3 bg-white rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.1)] animate-in zoom-in duration-500 delay-200">
                          <img 
                            src={getQrUrl(matchId)} 
                            alt="Match QR Code" 
                            className="w-56 h-56 md:w-64 md:h-64 rounded-xl"
                          />
                      </div>
                      
                      <div className="w-full p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Alternativt: Kopiera länk</div>
                          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[9px] font-mono text-blue-400 break-all select-all">
                              {getMatchLink(matchId)}
                          </div>
                          <button 
                            onClick={() => {
                                navigator.clipboard.writeText(getMatchLink(matchId));
                                alert("Scout-länk kopierad!");
                            }}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg"
                          >
                              <Share2 size={16}/> Kopiera Direktlänk
                          </button>
                      </div>
                  </div>

                  <button 
                    onClick={() => setShowOnboarding(false)}
                    className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                  >
                      Gå till Coach Dashboard
                  </button>
              </div>
          </div>
      )}

      <div className="flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter flex items-center gap-2">
              <Wrench className="text-slate-400" /> Verktygslåda
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Matchcenter & Support</p>
          </div>
        </div>

        {/* UNIFIED NAVIGATION */}
        <div className="flex p-1 bg-slate-900 rounded-2xl border border-slate-800 w-full shadow-inner overflow-x-auto hide-scrollbar gap-1">
            <button 
              onClick={() => setActiveTool('scoreboard')} 
              className={`flex-1 min-w-[100px] md:min-w-0 px-3 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex flex-col md:flex-row items-center justify-center gap-2 ${activeTool === 'scoreboard' ? 'bg-slate-800 text-white shadow-lg border border-white/5' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Hash size={16} className={activeTool === 'scoreboard' ? 'text-orange-500' : ''} /> 
              <span>Scoreboard</span>
            </button>
            <button 
              onClick={() => setActiveTool('live')} 
              className={`flex-1 min-w-[100px] md:min-w-0 px-3 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex flex-col md:flex-row items-center justify-center gap-2 ${activeTool === 'live' ? 'bg-emerald-600/20 text-emerald-400 shadow-lg border border-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Radio size={16} className={activeTool === 'live' ? 'text-emerald-400 animate-pulse' : ''} /> 
              <span>Live</span>
            </button>
            <button 
              onClick={() => setActiveTool('timer')} 
              className={`flex-1 min-w-[100px] md:min-w-0 px-3 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex flex-col md:flex-row items-center justify-center gap-2 ${activeTool === 'timer' ? 'bg-amber-600/20 text-amber-400 shadow-lg border border-amber-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Timer size={16} className={activeTool === 'timer' ? 'text-amber-400' : ''} /> 
              <span>Taktik</span>
            </button>
            <button 
              onClick={() => setActiveTool('video')} 
              className={`flex-1 min-w-[100px] md:min-w-0 px-3 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex flex-col md:flex-row items-center justify-center gap-2 ${activeTool === 'video' ? 'bg-orange-600/20 text-orange-400 shadow-lg border border-orange-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <MonitorPlay size={16} className={activeTool === 'video' ? 'text-orange-400' : ''} /> 
              <span>Video</span>
            </button>
            <button 
              onClick={() => setActiveTool('ai')} 
              className={`flex-1 min-w-[100px] md:min-w-0 px-3 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex flex-col md:flex-row items-center justify-center gap-2 ${activeTool === 'ai' ? 'bg-blue-600/20 text-blue-400 shadow-lg border border-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Bot size={16} className={activeTool === 'ai' ? 'text-blue-400' : ''} /> 
              <span>AI</span>
            </button>
            <button 
              onClick={() => setShowSupport(true)} 
              className={`flex-1 min-w-[100px] md:min-w-0 px-3 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex flex-col md:flex-row items-center justify-center gap-2 text-slate-500 hover:text-slate-300`}
            >
              <MessageSquareText size={16} /> 
              <span>Support</span>
            </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar">
        {activeTool === 'video' && <div className="h-full animate-in slide-in-from-right duration-300"><VideoAnalysis /></div>}
        {activeTool === 'ai' && <div className="h-full animate-in slide-in-from-right duration-300"><AICoach /></div>}
        
        {activeTool === 'live' && (
          <div className="animate-in slide-in-from-bottom duration-500 h-full min-h-[600px]">
              {checkingExisting ? (
                  <div className="h-[400px] flex flex-col items-center justify-center space-y-4">
                      <Loader2 className="w-10 h-10 text-slate-700 animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Söker efter aktiva sessioner...</p>
                  </div>
              ) : isLiveActive && matchId ? (
                  <CoachLiveDashboard matchId={matchId} onClose={handleStopLive} />
              ) : (
                  <div className="flex flex-col items-center justify-center p-12 md:p-20 bg-slate-900 border border-slate-800 rounded-[3rem] text-center space-y-8 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-12 opacity-5"><Radio size={160}/></div>
                      
                      {isGuest ? (
                          <div className="space-y-8 z-10 max-w-sm">
                              <div className="w-20 h-20 bg-amber-500/10 rounded-[2rem] flex items-center justify-center text-amber-500 mx-auto border border-amber-500/20"><CloudOff size={40}/></div>
                              <div className="space-y-2">
                                  <h3 className="text-2xl font-black text-white uppercase italic">Inloggning krävs</h3>
                                  <p className="text-sm text-slate-400">Live-läget kräver en inloggning via Google för att kunna skicka data i realtid till föräldrar.</p>
                              </div>
                              <button onClick={() => onNavigate?.(View.ACCOUNT)} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all">Gå till inställningar <ArrowRight size={14}/></button>
                          </div>
                      ) : (
                          <>
                            <div className="w-24 h-24 bg-emerald-600/10 rounded-[2.5rem] flex items-center justify-center text-emerald-500 shadow-inner"><Radio size={48} className="animate-pulse" /></div>
                            <div className="space-y-3 z-10">
                                <h3 className="text-3xl md:text-4xl font-black text-white italic uppercase tracking-tighter leading-none">Scoreboard Live-läget</h3>
                                <p className="text-sm text-slate-400 max-w-sm leading-relaxed mx-auto">Låt en förälder sköta poängen i realtid från en annan telefon medan du coachar. Allt synkas direkt.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md z-10 text-left">
                                <div className="p-5 bg-slate-950 border border-slate-800 rounded-[2rem]">
                                    <h4 className="text-[10px] font-black text-white uppercase tracking-[0.15em] mb-1 flex items-center gap-2"><QrCode size={14} className="text-emerald-500"/> 1. Dela länk</h4>
                                    <p className="text-[9px] text-slate-500 leading-tight">Matchscouten får en länk som QR-kod.</p>
                                </div>
                                <div className="p-5 bg-slate-950 border border-slate-800 rounded-[2rem]">
                                    <h4 className="text-[10px] font-black text-white uppercase tracking-[0.15em] mb-1 flex items-center gap-2"><Check size={14} className="text-emerald-500"/> 2. Följ Live</h4>
                                    <p className="text-[9px] text-slate-500 leading-tight">Se poäng, fouls och timeouts på din egen HUD.</p>
                                </div>
                            </div>
                            
                            <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-2xl flex items-start gap-3 text-left max-w-md">
                                <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
                                <p className="text-[10px] font-bold text-blue-300 leading-relaxed uppercase tracking-tighter">Viktigt: Om sessionen inte startar, gå till "Mitt Konto" och kopiera de senaste databasreglerna till Firebase Console.</p>
                            </div>

                            <button 
                                onClick={handleStartLive} 
                                disabled={startingLive}
                                className="px-12 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-900/40 flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50 z-10"
                            >
                                {startingLive ? <Loader2 className="animate-spin" size={20}/> : <Play size={20} fill="currentColor" className="ml-1"/>}
                                Starta Live Session
                            </button>
                          </>
                      )}
                  </div>
              )}
          </div>
        )}

      {activeTool === 'scoreboard' && (
          <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
              <div className="p-4 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] bg-slate-950 border-4 border-slate-900 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-slate-900 rounded-b-2xl border-x border-b border-slate-800 flex items-center justify-center z-10 gap-4">
                      <button onClick={() => setPossession('home')} className={`w-8 h-6 rounded flex items-center justify-center transition-all ${possession === 'home' ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/40' : 'text-slate-700 hover:text-slate-400'}`}><ArrowLeftRight size={14} className="rotate-180" /></button>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PERIOD <span className="text-white text-lg ml-1 font-mono">{period}</span></div>
                      <button onClick={() => setPossession('away')} className={`w-8 h-6 rounded flex items-center justify-center transition-all ${possession === 'away' ? 'bg-slate-200 text-black shadow-lg' : 'text-slate-700 hover:text-slate-400'}`}><ArrowLeftRight size={14} /></button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 md:gap-16 mt-8 relative z-10">
                      <div className="flex flex-col items-center gap-6">
                          <span className="text-xl md:text-5xl font-black text-white italic uppercase tracking-tighter">HEMMA</span>
                          <div className="text-8xl md:text-[14rem] font-black text-orange-500 leading-none tabular-nums tracking-tighter drop-shadow-[0_0_20px_rgba(249,115,22,0.4)]">{homeScore}</div>
                          
                          <div className="flex flex-wrap justify-center gap-2">
                              <button onClick={() => setHomeScore(homeScore + 1)} className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-slate-800 text-white flex items-center justify-center transition-all active:scale-90 border border-slate-700 font-black">+1</button>
                              <button onClick={() => setHomeScore(homeScore + 2)} className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-orange-600 text-white font-black text-lg md:text-xl transition-all active:scale-90 shadow-lg shadow-orange-900/20 hover:bg-orange-500">+2</button>
                              <button onClick={() => setHomeScore(homeScore + 3)} className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-orange-600 text-white font-black text-lg md:text-xl transition-all active:scale-90 shadow-lg shadow-orange-900/20 hover:bg-orange-500">+3</button>
                          </div>

                          <div className="grid grid-cols-2 gap-3 w-full max-w-[240px]">
                              <div className="p-4 rounded-[1.5rem] bg-slate-900 border border-slate-800 flex flex-col items-center relative overflow-hidden group shadow-inner">
                                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Fouls</span>
                                  <div className="text-2xl font-black text-white font-mono">{homeFouls}</div>
                                  {homeFouls >= 5 && <div className="absolute inset-0 bg-rose-600/90 flex items-center justify-center text-[10px] font-black text-white animate-pulse">BONUS</div>}
                                  <button onClick={() => setShowFoulPanel(true)} className="mt-2 w-full py-1.5 rounded-xl bg-slate-950 text-[7px] font-black text-slate-400 uppercase border border-slate-800 hover:text-white transition-colors">Hantera</button>
                              </div>
                              <div className="p-4 rounded-[1.5rem] bg-slate-900 border border-slate-800 flex flex-col items-center shadow-inner">
                                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">T.O</span>
                                  <div className="flex gap-1.5 mb-2">
                                      {[1,2,3].map(v => <div key={v} className={`w-3 h-3 rounded-full border ${v <= homeTimeouts ? 'bg-orange-500 border-orange-400 shadow-[0_0_5px_rgba(249,115,22,0.5)]' : 'bg-slate-950 border-slate-800'}`}></div>)}
                                  </div>
                                  <button onClick={() => setHomeTimeouts(h => Math.max(0, h - 1))} className="w-full py-1.5 rounded-xl bg-slate-950 text-[7px] font-black text-slate-400 uppercase border border-slate-800 hover:text-white transition-colors">Begär</button>
                              </div>
                          </div>
                      </div>

                      <div className="flex flex-col items-center gap-6 border-l border-slate-900 pl-4 md:pl-16">
                          <span className="text-xl md:text-5xl font-black text-slate-400 italic uppercase tracking-tighter">BORTA</span>
                          <div className="text-8xl md:text-[14rem] font-black text-slate-200 leading-none tabular-nums tracking-tighter">{awayScore}</div>
                          
                          <div className="flex flex-wrap justify-center gap-2">
                              <button onClick={() => setAwayScore(awayScore + 1)} className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-slate-800 text-white flex items-center justify-center transition-all active:scale-90 border border-slate-700 font-black">+1</button>
                              <button onClick={() => setAwayScore(awayScore + 2)} className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-slate-700 text-white font-black text-lg md:text-xl transition-all active:scale-90 shadow-lg hover:bg-slate-600">+2</button>
                              <button onClick={() => setAwayScore(awayScore + 3)} className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-slate-700 text-white font-black text-lg md:text-xl transition-all active:scale-90 shadow-lg hover:bg-slate-600">+3</button>
                          </div>

                          <div className="grid grid-cols-2 gap-3 w-full max-w-[240px]">
                              <div className="p-4 rounded-[1.5rem] bg-slate-900 border border-slate-800 flex flex-col items-center relative overflow-hidden shadow-inner">
                                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Fouls</span>
                                  <div className="text-2xl font-black text-white font-mono">{awayFouls}</div>
                                  {awayFouls >= 5 && <div className="absolute inset-0 bg-rose-600/90 flex items-center justify-center text-[10px] font-black text-white animate-pulse">BONUS</div>}
                                  <div className="mt-2 flex gap-1 w-full">
                                      <button onClick={() => setAwayFouls(f => Math.max(0, f - 1))} className="flex-1 py-1.5 rounded-xl bg-slate-950 text-slate-600 border border-slate-800 hover:text-slate-400 transition-colors"><Minus size={10} className="mx-auto"/></button>
                                      <button onClick={() => setAwayFouls(f => Math.min(9, f + 1))} className="flex-1 py-1.5 rounded-xl bg-slate-950 text-slate-400 border border-slate-800 hover:text-white transition-colors"><Plus size={10} className="mx-auto"/></button>
                                  </div>
                              </div>
                              <div className="p-4 rounded-[1.5rem] bg-slate-900 border border-slate-800 flex flex-col items-center shadow-inner">
                                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">T.O</span>
                                  <div className="flex gap-1.5 mb-2">
                                      {[1,2,3].map(v => <div key={v} className={`w-3 h-3 rounded-full border ${v <= awayTimeouts ? 'bg-white border-slate-300 shadow-[0_0_5px_rgba(255,255,255,0.5)]' : 'bg-slate-950 border-slate-800'}`}></div>)}
                                  </div>
                                  <button onClick={() => setAwayTimeouts(h => Math.max(0, h - 1))} className="w-full py-1.5 rounded-xl bg-slate-950 text-[7px] font-black text-slate-400 uppercase border border-slate-800 hover:text-white transition-colors">Begär</button>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="mt-12 pt-8 border-t border-slate-900 flex justify-center gap-6 relative z-10">
                        <button onClick={() => setPeriod(Math.max(1, period - 1))} className="p-4 bg-slate-900 rounded-2xl text-slate-500 text-[10px] font-black uppercase hover:text-white transition-all border border-slate-800">Föregående</button>
                        <button onClick={() => { setHomeScore(0); setAwayScore(0); setHomeFouls(0); setAwayFouls(0); setHomeTimeouts(3); setAwayTimeouts(3); }} className="p-4 bg-rose-600/10 rounded-2xl text-rose-600 text-[10px] font-black uppercase border border-rose-900/20 hover:bg-rose-600 hover:text-white transition-all">Score-Reset</button>
                        <button onClick={() => setPeriod(period + 1)} className="p-4 bg-slate-900 rounded-2xl text-slate-500 text-[10px] font-black uppercase hover:text-white transition-all border border-slate-800">Nästa Period</button>
                   </div>
              </div>
          </div>
      )}

      {/* TACTICAL TIMER VIEW - Optimized for mobile */}
      {activeTool === 'timer' && (
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 md:gap-8 animate-in slide-in-from-bottom duration-300 h-full">
             <div className="p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] bg-slate-900 border border-slate-800 flex flex-col items-center justify-center shadow-xl min-h-[300px] md:min-h-[500px] relative overflow-hidden shrink-0">
                 <div className="absolute top-0 left-0 p-8 opacity-5"><Timer size={80}/></div>
                 <div className="w-48 h-48 md:w-80 md:h-80 rounded-full border-8 border-slate-800 bg-slate-950 flex items-center justify-center shadow-2xl relative mb-6 md:mb-12">
                     <div className={`absolute inset-0 rounded-full border-8 border-amber-500 opacity-20 ${isRunning ? 'animate-pulse' : ''}`}></div>
                     <div className="text-3xl md:text-6xl font-black text-white font-mono tracking-wider tabular-nums z-10">
                         {formatTime(time).split('.')[0]}<span className="text-lg md:text-3xl text-slate-500">.{formatTime(time).split('.')[1]}</span>
                     </div>
                 </div>
                 <div className="flex items-center gap-4 md:gap-6 z-10">
                     <button onClick={() => setIsRunning(!isRunning)} className={`w-16 h-16 md:w-24 md:h-24 rounded-[2rem] md:rounded-[2.5rem] flex flex-col items-center justify-center gap-1 md:gap-2 transition-all shadow-xl ${isRunning ? 'bg-amber-500 text-white hover:bg-amber-400 shadow-amber-900/40' : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/40'}`}>
                         {isRunning ? <Pause size={24} fill="currentColor"/> : <Play size={24} fill="currentColor" className="ml-1" />}
                         <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">{isRunning ? 'Pausa' : 'Starta'}</span>
                     </button>
                     <button onClick={() => { setIsRunning(false); setTime(0); }} className="w-14 h-14 md:w-20 md:h-20 rounded-[1.5rem] md:rounded-[2rem] bg-slate-800 text-slate-400 border border-slate-700 flex flex-col items-center justify-center gap-1 md:gap-2 hover:bg-slate-700 hover:text-white transition-all">
                         <RotateCcw size={20} />
                         <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Reset</span>
                     </button>
                 </div>
             </div>
             <div className="p-3 md:p-6 rounded-[2.5rem] md:rounded-[3rem] bg-slate-900 border border-slate-800 shadow-xl min-h-[400px] md:min-h-[500px] flex flex-col relative overflow-hidden">
                <div className="flex items-center justify-between mb-2 md:mb-4 px-4 relative z-10">
                    <h4 className="text-[10px] md:text-sm font-black text-white uppercase tracking-widest flex items-center gap-2"><PencilRuler size={16} className="text-blue-500" /> Taktikbräda</h4>
                    <span className="hidden sm:inline text-[9px] font-bold text-slate-500 uppercase tracking-widest">Planera & Animera</span>
                </div>
                <div className="flex-1 relative z-10"><StrategyBoard id="live-match-strategy" /></div>
             </div>
          </div>
      )}

      {/* PLAYER FOUL MODAL (MANUAL) */}
      {showFoulPanel && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
              <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95">
                  <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/40 shrink-0">
                      <div>
                          <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">Lag-fouls Monitor</h4>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Håll koll på spelarnas individuella fouls</p>
                      </div>
                      <button onClick={() => setShowFoulPanel(false)} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-400 transition-colors shadow-lg"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-3 custom-scrollbar">
                      {players.map(p => (
                          <div key={p.id} className={`p-5 rounded-[2rem] border flex items-center justify-between transition-all ${playerFouls[p.id] >= 4 ? 'bg-rose-900/10 border-rose-500/30' : 'bg-slate-950 border-slate-800 shadow-inner'}`}>
                              <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-xs text-orange-500 shadow-lg">#{p.number}</div>
                                  <div>
                                      <div className="text-sm font-black text-white uppercase tracking-tight">{p.name}</div>
                                      <div className="flex gap-1.5 mt-2">
                                          {[1,2,3,4,5].map(v => <div key={v} className={`w-4 h-1.5 rounded-full ${v <= (playerFouls[p.id] || 0) ? (v === 5 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.4)]') : 'bg-slate-800'}`}></div>)}
                                      </div>
                                  </div>
                              </div>
                              <div className="flex items-center gap-3">
                                  {playerFouls[p.id] >= 5 && <div className="px-2 py-1 bg-rose-600 text-white text-[8px] font-black rounded uppercase animate-pulse shadow-lg">FOUL OUT</div>}
                                  <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                                      <button onClick={() => updatePlayerFoul(p.id, -1)} className="p-2 text-slate-600 hover:text-white transition-colors"><Minus size={18}/></button>
                                      <div className="w-px h-6 bg-slate-800 mx-1"></div>
                                      <button onClick={() => updatePlayerFoul(p.id, 1)} className="p-2 text-slate-300 hover:text-white transition-colors"><Plus size={18}/></button>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
                  <div className="p-8 bg-slate-950/60 border-t border-slate-800 shrink-0">
                      <button onClick={() => setShowFoulPanel(false)} className="w-full py-4 rounded-2xl bg-slate-800 text-white font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95">Färdig</button>
                  </div>
              </div>
          </div>
      )}
      </div>
    </div>
  );
};
