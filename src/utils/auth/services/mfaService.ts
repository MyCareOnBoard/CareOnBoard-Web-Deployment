import { auth } from '@/lib/firebase'
import { maskPhoneNumber } from '@/utils/auth/copy/mfaCopy'
import { setMfaResolverSession } from '@/utils/auth/services/mfaSessionStore'

let activeRecaptchaVerifier: import('firebase/auth').RecaptchaVerifier | null = null

async function loadFirebaseAuth() {
  return import('firebase/auth')
}

export async function hasEnrolledMfa(
  user: import('firebase/auth').User
): Promise<boolean> {
  const { multiFactor } = await loadFirebaseAuth()
  return multiFactor(user).enrolledFactors.length > 0
}

export async function createRecaptchaVerifier(containerId: string) {
  if (activeRecaptchaVerifier) {
    return activeRecaptchaVerifier
  }
  const { RecaptchaVerifier } = await loadFirebaseAuth()
  activeRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
  })
  return activeRecaptchaVerifier
}

export function clearRecaptchaVerifier(): void {
  if (activeRecaptchaVerifier) {
    try {
      activeRecaptchaVerifier.clear()
    } catch {
      // ignore cleanup errors
    }
    activeRecaptchaVerifier = null
  }
}

export async function refreshAuthToken(): Promise<void> {
  await auth.currentUser?.getIdToken(true)
}

export async function startMfaEnrollment(
  phoneE164: string,
  recaptcha: import('firebase/auth').RecaptchaVerifier
): Promise<string> {
  const { multiFactor, PhoneAuthProvider } = await loadFirebaseAuth()
  const user = auth.currentUser
  if (!user) throw new Error('No signed-in user')

  const session = await multiFactor(user).getSession()
  const phoneAuthProvider = new PhoneAuthProvider(auth)
  return phoneAuthProvider.verifyPhoneNumber(
    { phoneNumber: phoneE164, session },
    recaptcha
  )
}

export async function completeMfaEnrollment(
  verificationId: string,
  smsCode: string,
  displayName?: string
): Promise<void> {
  const { multiFactor, PhoneAuthProvider, PhoneMultiFactorGenerator } =
    await loadFirebaseAuth()
  const user = auth.currentUser
  if (!user) throw new Error('No signed-in user')

  const credential = PhoneAuthProvider.credential(verificationId, smsCode)
  const assertion = PhoneMultiFactorGenerator.assertion(credential)
  await multiFactor(user).enroll(assertion, displayName)
  await refreshAuthToken()
}

export async function storeMfaResolver(
  error: unknown,
  email: string
): Promise<boolean> {
  const firebaseError = error as { code?: string }
  if (firebaseError?.code !== 'auth/multi-factor-auth-required') return false

  const { getMultiFactorResolver } = await loadFirebaseAuth()
  const resolver = getMultiFactorResolver(auth, error as import('firebase/auth').MultiFactorError)
  const hint = resolver.hints[0]
  const phone =
    hint && 'phoneNumber' in hint ? (hint as { phoneNumber?: string }).phoneNumber : undefined

  setMfaResolverSession(resolver, email, maskPhoneNumber(phone))
  return true
}

export async function startMfaSignInChallenge(
  resolver: import('firebase/auth').MultiFactorResolver,
  recaptcha: import('firebase/auth').RecaptchaVerifier,
  hintIndex = 0
): Promise<string> {
  const { PhoneAuthProvider } = await loadFirebaseAuth()
  const hint = resolver.hints[hintIndex]
  if (!hint) throw new Error('No MFA hint available')

  const phoneAuthProvider = new PhoneAuthProvider(auth)
  return phoneAuthProvider.verifyPhoneNumber(
    { multiFactorHint: hint, session: resolver.session },
    recaptcha
  )
}

export async function completeMfaSignIn(
  resolver: import('firebase/auth').MultiFactorResolver,
  verificationId: string,
  smsCode: string
) {
  const { PhoneAuthProvider, PhoneMultiFactorGenerator } = await loadFirebaseAuth()
  const credential = PhoneAuthProvider.credential(verificationId, smsCode)
  const assertion = PhoneMultiFactorGenerator.assertion(credential)
  const userCredential = await resolver.resolveSignIn(assertion)
  await refreshAuthToken()
  return userCredential
}
