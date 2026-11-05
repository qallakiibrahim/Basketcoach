import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Player,
  MatchRecord,
  TrainingSession,
  Badge,
  Exercise,
  Phase,
  Homework,
} from "../types";
import { dataService } from "../services/dataService";
import {
  Trophy,
  Target,
  CheckCircle2,
  Zap,
  Heart,
  BrainCircuit,
  LogOut,
  Dumbbell,
  Eye,
  Star,
  Award,
  Lock,
  Play,
  Youtube,
  X,
  Info,
  Lightbulb,
  Egg,
  GlassWater,
  Moon,
  Carrot,
  Send,
  Bot,
  Loader2,
  Maximize2,
  Minimize2,
  ChevronRight,
  BookOpen,
  ExternalLink,
  Search,
  Flame,
  Sparkles,
  Circle,
  Medal,
  ClipboardList,
  Activity,
  Calendar,
  MessageSquareText,
} from "lucide-react";
import { SupportModal } from "./SupportModal";
import { PlayerChat } from "./PlayerChat";
import { chatService } from "../services/chatService";

interface PlayerPortalProps {
  player: Player;
  coachId?: string;
  onLogout: () => void;
  isPreview?: boolean;
}

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

// Synkade färger från Roster.tsx för konsekvent UI
const SKILL_THEMES: Record<string, string> = {
  Skytte: "bg-rose-500",
  Dribbling: "bg-amber-500",
  Passning: "bg-blue-500",
  Försvar: "bg-emerald-500",
  Spelförståelse: "bg-purple-500",
  Kondition: "bg-cyan-500",
  Fysik: "bg-indigo-500",
};

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

