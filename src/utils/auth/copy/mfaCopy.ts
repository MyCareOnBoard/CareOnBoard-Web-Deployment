export const MFA_COPY = {
  enroll: {
    title: 'Secure your account',
    subtitle:
      'Add a mobile number for two-step sign-in. We will text you a code when you log in.',
    phoneLabel: 'Mobile number',
    phoneHelp: 'Use a number that can receive text messages. Message and data rates may apply.',
    sendCode: 'Send code',
    verifyContinue: 'Verify and continue',
    resend: 'Send another code',
    resendCountdown: (seconds: number) =>
      `Send another code in 0:${String(seconds).padStart(2, '0')}`,
  },
  challenge: {
    title: 'Enter your sign-in code',
    codeSent: (maskedPhone: string) =>
      `Enter the 6-digit code we sent to ${maskedPhone}.`,
    sendFailed: 'We could not text a code to your phone. Try again below.',
    sending: (maskedPhone: string) => `Sending a code to ${maskedPhone}…`,
    verifySignIn: 'Verify and sign in',
    useDifferentAccount: 'Sign in with a different account',
    sendCode: 'Send code',
    resend: 'Send another code',
    resendCountdown: (seconds: number) =>
      `Send another code in 0:${String(seconds).padStart(2, '0')}`,
  },
  form: {
    codeLabel: '6-digit code',
    codePlaceholder: '000000',
  },
  loading: {
    verifying: 'Verifying…',
    sendingCode: 'Sending code…',
    resending: 'Sending a new code…',
  },
  errors: {
    sessionExpired: 'This sign-in step timed out. Please log in again.',
    codeRequired: 'Enter the 6-digit code from your text message.',
    phoneRequired: 'Enter a valid mobile number with country code.',
  },
} as const

export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return 'your phone'
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '***'
  const last4 = digits.slice(-4)
  return `*** ***-${last4}`
}
