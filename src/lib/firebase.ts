/**
 * Firebase Configuration
 *
 * Initializes Firebase app with environment variables.
 * This file is ready for Firebase integration but not currently used
 * since the app uses dummy authentication.
 *
 * To enable Firebase:
 * 1. Add your Firebase credentials to .env.local
 * 2. Update lib/auth-context.tsx to use Firebase auth methods
 * 3. Remove dummy auth from lib/auth.ts
 */

import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Export auth instance for use in authentication
export const auth = getAuth(app)

export default app
