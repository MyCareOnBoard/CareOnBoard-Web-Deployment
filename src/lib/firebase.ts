/**
 * Firebase Configuration
 *
 * Initializes Firebase app with environment variables.
 * Connects to Firebase Emulators in development mode.
 */

import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, connectAuthEmulator } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"

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

// Export firestore instance for use in database operations
// Use custom database name if provided via environment variable, otherwise use default
const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app)

// Connect to Firebase Emulators in development mode
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  console.log('🔥 Firebase Emulators enabled')
  try {
    // Allows MFA/phone verification in the Auth emulator without real reCAPTCHA/SMS.
    auth.settings.appVerificationDisabledForTesting = true
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    console.log('✅ Connected to Auth Emulator on port 9099')

    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    console.log('✅ Connected to Firestore Emulator on port 8080')
  } catch (error) {
    console.warn('⚠️ Emulator connection may already be established')
  }
}

// Helper to get fresh ID token
export async function getFreshIdToken(forceRefresh = true): Promise<string | null> {
  try {
    const user = auth.currentUser
    if (!user) return null
    return await user.getIdToken(forceRefresh)
  } catch (error) {
    console.error("Error getting fresh ID token:", error)
    return null
  }
}

export default app
