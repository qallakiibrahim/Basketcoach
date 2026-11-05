
import React, { useState, useEffect } from 'react';
import { liveMatchService } from '../services/liveMatchService';
import { dataService } from '../services/dataService';
import { LiveMatchData, Player } from '../types';
import { Trophy, Check, X, Loader2, ArrowRight, UserCheck, Flame, Zap, ShieldAlert, Timer, Plus, Minus, Bell, Radio } from 'lucide-react';

interface MatchLiveScoutProps {
  matchId: string;
  onExit: () => void;
}

export const MatchLiveScout: React.FC<MatchLiveScoutProps> = ({ matchId, onExit }) => {
  const [match, setMatch] = useState<LiveMatchData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const coachId = matchId.split('_')[1];
    const unsub = liveMatchService.subscribeToMatch(matchId, (data) => {
      // Only update if we are not in the middle of an optimistic update
      // or if the server data is newer than our last update
      setMatch(data);
      setLoading(false);
    });
    dataService.getPlayers(coachId).then(setPlayers);
    return () => unsub();
  }, [matchId]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 1500);
  };

  const updateScore = async (side: 'home' | 'away', delta: number) => {
    if (!match) return;
    
    // OPTIMISTIC UPDATE
    const prevMatch = { ...match };
    const newScore = Math.max(0, (side === 'home' ? match.homeScore : match.awayScore) + delta);
    
    const optimisticMatch = { ...match };
    if (side === 'home') {
        optimisticMatch.homeScore = newScore;
        if (selectedPlayerId && delta > 0) {
            optimisticMatch.playerPoints = { 
                ...match.playerPoints, 
                [selectedPlayerId]: (match.playerPoints[selectedPlayerId] || 0) + delta 
            };
        }
    } else {
        optimisticMatch.awayScore = newScore;
    }
    
    setMatch(optimisticMatch);
    setIsSyncing(true);

    try {
        const updates: any = {
            [side === 'home' ? 'homeScoreDelta' : 'awayScoreDelta']: delta
        };

        if (side === 'home' && selectedPlayerId && delta > 0) {
            updates.playerPoints = { [selectedPlayerId]: delta };
            showFeedback(`+${delta}p till #${players.find(p => p.id === selectedPlayerId)?.number}`);
        }

        await liveMatchService.updateMatch(matchId, updates);
    } catch (err) {
        console.error("Sync failed", err);
        setMatch(prevMatch); // Rollback on error
    } finally {
        setIsSyncing(false);
        if(side === 'home') setSelectedPlayerId(null);
    }
  };

  const addFoul = async (playerId: string) => {
    if (!match) return;
    const currentFouls = match.playerFouls[playerId] || 0;
    if (currentFouls >= 5) return;

    // OPTIMISTIC UPDATE
    const prevMatch = { ...match };
    const optimisticMatch = { 
        ...match,
        playerFouls: { ...match.playerFouls, [playerId]: currentFouls + 1 },
        homeFouls: Math.min(9, match.homeFouls + 1)
    };
    
    setMatch(optimisticMatch);
    setIsSyncing(true);

    try {
        await liveMatchService.updateMatch(matchId, {
            playerFouls: { [playerId]: 1 },
            homeFoulsDelta: 1
        });
        showFeedback(`Foul på #${players.find(p => p.id === playerId)?.number}`);
    } catch (err) {
        setMatch(prevMatch);
    } finally {
        setIsSyncing(false);
    }
  };

  if (loading) return <div className="h-screen bg-[#020617] flex flex-col items-center justify-center gap-4"><Loader2 className="w-12 h-12 text-emerald-500 animate-spin" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ansluter till matchen...</p></div>;
  if (!match) return <div className="h-screen bg-[#020617] flex flex-col items-center justify-center p-8 text-center space-y-6"><div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 border border-rose-500/20"><X size={40} /></div><h2 className="text-xl font-bold text-white uppercase italic tracking-tighter">Matchen hittades inte</h2><p className="text-slate-400 text-xs">Länken kan vara gammal eller matchen avslutad.</p><button onClick={onExit} className="px-8 py-3 bg-slate-800 text-white rounded-xl font-black uppercase text-[10px]">Stäng</button></div>;

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col p-4 md:p-8 space-y-6 animate-in fade-in max-w-lg mx-auto pb-safe">
      <header className="flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-lg"><Radio size={20}/></div>
             <div>
                <h2 className="text-lg font-black text-white italic uppercase tracking-tighter leading-none">Match Scout</h2>
                <div className="flex items-center gap-2 mt-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{isSyncing ? 'Synkar...' : 'Live synk aktiv'}</p>
                </div>
             </div>
          </div>
          <button onClick={onExit} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white transition-colors"><X size={20}/></button>
      </header>

      {/* FEEDBACK OVERLAY */}
      {feedback && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-emerald-600 text-white rounded-full font-black uppercase text-[10px] shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
             {feedback}
          </div>
      )}

      {/* SCORE CONTROLS */}
      <div className="grid grid-cols-2 gap-4">
         <div className="p-6 rounded-[2.5rem] bg-slate-900 border border-orange-500/30 text-center space-y-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-orange-600"></div>
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest block">HEMMA (ORION)</span>
            <div className="text-7xl font-black text-white tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">{match.homeScore}</div>
            <div className="flex justify-center gap-2">
                <button onClick={() => updateScore('home', 1)} className="w-14 h-14 rounded-2xl bg-slate-800 text-white font-black text-lg shadow-lg active:scale-90 border border-slate-700 transition-all">+1</button>
                <button onClick={() => updateScore('home', 2)} className="w-14 h-14 rounded-2xl bg-orange-600 text-white font-black text-lg shadow-lg active:scale-90 border border-orange-500 transition-all">+2</button>
            </div>
         </div>
         <div className="p-6 rounded-[2.5rem] bg-slate-900 border border-slate-800 text-center space-y-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-700"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">BORTA</span>
            <div className="text-7xl font-black text-white tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">{match.awayScore}</div>
            <div className="flex justify-center gap-2">
                <button onClick={() => updateScore('away', 1)} className="w-14 h-14 rounded-2xl bg-slate-800 text-white font-black text-lg shadow-lg active:scale-90 border border-slate-700 transition-all">+1</button>
                <button onClick={() => updateScore('away', 2)} className="w-14 h-14 rounded-2xl bg-slate-700 text-white font-black text-lg shadow-lg active:scale-90 border border-slate-600 transition-all">+2</button>
            </div>
         </div>
      </div>

      {/* MATCH INFO CONTROLS */}
      <div className="flex p-1 bg-slate-950 rounded-[2.5rem] border border-slate-900 items-center justify-between px-8 py-5 shadow-inner">
          <div className="flex flex-col items-center gap-1">
             <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">PERIOD</span>
             <div className="flex gap-4 items-center">
                <button onClick={() => liveMatchService.updateMatch(matchId, { period: Math.max(1, match.period - 1) })} className="p-2 text-slate-600"><Minus size={14}/></button>
                <span className="text-2xl font-black text-white font-mono">{match.period}</span>
                <button onClick={() => liveMatchService.updateMatch(matchId, { period: match.period + 1 })} className="p-2 text-slate-300"><Plus size={14}/></button>
             </div>
          </div>
          <div className="w-px h-10 bg-slate-900"></div>
          <div className="flex flex-col items-center gap-1">
             <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">LAG-FOULS</span>
             <div className="flex items-center gap-4">
                <button onClick={() => liveMatchService.updateMatch(matchId, { homeFoulsDelta: -1 })} className="p-2 text-slate-600"><Minus size={14}/></button>
                <span className={`text-2xl font-black font-mono ${match.homeFouls >= 5 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>{match.homeFouls}</span>
                <button onClick={() => liveMatchService.updateMatch(matchId, { homeFoulsDelta: 1 })} className="p-2 text-slate-300"><Plus size={14}/></button>
             </div>
          </div>
          <div className="w-px h-10 bg-slate-900"></div>
          <button 
            onClick={() => { if(match.homeTimeouts > 0) liveMatchService.updateMatch(matchId, { homeTimeoutsDelta: -1 }); }}
            className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
             <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">TIMEOUTS</span>
             <div className="flex gap-1.5">
                {[1,2,3].map(v => <div key={v} className={`w-2.5 h-2.5 rounded-full ${v <= match.homeTimeouts ? 'bg-orange-500' : 'bg-slate-800'}`}></div>)}
             </div>
          </button>
      </div>

      {/* PLAYER LIST FOR SCORING & FOULS */}
      <div className="flex-1 flex flex-col min-h-0 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
                <UserCheck size={16} className="text-slate-600" />
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">SPELARE & FOULS</h3>
            </div>
            <span className="text-[9px] font-bold text-slate-700 uppercase">Klicka spelare för att ge poäng</span>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
              {players.map(p => {
                  const isSelected = selectedPlayerId === p.id;
                  const fouls = match.playerFouls[p.id] || 0;
                  const pts = match.playerPoints[p.id] || 0;
                  const isOut = fouls >= 5;
                  
                  return (
                      <div key={p.id} className={`p-4 rounded-[2rem] border transition-all duration-300 relative overflow-hidden ${isSelected ? 'bg-orange-600/10 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.15)]' : 'bg-slate-900 border-slate-800 shadow-md'}`}>
                          {isOut && <div className="absolute inset-0 bg-rose-600/5 backdrop-blur-[1px] z-10 pointer-events-none"></div>}
                          
                          <div className="flex items-center justify-between gap-4">
                              <div onClick={() => !isOut && setSelectedPlayerId(isSelected ? null : p.id)} className="flex items-center gap-4 flex-1 cursor-pointer select-none">
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border shadow-lg transition-colors ${isOut ? 'bg-slate-950 text-slate-700 border-rose-900/50' : isSelected ? 'bg-orange-600 text-white border-orange-400' : 'bg-slate-950 text-slate-500 border-slate-800'}`}>#{p.number}</div>
                                  <div className="min-w-0">
                                      <div className={`text-xs font-black uppercase tracking-tight truncate ${isOut ? 'text-slate-700' : 'text-white'}`}>{p.name}</div>
                                      <div className="flex gap-1 mt-1.5">
                                          {[1,2,3,4,5].map(v => <div key={v} className={`w-3 h-1 rounded-full ${v <= fouls ? (v === 5 ? 'bg-rose-500' : 'bg-orange-500') : 'bg-slate-800'}`}></div>)}
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                  {isSelected ? (
                                      <div className="flex gap-1 animate-in zoom-in duration-200">
                                          <button onClick={() => updateScore('home', 2)} className="w-12 h-12 bg-orange-600 rounded-xl text-white font-black text-xs shadow-lg shadow-orange-900/40 active:scale-95 transition-all">+2p</button>
                                          <button onClick={() => updateScore('home', 3)} className="w-12 h-12 bg-orange-600 rounded-xl text-white font-black text-xs shadow-lg shadow-orange-900/40 active:scale-95 transition-all">+3p</button>
                                          <button onClick={() => setSelectedPlayerId(null)} className="w-12 h-12 bg-slate-800 rounded-xl text-slate-400 flex items-center justify-center"><X size={16}/></button>
                                      </div>
                                  ) : (
                                      <button 
                                        onClick={() => !isOut && addFoul(p.id)} 
                                        disabled={isOut}
                                        className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase shadow-lg transition-all active:scale-95 ${isOut ? 'bg-slate-950 text-rose-900 border border-rose-950 opacity-40' : fouls >= 4 ? 'bg-rose-600 text-white shadow-rose-900/40' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                                      >
                                          {isOut ? 'FOUL OUT' : `FOUL (${fouls}/5)`}
                                      </button>
                                  )}
                              </div>
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>

      <div className="text-center pb-2 opacity-20">
          <p className="text-[7px] font-black uppercase tracking-[0.4em] text-slate-600">Basketcoach Pro Live Scout Portal</p>
      </div>
    </div>
  );
};
