
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Roster } from './components/Roster';
import { Plan } from './components/Plan';
import { Training } from './components/Training';
import { MatchEvaluation } from './components/MatchEvaluation';
import { Account } from './components/Account';
import { VideoAnalysis } from './components/VideoAnalysis';
import { PlayerPortal } from './components/PlayerPortal';
import { AICoach } from './components/AICoach';
import { CoachTools } from './components/CoachTools';
import { MatchLiveScout } from './components/MatchLiveScout';
import { WarmupLibrary } from './components/WarmupLibrary';
import { ChatDashboard } from './components/ChatDashboard';
import { auth, isFirebaseConfigured, googleProvider } from './services/firebase';
import { dataService } from './services/dataService';
// @ts-ignore
import { onAuthStateChanged, signInWithPopup, signOut, signInAnonymously } from 'firebase/auth';
// @ts-ignore
import type { User as FirebaseUser } from 'firebase/auth';
import { Trophy, AlertCircle, UserCheck, Smartphone, Check, ArrowRight, Gamepad2, Loader2, Globe, Copy, ShieldAlert, LogIn, Info, AlertTriangle, CloudLightning, HardDrive, ShieldCheck, Lock, WifiOff, Shield, DatabaseZap, Clock, Radio, User } from 'lucide-react';
import { View, Player } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDenied, setIsDenied] = useState(false);
  
  const [loginError, setLoginError] = useState<{ message: string, isSyncIssue?: boolean, isRuleIssue?: boolean, isIndexIssue?: boolean, isBuilding?: boolean, isAuthDisabled?: boolean } | null>(null);
  const [showPlayerLogin, setShowPlayerLogin] = useState(false);
  const [playerCode, setPlayerCode] = useState("");
  const [loggedInPlayer, setLoggedInPlayer] = useState<Player | null>(null);
  const [currentCoachId, setCurrentCoachId] = useState<string | null>(null);
  const [verifyingCode, setVerifyingCode] = useState(false);

  // Live Scout State
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  useEffect(() => {
    // Kolla om vi har en match-id i URL:en (för scouten)
    const params = new URLSearchParams(window.location.search);
    const mId = params.get('match');
    if (mId) {
        setActiveMatchId(mId);
        setCurrentView(View.LIVE_SCOUT);
    }
  }, []);

  useEffect(() => {
    // Safety timeout for loading state
    const timeout = setTimeout(() => {
      if (authLoading) {
        setAuthLoading(false);
      }
    }, 5000);

    if (isFirebaseConfigured && auth) {
      try {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser: any) => {
          if (currentUser && !currentUser.isAnonymous) {
              try {
                const isAllowed = await dataService.isEmailWhitelisted(currentUser.email);
                setIsDenied(!isAllowed);
              } catch (err) {
                console.error("Whitelist check failed", err);
              }
          }
          setUser(currentUser);
          setAuthLoading(false);
          clearTimeout(timeout);
        });
        return () => {
          unsubscribe();
          clearTimeout(timeout);
        };
      } catch (err) {
        setAuthLoading(false);
        clearTimeout(timeout);
      }
    } else {
      setAuthLoading(false);
      clearTimeout(timeout);
    }
  }, []);


  const createDemoUser = (name: string, id: string) => ({
      uid: id,
      displayName: name,
      email: `${id}@basketcoach.pro`,
      photoURL: null,
      emailVerified: true,
      isAnonymous: true,
      metadata: {},
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => '',
      getIdTokenResult: async () => ({} as any),
      reload: async () => {},
      toJSON: () => ({}),
      phoneNumber: null,
      providerId: 'demo'
  } as any);

  const handleGuestLogin = () => {
    setUser(createDemoUser('Gäst Coach', 'guest'));
    setLoginError(null);
  };

  const handlePlayerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyingCode(true);
    setLoginError(null);
    try {
        const result = await dataService.loginPlayer(playerCode);
        if (result) {
            if (isFirebaseConfigured) {
                try {
                    await signInAnonymously(auth);
                } catch (authErr: any) {
                    if (authErr.code === 'auth/operation-not-allowed') {
                        setLoginError({ message: "Anonym inloggning ej aktiv.", isAuthDisabled: true });
                        setVerifyingCode(false);
                        return;
                    }
                    throw authErr;
                }
            }
            setLoggedInPlayer(result.player);
            setCurrentCoachId(result.coachId);
            setCurrentView(View.PLAYER_PORTAL);
        } else {
            setLoginError({ message: "Ogiltig kod.", isSyncIssue: true });
        }
    } catch (err: any) {
        if (err.message === 'ACCESS_DENIED') {
            setLoginError({ message: "Säkerhetsblockering i Firebase.", isRuleIssue: true });
        } else if (err.message === 'INDEX_BUILDING') {
            setLoginError({ message: "Databasen optimeras...", isIndexIssue: true, isBuilding: true });
        } else if (err.message === 'MISSING_INDEX') {
            setLoginError({ message: "Databas-index saknas.", isIndexIssue: true });
        } else {
            setLoginError({ message: "Ett fel uppstod vid inloggning." });
        }
    } finally {
        setVerifyingCode(false);
    }
  };

  const handleSimulatePlayerLogin = (player: Player) => {
      setLoggedInPlayer(player);
      const coachPath = dataService.getUserPath();
      const coachId = coachPath ? coachPath.split('/')[1] : 'guest';
      setCurrentCoachId(coachId);
      setCurrentView(View.PLAYER_PORTAL);
  };

  const handleGoogleLogin = async () => {
    if (!isFirebaseConfigured) {
      setUser(createDemoUser('Demo Coach', 'demo_user'));
      return;
    }
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      setLoginError({ message: error.message || "Ett okänt fel uppstod." });
    }
  };

  const handleLogout = async () => {
      if (loggedInPlayer) {
          const wasSimulated = user && !user.isAnonymous && !user.uid.startsWith('demo');
          setLoggedInPlayer(null);
          setCurrentCoachId(null);
          
          if (user?.isAnonymous) {
              await signOut(auth);
          }

          if (wasSimulated) {
             setCurrentView(View.ROSTER);
             return;
          }
          setPlayerCode("");
          setCurrentView(View.DASHBOARD);
      } else {
          await signOut(auth);
          setUser(null);
          setIsDenied(false);
      }
  };

  if (authLoading) {
    return (
      <div className="h-screen w-full bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (isDenied) {
      return (
          <div className="min-h-screen w-full bg-[#020617] flex items-center justify-center p-6 text-center">
              <div className="max-w-md w-full p-10 rounded-[3rem] bg-slate-900 border border-rose-500/20 shadow-2xl space-y-6">
                  <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto">
                      <Lock size={40} className="text-rose-500" />
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase italic">Åtkomst nekad</h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                      Din email ({user?.email}) är inte inbjuden att använda Coach Pro ännu. Kontakta din admin för att få tillgång.
                  </p>
                  <button onClick={handleLogout} className="w-full py-4 rounded-2xl bg-slate-800 text-white font-black uppercase text-xs tracking-widest">Logga ut och försök igen</button>
              </div>
          </div>
      );
  }

  if (currentView === View.LIVE_SCOUT && activeMatchId) {
      return <MatchLiveScout matchId={activeMatchId} onExit={() => {
          setActiveMatchId(null);
          window.history.replaceState({}, '', '/');
          setCurrentView(View.DASHBOARD);
      }} />;
  }

  if (!user || (user.isAnonymous && !loggedInPlayer && user.uid !== 'guest')) {
    return (
      <div className="min-h-screen w-full bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-[#020617] z-0"></div>
        <div className="max-w-5xl w-full grid lg:grid-cols-2 gap-12 relative z-10 items-center">
           <div className="space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-orange-500">
                 <Check size={12} /> Säsong 25/26 Redo
              </div>
              <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-white leading-[0.9]">
                  Coach <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Pro Tool</span>
                </h1>
                <p className="text-slate-400 text-lg md:text-xl font-medium max-w-md mx-auto lg:mx-0 leading-relaxed">
                  Digitalt stöd för basketcoacher. Samarbeta med din tränarstab i realtid.
                </p>
              </div>
           </div>

           <div className="w-full max-w-md mx-auto">
              <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative group">
                 <div className="relative space-y-6">
                    <div className="text-center space-y-2 mb-8">
                       <h2 className="text-2xl font-bold text-white">Logga in</h2>
                       <p className="text-slate-400 text-sm">Gå med i ditt lag</p>
                    </div>

                    {!showPlayerLogin ? (
                        <div className="space-y-3">
                            <button onClick={handleGoogleLogin} className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg font-bold group/btn">
                                <div className="flex items-center gap-3">
                                    <div className="p-1 bg-white/20 rounded-lg"><CloudLightning size={18} /></div>
                                    <div className="text-left">
                                        <div className="text-xs font-black uppercase tracking-wide">Coach-inloggning</div>
                                        <div className="text-[9px] opacity-80 font-medium">Logga in med Google</div>
                                    </div>
                                </div>
                                <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>

                            <button onClick={handleGuestLogin} className="w-full py-4 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 text-slate-300 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 group/guest">
                                <HardDrive size={14} className="text-slate-500 group-hover/guest:text-orange-500 transition-colors" />
                                <span>Starta utan konto (Spara lokalt)</span>
                            </button>

                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-slate-700"></div>
                                <span className="flex-shrink-0 mx-4 text-[9px] font-black text-slate-600 uppercase">ELLER</span>
                                <div className="flex-grow border-t border-slate-700"></div>
                            </div>

                            <button onClick={() => setShowPlayerLogin(true)} className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/20 transition-all text-xs font-bold">
                                <Gamepad2 size={16} /> <span>Spelarinloggning</span>
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handlePlayerLogin} className="space-y-4 animate-in slide-in-from-right duration-300">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ange din kod</label>
                                <input 
                                    autoFocus 
                                    type="text" 
                                    inputMode="text"
                                    autoCapitalize="characters"
                                    autoCorrect="off"
                                    spellCheck="false"
                                    placeholder="T.ex. P-10-XY3Z" 
                                    value={playerCode} 
                                    onChange={(e) => setPlayerCode(e.target.value)} 
                                    className={`w-full bg-slate-950 border ${loginError ? 'border-rose-500' : 'border-slate-800'} rounded-2xl p-4 text-center text-xl font-mono text-white tracking-widest uppercase focus:border-blue-500 outline-none`} 
                                />
                                {loginError && (
                                    <div className={`p-4 rounded-xl space-y-2 ${loginError.isIndexIssue ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-rose-500/10 border border-rose-500/20'}`}>
                                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase ${loginError.isIndexIssue ? 'text-purple-400' : 'text-rose-500'}`}>
                                            {loginError.isBuilding ? <Clock size={14} className="animate-spin" /> : loginError.isIndexIssue ? <DatabaseZap size={14} /> : <AlertTriangle size={14} />} 
                                            {loginError.message}
                                        </div>
                                    </div>
                                )}
                             </div>
                             <button type="submit" disabled={!playerCode || verifyingCode} className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 active:scale-95 transition-all">
                                {verifyingCode ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />} Logga in
                             </button>
                             <button type="button" onClick={() => { setShowPlayerLogin(false); setLoginError(null); }} className="w-full py-2 text-[10px] font-bold text-slate-500 uppercase hover:text-white">Avbryt</button>
                        </form>
                    )}
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#020617] overflow-hidden text-slate-200 font-sans selection:bg-orange-500/30">
      {!loggedInPlayer && <Sidebar activeView={currentView} onNavigate={setCurrentView} user={user} />}
      
      <main className="flex-1 flex flex-col overflow-x-hidden relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-[#020617] w-full">
        {!loggedInPlayer && (
          <header className="h-20 flex items-center justify-between px-4 md:px-10 shrink-0 z-40">
            <div className="flex items-center gap-4">
              <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-white">
                {currentView === View.ACCOUNT ? 'Inställningar' : currentView.replace('_', ' ')}
              </h2>
            </div>
            
            <button
                onClick={() => setCurrentView(View.ACCOUNT)}
                className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center hover:border-orange-500 transition-all shadow-lg active:scale-95"
                title="Mitt Konto"
            >
                {user?.photoURL ? (
                    <img src={user.photoURL} alt="P" className="w-full h-full object-cover" />
                ) : (
                    <User size={20} className="text-slate-400" />
                )}
            </button>
          </header>
        )}

        <div className={`flex-1 overflow-y-auto ${!loggedInPlayer ? (currentView === View.CHAT ? 'p-0 md:p-10' : 'p-4 md:p-10') : ''} custom-scrollbar w-full`}>
            {loggedInPlayer ? (
                <PlayerPortal player={loggedInPlayer} coachId={currentCoachId || undefined} onLogout={handleLogout} isPreview={!user || !user.isAnonymous} />
            ) : (
                (() => {
                    switch (currentView) {
                      case View.DASHBOARD: return (
                        <Dashboard 
                          onNavigateToHistory={() => setCurrentView(View.TRAINING)} 
                          onNavigateToWarmup={() => setCurrentView(View.WARMUP_LIBRARY)}
                          onNavigateToMatch={() => setCurrentView(View.MATCH_EVAL)}
                        />
                      );
                      case View.ROSTER: return <Roster onSimulatePlayerLogin={handleSimulatePlayerLogin} />;
                      case View.PLAN: return <Plan />;
                      case View.TRAINING: return <Training />;
                      case View.WARMUP_LIBRARY: return <WarmupLibrary />;
                      case View.MATCH_EVAL: return <MatchEvaluation />;
                      case View.VIDEO_ANALYSIS: return <CoachTools initialTool="video" onNavigate={setCurrentView} />;
                      case View.AI_COACH: return <CoachTools initialTool="ai" onNavigate={setCurrentView} />;
                      case View.TOOLS: return <CoachTools onNavigate={setCurrentView} />;
                      case View.ACCOUNT: return <Account user={user} />;
                      case View.CHAT: return <ChatDashboard coachId={user?.uid || 'guest'} />;
                      default: return <Dashboard onNavigateToHistory={() => setCurrentView(View.TRAINING)} />;
                    }
                })()
            )}
        </div>
      </main>
    </div>
  );
};

export default App;
