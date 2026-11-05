
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { WarmupExercise, WarmupPhase } from '../types';
import { 
  Flame, 
  Activity, 
  Zap, 
  ShieldCheck, 
  Clock, 
  Info, 
  Play, 
  ChevronRight, 
  Search,
  BookOpen,
  CheckCircle2,
  Target,
  Youtube
} from 'lucide-react';

// Super-robust YouTube ID extractor for all formats
const getVideoId = (url: string) => {
  if (!url) return null;
  
  // Handle various YouTube URL formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  
  if (match && match[2]) {
    // Extract exactly 11 characters (standard YouTube ID length)
    const id = match[2].trim();
    return id.length >= 11 ? id.substring(0, 11) : null;
  }
  
  return null;
};

interface WarmupLibraryProps {
  onSelect?: (exercise: WarmupExercise) => void;
  selectedIds?: string[];
  isSelectionMode?: boolean;
}

export const WarmupLibrary: React.FC<WarmupLibraryProps> = ({ onSelect, selectedIds = [], isSelectionMode = false }) => {
  const [exercises, setExercises] = useState<WarmupExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhase, setActivePhase] = useState<WarmupPhase | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDetailExercise, setSelectedDetailExercise] = useState<WarmupExercise | null>(null);

  useEffect(() => {
    const load = async () => {
      const data = await dataService.getWarmupExercises();
      setExercises(data);
      setLoading(false);
    };
    load();
  }, []);

  const filteredExercises = exercises.filter(ex => {
    const matchesPhase = activePhase === 'ALL' || ex.phase === activePhase;
    const matchesSearch = ex.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         ex.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPhase && matchesSearch;
  });

  const getPhaseIcon = (phase: WarmupPhase) => {
    switch (phase) {
      case WarmupPhase.PULS: return <Flame className="text-orange-500" size={18} />;
      case WarmupPhase.AKTIVERING: return <ShieldCheck className="text-emerald-500" size={18} />;
      case WarmupPhase.TEKNIK: return <Activity className="text-blue-500" size={18} />;
      case WarmupPhase.INTENSITET: return <Zap className="text-purple-500" size={18} />;
    }
  };

  const getPhaseColor = (phase: WarmupPhase) => {
    switch (phase) {
      case WarmupPhase.PULS: return 'border-orange-500/20 bg-orange-500/5';
      case WarmupPhase.AKTIVERING: return 'border-emerald-500/20 bg-emerald-500/5';
      case WarmupPhase.TEKNIK: return 'border-blue-500/20 bg-blue-500/5';
      case WarmupPhase.INTENSITET: return 'border-purple-500/20 bg-purple-500/5';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
            <BookOpen className="text-orange-500" /> SBBF Uppvärmningsarkiv
          </h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
            Gedigen biblipotek för rörelseförståelse & knäkontroll
          </p>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="Sök övning..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white outline-none focus:border-orange-500 transition-all"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        <button 
          onClick={() => setActivePhase('ALL')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${activePhase === 'ALL' ? 'bg-white text-black border-white' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600'}`}
        >
          Alla
        </button>
        {Object.values(WarmupPhase).map(phase => (
          <button 
            key={phase}
            onClick={() => setActivePhase(phase)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 whitespace-nowrap ${activePhase === phase ? 'bg-slate-800 text-white border-slate-600' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600'}`}
          >
            {getPhaseIcon(phase)}
            {phase}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 pb-4">
        {filteredExercises.map(ex => {
          const isSelected = selectedIds.includes(ex.id);
          return (
            <div 
              key={ex.id}
              onClick={() => onSelect?.(ex)}
              className={`group relative p-5 rounded-3xl border transition-all cursor-pointer ${isSelected ? 'border-orange-500 bg-orange-500/10' : 'bg-slate-900 border-slate-800 hover:border-slate-600'} ${getPhaseColor(ex.phase)}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
                  {getPhaseIcon(ex.phase)}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[9px] font-black text-slate-500 uppercase">
                    <Clock size={12} /> {ex.duration}
                  </div>
                  {isSelected && <CheckCircle2 size={20} className="text-orange-500 animate-in zoom-in" />}
                </div>
              </div>

              <h3 className="text-lg font-black text-white italic uppercase tracking-tighter mb-2 group-hover:text-orange-400 transition-colors">
                {ex.title}
              </h3>
              
              <p className="text-[11px] text-slate-400 leading-relaxed mb-4 line-clamp-2">
                {ex.description}
              </p>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[8px] font-black text-orange-500 uppercase tracking-widest">
                    Fokus: {ex.sbbfFocus}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {ex.coachingPoints.slice(0, 2).map((point, i) => (
                    <span key={i} className="text-[8px] font-bold text-slate-600 uppercase">
                      • {point}
                    </span>
                  ))}
                </div>
              </div>

              {!isSelectionMode && (
                <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-between items-center">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedDetailExercise(ex); }}
                    className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1 hover:text-white transition-colors"
                  >
                    <Info size={12} /> Detaljer
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedDetailExercise(ex); }}
                    className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white hover:bg-orange-600 transition-all"
                  >
                    <Play size={12} fill="currentColor" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredExercises.length === 0 && (
        <div className="py-20 text-center space-y-4 border-2 border-dashed border-slate-900 rounded-[3rem]">
          <Search size={48} className="text-slate-800 mx-auto" />
          <p className="text-xs font-black text-slate-600 uppercase tracking-widest">Inga övningar matchar din sökning</p>
        </div>
      )}
      {selectedDetailExercise && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[85vh]">
             <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/40 shrink-0">
                <div className="flex items-center gap-4">
                   <div className={`p-3 rounded-xl border shadow-inner ${getPhaseColor(selectedDetailExercise.phase)}`}>
                      {getPhaseIcon(selectedDetailExercise.phase)}
                   </div>
                   <div>
                      <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">{selectedDetailExercise.title}</h3>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{selectedDetailExercise.phase} • {selectedDetailExercise.duration}</p>
                   </div>
                </div>
                <button onClick={() => setSelectedDetailExercise(null)} className="p-2 text-slate-500 hover:text-white transition-colors bg-slate-800 rounded-full"><Activity size={20} className="rotate-45" /></button>
             </div>
             
             <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                {selectedDetailExercise.videoUrl && (
                  <div className="w-full aspect-video rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl relative group">
                    {getVideoId(selectedDetailExercise.videoUrl) ? (
                      <iframe 
                        src={`https://www.youtube-nocookie.com/embed/${getVideoId(selectedDetailExercise.videoUrl)}?rel=0&modestbranding=1&playsinline=1`}
                        title={selectedDetailExercise.title}
                        className="w-full h-full absolute inset-0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                        <Youtube size={48} className="text-slate-800" />
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Ogiltig videolänk</p>
                        <button 
                          onClick={() => window.open(selectedDetailExercise.videoUrl, '_blank')}
                          className="px-4 py-2 bg-slate-800 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-slate-700 transition-all"
                        >
                          Öppna i ny flik
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {selectedDetailExercise.videoUrl && (
                  <div className="space-y-1">
                    <button 
                      onClick={() => window.open(selectedDetailExercise.videoUrl, '_blank')}
                      className="w-full py-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 rounded-xl transition-all border border-red-500/20"
                    >
                      <Youtube size={14} /> Se på YouTube
                    </button>
                    <a 
                      href={selectedDetailExercise.videoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[8px] text-slate-500 hover:text-orange-500 transition-colors truncate block px-1"
                    >
                      {selectedDetailExercise.videoUrl}
                    </a>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                      <div className="space-y-4">
                         <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Info size={14} /> Beskrivning</h4>
                         <p className="text-sm text-slate-300 leading-relaxed font-medium">{selectedDetailExercise.description}</p>
                      </div>

                      {selectedDetailExercise.setup && (
                         <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Target size={14} className="text-blue-500" /> Organisation</h4>
                            <div className="p-4 rounded-2xl bg-blue-600/5 border border-blue-500/20">
                               <p className="text-xs font-bold text-slate-300 uppercase">{selectedDetailExercise.setup}</p>
                            </div>
                         </div>
                      )}
                   </div>

                   <div className="space-y-6">
                      {selectedDetailExercise.visualSteps && selectedDetailExercise.visualSteps.length > 0 && (
                         <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Activity size={14} className="text-purple-500" /> Steg-för-steg</h4>
                            <div className="space-y-2">
                               {selectedDetailExercise.visualSteps.map((step, i) => (
                                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                                     <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-purple-500 shrink-0 border border-purple-500/20">{i + 1}</div>
                                     <span className="text-xs font-bold text-slate-300 uppercase">{step}</span>
                                  </div>
                               ))}
                            </div>
                         </div>
                      )}
                   </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Coaching Points</h4>
                      <ul className="space-y-2">
                         {selectedDetailExercise.coachingPoints.map((point, i) => (
                            <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                               <span className="text-xs font-bold text-slate-300 uppercase">{point}</span>
                            </li>
                         ))}
                      </ul>
                   </div>
                   
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Target size={14} className="text-orange-500" /> SBBF Fokusområde</h4>
                      <div className="p-6 rounded-[2rem] bg-orange-600/10 border border-orange-500/20 flex flex-col items-center justify-center text-center space-y-2">
                         <Flame size={32} className="text-orange-500 mb-2" />
                         <span className="text-lg font-black text-white italic uppercase">{selectedDetailExercise.sbbfFocus}</span>
                         <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest">Utvecklingsmål</span>
                      </div>
                   </div>
                </div>
             </div>

             <div className="p-6 bg-slate-950/60 border-t border-slate-800 shrink-0 flex justify-end">
                <button onClick={() => setSelectedDetailExercise(null)} className="px-8 py-3 rounded-xl bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest hover:bg-slate-700 transition-all">Stäng</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
