
// @ts-ignore
import { initializeApp, getApps } from "firebase/app";
// @ts-ignore
import type { FirebaseApp } from "firebase/app";
// Fix: Added @ts-ignore to bypass environment-specific resolution issues with Firebase exports
// @ts-ignore
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// @ts-ignore
import type { Auth } from "firebase/auth";
// @ts-ignore
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
// @ts-ignore
import type { Firestore } from "firebase/firestore";

// Helper to get environment variables safely across Vite/Node environments
export const getEnvVar = (key: string) => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}

  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {}

  return "";
};

// Configuration using ONLY environment variables for security on GitHub
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: import.meta.env.VITE_FIREBASE_APP_ID || getEnvVar('VITE_FIREBASE_APP_ID'),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || getEnvVar('VITE_FIREBASE_MEASUREMENT_ID')
};

// Check if config is valid (has at least API key and Project ID)
export const isFirebaseConfigured = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

let app: FirebaseApp | undefined;
let auth: Auth;
let db: Firestore;
let googleProvider: any;
if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);

    // Enable offline persistence for better robustness in poor connectivity
    if (typeof window !== 'undefined') {
      enableIndexedDbPersistence(db).catch((err) => {
          if (err.code === 'failed-precondition') {
              // Multiple tabs open, persistence can only be enabled in one tab at a time.
              console.warn("Firestore persistence failed: Multiple tabs open");
          } else if (err.code === 'unimplemented') {
              // The current browser does not support all of the features required to enable persistence
              console.warn("Firestore persistence failed: Browser not supported");
          }
      });
    }

    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
  } catch (error) {
    console.error("Firebase init error", error);
    auth = { currentUser: null, onAuthStateChanged: () => () => {}, signOut: async () => {} } as any;
    db = {} as any;
    googleProvider = {};
  }
} else {
  auth = { currentUser: null, onAuthStateChanged: () => () => {}, signOut: async () => {} } as any;
  db = {} as any;
  googleProvider = {};
}

export { auth, db, googleProvider };
