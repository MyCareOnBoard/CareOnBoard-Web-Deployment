/**
 * User-Friendly Authentication Error Messages
 * 
 * Centralized error message handling for Firebase authentication errors.
 * Provides clear, actionable messages for users instead of technical error codes.
 * 
 * Best Practices:
 * - Messages are clear and concise
 * - Provide actionable guidance where possible
 * - Avoid technical jargon
 * - Maintain consistent tone across all messages
 */

/**
 * Maps Firebase auth error codes to user-friendly messages
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // Login/Authentication Errors
  'auth/invalid-credential': 'The email or password you entered is incorrect. Please try again.',
  'auth/wrong-password': 'The password you entered is incorrect. Please try again.',
  'auth/user-not-found': 'We couldn\'t find an account with this email address. Please check your email or sign up.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Please contact support for assistance.',
  'auth/too-many-requests': 'Too many unsuccessful attempts. Please wait a few minutes before trying again.',
  'auth/network-request-failed': 'Unable to connect. Please check your internet connection and try again.',
  
  // Signup/Registration Errors
  'auth/email-already-in-use': 'An account with this email already exists. Try logging in instead.',
  'auth/weak-password': 'Please choose a stronger password. Use at least 8 characters with uppercase, lowercase, and numbers.',
  'auth/operation-not-allowed': 'Account creation is currently unavailable. Please try again later or contact support.',
  
  // Password Reset Errors
  'auth/expired-action-code': 'This link has expired. Please request a new password reset link.',
  'auth/invalid-action-code': 'This link is no longer valid. Please request a new password reset link.',
  'auth/user-token-expired': 'Your session has expired. Please log in again.',
  
  // Token/Session Errors
  'auth/requires-recent-login': 'For your security, please log in again to complete this action.',
  'auth/invalid-user-token': 'Your session is no longer valid. Please log in again.',
  'auth/null-user': 'No user is currently logged in. Please log in to continue.',
  
  // General Errors
  'auth/internal-error': 'Something went wrong on our end. Please try again in a moment.',
  'auth/quota-exceeded': 'We\'re experiencing high demand. Please try again shortly.',
  'auth/unauthorized-continue-uri': 'There was an issue with the redirect. Please try again.',
  'auth/invalid-continue-uri': 'There was an issue with the redirect. Please try again.',

  // MFA / SMS verification
  'auth/invalid-verification-code': "That code doesn't match. Check the text message and try again.",
  'auth/code-expired': 'This code has expired. Tap Send a new code to get another one.',
  'auth/invalid-phone-number': 'Enter a valid mobile number, including country code (e.g. +1 555 123 4567).',
  'auth/captcha-check-failed':
    'Security check failed. Add this site hostname (e.g. 127.0.0.1) to Firebase Authorized domains and to the reCAPTCHA Enterprise key domains in Google Cloud Console, then refresh.',
  'auth/invalid-app-credential':
    'Phone verification could not be verified. Open the app at 127.0.0.1 (not localhost), refresh, and try again. For local testing, use Firebase test phone numbers or the Auth emulator.',
  'auth/session-expired': 'Your session has expired. Please log in again.',
  'auth/missing-multi-factor-info': 'Multi-factor verification is required. Please try signing in again.',
  'auth/second-factor-already-in-use': 'This phone number is already registered for your account.',
}

/**
 * Success messages for various auth operations
 */
export const AUTH_SUCCESS_MESSAGES = {
  login: {
    title: 'Welcome back!',
    description: 'You\'ve successfully logged in to your account.',
  },
  signup: {
    title: 'Account created!',
    description: 'Welcome! Your account has been successfully created.',
  },
  passwordResetSent: {
    title: 'Check your email',
    description: 'We\'ve sent password reset instructions to your email address.',
  },
  passwordResetComplete: {
    title: 'Password updated!',
    description: 'Your password has been successfully changed. You can now log in with your new password.',
  },
  emailVerificationSent: {
    title: 'Verification email sent',
    description: 'Please check your email and click the verification link to continue.',
  },
  profileUpdated: {
    title: 'Profile updated',
    description: 'Your profile information has been successfully saved.',
  },
  logout: {
    title: 'Logged out',
    description: 'You\'ve been successfully logged out. See you soon!',
  },
}

