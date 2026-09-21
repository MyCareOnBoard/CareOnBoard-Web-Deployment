/**
 * Passwordless email sign-in, used by the family portal.
 *
 * Family members are identified by whatever their agency recorded — a phone
 * number or an email address. Phone sign-in sends an SMS code; this is the email
 * equivalent, and it is deliberately passwordless: a relative who opens the
 * portal a few times a year should not have to invent and remember a password.
 *
 * A family member who wants one anyway can set a password after signing in, via
 * `attachPassword`, and use it on later visits.
 */
import { auth } from '@/lib/firebase'

/**
 * Firebase completes the sign-in on a page it navigates back to, and requires
 * the address that started it. It cannot come from the URL: anyone could then
 * craft a link that signs a victim's inbox into the attacker's chosen address.
 * So it is stashed here between the two halves of the flow.
 */
const PENDING_EMAIL_KEY = 'familyPortal.pendingEmail'

/** Where the link returns to. Must be an authorised domain in the Firebase console. */
function continueUrl(): string {
  return `${window.location.origin}/auth/family-login`
}

export function rememberPendingEmail(email: string): void {
  try {
    window.localStorage.setItem(PENDING_EMAIL_KEY, email)
  } catch {
    // Private browsing, or storage disabled. The flow still completes — the user
    // is asked to retype the address instead.
  }
}

export function readPendingEmail(): string | null {
  try {
    return window.localStorage.getItem(PENDING_EMAIL_KEY)
  } catch {
    return null
  }
}

export function clearPendingEmail(): void {
  try {
    window.localStorage.removeItem(PENDING_EMAIL_KEY)
  } catch {
    // Nothing to clean up if it could not be written in the first place.
  }
}

/** Send the sign-in link and remember who asked for it. */
export async function sendFamilySignInLink(email: string): Promise<void> {
  const { sendSignInLinkToEmail } = await import('firebase/auth')
  const normalized = email.trim().toLowerCase()
  await sendSignInLinkToEmail(auth, normalized, {
    url: continueUrl(),
    handleCodeInApp: true,
  })
  rememberPendingEmail(normalized)
}

/** Is the current URL a sign-in link Firebase can complete? */
export async function isFamilyEmailLink(href: string = window.location.href): Promise<boolean> {
  const { isSignInWithEmailLink } = await import('firebase/auth')
  return isSignInWithEmailLink(auth, href)
}

/**
 * Finish a link sign-in.
 * @param email the address the link was sent to
 */
export async function completeEmailLinkSignIn(
  email: string,
  href: string = window.location.href
): Promise<import('firebase/auth').UserCredential> {
  const { signInWithEmailLink } = await import('firebase/auth')
  const credential = await signInWithEmailLink(auth, email.trim().toLowerCase(), href)
  clearPendingEmail()
  return credential
}

/** Sign in a family member who has already set a password. */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<import('firebase/auth').UserCredential> {
  const { signInWithEmailAndPassword } = await import('firebase/auth')
  return signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password)
}

/** Does the signed-in account already have a password to sign in with? */
export function hasPasswordProvider(): boolean {
  return auth.currentUser?.providerData.some((p) => p.providerId === 'password') ?? false
}

/**
 * Add a password to the signed-in account, so next time they can skip the inbox.
 *
 * Linking rather than updating: an account created by email link has no password
 * credential to update, and `updatePassword` on one throws.
 */
export async function attachPassword(password: string): Promise<void> {
  const { EmailAuthProvider, linkWithCredential, updatePassword } = await import('firebase/auth')
  const user = auth.currentUser
  if (!user?.email) throw new Error('You need to be signed in with an email address to set a password.')

  if (hasPasswordProvider()) {
    await updatePassword(user, password)
    return
  }
  await linkWithCredential(user, EmailAuthProvider.credential(user.email, password))
}
