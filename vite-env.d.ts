// Fix: Removed the problematic triple-slash reference to 'vite/client' which was failing to resolve.
// Manually defined the ImportMeta and ImportMetaEnv interfaces to ensure environment variables are correctly typed.

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_FIREBASE_MEASUREMENT_ID: string
  // Fix: Removed MODE to avoid conflict with existing global declarations and resolve "identical modifiers" error.
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}