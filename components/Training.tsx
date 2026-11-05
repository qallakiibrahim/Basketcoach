
import React, { useState, useMemo, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { 
  Play, Pause, RotateCcw, X, ChevronRight, Save, Check, Trophy, Loader2, 
  Dumbbell, Layout, ChevronLeft, UserCheck, Activity, BrainCircuit, 
  Target, Zap, MessageSquare, Mic, Eye, Shield, Flame, Timer, Star, 
  ArrowUpCircle, Scaling, Trash2, Info, CheckCircle2, Youtube, Search, Video, Lightbulb,
  Calendar, Clock, Copy, Edit3, Sparkles, Plus, AlertCircle
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
import { Exercise, Player, Evaluation, Phase, TrainingSession, PlannedSession, WarmupExercise } from '../types';
import { mockWarmupExercises } from '../services/mockData';
import { WarmupLibrary } from './WarmupLibrary';

type TrainingStep = 'selection' | 'planning' | 'checkin' | 'live';

interface PlaylistItem {
  id: string;
  title: string;
  duration: number; // seconds
  type: 'warmup' | 'main';
  exercise: Exercise | WarmupExercise;
}

const SBBF_CRITERIA = [
  { label: 'Spelförståelse', icon: BrainCircuit, desc: 'Beslut & Speluppfattning' },
  { label: 'Teknik', icon: Target, desc: 'Fundamentals & Utförande' },
  { label: 'Fysik', icon: Zap, desc: 'Rörelse & Styrka' },
  { label: 'Attityd', icon: Flame, desc: 'Kämparanda & Inställning' },
  { label: 'Samarbete', icon: Mic, desc: 'Kommunikation & Lagspel' }
];

const NBA_CRITERIA = [
  { label: 'Scoring', icon: Target, desc: 'Avslut & Skytte' },
  { label: 'Playmaking', icon: BrainCircuit, desc: 'Skapa för andra' },
  { label: 'Defense', icon: Shield, desc: 'Stopp & Positionering' },
  { label: 'Athleticism', icon: Zap, desc: 'Explosivitet & Snabbhet' },
  { label: 'Hustle', icon: Flame, desc: 'Returer & Lösa bollar' }
];

const COMBO_CRITERIA = [
  { label: 'Skill & Teknik', icon: Target, desc: 'Bollbehandling & Avslut' },
  { label: 'IQ & Beslut', icon: BrainCircuit, desc: 'Spelförståelse' },
  { label: 'Fysik & Motorik', icon: Zap, desc: 'Atletism & Rörelse' },
  { label: 'Försvar & Effort', icon: Shield, desc: 'Intensitet & Stopp' },
  { label: 'Ledarskap', icon: Mic, desc: 'Kommunikation & Påverkan' }
];

const FYS_CRITERIA = [
  { label: 'Hållning', icon: Shield, desc: 'Form & säkerhet' },
  { label: 'Kraft', icon: Zap, desc: 'Explosivitet & push' },
  { label: 'Uthållighet', icon: Timer, desc: 'Rytm & energi' },
  { label: 'Stabilitet', icon: Scaling, desc: 'Balans & kontroll' },
  { label: 'Vilja', icon: ArrowUpCircle, desc: 'Mental inställning' }
];

export const Training: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'sessions' | 'active'>('upcoming');
  const [step, setStep] = useState<TrainingStep>('selection');
  const [phases, setPhases] = useState<Phase[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number>(0);
  const [gradingPlayer, setGradingPlayer] = useState<Player | null>(null);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [viewMode, setViewMode] = useState<'basket' | 'fys'>('basket');
  const [gradingFramework, setGradingFramework] = useState<'SBBF' | 'NBA' | 'COMBO'>('SBBF');
  const [timer, setTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>("Träningspass Sparat!");
  const [isSaving, setIsSaving] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<Record<string, 'närvarande' | 'delvis' | 'frånvarande'>>({});
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [allSessions, setAllSessions] = useState<TrainingSession[]>([]);
  const [plannedSessions, setPlannedSessions] = useState<PlannedSession[]>([]);
  const [activePlannedSessionId, setActivePlannedSessionId] = useState<string | null>(null);
  
  // Plan/Edit Session Form State
  const [sessionDate, setSessionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [sessionStartTime, setSessionStartTime] = useState<string>("18:00");
  const [sessionTheme, setSessionTheme] = useState<string>("");
  const [editingPlannedSessionId, setEditingPlannedSessionId] = useState<string | null>(null);
  const [isAiSuggesting, setIsAiSuggesting] = useState<boolean>(false);
  const [aiRationale, setAiRationale] = useState<string | null>(null);

  const [selectedWarmupIds, setSelectedWarmupIds] = useState<string[]>([]);
  const [showWarmupLibrary, setShowWarmupLibrary] = useState(false);
  const [timerMode, setTimerMode] = useState<'stopwatch' | 'countdown'>('stopwatch');
  const [countdownTime, setCountdownTime] = useState(600);
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [newExerciseTime, setNewExerciseTime] = useState(10);
  const [newExerciseSelection, setNewExerciseSelection] = useState<Exercise | WarmupExercise | null>(null);
  const [addExerciseSearch, setAddExerciseSearch] = useState("");
  const [addExerciseTab, setAddExerciseTab] = useState<'basket' | 'fys' | 'warmup'>('basket');

  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [activePlaylistItemIndex, setActivePlaylistItemIndex] = useState(0);

  const [currentScores, setCurrentScores] = useState<number[]>([]);
  const [currentNote, setCurrentNote] = useState<string>("");

  const handleStartPlanning = () => {
    const newPlaylist: PlaylistItem[] = [];
    
    // Add warmups
    selectedWarmupIds.forEach(id => {
        const warmup = mockWarmupExercises.find(w => w.id === id);
        if (warmup) {
            newPlaylist.push({
                id: warmup.id,
                title: warmup.title,
                duration: parseInt(warmup.duration) * 60 || 300,
                type: 'warmup',
                exercise: warmup
            });
        }
    });
    
    // Add main exercises
    selectedExercises.forEach(ex => {
        newPlaylist.push({
            id: ex.id,
            title: ex.title,
            duration: parseInt(ex.duration || '10') * 60 || 600,
            type: 'main',
            exercise: ex
        });
    });
    
    setPlaylist(newPlaylist);
    setStep('planning');
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, s, ph, pl] = await Promise.all([
        dataService.getPlayers(),
        dataService.getSessions(),
        dataService.getUnifiedPhases(),
        dataService.getPlannedSessions()
      ]);
      setPlayers(p);
      setAllSessions(s);
      setPhases(ph);
      setPlannedSessions(pl);
      if (ph.length > 0 && !selectedPhase) setSelectedPhase(ph[0]);
      
      const initialAttendance: any = {};
      p.forEach(player => initialAttendance[player.id] = 'närvarande');
      setAttendance(initialAttendance);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [activeTab]);

  useEffect(() => {
    let interval: number;
    if (step === 'live' && !isPaused) {
      interval = window.setInterval(() => {
        if (timerMode === 'stopwatch') {
          setTimer(t => t + 1);
        } else {
          setCountdownTime(t => {
            if (t <= 1) {
              setIsPaused(true);
              return 0;
            }
            return t - 1;
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, isPaused, timerMode]);

  const activeCriteria = viewMode === 'basket' 
    ? (gradingFramework === 'SBBF' ? SBBF_CRITERIA : gradingFramework === 'NBA' ? NBA_CRITERIA : COMBO_CRITERIA) 
    : FYS_CRITERIA;

  const handleStartGradingPlayer = (p: Player) => {
    if(playlist.length === 0) return;
    const currentItem = playlist[activePlaylistItemIndex];
    setGradingPlayer(p);
    const existing = evaluations.find(e => e.playerId === p.id && e.exerciseId === currentItem.id);
    if (existing) {
      setCurrentScores([...existing.scores]);
      setCurrentNote(existing.note || "");
    } else {
      setCurrentScores(new Array(5).fill(3));
      setCurrentNote("");
    }
  };

  const savePlayerEvaluation = () => {
    if (!gradingPlayer || playlist.length === 0) return;
    const currentItem = playlist[activePlaylistItemIndex];
    const newEval: Evaluation = { 
        playerId: gradingPlayer.id, 
        exerciseId: currentItem.id, 
        scores: currentScores, 
        note: currentNote, 
        timestamp: new Date().toISOString() 
    };
    setEvaluations(prev => [...prev.filter(e => !(e.playerId === gradingPlayer.id && e.exerciseId === currentItem.id)), newEval]);
    setGradingPlayer(null);
  };

  const handleSavePlannedSession = async () => {
    if (!selectedPhase || (selectedExercises.length === 0 && selectedWarmupIds.length === 0)) {
      alert("Välj minst en övning innan du sparar passet.");
      return;
    }
    setIsSaving(true);
    try {
      const durationsMap: Record<string, number> = {};
      playlist.forEach(item => {
        durationsMap[item.id] = Math.round(item.duration / 60);
      });

      if (editingPlannedSessionId) {
        await dataService.updatePlannedSession(editingPlannedSessionId, {
          date: sessionDate,
          startTime: sessionStartTime,
          theme: sessionTheme.trim() || undefined,
          phaseId: selectedPhase.id,
          warmupExerciseIds: selectedWarmupIds,
          exerciseIds: selectedExercises.map(e => e.id),
          exerciseDurations: durationsMap
        });
        setSaveSuccessMessage("Planerat pass uppdaterat!");
      } else {
        await dataService.savePlannedSession({
          date: sessionDate,
          startTime: sessionStartTime,
          theme: sessionTheme.trim() || undefined,
          phaseId: selectedPhase.id,
          warmupExerciseIds: selectedWarmupIds,
          exerciseIds: selectedExercises.map(e => e.id),
          exerciseDurations: durationsMap,
          status: 'planned'
        });
        setSaveSuccessMessage("Planerat pass sparat!");
      }

      setShowSaveSuccess(true);
      const updated = await dataService.getPlannedSessions();
      setPlannedSessions(updated);

      setTimeout(() => {
        setShowSaveSuccess(false);
        setEditingPlannedSessionId(null);
        setStep('selection');
        setSelectedExercises([]);
        setSelectedWarmupIds([]);
        setPlaylist([]);
        setSessionTheme("");
        setAiRationale(null);
        setActiveTab('upcoming');
      }, 1200);
    } catch (err: any) {
      console.error("Kunde inte spara planerat pass:", err);
      alert("Kunde inte spara passet: " + (err.message || 'Okänt fel'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartPlannedSession = (planned: PlannedSession) => {
    // 1. Set Phase
    const ph = phases.find(p => p.id === planned.phaseId) || phases[0];
    if (ph) setSelectedPhase(ph);

    // 2. Resolve Warmups
    const warmups = (planned.warmupExerciseIds || []).map(id => mockWarmupExercises.find(w => w.id === id)).filter(Boolean) as WarmupExercise[];
    setSelectedWarmupIds(planned.warmupExerciseIds || []);

    // 3. Resolve Main Exercises
    const allEx = phases.flatMap(p => p.exercises);
    const mainExercises = (planned.exerciseIds || []).map(id => allEx.find(e => e.id === id)).filter(Boolean) as Exercise[];
    setSelectedExercises(mainExercises);

    // 4. Build Playlist with saved durations if present
    const newPlaylist: PlaylistItem[] = [];
    warmups.forEach(w => {
      const durMinutes = planned.exerciseDurations?.[w.id] || (parseInt(w.duration) || 5);
      newPlaylist.push({
        id: w.id,
        title: w.title,
        duration: durMinutes * 60,
        type: 'warmup',
        exercise: w
      });
    });

    mainExercises.forEach(ex => {
      const durMinutes = planned.exerciseDurations?.[ex.id] || (parseInt(ex.duration || '10') || 10);
      newPlaylist.push({
        id: ex.id,
        title: ex.title,
        duration: durMinutes * 60,
        type: 'main',
        exercise: ex
      });
    });

    setPlaylist(newPlaylist);
    setSessionTheme(planned.theme || "");
    setActivePlannedSessionId(planned.id);
    setActivePlaylistItemIndex(0);
    setTimer(0);
    setIsPaused(true);
    setEvaluations([]);

    // Open directly in planning / ready to start
    setStep('planning');
    setActiveTab('active');
  };

  const handleEditPlannedSession = (planned: PlannedSession) => {
    const ph = phases.find(p => p.id === planned.phaseId) || phases[0];
    if (ph) setSelectedPhase(ph);

    setSessionDate(planned.date);
    setSessionStartTime(planned.startTime || "18:00");
    setSessionTheme(planned.theme || "");
    setEditingPlannedSessionId(planned.id);
    setSelectedWarmupIds(planned.warmupExerciseIds || []);

    const allEx = phases.flatMap(p => p.exercises);
    const mainExercises = (planned.exerciseIds || []).map(id => allEx.find(e => e.id === id)).filter(Boolean) as Exercise[];
    setSelectedExercises(mainExercises);

    setStep('selection');
    setActiveTab('active');
  };

  const handleCopyPlannedSession = async (planned: PlannedSession, e: React.MouseEvent) => {
    e.stopPropagation();
    // Default to +2 days ahead (e.g. next practice day)
    const d = new Date(planned.date || Date.now());
    d.setDate(d.getDate() + 2);
    const nextDate = d.toISOString().split('T')[0];

    try {
      const newCopy = await dataService.savePlannedSession({
        date: nextDate,
        startTime: planned.startTime || "18:00",
        theme: planned.theme ? `${planned.theme} (Kopia)` : 'Nytt pass',
        phaseId: planned.phaseId,
        warmupExerciseIds: planned.warmupExerciseIds,
        exerciseIds: planned.exerciseIds,
        exerciseDurations: planned.exerciseDurations,
        status: 'planned'
      });
      setPlannedSessions(prev => [...prev, newCopy].sort((a, b) => a.date.localeCompare(b.date)));
      setSaveSuccessMessage("Pass kopierat till " + nextDate);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 1200);
    } catch (err: any) {
      alert("Kunde inte kopiera passet: " + err.message);
    }
  };

  const handleDeletePlannedSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Vill du ta bort detta planerade pass?")) return;
    const updated = await dataService.deletePlannedSession(id);
    setPlannedSessions(updated);
  };

  const handleAiSuggest = async () => {
    setIsAiSuggesting(true);
    setAiRationale(null);
    try {
      const allEx = phases.flatMap(p => p.exercises);
      const res = await fetch('/api/gemini/suggest-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: sessionTheme.trim() || undefined,
          durationMinutes: 90,
          availableExercises: allEx,
          availableWarmups: mockWarmupExercises
        })
      });

      if (!res.ok) throw new Error("Serverfel vid AI-förslag");
      const data = await res.json();

      if (data.theme && !sessionTheme.trim()) {
        setSessionTheme(data.theme);
      }
      if (data.rationale) {
        setAiRationale(data.rationale);
      }

      if (Array.isArray(data.suggestedWarmupIds) && data.suggestedWarmupIds.length > 0) {
        setSelectedWarmupIds(data.suggestedWarmupIds);
      }

      if (Array.isArray(data.suggestedExerciseIds) && data.suggestedExerciseIds.length > 0) {
        const matched = allEx.filter(e => data.suggestedExerciseIds.includes(e.id));
        if (matched.length > 0) {
          setSelectedExercises(matched);
        }
      }
    } catch (err: any) {
      console.error("AI-förslag misslyckades:", err);
      alert("Kunde inte hämta AI-förslag just nu. Välj övningar manuellt.");
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const handleFinalizeSession = async () => {
    if(!selectedPhase || playlist.length === 0) return;
    setIsSaving(true);
    try {
      const sessionPayload: any = {
        date: sessionDate || new Date().toISOString().split('T')[0],
        phaseId: selectedPhase.id,
        warmupExerciseIds: playlist.filter(i => i.type === 'warmup').map(i => i.id),
        exerciseIds: playlist.filter(i => i.type === 'main').map(i => i.id),
        attendance: players.map(p => ({ playerId: p.id, status: attendance[p.id] || 'frånvarande' })),
        evaluations: evaluations
      };
      if (sessionTheme && sessionTheme.trim()) {
        sessionPayload.theme = sessionTheme.trim();
      }
      if (activePlannedSessionId) {
        sessionPayload.plannedSessionId = activePlannedSessionId;
      }
      await dataService.saveSession(sessionPayload);

      // If this session originated from a planned session, mark it completed or remove it from planned list
      if (activePlannedSessionId) {
        await dataService.deletePlannedSession(activePlannedSessionId);
        const updatedPlanned = await dataService.getPlannedSessions();
        setPlannedSessions(updatedPlanned);
      }

      setSaveSuccessMessage("Träningspass Avslutat & Sparat!");
      setShowSaveSuccess(true);
      setTimeout(() => {
        setShowSaveSuccess(false);
        setStep('selection');
        setEvaluations([]);
        setSelectedWarmupIds([]);
        setSelectedExercises([]);
        setPlaylist([]);
        setActivePlaylistItemIndex(0);
        setTimer(0);
        setActivePlannedSessionId(null);
        setEditingPlannedSessionId(null);
        setSessionTheme("");
        setActiveTab('sessions');
      }, 1500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm("Är du säker på att du vill ta bort detta pass? Historiken och XP försvinner för spelarna.")) return;
      const updated = await dataService.deleteSession(id);
      setAllSessions(updated);
      if (selectedSession?.id === id) setSelectedSession(null);
  };

  if (loading && players.length === 0) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 relative">
      {showSaveSuccess && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center animate-in zoom-in">
          <div className="text-center space-y-4">
            <Trophy size={64} className="text-orange-500 mx-auto drop-shadow-[0_0_20px_rgba(249,115,22,0.4)]" />
            <h2 className="text-3xl font-black italic uppercase text-white tracking-tighter">{saveSuccessMessage}</h2>
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Synkat och klart i BasketCoach Pro</p>
          </div>
        </div>
      )}

      <div className="flex gap-1 p-1 bg-slate-900 rounded-2xl w-full sm:w-fit border border-slate-800 shadow-xl">
          <button 
            onClick={() => { 
              setActiveTab('active'); 
              setEditingPlannedSessionId(null);
              setActivePlannedSessionId(null);
            }} 
            className={`flex-1 sm:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'active' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Plus size={13} /> Planera nytt pass
          </button>
          <button 
            onClick={() => { setActiveTab('upcoming'); setSelectedSession(null); }} 
            className={`flex-1 sm:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'upcoming' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Calendar size={13} /> Kommande ({plannedSessions.length})
          </button>
          <button 
            onClick={() => { setActiveTab('sessions'); }} 
            className={`flex-1 sm:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'sessions' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Clock size={13} /> Historik ({allSessions.length})
          </button>
      </div>

      {/* 1. FLIK: KOMMANDE PLANERADE PASS */}
      {activeTab === 'upcoming' && (
        <div className="space-y-6 animate-in slide-in-from-left duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                <Calendar className="text-orange-500" size={22} /> Kommande Träningar
              </h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                Planera framtida pass i förväg. Ett passerat datum flyttar aldrig passet automatiskt.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingPlannedSessionId(null);
                setActivePlannedSessionId(null);
                setSessionDate(new Date().toISOString().split('T')[0]);
                setSessionTheme("");
                setSelectedExercises([]);
                setSelectedWarmupIds([]);
                setPlaylist([]);
                setStep('selection');
                setActiveTab('active');
              }}
              className="px-6 py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-900/30 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Plus size={16} /> Planera ett pass
            </button>
          </div>

          {plannedSessions.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-800/80 rounded-3xl bg-slate-900/30 space-y-4">
              <Calendar size={48} className="mx-auto text-slate-700" />
              <div>
                <h4 className="text-base font-black text-slate-300 uppercase tracking-tight">Inga planerade pass ännu</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Klicka på knappen ovan för att välja datum, starttid, övningar och spara ditt nästa träningspass.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingPlannedSessionId(null);
                  setActivePlannedSessionId(null);
                  setStep('selection');
                  setActiveTab('active');
                }}
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider transition-all"
              >
                Skapa nästa pass nu
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {plannedSessions.map((planned) => {
                const todayStr = new Date().toISOString().split('T')[0];
                const isToday = planned.date === todayStr;
                const totalExercises = (planned.warmupExerciseIds?.length || 0) + (planned.exerciseIds?.length || 0);

                return (
                  <div
                    key={planned.id}
                    className={`p-5 sm:p-6 rounded-3xl border transition-all ${
                      isToday
                        ? 'bg-orange-950/20 border-orange-500/60 shadow-xl shadow-orange-950/30 ring-1 ring-orange-500/30'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Vänster: Datum, Tid, Tema, Fas */}
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black border shrink-0 ${
                          isToday 
                            ? 'bg-orange-600 text-white border-orange-400 shadow-md shadow-orange-600/30' 
                            : 'bg-slate-950 text-slate-300 border-slate-800'
                        }`}>
                          <span className="text-[10px] uppercase leading-none opacity-80">
                            {new Date(planned.date).toLocaleDateString('sv-SE', { weekday: 'short' })}
                          </span>
                          <span className="text-lg leading-tight">
                            {planned.date.split('-')[2]}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isToday && (
                              <span className="px-2.5 py-0.5 rounded-full bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest animate-pulse">
                                Dagens Pass
                              </span>
                            )}
                            <span className="text-xs font-black text-slate-300 flex items-center gap-1">
                              <Calendar size={13} className="text-slate-500" /> {planned.date}
                            </span>
                            {planned.startTime && (
                              <span className="text-xs font-black text-slate-400 flex items-center gap-1">
                                <Clock size={13} className="text-slate-500" /> {planned.startTime}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800 text-[9px] font-black uppercase">
                              Fas {planned.phaseId}
                            </span>
                          </div>

                          <h4 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                            {planned.theme || 'Träningspass'}
                          </h4>

                          <div className="text-[11px] font-bold text-slate-400 flex items-center gap-3">
                            <span>{totalExercises} st övningar ({planned.warmupExerciseIds?.length || 0} uppvärmning, {planned.exerciseIds?.length || 0} huvud)</span>
                          </div>
                        </div>
                      </div>

                      {/* Höger: Starta / Ändra / Kopiera / Ta bort */}
                      <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
                        <button
                          onClick={() => handleStartPlannedSession(planned)}
                          className="px-5 py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-900/30 flex items-center gap-2 transition-all active:scale-95"
                          title="Starta träning med detta pass"
                        >
                          <Play size={15} fill="currentColor" /> Starta träning
                        </button>
                        <button
                          onClick={() => handleEditPlannedSession(planned)}
                          className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all"
                          title="Ändra pass"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={(e) => handleCopyPlannedSession(planned, e)}
                          className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all"
                          title="Kopiera pass till ett nytt datum"
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          onClick={(e) => handleDeletePlannedSession(planned.id, e)}
                          className="p-3 rounded-2xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-900/50 transition-all"
                          title="Ta bort planerat pass"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. FLIK: HISTORIK */}

      {activeTab === 'sessions' ? (
          <div className="grid lg:grid-cols-12 gap-6 animate-in slide-in-from-right duration-500">
              <div className={`${selectedSession ? 'hidden lg:block' : ''} lg:col-span-4 space-y-2`}>
                {allSessions.length > 0 ? allSessions.map(s => (
                  <div key={s.id} className="relative group">
                    <div 
                      onClick={() => setSelectedSession(s)} 
                      className={`p-4 pr-16 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${selectedSession?.id === s.id ? 'bg-orange-600/10 border-orange-500' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
                    >
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center font-black text-xs text-white border border-slate-800">{s.date.split('-')[2]}</div>
                          <div className="text-xs font-black text-slate-300 uppercase tracking-tighter">Fas {s.phaseId} Pass</div>
                      </div>
                      <ChevronRight size={14} className="text-slate-700" />
                    </div>
                    {/* Radera-knapp: Placerad säkert i mitten/höger för att undvika felklick */}
                    <button 
                      onClick={(e) => handleDeleteSession(s.id, e)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100 z-10"
                      title="Ta bort pass"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )) : <p className="text-slate-600 p-8 text-center text-xs font-bold uppercase tracking-widest border-2 border-dashed border-slate-900 rounded-3xl">Inga sparade pass än.</p>}
              </div>
              {selectedSession && (
                  <div className="lg:col-span-8 p-4 sm:p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] bg-slate-900 border border-slate-800 shadow-2xl space-y-6 sm:space-y-8 animate-in slide-in-from-right relative overflow-hidden">
                      <button onClick={() => setSelectedSession(null)} className="lg:hidden absolute top-6 right-6 text-slate-500"><X size={20}/></button>
                      <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3"><Activity className="text-orange-500" /> {selectedSession.date}</h3>
                        <span className="text-[10px] font-black text-slate-500 uppercase">Fas {selectedSession.phaseId}</span>
                      </div>
                      <div className="space-y-3">
                          {selectedSession.attendance.map(a => {
                              const p = players.find(player => player.id === a.playerId);
                              const ev = selectedSession.evaluations.find(e => e.playerId === a.playerId);
                              return (
                                  <div key={a.playerId} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                      <div className="flex items-center gap-4">
                                          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center font-black text-[10px] text-slate-400">#{p?.number}</div>
                                          <span className="text-xs font-black text-white uppercase">{p?.name}</span>
                                      </div>
                                      <div className="flex items-center gap-6">
                                          <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${a.status === 'närvarande' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{a.status}</span>
                                          {ev && (
                                              <div className="flex gap-1.5 bg-slate-900 p-2 rounded-xl border border-slate-800">
                                                  {ev.scores.slice(0,5).map((s, i) => (
                                                      <div key={i} className="flex flex-col items-center gap-1">
                                                          <div className="w-4 h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]" style={{ width: `${(s/5)*100}%` }}></div></div>
                                                          <span className="text-[6px] font-black text-slate-600">{s}</span>
                                                      </div>
                                                  ))}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )}
          </div>
      ) : (
          <div className="space-y-6">
              {step === 'selection' && (
                  <div className="p-4 sm:p-8 md:p-12 rounded-3xl md:rounded-[3rem] bg-slate-900 border border-slate-800 space-y-6 sm:space-y-10 shadow-2xl animate-in slide-in-from-bottom relative overflow-hidden">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10 border-b border-slate-800/80 pb-6">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[9px] font-black uppercase tracking-widest">
                                {editingPlannedSessionId ? 'Redigerar planerat pass' : 'Planera Träningspass'}
                              </span>
                            </div>
                            <h3 className="text-2xl sm:text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
                              {editingPlannedSessionId ? 'Uppdatera pass' : 'Tränings-setup'}
                            </h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">
                              Sätt datum, tema och välj övningar
                            </p>
                          </div>

                          <div className="flex flex-col gap-2 items-start md:items-end w-full md:w-auto">
                              <div className="flex p-1.5 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner w-full md:w-auto justify-center">
                                  <button onClick={() => setViewMode('basket')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'basket' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><Layout size={14}/> Basket</button>
                                  <button onClick={() => setViewMode('fys')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'fys' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><Dumbbell size={14}/> Fys</button>
                              </div>
                              {viewMode === 'basket' && (
                                  <div className="flex items-center gap-2 self-center md:self-end">
                                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Bedömningsmall:</span>
                                      <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 shadow-inner">
                                          <button onClick={() => setGradingFramework('SBBF')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${gradingFramework === 'SBBF' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>SBBF</button>
                                          <button onClick={() => setGradingFramework('NBA')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${gradingFramework === 'NBA' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>NBA</button>
                                          <button onClick={() => setGradingFramework('COMBO')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${gradingFramework === 'COMBO' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Combo</button>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* DATUM, STARTTID, TEMA OCH AI-KNAPP */}
                      <div className="grid sm:grid-cols-12 gap-4 bg-slate-950/80 p-5 rounded-3xl border border-slate-800/80 relative z-10">
                        <div className="sm:col-span-3 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Calendar size={12} className="text-orange-500" /> Datum
                          </label>
                          <input 
                            type="date"
                            value={sessionDate}
                            onChange={(e) => setSessionDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-black text-white outline-none focus:border-orange-500 transition-colors"
                          />
                        </div>

                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Clock size={12} className="text-orange-500" /> Starttid
                          </label>
                          <input 
                            type="time"
                            value={sessionStartTime}
                            onChange={(e) => setSessionStartTime(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-black text-white outline-none focus:border-orange-500 transition-colors"
                          />
                        </div>

                        <div className="sm:col-span-5 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Target size={12} className="text-orange-500" /> Frivilligt Tema
                          </label>
                          <input 
                            type="text"
                            placeholder="T.ex. Passningar och rörelse / Pick & Roll HU15"
                            value={sessionTheme}
                            onChange={(e) => setSessionTheme(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-black text-white placeholder:text-slate-600 outline-none focus:border-orange-500 transition-colors"
                          />
                        </div>

                        <div className="sm:col-span-2 flex items-end">
                          <button
                            type="button"
                            onClick={handleAiSuggest}
                            disabled={isAiSuggesting}
                            className="w-full py-2.5 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:text-purple-100 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                            title="Föreslå övningar från biblioteket baserat på tema och längd"
                          >
                            {isAiSuggesting ? (
                              <>
                                <Loader2 size={13} className="animate-spin text-purple-400" />
                                <span>Tänker...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles size={13} className="text-purple-400" />
                                <span>Föreslå övningar</span>
                              </>
                            )}
                          </button>
                        </div>

                        {aiRationale && (
                          <div className="sm:col-span-12 p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-[11px] text-purple-200 flex items-start gap-2 animate-in fade-in">
                            <Sparkles size={14} className="text-purple-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-black uppercase text-[9px] tracking-wider text-purple-300 block mb-0.5">AI Coach Motivering:</span>
                              {aiRationale}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid md:grid-cols-12 gap-6 sm:gap-8 relative z-10">
                          <div className="md:col-span-4 space-y-6">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 group flex items-center gap-2">
                                    Välj Fas 
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {phases.map(p => (
                                        <button key={p.id} onClick={() => setSelectedPhase(p)} className={`py-4 rounded-xl font-black text-sm border transition-all ${selectedPhase?.id === p.id ? (viewMode === 'fys' ? 'bg-blue-600 border-blue-400' : 'bg-orange-600 border-orange-400') + ' text-white shadow-lg scale-105 select-none' : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-600'}`}>{p.id}</button>
                                    ))}
                                </div>
                              </div>

                              <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
                                <div className="flex justify-between items-center">
                                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2"><Flame size={14} className="text-orange-500" /> Uppvärmning</h4>
                                  <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-lg active:scale-95 transition-transform cursor-default">{selectedWarmupIds.length} valda</span>
                                </div>
                                <button 
                                  onClick={() => setShowWarmupLibrary(true)}
                                  className="w-full py-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-black uppercase hover:border-orange-500/50 transition-all flex items-center justify-center gap-2 group"
                                >
                                  {selectedWarmupIds.length > 0 ? 'Ändra Uppvärmning' : 'Välj från SBBF-arkiv'}
                                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                </button>
                                {selectedWarmupIds.length > 0 && (
                                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar">
                                    {selectedWarmupIds.map(id => (
                                      <div key={id} className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[8px] font-black text-slate-500 uppercase flex items-center gap-1">
                                        <div className="w-1 h-1 rounded-full bg-orange-500" />
                                        {id.startsWith('w') ? 'SBBF Övning' : 'Övning'}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                          </div>
                          <div className="md:col-span-8 space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Välj Huvudövning(ar)</label>
                              <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                                  {Object.entries(
                                      (selectedPhase?.exercises || []).filter(ex => {
                                          const isFys = ex.category === 'Fysik' || ex.category === 'Kondition';
                                          return viewMode === 'fys' ? isFys : !isFys;
                                      }).reduce((acc, ex) => {
                                          if (!acc[ex.category]) acc[ex.category] = [];
                                          acc[ex.category].push(ex);
                                          return acc;
                                      }, {} as Record<string, Exercise[]>)
                                  ).map(([category, items]) => (
                                      <div key={category} className="space-y-2">
                                          <div className="flex items-center gap-2 px-2">
                                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{category}</span>
                                            <div className="h-[1px] flex-1 bg-slate-800"></div>
                                          </div>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                              {items.map(ex => {
                                                  const isSelected = selectedExercises.some(e => e.id === ex.id);
                                                  return (
                                                      <button 
                                                          key={ex.id} 
                                                          onClick={() => {
                                                              if (isSelected) setSelectedExercises(prev => prev.filter(e => e.id !== ex.id));
                                                              else setSelectedExercises(prev => [...prev, ex]);
                                                          }} 
                                                          className={`p-4 rounded-xl text-left border text-[10px] font-black uppercase transition-all ${isSelected ? (viewMode === 'fys' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-orange-500 bg-orange-500/10 text-orange-400') + ' shadow-inner' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                                      >
                                                          <div className="flex justify-between items-center">
                                                              {ex.title}
                                                              {isSelected && <CheckCircle2 size={12} className={viewMode === 'fys' ? 'text-blue-500' : 'text-orange-500'} />}
                                                          </div>
                                                      </button>
                                                  );
                                              })}
                                          </div>
                                      </div>
                                  ))}
                                  {(!selectedPhase?.exercises || selectedPhase.exercises.length === 0) && (
                                      <div className="py-12 text-center space-y-3">
                                          <Loader2 size={32} className="mx-auto text-slate-800 animate-spin" />
                                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Laddar övningar...</p>
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <button 
                          disabled={selectedExercises.length === 0 && selectedWarmupIds.length === 0} 
                          onClick={handleStartPlanning} 
                          className="w-full sm:flex-1 py-5 rounded-[2rem] bg-orange-600 hover:bg-orange-500 text-white font-black uppercase text-xs shadow-xl shadow-orange-900/30 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                          Planera Tidslinje <ChevronRight size={18}/>
                        </button>
                        <button 
                          disabled={selectedExercises.length === 0 && selectedWarmupIds.length === 0} 
                          onClick={handleSavePlannedSession} 
                          className="w-full sm:w-auto px-8 py-5 rounded-[2rem] bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-xs border border-slate-700 shadow-xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                          title="Spara passet direkt till Kommande utan att ändra tidslinje"
                        >
                          <Save size={16} className="text-orange-500" /> Spara planerat pass
                        </button>
                      </div>
                  </div>
              )}

              {step === 'planning' && (
                  <div className="p-4 sm:p-8 md:p-12 rounded-3xl md:rounded-[3rem] bg-slate-900 border border-slate-800 space-y-6 sm:space-y-8 shadow-2xl animate-in slide-in-from-right">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-4 sm:pb-6">
                        <div>
                            <button onClick={() => setStep('selection')} className="text-slate-500 hover:text-white flex items-center gap-1 text-[9px] font-black uppercase mb-2"><ChevronLeft size={14}/> Tillbaka till val</button>
                            <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">Planera Tidslinje</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">
                              {sessionDate ? `${sessionDate} ${sessionStartTime || ''}` : ''} {sessionTheme ? `• ${sessionTheme}` : ''}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Tid</div>
                            <div className="text-2xl font-black text-orange-500 italic uppercase">{Math.round(playlist.reduce((acc, curr) => acc + curr.duration, 0) / 60)} min</div>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                          {playlist.map((item, idx) => (
                              <div key={`${item.id}-${idx}`} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-slate-600 transition-all">
                                  <div className="flex items-center gap-4">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${item.type === 'warmup' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                          {idx + 1}
                                      </div>
                                      <div>
                                          <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{item.type === 'warmup' ? 'Uppvärmning' : 'Huvudövning'}</div>
                                          <div className="text-sm font-black text-white uppercase">{item.title}</div>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-xl border border-slate-800">
                                      <button 
                                          onClick={() => {
                                              const newPlaylist = [...playlist];
                                              newPlaylist[idx].duration = Math.max(60, newPlaylist[idx].duration - 60);
                                              setPlaylist(newPlaylist);
                                          }}
                                          className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-black"
                                      >-</button>
                                      <div className="flex items-center gap-2 px-2">
                                          <input 
                                              type="number" 
                                              value={Math.round(item.duration / 60)}
                                              onChange={(e) => {
                                                  const newPlaylist = [...playlist];
                                                  newPlaylist[idx].duration = Math.max(1, parseInt(e.target.value) || 0) * 60;
                                                  setPlaylist(newPlaylist);
                                              }}
                                              className="w-12 bg-transparent text-white font-black text-center outline-none"
                                          />
                                          <span className="text-[10px] font-black text-slate-500 uppercase">min</span>
                                      </div>
                                      <button 
                                          onClick={() => {
                                              const newPlaylist = [...playlist];
                                              newPlaylist[idx].duration += 60;
                                              setPlaylist(newPlaylist);
                                          }}
                                          className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-black"
                                      >+</button>
                                  </div>
                              </div>
                          ))}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <button 
                          onClick={() => setStep('checkin')} 
                          className="flex-1 py-5 rounded-[2rem] bg-orange-600 hover:bg-orange-500 text-white font-black uppercase text-xs shadow-xl shadow-orange-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          Starta Nu (Närvaro) <ChevronRight size={18}/>
                        </button>
                        <button 
                          onClick={handleSavePlannedSession} 
                          disabled={isSaving}
                          className="sm:w-auto px-8 py-5 rounded-[2rem] bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-xs border border-slate-700 shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <Save size={16} className="text-orange-500" /> Spara som planerat pass
                        </button>
                      </div>
                  </div>
              )}

              {step === 'checkin' && playlist.length > 0 && (
                  <div className="p-4 sm:p-8 md:p-12 rounded-3xl md:rounded-[3rem] bg-slate-900 border border-slate-800 space-y-6 sm:space-y-8 shadow-2xl animate-in slide-in-from-right">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-4 sm:pb-6">
                        <div>
                            <button onClick={() => setStep('planning')} className="text-slate-500 hover:text-white flex items-center gap-1 text-[9px] font-black uppercase mb-2"><ChevronLeft size={14}/> Ändra planering</button>
                            <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">Närvarokontroll</h3>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Planerade Moment</div>
                            <div className="text-xs font-black text-orange-500 uppercase">{playlist.length} st</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                          {players.map(p => (
                              <div key={p.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between group">
                                  <div className="flex items-center gap-4">
                                      <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center font-black text-xs text-slate-600">#{p.number}</div>
                                      <span className="text-xs font-black text-white uppercase">{p.name}</span>
                                  </div>
                                  <div className="flex gap-1">
                                      {['frånvarande', 'delvis', 'närvarande'].map((s: any) => (
                                          <button key={s} onClick={() => setAttendance({...attendance, [p.id]: s})} className={`px-2 py-1.5 rounded-lg text-[7px] font-black uppercase transition-all ${attendance[p.id] === s ? (s === 'närvarande' ? 'bg-emerald-600 text-white' : s === 'delvis' ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white') : 'bg-slate-900 text-slate-600'}`}>{s.slice(0,3)}</button>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                      <button onClick={() => setStep('live')} className="w-full py-6 rounded-[2rem] bg-orange-600 text-white font-black uppercase text-xs shadow-xl shadow-orange-900/20 flex items-center justify-center gap-3">Starta Passet <Play size={18} fill="currentColor"/></button>
                  </div>
              )}

              {step === 'live' && playlist.length > 0 && (
                  <div className="space-y-6">
                      {/* STICKY HEADER */}
                      <div className="sticky top-0 z-40 -mx-4 px-4 sm:-mx-8 sm:px-8 pt-4 pb-4 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 shadow-2xl rounded-b-3xl transition-all">
                          <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
                              <div className="flex-1 min-w-0 w-full text-center md:text-left">
                                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                          <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-500' : (timerMode === 'countdown' && countdownTime === 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]')}`}></div>
                                          {isPaused ? 'Pausad' : (timerMode === 'countdown' && countdownTime === 0 ? 'Tiden är slut!' : 'Träning Pågår')}
                                      </div>
                                      <div className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-[9px] font-black text-slate-400 uppercase">
                                          {playlist[activePlaylistItemIndex]?.type === 'main' ? (
                                              `${evaluations.filter(e => e.exerciseId === playlist[activePlaylistItemIndex].id).length} / ${players.filter(p => attendance[p.id] === 'närvarande' || attendance[p.id] === 'delvis').length} Bedömda`
                                          ) : (
                                              'Uppvärmning'
                                          )}
                                      </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-center md:justify-start gap-2 sm:gap-3">
                                      <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter leading-none truncate">{playlist[activePlaylistItemIndex]?.title}</h3>
                                      {playlist[activePlaylistItemIndex]?.type === 'main' && (
                                          <button onClick={() => setShowCheatSheet(!showCheatSheet)} className={`p-1.5 rounded-lg transition-colors shrink-0 ${showCheatSheet ? 'bg-orange-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`} title="Visa övningsdetaljer">
                                              <Info size={16} />
                                          </button>
                                      )}
                                  </div>

                                  {/* PLAYLIST TABS - Improved for mobile */}
                                  <div className="w-full mt-3">
                                      <div className="flex items-center justify-between mb-1 px-1">
                                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Moment {activePlaylistItemIndex + 1} av {playlist.length}</span>
                                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest sm:hidden">Svep för fler →</span>
                                      </div>
                                      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scroll-smooth custom-scrollbar-horizontal">
                                          {playlist.map((item, idx) => (
                                              <button 
                                                  key={`${item.id}-${idx}`}
                                                  onClick={() => {
                                                      setActivePlaylistItemIndex(idx);
                                                      setTimer(0);
                                                      setCountdownTime(item.duration);
                                                      setTimerMode('countdown');
                                                      setIsPaused(true);
                                                  }}
                                                  className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all shrink-0 snap-start border ${idx === activePlaylistItemIndex 
                                                      ? (item.type === 'warmup' ? 'bg-orange-600 border-orange-400 text-white shadow-lg shadow-orange-900/20' : 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/20') 
                                                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
                                              >
                                                  <span className="opacity-50 mr-1">{idx + 1}.</span> {item.title}
                                              </button>
                                          ))}
                                          <button 
                                              onClick={() => {
                                                  setNewExerciseSelection(null);
                                                  setNewExerciseTime(10);
                                                  setAddExerciseSearch("");
                                                  setAddExerciseTab(viewMode === 'basket' ? 'basket' : 'fys');
                                                  setShowAddExerciseModal(true);
                                              }}
                                              className="px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all shrink-0 bg-slate-950 text-slate-500 hover:bg-slate-900 hover:text-white flex items-center gap-1 border border-dashed border-slate-700 snap-start"
                                          >
                                              + Lägg till
                                          </button>
                                      </div>
                                  </div>
                              </div>

                              <div className="flex flex-col items-center gap-2">
                                  <div className="flex items-center gap-4">
                                      {timerMode === 'countdown' && (
                                          <button onClick={() => setCountdownTime(Math.max(0, countdownTime - 60))} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all font-black text-xs">-1m</button>
                                      )}
                                      
                                      <div className={`text-4xl sm:text-5xl md:text-6xl font-black font-mono tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] cursor-pointer transition-colors ${timerMode === 'countdown' && countdownTime === 0 ? 'text-rose-500 animate-pulse' : 'text-white'}`} onClick={() => setTimerMode(m => m === 'stopwatch' ? 'countdown' : 'stopwatch')} title="Klicka för att byta mellan tidtagarur och nedräkning">
                                          {timerMode === 'stopwatch' 
                                              ? `${Math.floor(timer/60)}:${String(timer%60).padStart(2, '0')}`
                                              : `${Math.floor(countdownTime/60)}:${String(countdownTime%60).padStart(2, '0')}`
                                          }
                                      </div>

                                      {timerMode === 'countdown' && (
                                          <button onClick={() => setCountdownTime(countdownTime + 60)} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all font-black text-xs">+1m</button>
                                      )}
                                  </div>
                                  
                                  <div className="flex gap-2">
                                      <button onClick={() => setIsPaused(!isPaused)} className={`w-12 h-10 rounded-xl flex items-center justify-center ${isPaused ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-amber-500 hover:bg-amber-400 shadow-amber-900/20'} text-white shadow-xl transition-all`}>{isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}</button>
                                      <button onClick={() => { setTimer(0); setCountdownTime(600); setIsPaused(true); }} className="w-12 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 flex items-center justify-center transition-all"><RotateCcw size={16} /></button>
                                  </div>
                              </div>
                          </div>

                          {showCheatSheet && playlist[activePlaylistItemIndex]?.type === 'main' && (
                              <div className="mt-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl text-left animate-in slide-in-from-top-2 duration-200">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                          <h5 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Översikt</h5>
                                          <ul className="text-xs text-slate-300 space-y-1">
                                              <li><span className="font-bold text-slate-500">Setup:</span> {(playlist[activePlaylistItemIndex].exercise as Exercise).overview.setup}</li>
                                              <li><span className="font-bold text-slate-500">Action:</span> {(playlist[activePlaylistItemIndex].exercise as Exercise).overview.action}</li>
                                              <li><span className="font-bold text-emerald-500">Fokus:</span> {(playlist[activePlaylistItemIndex].exercise as Exercise).overview.coachingPoint}</li>
                                          </ul>
                                      </div>
                                      <div>
                                          <h5 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Pedagogik</h5>
                                          <ul className="text-xs text-slate-300 space-y-1">
                                              <li><span className="font-bold text-slate-500">Vad:</span> {(playlist[activePlaylistItemIndex].exercise as Exercise).pedagogy?.what || 'Ej angivet'}</li>
                                              <li><span className="font-bold text-slate-500">Hur:</span> {(playlist[activePlaylistItemIndex].exercise as Exercise).pedagogy?.how || 'Ej angivet'}</li>
                                              <li><span className="font-bold text-slate-500">Varför:</span> {(playlist[activePlaylistItemIndex].exercise as Exercise).pedagogy?.why || 'Ej angivet'}</li>
                                          </ul>
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>

                      <div className="px-4 sm:px-0 space-y-4">
                          {playlist[activePlaylistItemIndex]?.type === 'warmup' && (
                              <div className="p-6 rounded-[2.5rem] bg-orange-600/10 border border-orange-500/20 space-y-4 animate-in zoom-in-95">
                                  <div className="flex items-center gap-3">
                                      <div className="p-3 bg-orange-600 rounded-2xl text-white shadow-lg shadow-orange-900/20">
                                          <Flame size={24} />
                                      </div>
                                      <div>
                                          <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Aktiv Uppvärmning</div>
                                          <h4 className="text-xl font-black text-white uppercase italic">{(playlist[activePlaylistItemIndex].exercise as WarmupExercise).phase}</h4>
                                      </div>
                                  </div>
                                  <p className="text-sm text-slate-300 leading-relaxed font-medium">{(playlist[activePlaylistItemIndex].exercise as WarmupExercise).description}</p>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in zoom-in-95 duration-300">
                                      <div className="space-y-3">
                                          {(playlist[activePlaylistItemIndex].exercise as WarmupExercise).videoUrl && (
                                              <div className="w-full aspect-video rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl relative group">
                                                  {getVideoId((playlist[activePlaylistItemIndex].exercise as WarmupExercise).videoUrl!) ? (
                                                      <iframe 
                                                          src={`https://www.youtube-nocookie.com/embed/${getVideoId((playlist[activePlaylistItemIndex].exercise as WarmupExercise).videoUrl!)}?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1`}
                                                          title={(playlist[activePlaylistItemIndex].exercise as WarmupExercise).title}
                                                          className="w-full h-full absolute inset-0" 
                                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                          allowFullScreen
                                                      />
                                                  ) : (
                                                      <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                                                          <Youtube size={48} className="text-slate-800" />
                                                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Ogiltig videolänk</p>
                                                      </div>
                                                  )}
                                              </div>
                                          )}

                                          {(playlist[activePlaylistItemIndex].exercise as WarmupExercise).videoUrl && (
                                              <div className="space-y-1">
                                                  <button 
                                                      onClick={() => window.open((playlist[activePlaylistItemIndex].exercise as WarmupExercise).videoUrl, '_blank')}
                                                      className="w-full py-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 rounded-xl transition-all border border-red-500/20"
                                                  >
                                                      <Youtube size={14} /> Se på YouTube
                                                  </button>
                                                  <a 
                                                      href={(playlist[activePlaylistItemIndex].exercise as WarmupExercise).videoUrl} 
                                                      target="_blank" 
                                                      rel="noopener noreferrer"
                                                      className="text-[8px] text-slate-500 hover:text-orange-500 transition-colors truncate block px-1"
                                                  >
                                                      {(playlist[activePlaylistItemIndex].exercise as WarmupExercise).videoUrl}
                                                  </a>
                                              </div>
                                          )}

                                          <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-3">
                                              <div className="flex items-center gap-2 text-orange-500">
                                                  <Flame size={16} />
                                                  <h4 className="text-[10px] font-black uppercase tracking-widest">SBBF Fokus</h4>
                                              </div>
                                              <p className="text-xs font-black text-white uppercase italic leading-relaxed">
                                                  {(playlist[activePlaylistItemIndex].exercise as WarmupExercise).sbbfFocus}
                                              </p>
                                          </div>
                                      </div>

                                      <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-6 overflow-y-auto max-h-[500px] custom-scrollbar">
                                          <div className="space-y-4">
                                              <div className="flex items-center gap-2 text-blue-400">
                                                  <Target size={16} />
                                                  <h4 className="text-[10px] font-black uppercase tracking-widest">Organisation</h4>
                                              </div>
                                              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                                  {(playlist[activePlaylistItemIndex].exercise as WarmupExercise).setup || "Ingen specifik setup angiven."}
                                              </p>
                                          </div>

                                          <div className="space-y-4 pt-4 border-t border-slate-900">
                                              <div className="flex items-center gap-2 text-emerald-400">
                                                  <CheckCircle2 size={16} />
                                                  <h4 className="text-[10px] font-black uppercase tracking-widest">Coaching Points</h4>
                                              </div>
                                              <ul className="space-y-2">
                                                  {(playlist[activePlaylistItemIndex].exercise as WarmupExercise).coachingPoints.map((cp, i) => (
                                                      <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                                                          <span className="text-orange-500 mt-1">•</span> {cp}
                                                      </li>
                                                  ))}
                                              </ul>
                                          </div>

                                          {(playlist[activePlaylistItemIndex].exercise as WarmupExercise).visualSteps && (playlist[activePlaylistItemIndex].exercise as WarmupExercise).visualSteps!.length > 0 && (
                                              <div className="space-y-4 pt-4 border-t border-slate-900">
                                                  <div className="flex items-center gap-2 text-purple-400">
                                                      <Activity size={16} />
                                                      <h4 className="text-[10px] font-black uppercase tracking-widest">Steg-för-steg</h4>
                                                  </div>
                                                  <div className="space-y-2">
                                                      {(playlist[activePlaylistItemIndex].exercise as WarmupExercise).visualSteps!.map((step, i) => (
                                                          <div key={i} className="flex items-center gap-3 p-2 bg-slate-900/30 rounded-xl border border-slate-800/50">
                                                              <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-purple-500 shrink-0 border border-purple-500/20">{i + 1}</div>
                                                              <span className="text-[10px] font-bold text-slate-300 uppercase">{step}</span>
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          )}

                          {playlist[activePlaylistItemIndex]?.type === 'main' && (
                              <div className="space-y-4">
                                  <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                                      {activeCriteria.map((c, i) => (
                                          <div key={i} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 shrink-0">
                                              <c.icon size={12} className={viewMode === 'basket' ? 'text-orange-500' : 'text-blue-500'} />
                                              <span className="text-[10px] font-black text-white uppercase">{c.label}</span>
                                          </div>
                                      ))}
                                  </div>

                                  {(playlist[activePlaylistItemIndex].exercise as Exercise).videoUrl && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in zoom-in-95 duration-300">
                                          <div className="space-y-3">
                                              <div className="w-full aspect-video rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl relative group">
                                                  {getVideoId((playlist[activePlaylistItemIndex].exercise as Exercise).videoUrl!) ? (
                                                      <iframe 
                                                          src={`https://www.youtube-nocookie.com/embed/${getVideoId((playlist[activePlaylistItemIndex].exercise as Exercise).videoUrl!)}?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1`}
                                                          title={(playlist[activePlaylistItemIndex].exercise as Exercise).title}
                                                          className="w-full h-full absolute inset-0" 
                                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                          allowFullScreen
                                                      />
                                                  ) : (
                                                      <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                                                          <Youtube size={48} className="text-slate-800" />
                                                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Ogiltig videolänk</p>
                                                      </div>
                                                  )}
                                              </div>
                                              <div className="space-y-1">
                                                  <button 
                                                      onClick={() => window.open((playlist[activePlaylistItemIndex].exercise as Exercise).videoUrl, '_blank')}
                                                      className="w-full py-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 rounded-xl transition-all border border-red-500/20"
                                                  >
                                                      <Youtube size={14} /> Se på YouTube
                                                  </button>
                                                  <a 
                                                      href={(playlist[activePlaylistItemIndex].exercise as Exercise).videoUrl} 
                                                      target="_blank" 
                                                      rel="noopener noreferrer"
                                                      className="text-[8px] text-slate-500 hover:text-orange-500 transition-colors truncate block px-1"
                                                  >
                                                      {(playlist[activePlaylistItemIndex].exercise as Exercise).videoUrl}
                                                  </a>
                                              </div>
                                          </div>
                                          <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-6 overflow-y-auto max-h-[400px] custom-scrollbar">
                                              <div className="space-y-4">
                                                  <div className="flex items-center gap-2 text-blue-400">
                                                      <Target size={16} />
                                                      <h4 className="text-[10px] font-black uppercase tracking-widest">VAD (Teknik & Mål)</h4>
                                                  </div>
                                                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                                      {(playlist[activePlaylistItemIndex].exercise as Exercise).pedagogy?.what || (playlist[activePlaylistItemIndex].exercise as Exercise).overview.setup}
                                                  </p>
                                              </div>

                                              <div className="space-y-4 pt-4 border-t border-slate-900">
                                                  <div className="flex items-center gap-2 text-emerald-400">
                                                      <Info size={16} />
                                                      <h4 className="text-[10px] font-black uppercase tracking-widest">HUR (Utförande)</h4>
                                                  </div>
                                                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                                      {(playlist[activePlaylistItemIndex].exercise as Exercise).pedagogy?.how || (playlist[activePlaylistItemIndex].exercise as Exercise).overview.action}
                                                  </p>
                                              </div>

                                              <div className="space-y-4 pt-4 border-t border-slate-900">
                                                  <div className="flex items-center gap-2 text-purple-400">
                                                      <Lightbulb size={16} />
                                                      <h4 className="text-[10px] font-black uppercase tracking-widest">VARFÖR (Syfte)</h4>
                                                  </div>
                                                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                                      {(playlist[activePlaylistItemIndex].exercise as Exercise).pedagogy?.why || "För att utveckla spelförståelse och teknisk färdighet."}
                                                  </p>
                                              </div>

                                              <div className="space-y-3 pt-4 border-t border-slate-900">
                                                  <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Checklista för succé</h4>
                                                  <div className="grid grid-cols-1 gap-1.5">
                                                      {(playlist[activePlaylistItemIndex].exercise as Exercise).criteria.map((c, i) => (
                                                          <div key={i} className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-xl border border-slate-800">
                                                              <div className="w-4 h-4 rounded-full bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-500">
                                                                  <Check size={10} />
                                                              </div>
                                                              <span className="text-[9px] font-bold text-slate-400 uppercase">{c}</span>
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          )}
                      </div>

                      <div className="grid md:grid-cols-12 gap-4 sm:gap-6 items-start px-4 sm:px-0">
                        <div className="md:col-span-8 p-4 sm:p-8 rounded-3xl md:rounded-[3rem] bg-slate-900 border border-slate-800 space-y-4 sm:space-y-6 shadow-2xl relative overflow-hidden">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-2"><UserCheck size={14} /> Spelarbedömning</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                                {players.filter(p => attendance[p.id] === 'närvarande' || attendance[p.id] === 'delvis').map(p => {
                                    const isGraded = evaluations.some(e => e.playerId === p.id && e.exerciseId === playlist[activePlaylistItemIndex].id);
                                    const playerEvals = evaluations.filter(e => e.playerId === p.id && e.exerciseId === playlist[activePlaylistItemIndex].id);
                                    const scoreAvg = isGraded ? (playerEvals[0].scores.reduce((a,b)=>a+b,0)! / 5).toFixed(1) : null;
                                    return (
                                        <button key={p.id} onClick={() => handleStartGradingPlayer(p)} className={`p-4 rounded-[1.5rem] border flex items-center justify-between transition-all group ${isGraded ? 'border-emerald-500/50 bg-emerald-500/5 shadow-inner' : 'bg-slate-950 border-slate-800 hover:border-orange-500/50'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${isGraded ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}>#{p.number}</div>
                                                <div className="text-left">
                                                    <div className={`text-xs font-black uppercase ${isGraded ? 'text-emerald-400' : 'text-white'}`}>{p.name}</div>
                                                    {isGraded ? (
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <div className="flex gap-0.5">
                                                                {[1,2,3,4,5].map(v => <div key={v} className={`w-1.5 h-1.5 rounded-full ${v <= Math.round(parseFloat(scoreAvg!)) ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>)}
                                                            </div>
                                                            <span className="text-[8px] font-black text-emerald-500">{scoreAvg} snitt</span>
                                                        </div>
                                                    ) : <div className="text-[8px] text-slate-700 font-bold uppercase">Klicka för betyg</div>}
                                                </div>
                                            </div>
                                            {isGraded ? <Check size={18} className="text-emerald-500 animate-in zoom-in" /> : <ChevronRight size={18} className="text-slate-800 group-hover:text-white" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="md:col-span-4 p-5 sm:p-8 rounded-3xl md:rounded-[3rem] bg-slate-900 border border-slate-800 shadow-2xl space-y-4 sm:space-y-6 text-center">
                            <div className="w-16 h-16 bg-emerald-600/10 rounded-2xl flex items-center justify-center mx-auto text-emerald-500 border border-emerald-500/20 shadow-inner"><Save size={32}/></div>
                            <h4 className="text-xl font-black text-white italic uppercase leading-none">Avsluta Träning</h4>
                            <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed">Sparar närvaro och {evaluations.length} bedömningar till spelarnas arkiv.</p>
                            <button disabled={isSaving} onClick={handleFinalizeSession} className="w-full py-5 rounded-[2rem] bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/20 active:scale-95 transition-all">
                                {isSaving ? <Loader2 className="animate-spin" /> : <Trophy size={18} />} 
                                Spara & Arkivera
                            </button>
                        </div>
                      </div>
                  </div>
              )}

              {gradingPlayer && playlist.length > 0 && (
                  <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
                      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/40 shrink-0">
                              <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center font-black text-xl text-white shadow-xl italic">#{gradingPlayer.number}</div>
                                  <div>
                                      <h4 className="text-xl font-black text-white uppercase italic leading-none">{gradingPlayer.name}</h4>
                                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{playlist[activePlaylistItemIndex].title}</p>
                                  </div>
                              </div>
                              <button onClick={() => setGradingPlayer(null)} className="p-2.5 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-400 transition-colors"><X size={20}/></button>
                          </div>

                          <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
                              <div className="grid grid-cols-1 gap-4">
                                  {activeCriteria.map((c, i) => (
                                      <div key={i} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-inner">
                                          <div className="flex justify-between items-center px-1">
                                              <div className="flex items-center gap-2">
                                                  <div className={`p-1.5 rounded-lg ${viewMode === 'basket' ? 'bg-orange-600/10 text-orange-500' : 'bg-blue-600/10 text-blue-500'}`}>
                                                      <c.icon size={14} />
                                                  </div>
                                                  <div>
                                                      <span className="text-[10px] font-black text-white uppercase tracking-wider">{c.label}</span>
                                                      <p className="text-[7px] font-bold text-slate-600 uppercase tracking-tighter leading-none">{c.desc}</p>
                                                  </div>
                                              </div>
                                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 ${currentScores[i] >= 4 ? 'text-emerald-500' : currentScores[i] <= 2 ? 'text-rose-500' : 'text-orange-500'}`}>NIVÅ {currentScores[i]}</span>
                                          </div>
                                          <div className="flex gap-1">
                                              {[1, 2, 3, 4, 5].map(v => (
                                                  <button 
                                                    key={v} 
                                                    onClick={() => { const next = [...currentScores]; next[i] = v; setCurrentScores(next); }} 
                                                    className={`flex-1 h-10 rounded-xl font-black text-xs transition-all border ${currentScores[i] === v ? (viewMode === 'basket' ? 'bg-orange-600 border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-blue-600 border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)]') + ' text-white scale-[1.05] z-10' : 'bg-slate-900 border-slate-800 text-slate-600 hover:text-slate-400'}`}
                                                  >
                                                      {v}
                                                  </button>
                                              ))}
                                          </div>
                                      </div>
                                  ))}
                              </div>

                              <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2"><MessageSquare size={12}/> Coach-notering</label>
                                  <textarea 
                                    value={currentNote} 
                                    onChange={e => setCurrentNote(e.target.value)} 
                                    placeholder="Extra pepp eller tips..." 
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-white outline-none focus:border-orange-500 h-24 resize-none transition-all shadow-inner" 
                                  />
                              </div>
                          </div>

                          <div className="p-6 md:p-8 bg-slate-950/60 border-t border-slate-800 shrink-0">
                              <button onClick={savePlayerEvaluation} className="w-full py-5 rounded-[2rem] bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs shadow-xl shadow-emerald-900/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                                  <Check size={20}/> Spara Bedömning
                              </button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}

      {showAddExerciseModal && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
              <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/40 shrink-0">
                      <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Välj Nästa Övning</h3>
                      <button onClick={() => setShowAddExerciseModal(false)} className="p-2.5 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-400 transition-colors"><X size={20}/></button>
                  </div>
                  <div className="p-6 md:p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
                      {/* Exercise Selection */}
                      <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                              <div className="flex gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                                  <button 
                                      onClick={() => setAddExerciseTab('basket')}
                                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${addExerciseTab === 'basket' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                  >
                                      Basket
                                  </button>
                                  <button 
                                      onClick={() => setAddExerciseTab('fys')}
                                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${addExerciseTab === 'fys' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                  >
                                      Fys
                                  </button>
                                  <button 
                                      onClick={() => setAddExerciseTab('warmup')}
                                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${addExerciseTab === 'warmup' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                  >
                                      Uppvärmning
                                  </button>
                              </div>
                              <div className="relative w-full sm:w-64">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                  <input 
                                      type="text"
                                      placeholder="Sök i hela biblioteket..."
                                      value={addExerciseSearch}
                                      onChange={(e) => setAddExerciseSearch(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-[10px] font-black uppercase text-white outline-none focus:border-orange-500 transition-all"
                                  />
                              </div>
                          </div>

                          <div className="space-y-6 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                              {addExerciseTab === 'warmup' ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {mockWarmupExercises.filter(ex => 
                                          ex.title.toLowerCase().includes(addExerciseSearch.toLowerCase()) || 
                                          ex.description.toLowerCase().includes(addExerciseSearch.toLowerCase())
                                      ).map(ex => (
                                          <button 
                                              key={ex.id} 
                                              onClick={() => setNewExerciseSelection(ex)} 
                                              className={`p-4 rounded-xl text-left border text-[10px] font-black uppercase transition-all ${newExerciseSelection?.id === ex.id ? 'border-purple-500 bg-purple-500/10 text-purple-400 shadow-inner' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                          >
                                              <div className="flex justify-between items-start gap-2">
                                                  <span className="flex-1">{ex.title}</span>
                                                  <span className="text-[7px] opacity-50 shrink-0">Uppvärmning</span>
                                              </div>
                                          </button>
                                      ))}
                                  </div>
                              ) : (
                                  Object.entries(
                                      phases.flatMap(p => p.exercises)
                                          .filter(ex => {
                                              const isFys = ex.category === 'Fysik' || ex.category === 'Kondition';
                                              const matchesTab = addExerciseTab === 'fys' ? isFys : !isFys;
                                              const matchesSearch = ex.title.toLowerCase().includes(addExerciseSearch.toLowerCase()) || 
                                                                   ex.category.toLowerCase().includes(addExerciseSearch.toLowerCase());
                                              return matchesTab && matchesSearch;
                                          })
                                          .reduce((acc, ex) => {
                                              if (!acc[ex.category]) acc[ex.category] = [];
                                              acc[ex.category].push(ex);
                                              return acc;
                                          }, {} as Record<string, Exercise[]>)
                                  ).map(([category, items]) => (
                                      <div key={category} className="space-y-2">
                                          <div className="flex items-center gap-2 px-2">
                                              <div className="h-[1px] flex-1 bg-slate-800"></div>
                                              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{category}</span>
                                              <div className="h-[1px] flex-1 bg-slate-800"></div>
                                          </div>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                              {items.map(ex => (
                                                  <button 
                                                      key={ex.id} 
                                                      onClick={() => setNewExerciseSelection(ex)} 
                                                      className={`p-4 rounded-xl text-left border text-[10px] font-black uppercase transition-all ${newExerciseSelection?.id === ex.id ? (addExerciseTab === 'basket' ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-blue-500 bg-blue-500/10 text-blue-400') + ' shadow-inner' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                                  >
                                                      <div className="flex flex-col gap-1">
                                                          <span className="flex-1 truncate">{ex.title}</span>
                                                          <div className="flex items-center gap-1.5">
                                                              {ex.duration && <span className="text-[7px] opacity-40 shrink-0 flex items-center gap-1"><Timer size={8}/> {ex.duration}m</span>}
                                                              <span className="text-[8px] font-bold text-orange-500/40">#{ex.id}</span>
                                                          </div>
                                                      </div>
                                                  </button>
                                              ))}
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>

                      {/* Time Selection */}
                      {addExerciseTab !== 'warmup' && (
                          <div className="space-y-3">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">2. Sätt Tid (Minuter)</label>
                              <div className="flex gap-2">
                                  {[5, 10, 15, 20].map(t => (
                                      <button 
                                          key={t}
                                          onClick={() => setNewExerciseTime(t)}
                                          className={`flex-1 py-4 rounded-xl font-black text-sm border transition-all ${newExerciseTime === t ? 'bg-orange-600 border-orange-400 text-white shadow-lg scale-105' : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-600'}`}
                                      >
                                          {t} min
                                      </button>
                                  ))}
                              </div>
                              <div className="flex items-center gap-4 mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
                                  <span className="text-xs font-black text-slate-500 uppercase">Annan tid:</span>
                                  <input 
                                      type="number" 
                                      value={newExerciseTime} 
                                      onChange={(e) => setNewExerciseTime(Number(e.target.value))}
                                      className="w-20 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-black text-center outline-none focus:border-orange-500"
                                      min="1"
                                  />
                                  <span className="text-xs font-black text-slate-500 uppercase">minuter</span>
                              </div>
                          </div>
                      )}
                  </div>
                  <div className="p-6 md:p-8 bg-slate-950/60 border-t border-slate-800 shrink-0">
                      <button 
                          disabled={!newExerciseSelection}
                          onClick={() => {
                              if (newExerciseSelection) {
                                  const isWarmup = addExerciseTab === 'warmup';
                                  const newItem: PlaylistItem = {
                                      id: newExerciseSelection.id,
                                      title: newExerciseSelection.title,
                                      duration: isWarmup ? (parseInt((newExerciseSelection as WarmupExercise).duration) * 60 || 300) : (newExerciseTime * 60),
                                      type: isWarmup ? 'warmup' : 'main',
                                      exercise: newExerciseSelection
                                  };
                                  setPlaylist(prev => [...prev, newItem]);
                                  setActivePlaylistItemIndex(playlist.length);
                                  setCountdownTime(newExerciseTime * 60);
                                  setTimerMode('countdown');
                                  setTimer(0);
                                  setIsPaused(true);
                                  setShowAddExerciseModal(false);
                              }
                          }} 
                          className="w-full py-5 rounded-[2rem] bg-orange-600 hover:bg-orange-500 text-white font-black uppercase text-xs shadow-xl shadow-orange-900/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                          Lägg till & Starta Nästa <Play size={16} fill="currentColor" />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showWarmupLibrary && (
        <div className="fixed inset-0 z-[700] bg-slate-950/95 backdrop-blur-xl p-4 md:p-10 overflow-y-auto custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
              <button 
                onClick={() => setShowWarmupLibrary(false)}
                className="px-6 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs font-black uppercase flex items-center gap-2 hover:bg-slate-800 transition-all"
              >
                <ChevronLeft size={16} /> Tillbaka till setup
              </button>
              <div className="text-right">
                <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Valda övningar</div>
                <div className="text-2xl font-black text-white italic uppercase">{selectedWarmupIds.length} st</div>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-[3rem] p-8 md:p-12">
              <WarmupLibrary 
                isSelectionMode={true}
                selectedIds={selectedWarmupIds}
                onSelect={(ex) => {
                  setSelectedWarmupIds(prev => 
                    prev.includes(ex.id) ? prev.filter(id => id !== ex.id) : [...prev, ex.id]
                  );
                }}
              />
            </div>

            <button 
              onClick={() => setShowWarmupLibrary(false)}
              className="w-full py-6 rounded-[2rem] bg-orange-600 text-white font-black uppercase text-sm shadow-2xl shadow-orange-900/40 flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              Bekräfta Uppvärmningsplan <Check size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
