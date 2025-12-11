/**
 * Firebase Configuration
 *
 * Initializes Firebase app with environment variables.
 * Connects to Firebase Emulators in development mode.
 */

import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, connectAuthEmulator } from "firebase/auth"

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Add validation
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain) {
  throw new Error("Firebase config is missing. Check your .env file.")
}

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Export auth instance for use in authentication
export const auth = getAuth(app)

// Connect to Firebase Emulators in development mode
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })  } catch (error) {  }
}

// Helper to get fresh ID token
export async function getFreshIdToken(forceRefresh = true): Promise<string | null> {
  try {
    const user = auth.currentUser
    if (!user) return null
    return await user.getIdToken(forceRefresh)
  } catch (error) {    return null
  }
}

export default app
