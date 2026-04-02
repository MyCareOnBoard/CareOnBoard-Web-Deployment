/**
 * Authentication Utilities with Firebase
 *
 * Handles all authentication operations using Firebase Auth
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getAuthErrorMessage } from '@/utils/auth';

export interface User {
  id: string
  email: string
  name: string
  createdAt: Date
}

export interface AuthResponse {
  success: boolean
  user?: User
  error?: string
}

/**
 * Convert Firebase User to our User type
 */
function mapFirebaseUser(firebaseUser: FirebaseUser): User {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: firebaseUser.displayName || '',
    createdAt: firebaseUser.metadata.creationTime 
      ? new Date(firebaseUser.metadata.creationTime)
      : new Date(),
  };
}

/**
 * Login with email and password using Firebase
 */
export async function loginWithEmail(email: string, password: string): Promise<AuthResponse> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = mapFirebaseUser(userCredential.user);

    return {
      success: true,
      user,
    };
  } catch (error: any) {
    console.error('Login error:', error);

    return {
      success: false,
      error: getAuthErrorMessage(error),
    };
  }
}

/**
 * Register new user with Firebase
 */
export async function registerWithEmail(name: string, email: string, password: string): Promise<AuthResponse> {
  try {
    // Validate password
    if (password.length < 6) {
      return {
        success: false,
        error: 'Password must be at least 6 characters',
      };
    }

    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update user profile with display name
    await updateProfile(userCredential.user, {
      displayName: name,
    });

    const user = mapFirebaseUser(userCredential.user);
    // Update name since we just set it
    user.name = name;

    return {
      success: true,
      user,
    };
  } catch (error: any) {
    console.error('Registration error:', error);

    return {
      success: false,
      error: getAuthErrorMessage(error),
    };
  }
}

/**
 * Send password reset email using Firebase
 */
export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await firebaseSendPasswordResetEmail(auth, email);
    
    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Password reset error:', error);

    return {
      success: false,
      error: getAuthErrorMessage(error),
    };
  }
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    // Use Firebase auth state observer
    const unsubscribe = auth.onAuthStateChanged((firebaseUser: FirebaseUser | null) => {
      unsubscribe();
      
      if (firebaseUser) {
        resolve(mapFirebaseUser(firebaseUser));
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Get Firebase ID token for the current user
 * Use this to send authenticated requests to your backend
 * 
 * @param forceRefresh - Force token refresh even if not expired
 * @returns Firebase ID token or null if not authenticated
 */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  
  if (!user) {
    return null;
  }

  try {
    return await user.getIdToken(forceRefresh);
  } catch (error) {
    console.error('Error getting ID token:', error);
    return null;
  }
}

/**
 * Save user session - Firebase handles this automatically
 * Kept for backward compatibility
 */
export function saveUserSession(user: User): void {
  // Firebase handles session persistence automatically
  // This function is kept for backward compatibility
}

/**
 * Clear user session - Firebase handles this automatically
 * Kept for backward compatibility
 */
export function clearUserSession(): void {
  // Firebase handles session clearing automatically via signOut
  // This function is kept for backward compatibility
}
