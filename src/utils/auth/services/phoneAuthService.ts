import { auth } from '@/lib/firebase'

export async function startPhoneSignIn(
  phoneE164: string,
  recaptcha: import('firebase/auth').RecaptchaVerifier
): Promise<import('firebase/auth').ConfirmationResult> {
  const { signInWithPhoneNumber } = await import('firebase/auth')
  return signInWithPhoneNumber(auth, phoneE164, recaptcha)
}

export async function completePhoneSignIn(
  confirmationResult: import('firebase/auth').ConfirmationResult,
  code: string
): Promise<import('firebase/auth').UserCredential> {
  return confirmationResult.confirm(code)
}
