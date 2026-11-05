
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, AlertCircle, Trash2, Database, TrendingUp, Users, Trophy } from 'lucide-react';
import { dataService } from '../services/dataService';
import { Player, TrainingSession, MatchRecord } from '../types';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export const AICoach: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('basketcoach_ai_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Team context state
  const [teamData, setTeamData] = useState<{
    players: Player[];
    sessions: TrainingSession[];
    matches: MatchRecord[];
  } | null>(null);

  useEffect(() => {
    localStorage.setItem('basketcoach_ai_messages', JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Load team data for context
  useEffect(() => {
    const loadContext = async () => {
      try {
        const [p, s, m] = await Promise.all([
          dataService.getPlayers(),
          dataService.getSessions(),
          dataService.getMatches()
        ]);
        setTeamData({ players: p, sessions: s, matches: m });
      } catch (err) {
        console.error("Failed to load team context for AI", err);
      }
    };
    loadContext();
  }, []);

  const generateContextString = () => {
    if (!teamData) return "Ingen lagdata tillgänglig för tillfället.";

    const { players, sessions, matches } = teamData;
    
    let context = `LAGKONTEXT:\n`;
    context += `- Antal spelare: ${players.length}\n`;
    context += `- Genomförda träningar: ${sessions.length}\n`;
    context += `- Spelade matcher: ${matches.length}\n\n`;

    // Beräkna närvaro
    if (sessions.length > 0) {
      const totalPossible = sessions.length * players.length;
      let totalAttended = 0;
      sessions.forEach(s => {
        totalAttended += s.attendance.filter(a => a.status === 'närvarande' || a.status === 'delvis').length;
      });
      const attendanceRate = ((totalAttended / totalPossible) * 100).toFixed(1);
      context += `STATISTIK:\n`;
      context += `- Genomsnittlig närvaro: ${attendanceRate}%\n`;
      
      // Hitta spelare med låg närvaro (under 50%)
      const lowAttendancePlayers = players.filter(p => {
        const attended = sessions.filter(s => s.attendance.find(a => a.playerId === p.id && (a.status === 'närvarande' || a.status === 'delvis'))).length;
        return (attended / sessions.length) < 0.5;
      });
      if (lowAttendancePlayers.length > 0) {
        context += `- Spelare med låg närvaro: ${lowAttendancePlayers.map(p => p.name).join(', ')}\n`;
      }
      context += `\n`;
    }

    // Matchanalys
    if (matches.length > 0) {
      context += `SENASTE MATCHER:\n`;
      matches.slice(0, 3).forEach(m => {
        context += `- vs ${m.opponent}: ${m.score}-${m.opponentScore} (${m.score > m.opponentScore ? 'Vinst' : 'Förlust'})\n`;
        if (m.teamSummary) context += `  Summering: ${m.teamSummary}\n`;
      });
      
      // Aggregera feedback
      const allFeedback = matches.flatMap(m => m.feedbacks);
      if (allFeedback.length > 0) {
        const avgEffort = (allFeedback.reduce((acc, f) => acc + f.effort, 0) / allFeedback.length).toFixed(1);
        const avgTeamwork = (allFeedback.reduce((acc, f) => acc + f.teamwork, 0) / allFeedback.length).toFixed(1);
        context += `- Genomsnittlig insats (1-5): ${avgEffort}\n`;
        context += `- Genomsnittligt lagarbete (1-5): ${avgTeamwork}\n`;
      }
      context += `\n`;
    }

    // Spelarutveckling
    const playersWithAssessments = players.filter(p => p.skillAssessment && Object.keys(p.skillAssessment).length > 0);
    if (playersWithAssessments.length > 0) {
      context += `SPELARFOKUS:\n`;
      // Hitta lägsta snitt-skills för laget
      const skillSums: Record<string, number> = {};
      const skillCounts: Record<string, number> = {};
      playersWithAssessments.forEach(p => {
        Object.entries(p.skillAssessment!).forEach(([skill, val]) => {
          skillSums[skill] = (skillSums[skill] || 0) + val;
          skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
      });
      
      const avgSkills = Object.entries(skillSums).map(([skill, sum]) => ({
        skill,
        avg: sum / skillCounts[skill]
      })).sort((a, b) => a.avg - b.avg);
      
      if (avgSkills.length > 0) {
        context += `- Lagets svagaste områden: ${avgSkills.slice(0, 2).map(s => `${s.skill} (${s.avg.toFixed(1)})`).join(', ')}\n`;
        context += `- Lagets starkaste områden: ${avgSkills.slice(-2).reverse().map(s => `${s.skill} (${s.avg.toFixed(1)})`).join(', ')}\n`;
      }
    }

    return context;
  };

  const handleSend = async (e?: React.FormEvent, overrideInput?: string) => {
    e?.preventDefault();
    const messageText = overrideInput || input;
    if (!messageText.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setIsAnalyzing(true);

    try {
      const contextString = generateContextString();
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          contextString,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: data.text || "Jag kunde inte generera ett svar just nu.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Ett fel uppstod. Kontrollera din anslutning eller API-nyckel.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setIsAnalyzing(false);
    }
  };

  const clearChat = () => {
      setMessages([]);
  };

  const suggestedQuestions = [
    { text: "Analysera vårt senaste matchresultat", icon: Trophy },
    { text: "Föreslå nästa träningspass baserat på vår form", icon: TrendingUp },
    { text: "Hur kan vi förbättra närvaron i laget?", icon: Users },
    { text: "Ge mig en övning för knäkontroll", icon: Sparkles }
  ];

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col pb-2 sm:pb-6">
      <div className="flex items-center justify-between mb-2 sm:mb-4 px-2">
        <div>
          <h3 className="text-lg sm:text-xl md:text-3xl font-black italic uppercase tracking-tighter flex items-center gap-2 text-white">
            <Bot className="text-blue-500 w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" /> 
            AI Assistent 
            <span className="text-[8px] sm:text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full ml-1 sm:ml-2 normal-case font-bold tracking-normal">Kontext-medveten</span>
          </h3>
          <p className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 sm:mt-1">Din virtuella assisterande coach</p>
        </div>
        <button 
            onClick={clearChat}
            className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
            title="Rensa chatt"
        >
            <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
        </button>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-[2rem] overflow-hidden flex flex-col shadow-2xl relative">
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 custom-scrollbar relative z-10">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-4 sm:p-8 min-h-full">
              <div className="w-14 h-14 sm:w-20 sm:h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-inner border border-white/5">
                <Sparkles size={28} className="text-blue-500 animate-pulse sm:w-10 sm:h-10" />
              </div>
              <h4 className="text-lg sm:text-xl font-black text-white uppercase italic mb-1 sm:mb-2">Hur kan jag hjälpa laget idag?</h4>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-6 sm:mb-8">
                Jag har analyserat er lagstatistik och är redo att ge specifika råd.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full max-w-lg">
                  {suggestedQuestions.map((q, i) => (
                    <button 
                      key={i}
                      type="button"
                      onClick={() => handleSend(undefined, q.text)}
                      className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950 border border-slate-800 text-[9px] sm:text-[10px] font-black uppercase text-slate-400 hover:border-blue-500 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-2 sm:gap-3 text-left group"
                    >
                      <div className="p-1.5 sm:p-2 rounded-lg bg-slate-900 group-hover:bg-blue-600 transition-colors shrink-0">
                        <q.icon size={12} className="text-blue-500 group-hover:text-white sm:w-3.5 sm:h-3.5" />
                      </div>
                      <span className="truncate sm:whitespace-normal">{q.text}</span>
                    </button>
                  ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 sm:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in`}>
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg ${msg.role === 'user' ? 'bg-orange-600' : 'bg-blue-600'}`}>
                    {msg.role === 'user' ? <User size={14} className="text-white sm:w-4 sm:h-4" /> : <Bot size={14} className="text-white sm:w-4 sm:h-4" />}
                  </div>
                  <div className={`max-w-[90%] sm:max-w-[85%] p-3 sm:p-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-xl ${msg.role === 'user' ? 'bg-slate-800 text-slate-200 rounded-tr-none border border-white/5' : 'bg-blue-600/10 border border-blue-500/20 text-slate-200 rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 sm:gap-4 animate-in">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-lg">
                        <Loader2 size={14} className="text-white animate-spin sm:w-4 sm:h-4" />
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-blue-600/10 border border-blue-500/20 rounded-tl-none flex flex-col gap-1.5 sm:gap-2 min-w-[120px] sm:min-w-[150px]">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[10px] font-black text-blue-400 uppercase tracking-widest mb-0.5 sm:mb-1">
                          <Database size={10} className="animate-pulse sm:w-3 sm:h-3" /> Analyserar lagdata...
                        </div>
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full animate-bounce delay-100"></span>
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full animate-bounce delay-200"></span>
                        </div>
                    </div>
                </div>
              )}
            </>
          )}
          <div ref={scrollRef} />
        </div>

        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 relative z-20">
          <form onSubmit={handleSend} className="relative flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Fråga om laget..."
              className="w-full bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 rounded-xl py-3 sm:py-4 pl-4 pr-10 sm:pr-12 text-xs sm:text-sm focus:border-blue-500 outline-none transition-all shadow-inner"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-1.5 sm:right-2 p-2 sm:p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-slate-800 text-white rounded-lg transition-all shadow-lg active:scale-95"
            >
              <Send size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </form>
          <div className="mt-2 flex items-center justify-center gap-3 sm:gap-4">
             <div className="flex items-center gap-1 sm:gap-1.5">
                <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${teamData ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
                <span className="text-[7px] sm:text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Lagdata synkad</span>
             </div>
             <div className="flex items-center gap-1 sm:gap-1.5">
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-blue-500"></div>
                <span className="text-[7px] sm:text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Gemini 3 Flash</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
