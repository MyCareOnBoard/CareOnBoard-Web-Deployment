export const MFA_COPY = {
  enroll: {
    title: 'Secure your account',
    subtitle:
      "For your security, add a mobile number. We'll text you a verification code when you sign in.",
    phoneLabel: 'Mobile number',
    phoneHelp: 'Use a number that can receive text messages. Standard message rates may apply.',
    sendCode: 'Send verification code',
    verifyContinue: 'Verify and continue',
    resend: 'Send a new code',
    resendCountdown: (seconds: number) => `Send a new code in 0:${String(seconds).padStart(2, '0')}`,
  },
  challenge: {
    title: 'Check your phone',
    subtitle: (maskedPhone: string) =>
      `We sent a 6-digit code to ${maskedPhone}. Enter it below to finish signing in.`,
    verifySignIn: 'Verify and sign in',
    useDifferentAccount: 'Use a different account',
    autoSending: (maskedPhone: string) => `Sending code to ${maskedPhone}…`,
    sendCode: 'Send verification code',
    resend: 'Send a new code',
    resendCountdown: (seconds: number) => `Send a new code in 0:${String(seconds).padStart(2, '0')}`,
  },
  loading: {
    sending: 'Sending code to your phone…',
    verifying: 'Verifying code…',
  },
  errors: {
    sessionExpired: 'Your sign-in timed out. Please log in again.',
    codeRequired: 'Enter the 6-digit code from your text message.',
    phoneRequired: 'Enter your mobile number.',
  },
} as const

export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return 'your phone'
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '***'
  const last4 = digits.slice(-4)
  return `*** ***-${last4}`
}
