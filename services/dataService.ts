
import { Player, TrainingSession, PlannedSession, MatchRecord, Homework, Phase, Exercise, AppTicket, TicketStatus, WarmupExercise } from '../types';
import { mockPlayers, mockPhases, mockWarmupExercises } from './mockData';
import { db, auth, isFirebaseConfigured } from './firebase';
// Fix: Added @ts-ignore to bypass environment-specific resolution issues with Firebase exports
// @ts-ignore
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp,
  getDoc,
  setDoc,
  where,
  collectionGroup,
  limit,
  onSnapshot
} from 'firebase/firestore';

const PLAYERS_KEY = 'basket_coach_players_v4';
const SESSIONS_KEY = 'basket_coach_sessions_v4';
const PLANNED_SESSIONS_KEY = 'basket_coach_planned_sessions_v1';
const MATCHES_KEY = 'basket_coach_matches_v4';
const CUSTOM_EXERCISES_KEY = 'basket_coach_custom_exercises_v1';
const CUSTOM_PHASE_NAME_KEY = 'basket_coach_custom_phase_name_v1';
const INIT_KEY = 'basket_coach_initialized_v4';

// Din unika access-nyckel
const SUPER_ADMIN_EMAIL = "ibrahim.qallaki@gmail.com"; 

// Helper to remove any undefined values before writing to Firestore
const cleanFirestorePayload = <T extends Record<string, any>>(obj: T): T => {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        cleaned[key] = cleanFirestorePayload(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned as T;
};

export const dataService = {
  getStorageMode: () => {
    if (!isFirebaseConfigured) return 'NO_CONFIG';
    const user = auth.currentUser;
    if (!user || user.uid === 'guest') return 'LOCAL';
    return 'CLOUD';
  },

  generateSecureCode: (playerNumber: number | string) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let randomPart = "";
    for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `P-${playerNumber}-${randomPart}`;
  },

  isEmailWhitelisted: async (email: string): Promise<boolean> => {
    if (!db || !isFirebaseConfigured) return true;
    try {
      const lowerEmail = email.toLowerCase().trim();
      if (lowerEmail === SUPER_ADMIN_EMAIL) return true;

      const docRef = doc(db, 'app_settings', 'whitelist');
      const snap = await getDoc(docRef);
      if (!snap.exists()) return false; 
      const list = snap.data().emails || [];
      return list.map((e: string) => e.toLowerCase().trim()).includes(lowerEmail);
    } catch (err) {
      return false; 
    }
  },

  getWhitelistedEmails: async (): Promise<string[]> => {
    if (!db) return [];
    try {
      const docRef = doc(db, 'app_settings', 'whitelist');
      const snap = await getDoc(docRef);
      return snap.exists() ? snap.data().emails || [] : [];
    } catch (err) {
      return [];
    }
  },

  updateWhitelist: async (emails: string[]): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, 'app_settings', 'whitelist');
    await setDoc(docRef, { emails, updated_at: serverTimestamp() }, { merge: true });
  },

  isSuperAdmin: (userOverride?: any) => {
    const user = userOverride || auth.currentUser;
    if (!user || !user.email) return false;
    // Tvinga allt till lowercase och trimma för att eliminera stavfel/skiftläge
    return user.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL;
  },

  getUserPath: () => {
    if (!isFirebaseConfigured || !db) return null;
    const user = auth.currentUser;
    if (!user || user.uid === 'guest' || user.isAnonymous) return null;
    return `users/${user.uid}`;
  },

  getPlayers: async (coachId?: string): Promise<Player[]> => {
    const path = coachId ? `users/${coachId}` : dataService.getUserPath();
    if (path && db) {
      try {
        const q = query(collection(db, `${path}/players`), orderBy('number', 'asc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Player));
      } catch (err) {
        console.error("Firestore read error (players):", err);
        return [];
      }
    }
    const stored = localStorage.getItem(PLAYERS_KEY);
    return stored ? JSON.parse(stored) : mockPlayers;
  },

  subscribeToPlayers: (callback: (players: Player[]) => void, coachId?: string): (() => void) => {
    const path = coachId ? `users/${coachId}` : dataService.getUserPath();
    if (path && db) {
      try {
        const q = query(collection(db, `${path}/players`), orderBy('number', 'asc'));
        return onSnapshot(q, (snapshot) => {
          const players = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Player));
          callback(players);
        });
      } catch (err) {
        console.error("Firestore subscribe error (players):", err);
        return () => {};
      }
    }
    // Fallback for local storage (just initial load)
    const stored = localStorage.getItem(PLAYERS_KEY);
    if (stored) callback(JSON.parse(stored));
    else callback(mockPlayers);
    return () => {};
  },

  addPlayer: async (player: Omit<Player, 'id'>): Promise<Player[]> => {
    const path = dataService.getUserPath();
    if (path && db) {
      await addDoc(collection(db, `${path}/players`), { ...player, created_at: new Date().toISOString() });
      return dataService.getPlayers();
    } else {
      const current = await dataService.getPlayers();
      const newP: Player = { ...player, id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
      const updated = [...current, newP];
      dataService.saveLocal(PLAYERS_KEY, updated);
      return updated;
    }
  },

  updatePlayer: async (id: string, updates: Partial<Player>, coachId?: string): Promise<Player[]> => {
    const path = coachId ? `users/${coachId}` : dataService.getUserPath();
    if (path && db) {
      await updateDoc(doc(db, `${path}/players`, id), updates);
      return dataService.getPlayers(coachId);
    } else {
      const players = await dataService.getPlayers(coachId);
      const updated = players.map(p => p.id === id ? { ...p, ...updates } : p);
      dataService.saveLocal(PLAYERS_KEY, updated);
      return updated;
    }
  },

  deletePlayer: async (id: string): Promise<Player[]> => {
    const path = dataService.getUserPath();
    if (path && db) {
      await deleteDoc(doc(db, `${path}/players`, id));
      return dataService.getPlayers();
    } else {
      const players = await dataService.getPlayers();
      const updated = players.filter(p => p.id !== id);
      dataService.saveLocal(PLAYERS_KEY, updated);
      return updated;
    }
  },

  getSessions: async (coachId?: string): Promise<TrainingSession[]> => {
    const path = coachId ? `users/${coachId}` : dataService.getUserPath();
    if (path && db) {
      try {
        const q = query(collection(db, `${path}/sessions`), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TrainingSession));
      } catch (err) {
          console.error("Firestore read error (sessions):", err);
          return [];
      }
    }
    const stored = localStorage.getItem(SESSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  saveSession: async (session: Omit<TrainingSession, 'id'>): Promise<TrainingSession> => {
    const path = dataService.getUserPath();
    if (path && db) {
      const payload = cleanFirestorePayload({ ...session, created_at: new Date().toISOString() });
      const docRef = await addDoc(collection(db, `${path}/sessions`), payload);
      return { ...session, id: docRef.id } as TrainingSession;
    } else {
      const sessions = await dataService.getSessions();
      const newS: TrainingSession = { ...session, id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
      dataService.saveLocal(SESSIONS_KEY, [newS, ...sessions]);
      return newS;
    }
  },

  deleteSession: async (id: string): Promise<TrainingSession[]> => {
    const path = dataService.getUserPath();
    if (path && db) {
      await deleteDoc(doc(db, `${path}/sessions`, id));
      return dataService.getSessions();
    } else {
      const sessions = await dataService.getSessions();
      const updated = sessions.filter(s => s.id !== id);
      dataService.saveLocal(SESSIONS_KEY, updated);
      return updated;
    }
  },

  getPlannedSessions: async (coachId?: string): Promise<PlannedSession[]> => {
    const path = coachId ? `users/${coachId}` : dataService.getUserPath();
    if (path && db) {
      try {
        const q = query(collection(db, `${path}/planned_sessions`), orderBy('date', 'asc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PlannedSession));
      } catch (err) {
        console.error("Firestore read error (planned_sessions):", err);
        return [];
      }
    }
    const stored = localStorage.getItem(PLANNED_SESSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  savePlannedSession: async (session: Omit<PlannedSession, 'id'>): Promise<PlannedSession> => {
    const path = dataService.getUserPath();
    if (path && db) {
      const payload = cleanFirestorePayload({ ...session, created_at: new Date().toISOString() });
      const docRef = await addDoc(collection(db, `${path}/planned_sessions`), payload);
      return { ...session, id: docRef.id } as PlannedSession;
    } else {
      const list = await dataService.getPlannedSessions();
      const newP: PlannedSession = { ...session, id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
      const updated = [...list, newP].sort((a, b) => a.date.localeCompare(b.date));
      dataService.saveLocal(PLANNED_SESSIONS_KEY, updated);
      return newP;
    }
  },

  updatePlannedSession: async (id: string, updates: Partial<PlannedSession>): Promise<PlannedSession[]> => {
    const path = dataService.getUserPath();
    if (path && db) {
      const payload = cleanFirestorePayload(updates);
      await updateDoc(doc(db, `${path}/planned_sessions`, id), payload);
      return dataService.getPlannedSessions();
    } else {
      const list = await dataService.getPlannedSessions();
      const updated = list.map(item => item.id === id ? { ...item, ...updates } : item);
      dataService.saveLocal(PLANNED_SESSIONS_KEY, updated);
      return updated;
    }
  },

  deletePlannedSession: async (id: string): Promise<PlannedSession[]> => {
    const path = dataService.getUserPath();
    if (path && db) {
      await deleteDoc(doc(db, `${path}/planned_sessions`, id));
      return dataService.getPlannedSessions();
    } else {
      const list = await dataService.getPlannedSessions();
      const updated = list.filter(s => s.id !== id);
      dataService.saveLocal(PLANNED_SESSIONS_KEY, updated);
      return updated;
    }
  },

  getMatches: async (coachId?: string): Promise<MatchRecord[]> => {
    const path = coachId ? `users/${coachId}` : dataService.getUserPath();
    if (path && db) {
      try {
        const q = query(collection(db, `${path}/matches`), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MatchRecord));
      } catch (err) {
        console.error("Firestore read error (matches):", err);
        return [];
      }
    }
    const stored = localStorage.getItem(MATCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  saveMatch: async (match: Omit<MatchRecord, 'id'>): Promise<MatchRecord> => {
    const path = dataService.getUserPath();
    if (path && db) {
      const docRef = await addDoc(collection(db, `${path}/matches`), { ...match, created_at: new Date().toISOString() });
      return { ...match, id: docRef.id } as MatchRecord;
    } else {
      const matches = await dataService.getMatches();
      const newM: MatchRecord = { ...match, id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
      dataService.saveLocal(MATCHES_KEY, [newM, ...matches]);
      return newM;
    }
  },

  deleteMatch: async (id: string): Promise<MatchRecord[]> => {
    const path = dataService.getUserPath();
    if (path && db) {
      await deleteDoc(doc(db, `${path}/matches`, id));
      return dataService.getMatches();
    } else {
      const matches = await dataService.getMatches();
      const updated = matches.filter(m => m.id !== id);
      dataService.saveLocal(MATCHES_KEY, updated);
      return updated;
    }
  },

  createTicket: async (ticket: Omit<AppTicket, 'id' | 'status' | 'createdAt' | 'appVersion' | 'technicalInfo'>): Promise<void> => {
    if (!isFirebaseConfigured || !db) return;
    const colRef = collection(db, 'app_tickets');
    await addDoc(colRef, {
      ...ticket,
      status: 'backlog',
      createdAt: new Date().toISOString(),
      appVersion: '5.8.1',
      technicalInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform
      }
    });
  },

  getTickets: async (currentUser?: any): Promise<AppTicket[]> => {
    if (!isFirebaseConfigured || !db) return [];
    try {
      const user = currentUser || auth.currentUser;
      const isAdmin = dataService.isSuperAdmin(user);
      const colRef = collection(db, 'app_tickets');
      
      let q;
      // För att kunna lista ALLA ärenden måste queryn vara ren om man är admin
      if (isAdmin) {
          q = query(colRef, limit(300)); 
      } else if (user) {
          q = query(colRef, where('userId', '==', user.uid));
      } else {
          return [];
      }

      const snap = await getDocs(q);
      const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppTicket));
      
      return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    } catch (err: any) {
      console.warn("Ticket fetch error:", err.code, err.message);
      if (err.message?.includes('index')) throw new Error("MISSING_INDEX");
      if (err.code === 'permission-denied') throw new Error("ACCESS_DENIED");
      return [];
    }
  },

  updateTicketStatus: async (ticketId: string, status: TicketStatus): Promise<void> => {
    if (!isFirebaseConfigured || !db) return;
    const docRef = doc(db, 'app_tickets', ticketId);
    await updateDoc(docRef, { status });
  },

  deleteTicket: async (ticketId: string): Promise<void> => {
    if (!isFirebaseConfigured || !db) return;
    await deleteDoc(doc(db, 'app_tickets', ticketId));
  },

  getCustomExercises: async (coachId?: string): Promise<Exercise[]> => {
    const path = coachId ? `users/${coachId}` : dataService.getUserPath();
    if (path && db) {
      try {
        const q = query(collection(db, `${path}/custom_exercises`), orderBy('title', 'asc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Exercise));
      } catch (err) {
        return [];
      }
    }
    const stored = localStorage.getItem(CUSTOM_EXERCISES_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  saveCustomExercise: async (exercise: Exercise): Promise<Exercise[]> => {
    const path = dataService.getUserPath();
    if (path && db) {
      await setDoc(doc(db, `${path}/custom_exercises`, exercise.id), exercise);
      return dataService.getCustomExercises();
    } else {
      const current = await dataService.getCustomExercises();
      const updated = [...current, exercise];
      dataService.saveLocal(CUSTOM_EXERCISES_KEY, updated);
      return updated;
    }
  },

  deleteCustomExercise: async (id: string): Promise<Exercise[]> => {
    const path = dataService.getUserPath();
    if (path && db) {
      await deleteDoc(doc(db, `${path}/custom_exercises`, id));
      return dataService.getCustomExercises();
    } else {
      const current = await dataService.getCustomExercises();
      const updated = current.filter(ex => ex.id !== id);
      dataService.saveLocal(CUSTOM_EXERCISES_KEY, updated);
      return updated;
    }
  },

  getCustomPhaseName: async (coachId?: string): Promise<string> => {
    const path = coachId ? `users/${coachId}` : dataService.getUserPath();
    if (path && db) {
      try {
        const docRef = doc(db, `${path}/settings`, 'custom_phase');
        const snap = await getDoc(docRef);
        return snap.exists() ? snap.data().name : "Egna Övningar";
      } catch (err) {
        return "Egna Övningar";
      }
    }
    return localStorage.getItem(CUSTOM_PHASE_NAME_KEY) || "Egna Övningar";
  },

  saveCustomPhaseName: async (name: string): Promise<void> => {
    const path = dataService.getUserPath();
    if (path && db) {
      await setDoc(doc(db, `${path}/settings`, 'custom_phase'), { name });
    } else {
      localStorage.setItem(CUSTOM_PHASE_NAME_KEY, name);
    }
  },

  getUnifiedPhases: async (coachId?: string): Promise<Phase[]> => {
    const custom = await dataService.getCustomExercises(coachId);
    const customName = await dataService.getCustomPhaseName(coachId);
    const phases = JSON.parse(JSON.stringify(mockPhases));
    if (custom.length > 0) {
        phases.push({
            id: 9,
            title: customName,
            duration: "Säsong",
            color: "from-indigo-600 to-blue-500",
            description: "Dina skräddarsydda övningar.",
            exercises: custom
        });
    }
    return phases;
  },

  calculateAttendanceRate: (sessions: TrainingSession[]): number => {
    if (sessions.length === 0) return 0;
    const totalPossible = sessions.reduce((acc, s) => acc + s.attendance.length, 0);
    const totalPresent = sessions.reduce((acc, s) => acc + s.attendance.filter(a => a.status === 'närvarande').length, 0);
    return totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;
  },

  getTeamProgressTimeline: (sessions: TrainingSession[]) => {
    return [...sessions].reverse().map(s => {
      const allScores = s.evaluations.flatMap(e => e.scores);
      const avg = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : "0";
      return { date: s.date, avg: parseFloat(avg) };
    });
  },

  loginPlayer: async (accessCode: string): Promise<{ player: Player, coachId: string } | null> => {
    const cleanCode = accessCode.trim().toUpperCase();
    
    if (isFirebaseConfigured && db) {
      try {
        const playersRef = collectionGroup(db, 'players');
        const q = query(playersRef, where('accessCode', '==', cleanCode));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const d = snapshot.docs[0];
          const pathParts = d.ref.path.split('/');
          const coachId = pathParts[1]; 
          return { 
            player: { id: d.id, ...d.data() } as Player, 
            coachId 
          };
        }
      } catch (err: any) {
        console.warn("Player search index status:", err.code, err.message);
        if (err.code === 'permission-denied') throw new Error("ACCESS_DENIED");
        if (err.code === 'failed-precondition') throw new Error("MISSING_INDEX");
        throw err;
      }
    }

    const players = await dataService.getPlayers();
    const localPlayer = players.find(p => p.accessCode?.trim().toUpperCase() === cleanCode);
    if (localPlayer) return { player: localPlayer, coachId: 'guest' };
    return null;
  },

  toggleHomework: async (playerId: string, homeworkId: string, coachId?: string): Promise<void> => {
     const path = coachId ? `users/${coachId}` : dataService.getUserPath();
     
     if (path && db) {
         try {
             const playerRef = doc(db, `${path}/players`, playerId);
             const snap = await getDoc(playerRef);
             
             if (snap.exists()) {
                 const player = snap.data() as Player;
                 if (player.homework) {
                     const updated = player.homework.map(h => h.id === homeworkId ? { ...h, completed: !h.completed } : h);
                     await updateDoc(playerRef, { homework: updated });
                 }
             }
         } catch (err) {
             console.error("Error toggling homework:", err);
             throw err;
         }
     } else {
         const players = await dataService.getPlayers(coachId);
         const player = players.find(p => p.id === playerId);
         if (player && player.homework) {
             const updated = player.homework.map(h => h.id === homeworkId ? { ...h, completed: !h.completed } : h);
             await dataService.updatePlayer(playerId, { homework: updated }, coachId);
         }
     }
  },

  addHomework: async (playerId: string, title: string): Promise<void> => {
    const players = await dataService.getPlayers();
    const player = players.find(p => p.id === playerId);
    if(player) {
        const newHw = { id: Math.random().toString(36).substr(2, 9), title, completed: false, dateAssigned: new Date().toISOString() };
        await dataService.updatePlayer(playerId, { homework: [...(player.homework || []), newHw] });
    }
  },

  deleteHomework: async (playerId: string, homeworkId: string): Promise<void> => {
    const players = await dataService.getPlayers();
    const player = players.find(p => p.id === playerId);
    if (player && player.homework) {
        const updated = player.homework.filter(h => h.id !== homeworkId);
        await dataService.updatePlayer(playerId, { homework: updated });
    }
  },

  updateHomework: async (playerId: string, homeworkId: string, updates: Partial<Homework>): Promise<void> => {
    const players = await dataService.getPlayers();
    const player = players.find(p => p.id === playerId);
    if (player && player.homework) {
        const updated = player.homework.map(h => h.id === homeworkId ? { ...h, ...updates } : h);
        await dataService.updatePlayer(playerId, { homework: updated });
    }
  },

  exportTeamData: async () => {
    const data = { players: await dataService.getPlayers(), sessions: await dataService.getSessions(), matches: await dataService.getMatches() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `basketcoach_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  },

  importTeamData: async (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.players) localStorage.setItem(PLAYERS_KEY, JSON.stringify(data.players));
      if (data.sessions) localStorage.setItem(SESSIONS_KEY, JSON.stringify(data.sessions));
      if (data.matches) localStorage.setItem(MATCHES_KEY, JSON.stringify(data.matches));
      localStorage.setItem(INIT_KEY, 'true');
      window.location.reload();
    } catch (e) {}
  },

  saveLocal: (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(INIT_KEY, 'true');
  },

  getLocalDataStats: () => {
    const p = localStorage.getItem(PLAYERS_KEY);
    const s = localStorage.getItem(SESSIONS_KEY);
    return {
      players: p ? JSON.parse(p).length : 0,
      sessions: s ? JSON.parse(s).length : 0
    };
  },

  getAppContextSnapshot: async () => {
    const players = await dataService.getPlayers();
    return {
      version: "5.8.1",
      playerCount: players.length,
      timestamp: new Date().toISOString()
    };
  },

  getWarmupExercises: async (): Promise<WarmupExercise[]> => {
    // För enkelhetens skull kör vi bara mock-data för uppvärmning just nu, 
    // men förberett för Firestore om det behövs senare.
    return mockWarmupExercises;
  }
};
