
import React, { useState, useEffect } from 'react';
import { liveMatchService } from '../services/liveMatchService';
import { dataService } from '../services/dataService';
import { LiveMatchData, Player } from '../types';
import { Trophy, AlertTriangle, Users, Share2, X, Check, Loader2, QrCode, Timer, Zap, ShieldAlert } from 'lucide-react';

interface CoachLiveDashboardProps {
  matchId: string;
  onClose: () => void;
}

export const CoachLiveDashboard: React.FC<CoachLiveDashboardProps> = ({ matchId, onClose }) => {
  const [match, setMatch] = useState<LiveMatchData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    const unsub = liveMatchService.subscribeToMatch(matchId, setMatch);
    dataService.getPlayers().then(setPlayers);
    return () => unsub();
  }, [matchId]);

  if (!match) return (
    <div className="h-full flex flex-col items-center justify-center space-y-4 py-20">
      <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ansluter till Live-synk...</p>
    </div>
  );

  const getMatchLink = (id: string) => `${window.location.origin}?match=${id}`;

  const getQrUrl = (id: string) => {
    const link = getMatchLink(id);
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}&bgcolor=ffffff&qzone=4&ecc=M`;
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
      {/* HUD HEADER */}
      <div className="flex justify-between items-center bg-slate-900/50 p-4 px-6 rounded-[2.5rem] border border-slate-800 shadow-xl relative overflow-hidden group">
         <div className="absolute top-0 left-0 w-full h-1 bg-emerald-600/30"></div>
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-inner">
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.6)]"></div>
            </div>
            <div>
               <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">Live Match Intelligence</h4>
               <p className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">Scout ansluten & synkad • Uppdaterad nyss</p>
            </div>
         </div>
         <div className="flex gap-2">
            <button onClick={() => setShowShare(true)} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase flex items-center gap-2 shadow-lg shadow-blue-900/40 transition-all active:scale-95">
                <Share2 size={14} /> Scout-Länk
            </button>
            <button onClick={onClose} className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors border border-slate-700"><X size={18}/></button>
         </div>
      </div>

      {/* MATCH HUD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
         {/* LEFT: BIG DISPLAY */}
         <div className="lg:col-span-8 p-8 md:p-12 rounded-[3.5rem] bg-slate-950 border-4 border-slate-900 shadow-2xl relative overflow-hidden flex flex-col items-center">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none rotate-12"><Trophy size={200}/></div>
            
            <div className="absolute top-0 left-1/2 -translate-x-1/2 px-8 py-2.5 bg-slate-900 rounded-b-[2rem] border-x-2 border-b-2 border-slate-800 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] shadow-lg">
               PERIOD <span className="text-white text-xl ml-2 font-mono drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{match.period}</span>
            </div>
            
            <div className="flex items-center justify-between w-full mt-12 md:mt-16">
               <div className="text-center space-y-4">
                  <div className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> {match.homeName.toUpperCase()}
                  </div>
                  <div className="text-8xl md:text-[12rem] font-black text-orange-500 leading-none tabular-nums tracking-tighter drop-shadow-[0_0_20px_rgba(249,115,22,0.4)]">{match.homeScore}</div>
               </div>
               
               <div className="text-5xl font-black text-slate-900 italic tracking-tighter hidden md:block">VS</div>
               
               <div className="text-center space-y-4">
                  <div className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                     {match.awayName.toUpperCase()} <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                  </div>
                  <div className="text-8xl md:text-[12rem] font-black text-slate-100 leading-none tabular-nums tracking-tighter drop-shadow-[0_0_255,255,255,0.1)]">{match.awayScore}</div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-12 md:gap-24 w-full mt-12 border-t border-slate-900/50 pt-10">
               <div className="flex flex-col items-center gap-4">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">LAG-FOULS</span>
                  <div className="flex gap-2">
                     {[1,2,3,4,5].map(v => (
                        <div key={v} className={`w-8 md:w-10 h-2.5 rounded-full transition-all duration-500 border ${v <= match.homeFouls ? (v === 5 ? 'bg-rose-600 border-rose-400 shadow-[0_0_10px_rgba(225,29,72,0.5)]' : 'bg-orange-500 border-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.4)]') : 'bg-slate-900 border-slate-800'}`}></div>
                     ))}
                  </div>
                  {match.homeFouls >= 5 && <div className="px-4 py-1 rounded-full bg-rose-600/10 border border-rose-500/30 text-[9px] font-black text-rose-500 animate-pulse uppercase tracking-widest">BONUS: STRAFFKAST</div>}
               </div>
               <div className="flex flex-col items-center gap-4">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">TIMEOUTS KVAR</span>
                  <div className="flex gap-3">
                     {[1,2,3].map(v => (
                        <div key={v} className={`w-4 h-4 rounded-full transition-all duration-500 border-2 ${v <= match.homeTimeouts ? 'bg-white border-white shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'bg-slate-900 border-slate-800'}`}></div>
                     ))}
                  </div>
                  <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest italic">{match.homeTimeouts} AV 3 KVAR</span>
               </div>
            </div>
         </div>

         {/* RIGHT: FOUL MONITOR */}
         <div className="lg:col-span-4 p-6 md:p-8 rounded-[3rem] bg-slate-900 border border-slate-800 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-orange-600/20"></div>
            <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><ShieldAlert size={14} className="text-orange-500"/> Foul Monitor</h4>
                <span className="text-[9px] font-bold text-slate-600 uppercase bg-slate-950 px-3 py-1 rounded-full border border-slate-800">{players.length} SPELARE</span>
            </div>
            
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto custom-scrollbar pr-3">
               {players.sort((a, b) => (match.playerFouls[b.id] || 0) - (match.playerFouls[a.id] || 0)).map(p => {
                  const fouls = match.playerFouls[p.id] || 0;
                  const pts = match.playerPoints[p.id] || 0;
                  const isCritical = fouls === 4;
                  const isOut = fouls >= 5;
                  
                  return (
                     <div key={p.id} className={`p-4 rounded-[1.5rem] border transition-all duration-500 relative overflow-hidden ${isOut ? 'bg-rose-950/20 border-rose-600 shadow-rose-900/20' : isCritical ? 'bg-orange-950/20 border-orange-500 shadow-orange-900/20' : 'bg-slate-950 border-slate-800 group hover:border-slate-600'}`}>
                        <div className="flex justify-between items-center relative z-10">
                           <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl bg-slate-900 border flex items-center justify-center font-black text-xs transition-colors ${isOut ? 'text-rose-500 border-rose-800' : isCritical ? 'text-orange-500 border-rose-800' : 'text-slate-600 border-slate-800 group-hover:text-orange-500'}`}>#{p.number}</div>
                              <div>
                                 <div className="text-[11px] font-black text-white uppercase tracking-tight">{p.name}</div>
                                 <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{pts} POÄNG</div>
                              </div>
                           </div>
                           <div className="text-right">
                              <div className={`text-sm font-black italic tabular-nums ${isOut ? 'text-rose-500' : isCritical ? 'text-orange-500' : 'text-white'}`}>{fouls} <span className="text-[8px] not-italic text-slate-600">F</span></div>
                           </div>
                        </div>
                        
                        <div className="flex gap-1.5 mt-3 relative z-10">
                           {[1,2,3,4,5].map(v => (
                              <div key={v} className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${v <= fouls ? (v === 5 ? 'bg-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.6)]' : 'bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]') : 'bg-slate-800'}`}></div>
                           ))}
                        </div>
                        
                        {isOut && (
                            <div className="mt-2 text-[8px] font-black text-rose-500 uppercase text-center animate-pulse tracking-[0.2em] relative z-10">FOUL OUT — MÅSTE BYTAS UT</div>
                        )}
                        {isCritical && (
                            <div className="mt-2 text-[8px] font-black text-orange-500 uppercase text-center tracking-[0.2em] relative z-10">VARNING: 4 FOULS</div>
                        )}
                     </div>
                  );
               })}
            </div>
         </div>
      </div>

      {/* SHARE MODAL */}
      {showShare && (
         <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-[0_0_60px_rgba(0,0,0,0.5)] space-y-8 text-center animate-in zoom-in-95">
               <div>
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Bjud in Matchscout</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2 leading-relaxed">Låt föräldern skanna koden för att börja sköta poängen.</p>
               </div>
               
               <div className="flex flex-col items-center gap-6">
                  <div className="p-3 bg-white rounded-3xl shadow-2xl">
                      <img 
                        src={getQrUrl(matchId)} 
                        alt="Match QR Code" 
                        className="w-56 h-56 rounded-xl"
                      />
                  </div>

                  <div className="w-full p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4 shadow-inner">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Alternativt: Kopiera länk</div>
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[8px] font-mono text-blue-400 break-all select-all">
                          {getMatchLink(matchId)}
                      </div>
                      <button onClick={() => {
                          navigator.clipboard.writeText(getMatchLink(matchId));
                          alert("Länk kopierad!");
                      }} className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-black uppercase border border-slate-800 transition-all flex items-center justify-center gap-2">
                          <Share2 size={16}/> Kopiera Direktlänk
                      </button>
                  </div>
               </div>

               <button onClick={() => setShowShare(false)} className="w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-900/40 transition-all active:scale-95">Stäng</button>
            </div>
         </div>
      )}
    </div>
  );
};