const RadarChart = ({ skills }: { skills: Record<string, number> }) => {
  // Exakta etiketter från coachens vy för 1:1 synk
  const labels = [
    "Dribbling",
    "Spelförståelse",
    "Skytte",
    "Försvar",
    "Fysik",
    "Passning",
    "Kondition",
  ];
  const numPoints = labels.length;
  const radius = 75;
  const center = 100;
  const points = labels.map((label, i) => {
    const value = skills[label] || 5;
    const angle = (Math.PI * 2 * i) / numPoints - Math.PI / 2;
    const r = (value / 10) * radius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  });
  const pathData =
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") +
    " Z";

  return (
    <div className="relative w-full aspect-square max-w-[280px] mx-auto">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-500/5 to-transparent opacity-50"></div>
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full overflow-visible relative z-10"
      >
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((scale, idx) => (
          <circle
            key={idx}
            cx={center}
            cy={center}
            r={radius * scale}
            fill="none"
            stroke="white"
            strokeWidth="0.5"
            strokeOpacity="0.1"
          />
        ))}
        {labels.map((_, i) => {
          const angle = (Math.PI * 2 * i) / numPoints - Math.PI / 2;
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos(angle)}
              y2={center + radius * Math.sin(angle)}
              stroke="white"
              strokeWidth="0.5"
              strokeOpacity="0.1"
            />
          );
        })}
        <path
          d={pathData}
          fill="rgba(249, 115, 22, 0.2)"
          stroke="#f97316"
          strokeWidth="3"
          className="drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3.5"
            fill="white"
            className="drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]"
          />
        ))}
        {labels.map((label, i) => {
          const angle = (Math.PI * 2 * i) / numPoints - Math.PI / 2;
          const r = radius + 25;
          const x = center + r * Math.cos(angle);
          const y = center + r * Math.sin(angle);
          return (
            <text
              key={i}
              x={x}
              y={y}
              fill="#94a3b8"
              fontSize="8"
              fontWeight="900"
              textAnchor="middle"
              dominantBaseline="middle"
              className="uppercase tracking-widest"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export const PlayerPortal: React.FC<PlayerPortalProps> = ({
  player,
  coachId,
  onLogout,
  isPreview = false,
}) => {
  const [activeTab, setActiveTab] = useState<
    "career" | "training" | "fuel" | "matches" | "ai" | "chat"
  >("career");
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null,
  );
  const [trainingSearch, setTrainingSearch] = useState("");
  const [exerciseViewMode, setExerciseViewMode] = useState<"video" | "info">(
    "video",
  );
  const [loading, setLoading] = useState(true);
  const [myPlayer, setMyPlayer] = useState<Player>(player);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  const [fuelChecks, setFuelChecks] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(
      `fuel_${player.id}_${new Date().toISOString().split("T")[0]}`,
    );
    return saved
      ? JSON.parse(saved)
      : { protein: false, water: false, greens: false, sleep: false };
  });

  const isSniperUnlocked = (myPlayer.skillAssessment?.["Skytte"] || 0) > 8;
  const isProfessorUnlocked =
    myPlayer.homework &&
    myPlayer.homework.length > 0 &&
    myPlayer.homework.every((hw) => hw.completed);

  const [showAiChat, setShowAiChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [showQuestComplete, setShowQuestComplete] = useState(false);
  const [questTitle, setQuestTitle] = useState("");
  const [isAnalyzingPerformance, setIsAnalyzingPerformance] = useState(false);

  const handleAnalyzePerformance = async () => {
    setIsAnalyzingPerformance(true);
    try {
      const res = await fetch('/api/gemini/player-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: myPlayer.name,
          skillAssessment: myPlayer.skillAssessment,
          matches: matches.map((m) => ({
            opponent: m.opponent,
            score: m.score,
            opponentScore: m.opponentScore,
            feedback: m.feedbacks.find((f) => f.playerId === myPlayer.id),
          })),
          allExercises: allExercises.map((e) => ({ id: e.id, title: e.title, category: e.category })),
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const result = await res.json();

      const updatedPlayer = {
        ...myPlayer,
        aiFeedback: result.feedback,
        suggestedDrills: result.suggestedDrills,
      };

      setMyPlayer(updatedPlayer);
      await dataService.updatePlayer(
        updatedPlayer.id,
        {
          aiFeedback: result.feedback,
          suggestedDrills: result.suggestedDrills,
        },
        coachId,
      );
    } catch (err) {
      console.error("Failed to analyze performance", err);
    } finally {
      setIsAnalyzingPerformance(false);
    }
  };

  useEffect(() => {
    if (!coachId) return;
    const unsubscribe = chatService.subscribeToAllMessages(coachId, (messages) => {
      const unread = messages.filter(msg => {
        const isRelevant = msg.recipientId === 'TEAM' || msg.recipientId === player.id;
        return isRelevant && msg.senderRole === 'coach' && !msg.readBy.includes(player.id);
      }).length;
      setUnreadChatCount(unread);
    });
    return () => unsubscribe();
  }, [coachId, player.id]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [allMatches, allSessions, phases, currentPlayers] =
        await Promise.all([
          dataService.getMatches(coachId),
          dataService.getSessions(coachId),
          dataService.getUnifiedPhases(coachId),
          dataService.getPlayers(coachId),
        ]);
      const updatedMe = currentPlayers.find((p) => p.id === player.id);
      if (updatedMe) setMyPlayer(updatedMe);
      const myMatches = allMatches.filter((m) =>
        m.feedbacks.some((f) => f.playerId === player.id),
      );
      setMatches(myMatches);
      setSessions(allSessions);
      setAllExercises(phases.flatMap((p) => p.exercises));
      setLoading(false);
    };
    loadData();
  }, [player.id, activeTab, coachId]);

  useEffect(() => {
    localStorage.setItem(
      `fuel_${player.id}_${new Date().toISOString().split("T")[0]}`,
      JSON.stringify(fuelChecks),
    );
  }, [fuelChecks, player.id]);

  const toggleFuel = (key: string) => {
    setFuelChecks((prev) => {
      const isCompleting = !prev[key];
      if (isCompleting) {
        const labels: Record<string, string> = {
          protein: "ÄGG/PROTEIN FRUKOST",
          water: "DRICK 1.5L VATTEN",
          greens: "FRUKT/GRÖNT SNACK",
          sleep: "8H SÖMN INATT",
        };
        setQuestTitle(labels[key] || "FUEL STATION");
        setShowQuestComplete(true);
        setTimeout(() => setShowQuestComplete(false), 3000);
      }
      return { ...prev, [key]: !prev[key] };
    });
  };

  const gamification = useMemo(() => {
    const skills = Object.values(myPlayer.skillAssessment || {}) as number[];
    const avgSkill =
      skills.length > 0 ? skills.reduce((a, b) => a + b, 0) / skills.length : 5;
    const ovr = Math.min(99, Math.round(50 + avgSkill * 5));
    return {
      ovr,
      level: Math.floor(ovr / 10),
      progressToNext: (ovr % 10) * 10,
    };
  }, [myPlayer]);

  const myTrainingPlan = useMemo(
    () =>
      (myPlayer.individualPlan || [])
        .map((id) => allExercises.find((e) => e.id === id))
        .filter((e): e is Exercise => !!e),
    [myPlayer.individualPlan, allExercises],
  );

  const handleToggleHomework = async (homeworkId: string) => {
    const hw = myPlayer.homework?.find((h) => h.id === homeworkId);
    const isCompleting = hw && !hw.completed;

    const updatedHomework = (myPlayer.homework || []).map((h) =>
      h.id === homeworkId ? { ...h, completed: !h.completed } : h,
    );
    setMyPlayer((prev) => ({ ...prev, homework: updatedHomework }));

    if (isCompleting) {
      setQuestTitle(hw.title);
      setShowQuestComplete(true);
      setTimeout(() => setShowQuestComplete(false), 3000);
    }

    try {
      await dataService.toggleHomework(myPlayer.id, homeworkId, coachId);
    } catch (err) {
      console.error("Failed to toggle homework", err);
    }
  };

  const handleAiAsk = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || !selectedExercise) return;
    const userMsg: ChatMessage = { role: "user", text: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/gemini/player-ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseTitle: selectedExercise.title,
          question: chatInput,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: data.text || "Jag kunde inte svara just nu, träna på!",
        },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "model", text: "Kunde inte nå coachen just nu." },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans pb-24 relative overflow-x-hidden">
      {showSupport && (
        <SupportModal userRole="player" onClose={() => setShowSupport(false)} />
      )}
      {/* PROFILE HEADER */}
      <header className="relative pt-12 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-[#020617] to-[#020617]"></div>
        <div className="relative z-10 max-w-md mx-auto">
          <div className="bg-[#0a0f1d] rounded-[3rem] border border-slate-800 shadow-2xl overflow-hidden p-8 pt-10">
            <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col">
                <div className="text-6xl font-black text-orange-500 leading-none tracking-tighter drop-shadow-[0_0_15px_rgba(249,115,22,0.4)]">
                  {gamification.ovr}
                </div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">
                  OVR RATING
                </div>
              </div>
              <button
                onClick={() => setShowSupport(true)}
                className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-700 shadow-inner hover:border-blue-500 transition-all text-blue-500"
              >
                <MessageSquareText size={20} />
              </button>
            </div>

            <div className="relative flex flex-col items-center">
              <div className="w-32 h-32 bg-slate-950 rounded-full border-4 border-slate-800 flex items-center justify-center relative overflow-hidden shadow-2xl mb-6">
                <span className="text-5xl font-black text-slate-800 italic">
                  #{myPlayer.number}
                </span>
                <div className="absolute bottom-0 bg-orange-600 px-3 py-1 rounded-full border-2 border-slate-900 translate-y-1 shadow-xl z-20">
                  <span className="text-[10px] font-black text-white uppercase italic tracking-widest">
                    LVL {gamification.level}
                  </span>
                </div>
              </div>

              <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-6">
                {myPlayer.name}
              </h1>

              <div className="w-full space-y-2">
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden shadow-inner border border-white/5 relative">
                  <div
                    className="absolute top-0 left-0 h-full bg-orange-600 shadow-[0_0_10px_rgba(234,88,12,0.5)] transition-all duration-1000"
                    style={{ width: `${gamification.progressToNext}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                  <span>Nivå {gamification.level}</span>
                  <span>{gamification.progressToNext}% till nästa</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="absolute top-6 right-6 p-3 bg-slate-800/80 rounded-2xl text-white hover:bg-rose-600 backdrop-blur-md z-50 transition-all shadow-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
        >
          {isPreview ? <X size={16} /> : <LogOut size={16} />}
          {isPreview ? "Avsluta Preview" : "Logga ut"}
        </button>
      </header>

      <main className={`max-w-lg mx-auto ${activeTab === 'chat' ? 'px-0 md:px-4' : 'px-4'} -mt-6 relative z-20 ${activeTab === 'chat' ? 'space-y-0' : 'space-y-6'}`}>
        <nav className={`flex p-1 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl sticky top-4 z-40 ${activeTab === 'chat' ? 'mx-4 mb-4' : ''}`}>
          {(["career", "training", "fuel", "matches", "ai", "chat"] as const).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? "bg-slate-800 text-white shadow-lg" : "text-slate-500"}`}
              >
                {tab === "career"
                  ? "Profil"
                  : tab === "fuel"
                    ? "Kost"
                    : tab === "matches"
                      ? "Match"
                      : tab === "ai"
                        ? "AI"
                        : tab === "chat"
                          ? "Chat"
                          : "Träning"}
                {tab === "chat" && unreadChatCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-slate-900 animate-bounce"></span>
                )}
              </button>
            ),
          )}
        </nav>

        {activeTab === "chat" && coachId && (
          <PlayerChat player={myPlayer} coachId={coachId} />
        )}

        {activeTab === "training" && (
          <div className="space-y-10 animate-in slide-in-from-right duration-300 pb-20">
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <ClipboardList size={16} className="text-slate-500" />
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  COACHUPPDRAG
                </h3>
              </div>
              <div className="space-y-3">
                {(myPlayer.homework || []).map((hw) => (
                  <div
                    key={hw.id}
                    onClick={() => handleToggleHomework(hw.id)}
                    className="p-5 rounded-[2rem] bg-[#0a0f1d] border border-slate-800/50 flex items-center gap-5 group shadow-lg cursor-pointer hover:bg-slate-900 transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${hw.completed ? "bg-blue-600 border-blue-600" : "border-slate-800"}`}
                    >
                      {hw.completed ? (
                        <CheckCircle2 size={16} className="text-white" />
                      ) : (
                        <Circle size={16} className="text-slate-800" />
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-black uppercase tracking-tight ${hw.completed ? "text-slate-600 line-through" : "text-white"}`}
                    >
                      {hw.title}
                    </span>
                  </div>
                ))}
                {(myPlayer.homework || []).length === 0 && (
                  <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-[2rem] opacity-30">
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      Inga aktiva uppdrag just nu.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Target size={16} className="text-orange-500" />
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      DIN UTVECKLINGSPLAN
                    </h3>
                  </div>
                  <div className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-lg active:scale-95 transition-transform">
                    {myTrainingPlan.length} ÖVNINGAR
                  </div>
                </div>

                {/* SEARCH BAR */}
                <div className="px-1">
                  <div className="relative group">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-orange-500 transition-colors" />
                    <input 
                      type="text"
                      placeholder="Sök i din plan..."
                      value={trainingSearch}
                      onChange={(e) => setTrainingSearch(e.target.value)}
                      className="w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl py-4 pl-10 pr-4 text-[11px] font-black uppercase tracking-widest focus:outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all placeholder:text-slate-700 shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-8 pb-10">
                  {myTrainingPlan.length > 0 ? (
                    Object.entries(
                      myTrainingPlan
                        .filter(ex => 
                          ex.title.toLowerCase().includes(trainingSearch.toLowerCase()) ||
                          ex.category.toLowerCase().includes(trainingSearch.toLowerCase())
                        )
                        .reduce((acc, ex) => {
                          if (!acc[ex.category]) acc[ex.category] = [];
                          acc[ex.category].push(ex);
                          return acc;
                        }, {} as Record<string, Exercise[]>)
                    ).map(([category, exercises]) => (
                      <div key={category} className="space-y-3">
                        <div className="flex items-center gap-2 px-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${SKILL_THEMES[category] || 'bg-slate-500'} shadow-[0_0_8px_rgba(255,255,255,0.2)]`} />
                          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{category}</span>
                          <div className="h-[1px] flex-1 bg-slate-800/50"></div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2">
                          {exercises.map((ex) => (
                            <div
                              key={ex.id}
                              onClick={() => {
                                setSelectedExercise(ex);
                                setIsPlaying(false);
                                setExerciseViewMode("video");
                              }}
                              className="p-4 rounded-[1.5rem] bg-[#0a0f1d] border border-slate-800 hover:border-slate-700/50 flex items-center gap-5 transition-all cursor-pointer shadow-lg active:scale-[0.98] group"
                            >
                              <div className={`w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 text-xl font-black transition-colors group-hover:border-orange-500/30 ${SKILL_THEMES[category]?.replace('bg-', 'text-') || 'text-slate-700'}`}>
                                {ex.title.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-black text-white italic uppercase tracking-tight group-hover:text-orange-400 transition-colors truncate">
                                  {ex.title}
                                </h4>
                                <div className="flex items-center gap-3 mt-1">
                                  <p className="text-[8px] font-bold text-slate-600 uppercase flex items-center gap-1">
                                    <Play size={10} className="fill-current" /> Video
                                  </p>
                                  {ex.duration && (
                                    <p className="text-[8px] font-bold text-slate-600 uppercase flex items-center gap-1">
                                      <Activity size={10} /> {ex.duration}m
                                    </p>
                                  )}
                                </div>
                              </div>
                              <ChevronRight size={18} className="text-slate-800 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-[2rem] opacity-30">
                      <p className="text-[10px] font-black uppercase tracking-widest">
                        Planen är tom. Prata med coachen!
                      </p>
                    </div>
                  )}
                  
                  {myTrainingPlan.length > 0 && myTrainingPlan.filter(ex => 
                    ex.title.toLowerCase().includes(trainingSearch.toLowerCase()) ||
                    ex.category.toLowerCase().includes(trainingSearch.toLowerCase())
                  ).length === 0 && (
                    <div className="py-12 text-center text-slate-600">
                      <Search size={32} className="mx-auto mb-3 opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Inga övningar matchar sökningen</p>
                    </div>
                  )}
                </div>
              </div>
          </div>
        )}

        {activeTab === "matches" && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20">
            <div className="flex items-center gap-2 px-2">
              <Trophy size={16} className="text-slate-500" />
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                MATCHLOGG ({matches.length})
              </h3>
            </div>

            <div className="space-y-4">
              {matches
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
                )
                .map((m) => {
                  const feedback = m.feedbacks.find(
                    (f) => f.playerId === player.id,
                  );
                  const isWin = m.score > m.opponentScore;
                  return (
                    <div
                      key={m.id}
                      className="p-6 rounded-[2.5rem] bg-[#0a0f1d] border border-slate-800/50 space-y-6 shadow-xl relative overflow-hidden group"
                    >
                      <div
                        className={`absolute top-0 left-0 w-1.5 h-full ${isWin ? "bg-emerald-500" : "bg-rose-500"}`}
                      ></div>

                      <div className="flex justify-between items-start pl-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-slate-500 text-[8px] font-black uppercase tracking-widest">
                            <Calendar size={10} /> {m.date}
                          </div>
                          <h4 className="text-xl font-black text-white italic uppercase tracking-tighter leading-none">
                            {m.opponent}
                          </h4>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div
                            className={`px-4 py-2 rounded-2xl font-black text-lg shadow-inner ${isWin ? "bg-emerald-600/10 border border-emerald-500/20 text-emerald-500" : "bg-rose-600/10 border border-rose-500/20 text-rose-500"}`}
                          >
                            {m.score} - {m.opponentScore}
                          </div>
                          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mr-1">
                            {isWin ? "VINST" : "FÖRLUST"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-900 flex flex-col items-center gap-2 group-hover:border-yellow-500/30 transition-colors">
                          <span className="text-[7px] font-black text-slate-600 uppercase tracking-[0.2em]">
                            ANSTRÄNGNING
                          </span>
                          <div className="flex items-center gap-1.5 text-yellow-500 font-black italic">
                            <Zap size={14} fill="currentColor" />{" "}
                            {feedback?.effort || 3}
                          </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-900 flex flex-col items-center gap-2 group-hover:border-rose-500/30 transition-colors">
                          <span className="text-[7px] font-black text-slate-600 uppercase tracking-[0.2em]">
                            LAGANDA
                          </span>
                          <div className="flex items-center gap-1.5 text-rose-500 font-black italic">
                            <Heart size={14} fill="currentColor" />{" "}
                            {feedback?.teamwork || 3}
                          </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-900 flex flex-col items-center gap-2 group-hover:border-emerald-500/30 transition-colors">
                          <span className="text-[7px] font-black text-slate-600 uppercase tracking-[0.2em]">
                            LÄRANDE
                          </span>
                          <div className="flex items-center gap-1.5 text-emerald-500 font-black italic">
                            <Target size={14} fill="currentColor" />{" "}
                            {feedback?.learning || 3}
                          </div>
                        </div>
                      </div>

                      {m.teamSummary && (
                        <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
                          <p className="text-[9px] text-slate-400 italic font-medium leading-relaxed">
                            Coach: "{m.teamSummary}"
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              {matches.length === 0 && (
                <div className="p-20 text-center border-2 border-dashed border-slate-800 rounded-[2.5rem] opacity-30">
                  <Activity className="mx-auto mb-4 text-slate-600" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                    Ingen matchdata än.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "fuel" && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-500 pb-20">
            <div className="p-10 rounded-[3rem] bg-gradient-to-br from-[#0a191f] to-[#050c0e] border-2 border-[#162d35] text-center space-y-2 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500 via-transparent to-transparent"></div>
              <h2 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase leading-none">
                FUEL STATION
              </h2>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">
                OPTIMERA DIN ÅTERHÄMTNING
              </p>
            </div>
            <div className="space-y-3">
              {[
                {
                  key: "protein",
                  icon: Egg,
                  label: "ÄGG/PROTEIN FRUKOST",
                  color: "text-orange-400",
                },
                {
                  key: "water",
                  icon: GlassWater,
                  label: "DRICK 1.5L VATTEN",
                  color: "text-blue-400",
                },
                {
                  key: "greens",
                  icon: Carrot,
                  label: "FRUKT/GRÖNT SNACK",
                  color: "text-emerald-400",
                },
                {
                  key: "sleep",
                  icon: Moon,
                  label: "8H SÖMN INATT",
                  color: "text-purple-400",
                },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => toggleFuel(item.key)}
                  className={`w-full p-5 rounded-[2rem] bg-[#0a0f1d] border border-slate-800/50 flex items-center gap-6 transition-all group active:scale-[0.98] ${fuelChecks[item.key] ? "border-emerald-500/30 bg-emerald-500/5" : "hover:border-slate-700"}`}
                >
                  <div
                    className={`w-12 h-12 rounded-2xl bg-slate-950 border-2 flex items-center justify-center transition-colors ${fuelChecks[item.key] ? "border-emerald-500 bg-emerald-500" : "border-slate-800"}`}
                  >
                    {fuelChecks[item.key] ? (
                      <CheckCircle2 size={24} className="text-white" />
                    ) : (
                      <Circle size={24} className="text-slate-800" />
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center ${item.color}`}
                    >
                      <item.icon size={20} />
                    </div>
                    <span
                      className={`text-xs md:text-sm font-black italic uppercase tracking-tight text-left ${fuelChecks[item.key] ? "text-white" : "text-slate-400"}`}
                    >
                      {item.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "ai" && (
          <div className="space-y-8 animate-in slide-in-from-left duration-300 pb-20">
            <div className="p-8 rounded-[3rem] bg-[#0a0f1d] border border-slate-800 shadow-2xl flex flex-col items-center relative overflow-hidden">
              <div className="w-full flex items-center justify-between gap-2 mb-8 px-2 relative z-10">
                <div className="flex items-center gap-2">
                  <Bot size={16} className="text-indigo-500" />
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    AI PRESTATIONSANALYS
                  </h3>
                </div>
                <button
                  onClick={handleAnalyzePerformance}
                  disabled={isAnalyzingPerformance}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isAnalyzingPerformance ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"}`}
                >
                  {isAnalyzingPerformance ? (
                    <>
                      <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                      Analyserar...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Ny Analys
                    </>
                  )}
                </button>
              </div>

              {myPlayer.aiFeedback ? (
                <div className="w-full space-y-6 relative z-10">
                  <div className="p-6 rounded-2xl bg-slate-900/50 border border-indigo-500/20">
                    <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <MessageSquareText size={14} />
                      Feedback
                    </h4>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {myPlayer.aiFeedback}
                    </p>
                  </div>

                  {myPlayer.suggestedDrills &&
                    myPlayer.suggestedDrills.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2 px-2">
                          <Target size={14} />
                          Rekommenderade Övningar
                        </h4>
                        <div className="grid gap-3">
                          {myPlayer.suggestedDrills.map((drillId, idx) => {
                            const exercise = allExercises.find(
                              (e) => e.id === drillId,
                            );
                            if (!exercise) return null;
                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  setSelectedExercise(exercise);
                                  setExerciseViewMode("video");
                                }}
                                className="w-full p-4 rounded-2xl bg-slate-900/50 border border-emerald-500/20 flex items-center justify-between group hover:bg-slate-800 transition-colors text-left"
                              >
                                <div>
                                  <h5 className="text-sm font-bold text-white">
                                    {exercise.title}
                                  </h5>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                                    {exercise.category}
                                  </p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                  <Play size={14} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                <div className="w-full py-12 flex flex-col items-center justify-center text-center relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-slate-600">
                    <Bot size={32} />
                  </div>
                  <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">
                    Ingen analys ännu
                  </h4>
                  <p className="text-xs text-slate-500 max-w-[250px]">
                    Klicka på "Ny Analys" för att låta AI analysera din profil
                    och dina senaste matcher.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "career" && (
          <div className="space-y-8 animate-in slide-in-from-left duration-300 pb-20">
            <div className="p-8 rounded-[3rem] bg-[#0a0f1d] border border-slate-800 shadow-2xl flex flex-col items-center relative overflow-hidden">
              <div className="w-full flex items-center gap-2 mb-8 px-2 relative z-10">
                <Star
                  size={16}
                  className="text-yellow-500"
                  fill="currentColor"
                />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  DIN SPELARPROFIL
                </h3>
              </div>
              <RadarChart skills={myPlayer.skillAssessment || {}} />
              <div className="w-full space-y-5 mt-12 px-2 relative z-10">
                {[
                  {
                    label: "Dribbling",
                    val: myPlayer.skillAssessment?.["Dribbling"] || 5,
                    color: SKILL_THEMES["Dribbling"],
                  },
                  {
                    label: "Spelförståelse",
                    val: myPlayer.skillAssessment?.["Spelförståelse"] || 5,
                    color: SKILL_THEMES["Spelförståelse"],
                  },
                  {
                    label: "Skytte",
                    val: myPlayer.skillAssessment?.["Skytte"] || 5,
                    color: SKILL_THEMES["Skytte"],
                  },
                  {
                    label: "Försvar",
                    val: myPlayer.skillAssessment?.["Försvar"] || 5,
                    color: SKILL_THEMES["Försvar"],
                  },
                  {
                    label: "Fysik",
                    val: myPlayer.skillAssessment?.["Fysik"] || 5,
                    color: SKILL_THEMES["Fysik"],
                  },
                  {
                    label: "Passning",
                    val: myPlayer.skillAssessment?.["Passning"] || 5,
                    color: SKILL_THEMES["Passning"],
                  },
                  {
                    label: "Kondition",
                    val: myPlayer.skillAssessment?.["Kondition"] || 5,
                    color: SKILL_THEMES["Kondition"],
                  },
                ].map((skill) => (
                  <div
                    key={skill.label}
                    className="flex items-center justify-between gap-6"
                  >
                    <div className="text-[10px] font-black text-slate-400 tracking-widest w-28 uppercase">
                      {skill.label}
                    </div>
                    <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden relative border border-white/5">
                      <div
                        className={`h-full ${skill.color} rounded-full transition-all duration-1000`}
                        style={{ width: `${(skill.val / 10) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-sm font-black text-white italic w-4 text-right tabular-nums">
                      {skill.val}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <Medal size={16} className="text-slate-500" />
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  TROFÉSAMLING
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`p-6 rounded-[2.5rem] flex flex-col items-center justify-center text-center transition-all duration-500 ${isSniperUnlocked ? "bg-[#1a0f1a] border border-fuchsia-500/20" : "bg-slate-900/40 border border-slate-800/50 opacity-40 grayscale"}`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-inner ${isSniperUnlocked ? "bg-slate-950 border border-fuchsia-500/30 text-fuchsia-500" : "bg-slate-950 border border-slate-800"}`}
                  >
                    {isSniperUnlocked ? (
                      <Target size={24} />
                    ) : (
                      <Lock size={20} className="text-slate-600" />
                    )}
                  </div>
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest">
                    SNIPER
                  </h4>
                  <p
                    className={`text-[8px] font-bold uppercase mt-1 ${isSniperUnlocked ? "text-fuchsia-400" : "text-slate-500"}`}
                  >
                    Skytte-betyg över 8
                  </p>
                </div>
                <div
                  className={`p-6 rounded-[2.5rem] flex flex-col items-center justify-center text-center transition-all duration-500 ${isProfessorUnlocked ? "bg-[#0f1a1a] border border-teal-500/20" : "bg-slate-900/40 border border-slate-800/50 opacity-40 grayscale"}`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-inner ${isProfessorUnlocked ? "bg-slate-950 border border-teal-500/30 text-teal-500" : "bg-slate-950 border border-slate-800"}`}
                  >
                    {isProfessorUnlocked ? (
                      <BrainCircuit size={24} />
                    ) : (
                      <Lock size={20} className="text-slate-600" />
                    )}
                  </div>
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest">
                    THE PROFESSOR
                  </h4>
                  <p
                    className={`text-[8px] font-bold uppercase mt-1 ${isProfessorUnlocked ? "text-teal-400" : "text-slate-500"}`}
                  >
                    Gjort alla uppdrag
                  </p>
                </div>
                <div className="p-6 rounded-[2.5rem] bg-[#0a1125] border border-blue-500/20 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-blue-500/30 flex items-center justify-center mb-4 text-blue-500 shadow-inner">
                    <Dumbbell size={24} />
                  </div>
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest">
                    GYM RAT
                  </h4>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">
                    Hög närvaro
                  </p>
                </div>
                <div className="p-6 rounded-[2.5rem] bg-[#1a0f0a] border border-orange-500/20 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-orange-500/30 flex items-center justify-center mb-4 text-orange-500 shadow-inner">
                    <Heart size={24} />
                  </div>
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest">
                    HEART & SOUL
                  </h4>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">
                    Matchinsatser
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* EXERCISE DETAIL MODAL */}
      {selectedExercise && (
        <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between p-4 px-6 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                <Flame size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white italic uppercase tracking-tighter leading-none">
                  {selectedExercise.title}
                </h3>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                  {selectedExercise.category} • Utveckling
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedExercise(null);
                setIsPlaying(false);
              }}
              className="p-2.5 bg-slate-800 rounded-full text-white shadow-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-3 px-6 bg-slate-900/50 flex gap-2 shrink-0 overflow-x-auto">
            <button
              onClick={() => setExerciseViewMode("video")}
              className={`flex-1 min-w-[120px] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${exerciseViewMode === "video" ? "bg-red-600 text-white shadow-lg" : "bg-slate-800 text-slate-400"}`}
            >
              <Youtube size={14} /> Video
            </button>
            <button
              onClick={() => setExerciseViewMode("info")}
              className={`flex-1 min-w-[120px] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${exerciseViewMode === "info" ? "bg-emerald-600 text-white shadow-lg" : "bg-slate-800 text-slate-400"}`}
            >
              <BookOpen size={14} /> Instruktion
            </button>
            <button
              onClick={() => setShowAiChat(true)}
              className="p-3 px-5 rounded-xl bg-indigo-600 text-white shadow-lg flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest"
            >
              <Bot size={14} /> Fråga AI
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            {exerciseViewMode === "video" ? (
              <div className="flex-1 flex flex-col p-6 gap-6">
                <div className="w-full aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl border border-white/5 relative">
                  {(() => {
                    const vId = getVideoId(selectedExercise.videoUrl || "");
                    if (vId) {
                      return (
                        <div className="w-full h-full relative">
                          {!isPlaying ? (
                            <div
                              className="absolute inset-0 z-10 flex flex-col items-center justify-center cursor-pointer group"
                              onClick={() => setIsPlaying(true)}
                            >
                              <img
                                src={`https://img.youtube.com/vi/${vId}/hqdefault.jpg`}
                                alt="Thumbnail"
                                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                              />
                              <div className="relative z-20 w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform shadow-red-600/50">
                                <Play
                                  size={32}
                                  fill="white"
                                  className="text-white ml-1"
                                />
                              </div>
                              <div className="mt-4 relative z-20 px-4 py-2 bg-black/80 rounded-xl border border-white/10 text-white text-[10px] font-black uppercase tracking-widest">
                                Starta Träningsvideo
                              </div>
                            </div>
                          ) : (
                            <iframe
                              src={`https://www.youtube-nocookie.com/embed/${vId}?autoplay=1&mute=0&rel=0&modestbranding=1&playsinline=1`}
                              title={selectedExercise.title}
                              className="w-full h-full absolute inset-0 z-10"
                              allow="autoplay; fullscreen; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          )}
                        </div>
                      );
                    }
                    return (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 gap-3">
                        <Youtube size={64} className="opacity-10" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                          Ingen video tillgänglig
                        </p>
                      </div>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() =>
                      window.open(selectedExercise.videoUrl, "_blank")
                    }
                    className="py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
                  >
                    <ExternalLink size={14} className="text-red-500" /> YouTube
                    App
                  </button>
                  <button
                    onClick={() =>
                      window.open(
                        `https://www.youtube.com/results?search_query=${encodeURIComponent("basketball " + selectedExercise.title)}`,
                        "_blank",
                      )
                    }
                    className="py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
                  >
                    <Search size={14} className="text-blue-500" /> Fler videor
                  </button>
                </div>
                <div className="p-6 rounded-[2rem] bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 text-orange-500">
                    <Zap size={18} />
                    <h4 className="text-xs font-black uppercase tracking-widest">
                      Coach-tips för dig
                    </h4>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed font-medium italic">
                    "{selectedExercise.overview.coachingPoint}"
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 p-6 space-y-8 animate-in slide-in-from-right duration-300">
                <div className="space-y-6">
                  <div className="p-6 rounded-[2rem] bg-blue-600/5 border border-blue-500/20 space-y-3">
                    <div className="flex items-center gap-3 text-blue-400">
                      <div className="p-2 bg-blue-500/10 rounded-xl">
                        <Target size={18} />
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-[0.2em]">
                        VAD (Teknik)
                      </h4>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed font-medium">
                      {selectedExercise.pedagogy?.what ||
                        "Grundläggande basketfärdighet."}
                    </p>
                  </div>
                  <div className="p-6 rounded-[2rem] bg-emerald-600/5 border border-emerald-500/20 space-y-3">
                    <div className="flex items-center gap-3 text-emerald-400">
                      <div className="p-2 bg-emerald-500/10 rounded-xl">
                        <Info size={18} />
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-[0.2em]">
                        HUR (Utförande)
                      </h4>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed font-medium">
                      {selectedExercise.pedagogy?.how ||
                        selectedExercise.overview.action}
                    </p>
                  </div>
                  <div className="p-6 rounded-[2rem] bg-purple-600/5 border border-purple-500/20 space-y-3">
                    <div className="flex items-center gap-3 text-purple-400">
                      <div className="p-2 bg-purple-500/10 rounded-xl">
                        <Lightbulb size={18} />
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-[0.2em]">
                        VARFÖR (Syfte)
                      </h4>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed font-medium">
                      {selectedExercise.pedagogy?.why ||
                        "För att bli en mer komplett spelare och hjälpa laget vinna."}
                    </p>
                  </div>
                </div>
                <div className="p-6 rounded-[2rem] bg-slate-900 border border-slate-800 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                    Checklista för succé
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {(selectedExercise.criteria || []).map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800"
                      >
                        <div className="w-5 h-5 rounded-full bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-500">
                          <CheckCircle2 size={12} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-300 uppercase">
                          {c}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI CHAT OVERLAY */}
      {showAiChat && selectedExercise && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-indigo-600/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <Bot size={24} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase italic tracking-tighter">
                    Fråga AI Coachen
                  </h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">
                    {selectedExercise.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAiChat(false);
                  setChatMessages([]);
                }}
                className="p-2 text-slate-500 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                  <Sparkles size={40} className="text-indigo-400 mb-4" />
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-300">
                    Har du en fråga om övningen? Jag kan förklara tekniken eller
                    ge dig extra tips!
                  </p>
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-2xl text-xs font-medium leading-relaxed ${m.role === "user" ? "bg-indigo-600 text-white rounded-tr-none" : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"}`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-100"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              )}
              <div ref={chatScrollRef} />
            </div>
            <form
              onSubmit={handleAiAsk}
              className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2"
            >
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Skriv din fråga..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isAiLoading}
                className="p-3 bg-indigo-600 text-white rounded-xl disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SOLO LEVELING QUEST COMPLETE ANIMATION */}
      {showQuestComplete && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"></div>
          <div className="relative z-10 flex flex-col items-center animate-in zoom-in-50 slide-in-from-bottom-10 duration-500">
            <div className="absolute inset-0 bg-blue-500 blur-[100px] opacity-50 rounded-full"></div>
            <div className="border-y-4 border-blue-500 bg-gradient-to-r from-transparent via-blue-900/80 to-transparent w-screen py-8 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.5)]">
              <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-100 to-blue-500 tracking-[0.2em] uppercase italic drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]">
                Quest Completed
              </h2>
              <p className="text-blue-200 font-bold tracking-widest uppercase mt-4 text-sm md:text-xl drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]">
                {questTitle}
              </p>
              <div className="mt-6 flex items-center gap-2 text-yellow-400 font-black text-xl animate-pulse">
                <Sparkles size={24} />
                <span>+ EXP GAINED</span>
                <Sparkles size={24} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
