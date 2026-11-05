
import React, { useState, useEffect, useMemo } from 'react';
import { Target, Users, Activity, Star, Zap, ChevronRight, Calendar, Lightbulb, Trophy, Loader2, Dumbbell, TrendingUp, TrendingDown, Timer, Heart, BrainCircuit, ArrowUpRight, ArrowDownRight, Flame, Sparkles, AlertCircle, Play, Plus, Bot, CheckCircle2 } from 'lucide-react';
import { dataService } from '../services/dataService';
import { mockPhases, mockWarmupExercises } from '../services/mockData';
import { Player, TrainingSession, MatchRecord, Exercise, WarmupExercise } from '../types';

interface ChartDataPoint {
  label: string;
  avg: number;
  rawDate?: string;
}

export const Dashboard: React.FC<{ 
  onNavigateToHistory?: () => void,
  onNavigateToWarmup?: () => void,
  onNavigateToMatch?: () => void
}> = ({ onNavigateToHistory, onNavigateToWarmup, onNavigateToMatch }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartTimeRange, setChartTimeRange] = useState<'Vecka' | 'Månad' | 'Säsong'>('Säsong');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isFetchingInsight, setIsFetchingInsight] = useState(false);
  const storageMode = dataService.getStorageMode();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [p, s, m, ph] = await Promise.all([
          dataService.getPlayers(),
          dataService.getSessions(),
          dataService.getMatches(),
          dataService.getUnifiedPhases()
        ]);
        setPlayers(p);
        setSessions(s);
        setMatches(m);
        setAllExercises(ph.flatMap(p => p.exercises));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Fetch AI Insight
  useEffect(() => {
    const fetchInsight = async () => {
      if (players.length === 0 || sessions.length === 0) return;
      
      const savedInsight = sessionStorage.getItem('basketcoach_daily_insight');
      const savedDate = sessionStorage.getItem('basketcoach_daily_insight_date');
      const today = new Date().toISOString().split('T')[0];

      if (savedInsight && savedDate === today) {
        setAiInsight(savedInsight);
        return;
      }

      setIsFetchingInsight(true);
      try {
        const recentMatches = matches.slice(-2).map(m => `${m.score}-${m.opponentScore}`).join(', ');
        const res = await fetch('/api/gemini/insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playersCount: players.length,
            sessionsCount: sessions.length,
            recentMatches,
          }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        const insight = data.insight || "Dags för en ny bra träningsvecka. Fokusera på detaljerna idag!";
        setAiInsight(insight);
        sessionStorage.setItem('basketcoach_daily_insight', insight);
        sessionStorage.setItem('basketcoach_daily_insight_date', today);
      } catch (error) {
        console.error("Failed to fetch AI insight", error);
        setAiInsight("Dags för en ny bra träningsvecka. Fokusera på detaljerna idag!");
      } finally {
        setIsFetchingInsight(false);
      }
    };

    fetchInsight();
  }, [players.length, sessions.length, matches.length]);

  // Calculate Action Items & Hot/Cold Players
  const { actionItems, hotPlayers, coldPlayers } = useMemo(() => {
    const items: { text: string, type: 'warning' | 'info' | 'success', icon: any }[] = [];
    let hot: { player: Player, reason: string }[] = [];
    let cold: { player: Player, reason: string }[] = [];

    if (players.length === 0 || sessions.length === 0) return { actionItems: items, hotPlayers: hot, coldPlayers: cold };

    // 1. Action Items: Match without feedback
    const recentMatch = matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    if (recentMatch && recentMatch.feedbacks.length === 0) {
      items.push({ text: `Utvärdera senaste matchen mot ${recentMatch.opponent}`, type: 'warning', icon: AlertCircle });
    }

    // 2. Action Items & Cold Players: Low attendance
    const recentSessions = sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
    if (recentSessions.length > 0) {
      const attendanceCounts: Record<string, number> = {};
      players.forEach(p => attendanceCounts[p.id] = 0);
      
      recentSessions.forEach(s => {
        s.attendance.forEach(a => {
          if (a.status === 'närvarande' || a.status === 'delvis') {
            if (attendanceCounts[a.playerId] !== undefined) attendanceCounts[a.playerId]++;
          }
        });
      });

      const lowAttendancePlayers = players.filter(p => attendanceCounts[p.id] === 0);
      if (lowAttendancePlayers.length > 0) {
        items.push({ text: `${lowAttendancePlayers.length} spelare har missat de senaste 3 passen`, type: 'warning', icon: Users });
        cold = lowAttendancePlayers.slice(0, 2).map(p => ({ player: p, reason: 'Låg närvaro' }));
      }

      const perfectAttendancePlayers = players.filter(p => attendanceCounts[p.id] === recentSessions.length);
      if (perfectAttendancePlayers.length > 0) {
        hot = perfectAttendancePlayers.slice(0, 2).map(p => ({ player: p, reason: '100% närvaro' }));
      }
    }

    if (items.length === 0) {
      items.push({ text: "Allt ser bra ut! Redo för nästa pass.", type: 'success', icon: CheckCircle2 });
    }

    return { actionItems: items, hotPlayers: hot, coldPlayers: cold };
  }, [players, sessions, matches]);

  const attendanceRate = useMemo(() => dataService.calculateAttendanceRate(sessions), [sessions]);

  const matchStats = useMemo(() => {
    const total = matches.length;
    if (total === 0) return { winRate: 0, wins: 0, losses: 0, draws: 0, streak: '-' };
    const wins = matches.filter(m => m.score > m.opponentScore).length;
    const losses = matches.filter(m => m.score < m.opponentScore).length;
    const draws = total - wins - losses;
    const winRate = Math.round((wins / total) * 100);
    const recent = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    return { winRate, wins, losses, draws, recent };
  }, [matches]);

  // SMART GRUPPERING AV UTVECKLINGSDATA
  const aggregatedTimeline = useMemo(() => {
    const rawTimeline = dataService.getTeamProgressTimeline(sessions);
    if (rawTimeline.length === 0) return [];

    const now = new Date();

    if (chartTimeRange === 'Vecka') {
      // Visa de senaste 7 dagarna med träning
      return rawTimeline.slice(-7).map(d => ({
        label: `${d.date.split('-')[2]}/${d.date.split('-')[1]}`,
        avg: d.avg,
        rawDate: d.date
      }));
    }

    if (chartTimeRange === 'Månad') {
      // Gruppera per vecka för de senaste 30 dagarna
      const cutoff = new Date();
      cutoff.setDate(now.getDate() - 30);
      
      const weeks: Record<string, { sum: number, count: number }> = {};
      
      rawTimeline.forEach(d => {
        const date = new Date(d.date);
        if (date >= cutoff) {
          // Beräkna veckonummer (enkel version)
          const startOfYear = new Date(date.getFullYear(), 0, 1);
          const weekNum = Math.ceil((((date.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
          const key = `V.${weekNum}`;
          if (!weeks[key]) weeks[key] = { sum: 0, count: 0 };
          weeks[key].sum += d.avg;
          weeks[key].count += 1;
        }
      });

      return Object.entries(weeks).map(([label, data]) => ({
        label,
        avg: parseFloat((data.sum / data.count).toFixed(1))
      }));
    }

    if (chartTimeRange === 'Säsong') {
      // Gruppera per månad för hela säsongen
      const months: Record<string, { sum: number, count: number }> = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
      
      rawTimeline.forEach(d => {
        const date = new Date(d.date);
        const key = monthNames[date.getMonth()];
        if (!months[key]) months[key] = { sum: 0, count: 0 };
        months[key].sum += d.avg;
        months[key].count += 1;
      });

      // Sortera månaderna kronologiskt baserat på sista träningen i månaden
      return Object.entries(months).map(([label, data]) => ({
        label,
        avg: parseFloat((data.sum / data.count).toFixed(1))
      }));
    }

    return [];
  }, [sessions, chartTimeRange]);

  const developmentInsights = useMemo(() => {
    if (sessions.length < 2) return { index: '0.0', trend: 0, topCategory: 'Starta träning' };
    const allEvals = sessions.flatMap(s => s.evaluations);
    if (allEvals.length === 0) return { index: '0.0', trend: 0, topCategory: 'Ingen data' };

    const totalScore = allEvals.reduce((acc, ev) => acc + (ev.scores.reduce((a, b) => a + b, 0) / ev.scores.length), 0);
    const avgIndex = (totalScore / allEvals.length).toFixed(1);

    // Enkel trendberäkning (senaste 3 vs tidigare)
    const sorted = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const recent = sorted.slice(-3).flatMap(s => s.evaluations);
    const prev = sorted.slice(0, -3).flatMap(s => s.evaluations);
    let trend = 0;
    if (prev.length > 0 && recent.length > 0) {
        const rAvg = recent.reduce((acc, ev) => acc + (ev.scores.reduce((a,b)=>a+b,0)/ev.scores.length), 0) / recent.length;
        const pAvg = prev.reduce((acc, ev) => acc + (ev.scores.reduce((a,b)=>a+b,0)/ev.scores.length), 0) / prev.length;
        trend = Math.round(((rAvg - pAvg) / pAvg) * 100);
    }

    return { index: avgIndex, trend, topCategory: 'Analys aktiv' };
  }, [sessions]);

  const fysStats = useMemo(() => {
    const fysIds = new Set(mockPhases.flatMap(p => p.exercises).filter(e => e.category === 'Fysik' || e.category === 'Kondition').map(e => e.id));
    let total = 0, fys = 0;
    sessions.forEach(s => s.evaluations.forEach(e => { total++; if (fysIds.has(e.exerciseId)) fys++; }));
    return { count: fys, ratio: total > 0 ? Math.round((fys / total) * 100) : 0 };
  }, [sessions]);

  // Fix: Added missing sisuStats useMemo to calculate aggregate match feedback data
  const sisuStats = useMemo(() => {
    if (matches.length === 0) return null;
    
    const allFeedbacks = matches.flatMap(m => m.feedbacks);
    if (allFeedbacks.length === 0) return null;

    const totalEffort = allFeedbacks.reduce((acc, f) => acc + f.effort, 0);
    const totalTeamwork = allFeedbacks.reduce((acc, f) => acc + f.teamwork, 0);
    const totalLearning = allFeedbacks.reduce((acc, f) => acc + f.learning, 0);
    const count = allFeedbacks.length;

    const sortedMatches = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestSummary = sortedMatches[0]?.teamSummary;

    return {
      effort: (totalEffort / count).toFixed(1),
      teamwork: (totalTeamwork / count).toFixed(1),
      learning: (totalLearning / count).toFixed(1),
      latestSummary
    };
  }, [matches]);

  const stats = [
    { label: 'Närvaro', value: `${attendanceRate}%`, subtext: 'Snitt per pass', icon: Activity, gradient: 'from-emerald-600 to-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10' },
    { label: 'Matchform', value: matches.length > 0 ? `${matchStats.winRate}%` : '-', subtext: `${matchStats.wins}V - ${matchStats.losses}F`, icon: Trophy, gradient: 'from-yellow-500 to-orange-500', border: 'border-yellow-500/20', bg: 'bg-yellow-500/10' },
    { label: 'Fys-volym', value: `${fysStats.count} st`, subtext: `${fysStats.ratio}% av fokus`, icon: Dumbbell, gradient: 'from-blue-600 to-cyan-400', border: 'border-blue-500/20', bg: 'bg-blue-500/10' },
    { label: 'Utvecklingsindex', value: developmentInsights.index, subtext: 'Genomsnittlig nivå', trend: developmentInsights.trend, icon: TrendingUp, gradient: 'from-purple-600 to-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-500/10' },
  ];

  if (loading) return <div className="h-full w-full flex flex-col items-center justify-center space-y-4"><Loader2 className="w-12 h-12 text-orange-500 animate-spin" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Laddar statistik...</p></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-in pb-24">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-slate-900 border border-slate-800">
            <div className={`w-2 h-2 rounded-full ${storageMode === 'CLOUD' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-amber-500'}`}></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{storageMode === 'CLOUD' ? 'Moln-läge' : 'Lokal lagring'}</span>
         </div>
         <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Säsongens Överblick</div>
      </div>

      {/* Quick Actions & AI Insight */}
      <div className="grid lg:grid-cols-12 gap-4 md:gap-6">
        <div className="lg:col-span-8 min-w-0">
            <div className="p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 shadow-xl relative overflow-hidden h-full flex flex-col justify-center min-w-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="relative z-10 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                        {isFetchingInsight ? <Loader2 className="text-indigo-400 animate-spin" size={24} /> : <Bot className="text-indigo-400" size={24} />}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Sparkles size={14} /> Dagens AI-Insikt
                        </h3>
                        <p className="text-sm md:text-base text-slate-300 leading-relaxed italic break-words">
                            {isFetchingInsight ? "Analyserar truppens senaste data..." : aiInsight}
                        </p>
                    </div>
                </div>
            </div>
        </div>
        <div className="lg:col-span-4 grid grid-cols-2 gap-4">
            <button onClick={() => onNavigateToHistory?.()} className="p-4 rounded-3xl bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/20 transition-all flex flex-col items-center justify-center gap-3 group">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform"><Play size={20} fill="currentColor" /></div>
                <span className="text-[10px] font-black uppercase tracking-widest">Starta Pass</span>
            </button>
            <button onClick={() => onNavigateToMatch?.()} className="p-4 rounded-3xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all flex flex-col items-center justify-center gap-3 group">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform"><Plus size={20} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest">Ny Match</span>
            </button>
        </div>
      </div>

      {/* Action Items & Hot/Cold */}
      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-md min-w-0">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <AlertCircle size={14} /> Att Göra
              </h3>
              <div className="space-y-3">
                  {actionItems.map((item, i) => (
                      <div key={i} className={`p-3 rounded-2xl border flex items-start gap-3 ${
                          item.type === 'warning' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                          item.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                          'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      }`}>
                          <item.icon size={16} className="shrink-0 mt-0.5" />
                          <span className="text-xs font-medium leading-snug">{item.text}</span>
                      </div>
                  ))}
              </div>
          </div>
          
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-md min-w-0">
                  <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <TrendingUp size={14} /> Stekheta
                  </h3>
                  {hotPlayers.length > 0 ? (
                      <div className="space-y-3">
                          {hotPlayers.map((h, i) => (
                              <div key={i} className="flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-800/50 transition-colors">
                                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 font-black text-xs shrink-0">
                                      {h.player.number}
                                  </div>
                                  <div className="min-w-0">
                                      <div className="text-sm font-bold text-white truncate">{h.player.name}</div>
                                      <div className="text-[10px] text-emerald-400 uppercase tracking-widest truncate">{h.reason}</div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <p className="text-xs text-slate-500 italic">Behöver mer data för att se trender.</p>
                  )}
              </div>
              <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-md min-w-0">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <TrendingDown size={14} /> Behöver Stöd
                  </h3>
                  {coldPlayers.length > 0 ? (
                      <div className="space-y-3">
                          {coldPlayers.map((c, i) => (
                              <div key={i} className="flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-800/50 transition-colors">
                                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-black text-xs shrink-0">
                                      {c.player.number}
                                  </div>
                                  <div className="min-w-0">
                                      <div className="text-sm font-bold text-white truncate">{c.player.name}</div>
                                      <div className="text-[10px] text-slate-500 uppercase tracking-widest truncate">{c.reason}</div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <p className="text-xs text-slate-500 italic">Inga spelare flaggade just nu.</p>
                  )}
              </div>
          </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {stats.map((s, i) => (
          <div key={i} className={`p-4 md:p-6 rounded-3xl border ${s.border} ${s.bg} backdrop-blur-sm relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 min-w-0`}>
            <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-300 opacity-80">{s.label}</span>
                {s.trend !== undefined && s.trend !== 0 && (
                    <div className={`flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full ${s.trend > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {s.trend > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {Math.abs(s.trend)}%
                    </div>
                )}
                <s.icon className="w-4 h-4 md:w-5 md:h-5 text-white opacity-60 shrink-0" />
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                    <div className="text-2xl md:text-5xl font-black text-white tracking-tighter truncate">{s.value}</div>
                    {s.label === 'Utvecklingsindex' && <span className="text-xs text-slate-500 font-bold">/5</span>}
                </div>
                <div className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-wide truncate">{s.subtext}</div>
              </div>
            </div>
            <div className={`absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br ${s.gradient} rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity`}></div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-6 md:gap-8">
        <div className="lg:col-span-8 space-y-4 sm:space-y-6 min-w-0">
          <div className="p-4 sm:p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] bg-slate-900/50 border border-slate-800 backdrop-blur-md relative overflow-hidden min-w-0">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-10 gap-4 relative z-10">
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tighter">Utvecklingskurva</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {chartTimeRange === 'Vecka' ? 'Dagsform senaste passen' : chartTimeRange === 'Månad' ? 'Veckosnitt senaste 30 dagarna' : 'Månadssnitt över säsongen'}
                  </p>
                </div>
                <div className="flex gap-2">
                   {(['Vecka', 'Månad', 'Säsong'] as const).map(t => (
                      <button key={t} onClick={() => setChartTimeRange(t)} className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${chartTimeRange === t ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}>{t}</button>
                   ))}
                </div>
             </div>
             <div className="relative h-64 flex items-end justify-between gap-1 md:gap-4 px-2 overflow-x-auto custom-scrollbar-horizontal w-full pb-2">
               {aggregatedTimeline.length > 0 ? aggregatedTimeline.map((item, i) => {
                 const height = (item.avg / 5) * 100;
                 return (
                   <div key={i} className="relative flex-1 min-w-[16px] md:min-w-[40px] max-w-[60px] group flex flex-col items-center gap-2 h-full justify-end">
                     <div className="w-full bg-slate-800/30 rounded-t-xl h-full absolute bottom-0 z-0"></div>
                     <div 
                        className="w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-xl transition-all duration-700 shadow-[0_0_20px_rgba(249,115,22,0.2)] relative z-10 hover:brightness-125" 
                        style={{ height: `${height}%` }}
                     >
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-black px-2 py-1.5 rounded-lg border border-slate-700 pointer-events-none z-50 whitespace-nowrap shadow-xl">
                            {item.avg} / 5
                        </div>
                     </div>
                     <div className="text-[8px] md:text-[10px] font-black text-slate-600 uppercase h-4 truncate w-full text-center tracking-tighter">
                        {item.label}
                     </div>
                   </div>
                 );
               }) : (
                 <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
                    <TrendingUp className="opacity-20" size={32} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Vänta på nästa träningspass...</span>
                 </div>
               )}
             </div>
          </div>
          
          {/* Season Roadmap */}
          <div className="p-4 sm:p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] bg-slate-900/50 border border-slate-800 backdrop-blur-md relative overflow-hidden min-w-0">
             <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2"><Trophy size={16} className="text-orange-500" /> Season Roadmap</h4>
                <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-950 px-3 py-1 rounded-full border border-slate-800">Fas {sessions.length > 0 ? sessions[0].phaseId : 1} av 8</span>
             </div>
             <div className="relative pt-4">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -translate-y-1/2 rounded-full"></div>
                <div className="flex items-center justify-between mb-2 sm:hidden">
                   <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Säsongens framsteg</span>
                   <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Svep →</span>
                </div>
                <div className="flex relative z-10 overflow-x-auto pb-4 custom-scrollbar-horizontal w-full gap-4 snap-x">
                   {mockPhases.map((phase) => (
                      <div key={phase.id} className="flex flex-col items-center gap-2 md:gap-3 min-w-[40px] md:min-w-[60px] snap-center">
                          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black text-xs transition-all border-4 ${phase.id === (sessions.length > 0 ? sessions[0].phaseId : 1) ? 'bg-orange-500 border-slate-900 text-white scale-110 shadow-[0_0_15px_rgba(249,115,22,0.4)]' : phase.id < (sessions.length > 0 ? sessions[0].phaseId : 1) ? 'bg-emerald-500 border-slate-900 text-slate-900' : 'bg-slate-800 border-slate-900 text-slate-600'}`}>
                              {phase.id}
                          </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </div>

        {/* Sidebar Insights */}
        <div className="lg:col-span-4 space-y-4 sm:space-y-6 min-w-0">
          <div className="p-5 sm:p-8 rounded-3xl md:rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden min-w-0">
             <div className="absolute top-0 right-0 w-40 h-40 bg-orange-600/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
             <h3 className="text-sm font-black italic uppercase tracking-tighter flex items-center gap-2 text-white mb-6 relative z-10"><Flame className="text-orange-500" size={18} /> Dagens Uppvärmning</h3>
             <div className="space-y-4 relative z-10">
                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
                    <div className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">{mockWarmupExercises[0].phase}</div>
                    <h4 className="text-sm font-black text-white uppercase italic">{mockWarmupExercises[0].title}</h4>
                    <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">{mockWarmupExercises[0].description}</p>
                    <div className="mt-3 flex items-center gap-2">
                        <div className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[8px] font-black text-slate-500 uppercase">Fokus: {mockWarmupExercises[0].sbbfFocus}</div>
                    </div>
                </div>
                <button 
                    onClick={() => onNavigateToWarmup?.()}
                    className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
                >
                    Visa i arkivet <ChevronRight size={14} />
                </button>
             </div>
          </div>

          <div className="p-5 sm:p-8 rounded-3xl md:rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden min-w-0">
             <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
             <h3 className="text-sm font-black italic uppercase tracking-tighter flex items-center gap-2 text-white mb-6 relative z-10"><Trophy className="text-indigo-400" size={18} /> Match Intelligence</h3>
             {sisuStats ? (
                <div className="space-y-6 relative z-10">
                   <div className="space-y-4">
                      <div className="space-y-1">
                         <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400"><span><Zap size={10} className="text-yellow-500 inline mr-1" /> Ansträngning</span><span className="text-white">{sisuStats.effort}/5</span></div>
                         <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]" style={{ width: `${(parseFloat(sisuStats.effort)/5)*100}%` }}></div></div>
                      </div>
                      <div className="space-y-1">
                         <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400"><span><Heart size={10} className="text-rose-500 inline mr-1" /> Laganda</span><span className="text-white">{sisuStats.teamwork}/5</span></div>
                         <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" style={{ width: `${(parseFloat(sisuStats.teamwork)/5)*100}%` }}></div></div>
                      </div>
                      <div className="space-y-1">
                         <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400"><span><Target size={10} className="text-emerald-500 inline mr-1" /> Lärande</span><span className="text-white">{sisuStats.learning}/5</span></div>
                         <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" style={{ width: `${(parseFloat(sisuStats.learning)/5)*100}%` }}></div></div>
                      </div>
                   </div>
                   {sisuStats.latestSummary && (
                       <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
                           <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Lightbulb size={10} /> Senaste Lärdom</div>
                           <p className="text-xs text-slate-300 leading-relaxed italic line-clamp-3">"{sisuStats.latestSummary}"</p>
                       </div>
                   )}
                   <button 
                        onClick={() => onNavigateToMatch?.()}
                        className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
                    >
                        Visa alla matcher <ChevronRight size={14} />
                    </button>
                </div>
             ) : (
                <div className="py-12 text-center space-y-2 opacity-30">
                    <Trophy className="mx-auto text-slate-700" size={32} />
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Ingen matchdata än.</p>
                </div>
             )}
          </div>

          <div className="p-4 sm:p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] bg-slate-900/50 border border-slate-800 backdrop-blur-md min-w-0">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-sm font-black italic uppercase tracking-tighter flex items-center gap-2 text-white">
                    <Calendar className="text-slate-400" size={18} /> Senaste Aktivitet
                </h3>
            </div>
            <div className="space-y-3">
              {[...sessions.map(s => ({ type: 'session', date: s.date, data: s })), ...matches.map(m => ({ type: 'match', date: m.date, data: m }))]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 4).map((item, i) => {
                 if (item.type === 'session') {
                    const s = item.data as TrainingSession;
                    return (
                        <div key={`s-${s.id}`} onClick={() => onNavigateToHistory?.()} className="p-3 md:p-4 rounded-2xl bg-slate-950/50 border border-slate-800/50 flex justify-between items-center group cursor-pointer hover:border-slate-600 hover:bg-slate-800 transition-all">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:border-orange-500 transition-colors shrink-0">
                                    <span className="text-xs font-black text-white">{s.date.split('-')[2]}</span>
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[10px] font-black text-slate-300 uppercase group-hover:text-white truncate">Fas {s.phaseId} Pass</div>
                                    <div className="text-[9px] text-slate-600 font-bold uppercase truncate">{s.evaluations.length} bedömningar</div>
                                </div>
                            </div>
                            <ChevronRight size={14} className="text-slate-700 group-hover:text-white transition-all shrink-0" />
                        </div>
                    );
                 } else {
                    const m = item.data as MatchRecord;
                    const isWin = m.score > m.opponentScore;
                    return (
                        <div key={`m-${m.id}`} onClick={() => onNavigateToMatch?.()} className="p-3 md:p-4 rounded-2xl bg-slate-950/50 border border-slate-800/50 flex justify-between items-center group cursor-pointer hover:border-slate-600 hover:bg-slate-800 transition-all">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${isWin ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                                    <Trophy size={14} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[10px] font-black text-slate-300 uppercase group-hover:text-white truncate">Match vs {m.opponent}</div>
                                    <div className="text-[9px] text-slate-600 font-bold uppercase truncate">{m.score} - {m.opponentScore}</div>
                                </div>
                            </div>
                            <ChevronRight size={14} className="text-slate-700 group-hover:text-white transition-all shrink-0" />
                        </div>
                    );
                 }
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
