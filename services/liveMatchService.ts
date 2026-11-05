
import { db, auth } from './firebase';
// Fix: Added @ts-ignore to bypass environment-specific resolution issues with Firebase exports
// @ts-ignore
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc,
  getDoc,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { LiveMatchData, Player } from '../types';

export const liveMatchService = {
  startMatch: async (homeName: string, awayName: string, players: Player[]): Promise<string> => {
    if (!db || !auth.currentUser) throw new Error("Not authenticated");
    
    const coachId = auth.currentUser.uid;
    const matchId = `live_${coachId}`;
    
    const initialPlayerFouls: Record<string, number> = {};
    const initialPlayerPoints: Record<string, number> = {};
    players.forEach(p => {
      initialPlayerFouls[p.id] = 0;
      initialPlayerPoints[p.id] = 0;
    });

    const matchData: LiveMatchData = {
      id: matchId,
      coachId,
      homeName,
      awayName,
      homeScore: 0,
      awayScore: 0,
      period: 1,
      homeFouls: 0,
      awayFouls: 0,
      homeTimeouts: 3,
      awayTimeouts: 3,
      playerFouls: initialPlayerFouls,
      playerPoints: initialPlayerPoints,
      status: 'active',
      lastUpdated: new Date().toISOString()
    };

    await setDoc(doc(db, 'live_matches', matchId), {
      ...matchData,
      serverTime: serverTimestamp()
    });

    return matchId;
  },

  getExistingMatch: async (): Promise<LiveMatchData | null> => {
    if (!db || !auth.currentUser) return null;
    const coachId = auth.currentUser.uid;
    const docRef = doc(db, 'live_matches', `live_${coachId}`);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as LiveMatchData) : null;
  },

  subscribeToMatch: (matchId: string, callback: (data: LiveMatchData) => void) => {
    if (!db) return () => {};
    const docRef = doc(db, 'live_matches', matchId);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as LiveMatchData);
      }
    });
  },

  updateMatch: async (matchId: string, updates: any) => {
    if (!db) return;
    const docRef = doc(db, 'live_matches', matchId);
    
    // Convert numeric updates to atomic increments for robustness
    const finalUpdates: any = {
      ...updates,
      lastUpdated: new Date().toISOString()
    };

    // Special handling for nested player stats to avoid overwriting the whole object
    if (updates.playerPoints) {
      Object.entries(updates.playerPoints).forEach(([pid, delta]) => {
        finalUpdates[`playerPoints.${pid}`] = increment(delta as number);
      });
      delete finalUpdates.playerPoints;
    }
    
    if (updates.playerFouls) {
      Object.entries(updates.playerFouls).forEach(([pid, delta]) => {
        finalUpdates[`playerFouls.${pid}`] = increment(delta as number);
      });
      delete finalUpdates.playerFouls;
    }

    // Use increment for global scores too if deltas are provided
    if (updates.homeScoreDelta !== undefined) {
      finalUpdates.homeScore = increment(updates.homeScoreDelta);
      delete finalUpdates.homeScoreDelta;
    }
    if (updates.awayScoreDelta !== undefined) {
      finalUpdates.awayScore = increment(updates.awayScoreDelta);
      delete finalUpdates.awayScoreDelta;
    }
    if (updates.homeFoulsDelta !== undefined) {
      finalUpdates.homeFouls = increment(updates.homeFoulsDelta);
      delete finalUpdates.homeFoulsDelta;
    }
    if (updates.homeTimeoutsDelta !== undefined) {
      finalUpdates.homeTimeouts = increment(updates.homeTimeoutsDelta);
      delete finalUpdates.homeTimeoutsDelta;
    }

    await updateDoc(docRef, finalUpdates);
  },

  finishMatch: async (matchId: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'live_matches', matchId));
  }
};
