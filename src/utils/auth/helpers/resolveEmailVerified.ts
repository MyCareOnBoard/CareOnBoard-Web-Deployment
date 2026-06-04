import { auth } from '@/lib/firebase'

/** Firebase Auth is the source of truth; API/Firestore values are ignored when signed in. */
export function resolveEmailVerified(): boolean {
  return auth.currentUser?.emailVerified === true
}
