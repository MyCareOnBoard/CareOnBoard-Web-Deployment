export const ONBOARDING_EMAIL_COPY = {
  badge: 'Email verification',
  emailPage: {
    title: 'Confirm your email',
    description:
      "We'll send a 6-digit code to the email on your account. Enter it on the next screen.",
    emailLabel: 'Your email',
    sendCode: 'Send verification code',
    sendingCode: 'Sending code…',
    loadingAccount: 'Loading your account…',
    emailRequired: 'Email is required',
  },
  otpPage: {
    title: 'Enter your verification code',
    subline: 'Check your inbox for a 6-digit code.',
    codePlaceholder: '6-digit code',
    confirmCode: 'Confirm code',
    verifying: 'Verifying…',
    resend: 'Send another code',
    resending: 'Sending…',
    loadingEmail: 'Loading your email…',
    codeRequired: 'Enter the 6-digit code from your email.',
    invalidCode: 'That code is invalid or expired. Request a new code.',
    resendFailed: "We couldn't send a new code. Try again.",
    resendSuccess: 'We sent a new code to your email.',
    fetchEmailFailed: 'Unable to load your email.',
    userNotFound: 'User not found. Please create a user account first.',
  },
  errors: {
    sendFailed: "We couldn't send a verification code. Try again.",
    serviceUnavailable:
      'Verification email is temporarily unavailable. Please contact support.',
    databaseSetup:
      'Database is being set up. Please wait 2-3 minutes and try again, or contact support.',
    network: 'Network error. Please check your connection and try again.',
    loadUserFailed: 'Unable to load user data',
    notSignedIn: 'No authenticated user found',
  },
} as const