/**
 * Validation error messages
 */
export const VALIDATION_MESSAGES = {
  email: {
    required: 'Please enter your email address.',
    invalid: 'Please enter a valid email address.',
  },
  password: {
    required: 'Please enter your password.',
    tooShort: 'Password must be at least 8 characters long.',
    missingLowercase: 'Password must include at least one lowercase letter.',
    missingUppercase: 'Password must include at least one uppercase letter.',
    missingNumber: 'Password must include at least one number.',
    tooWeak: 'Please choose a stronger password.',
  },
  confirmPassword: {
    required: 'Please confirm your password.',
    mismatch: 'Passwords don\'t match. Please try again.',
  },
  fullName: {
    required: 'Please enter your full name.',
    tooShort: 'Please enter your full name (at least 2 characters).',
    invalid: 'Please use only letters and spaces in your name.',
  },
  form: {
    incomplete: 'Please complete all required fields.',
    invalid: 'Please fix the errors in the form before continuing.',
  },
}

/**
 * Get a user-friendly error message for a Firebase auth error
 * 
 * @param error - The error object from Firebase or a custom error
 * @returns User-friendly error message
 */
export function getAuthErrorMessage(error: any): string {
  if (!error) {
    return 'An unexpected error occurred. Please try again.'
  }

  // Check if it's a Firebase error with a code
  if (error.code && AUTH_ERROR_MESSAGES[error.code]) {
    return AUTH_ERROR_MESSAGES[error.code]
  }

  if (error.message) {
    const msg = String(error.message)
    if (msg.includes('CAPTCHA_CHECK_FAILED') || msg.includes('Hostname match not found')) {
      return AUTH_ERROR_MESSAGES['auth/captcha-check-failed']
    }
    if (msg.includes('INVALID_APP_CREDENTIAL') || msg.includes('invalid-app-credential')) {
      return AUTH_ERROR_MESSAGES['auth/invalid-app-credential']
    }
    if (msg.includes('region enabled by the app developer') || msg.includes('SMS unable to be sent')) {
      return 'SMS is not enabled for this country in Firebase. Ask an admin to add your region under Authentication → Settings → SMS region policy.'
    }
    if (!msg.includes('auth/') && !msg.includes('Firebase')) {
      return msg
    }
  }

  // Fallback to generic message
  return 'Something went wrong. Please try again or contact support if the problem persists.'
}

/**
 * Get validation error message for form fields
 * 
 * @param field - The form field name
 * @param validationType - The type of validation that failed
 * @returns User-friendly validation message
 */
export function getValidationMessage(
  field: 'email' | 'password' | 'confirmPassword' | 'fullName' | 'form',
  validationType: string
): string {
  const fieldMessages = VALIDATION_MESSAGES[field] as any
  return fieldMessages[validationType] || `Please enter a valid ${field}.`
}

/**
 * Format success message for toast notifications
 * 
 * @param operation - The auth operation that succeeded
 * @returns Formatted success message object
 */
export function getSuccessMessage(operation: keyof typeof AUTH_SUCCESS_MESSAGES) {
  return AUTH_SUCCESS_MESSAGES[operation] || {
    title: 'Success',
    description: 'Operation completed successfully.',
  }
}

/**
 * Check if error is a network-related error
 */
export function isNetworkError(error: any): boolean {
  return (
    error?.code === 'auth/network-request-failed' ||
    error?.message?.toLowerCase().includes('network') ||
    error?.message?.toLowerCase().includes('connection')
  )
}

/**
 * Check if error requires user to log in again
 */
export function requiresReauth(error: any): boolean {
  return (
    error?.code === 'auth/requires-recent-login' ||
    error?.code === 'auth/user-token-expired' ||
    error?.code === 'auth/invalid-user-token'
  )
}

/**
 * Check if error is related to expired/invalid action codes (password reset links, etc.)
 */
export function isExpiredActionCode(error: any): boolean {
  return (
    error?.code === 'auth/expired-action-code' ||
    error?.code === 'auth/invalid-action-code'
  )
}
