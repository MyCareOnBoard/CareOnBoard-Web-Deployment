/**
 * @deprecated Prefer imports from authService. Re-exports for backward compatibility.
 */
export {
  loginWithEmail,
  registerWithEmail,
  sendPasswordResetEmail,
  logout,
  getCurrentUser,
  getIdToken,
  storeUserData,
  removeUserData,
  transformFirebaseUser,
  type AuthResponse,
  type LoginResponse,
  type LoginResult,
} from './authService'

export function saveUserSession(): void {
  // Firebase handles session persistence automatically
}

export function clearUserSession(): void {
  // Firebase handles session clearing automatically via signOut
}
