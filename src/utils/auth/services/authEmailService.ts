import type { User as FirebaseUser } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { axiosClientWithoutAuth } from '@/lib/axios'
import { getAuthErrorMessage } from '../helpers/errorMessages'

function assertEmailSent(data: { success?: unknown } | null | undefined): void {
  if (data?.success !== true) throw new Error('Email delivery could not be confirmed. Please try again.')
}

function emailError(cause: unknown): Error {
  const error = cause as { code?: string; response?: { status?: number; data?: { error?: string } } }
  const status = error?.response?.status
  if (status === 429) return new Error('Too many email requests. Please wait a few minutes before trying again.')
  if (status && status >= 500) return new Error('Email delivery is temporarily unavailable. Please try again in a few minutes.')
  if (status === 401) return new Error('Your session has expired. Please sign in again.')
  if (error?.code === 'ERR_NETWORK' || error?.code === 'ECONNABORTED') return new Error('Unable to connect. Please check your internet connection and try again.')
  return new Error(error?.response?.data?.error || getAuthErrorMessage(cause))
}

export async function sendCustomVerificationEmail(user: FirebaseUser, continuePath?: string): Promise<void> {
  try {
    if (auth.currentUser?.uid !== user.uid) throw new Error('The signed-in account changed. Please sign in again.')
    const token = await user.getIdToken()
    if (auth.currentUser?.uid !== user.uid) throw new Error('The signed-in account changed. Please sign in again.')
    // New identities can request verification before an application profile or MFA enrollment exists.
    const { data } = await axiosClientWithoutAuth.post('/authEmail/verification', continuePath ? { continuePath } : {}, {
      headers: { Authorization: `Bearer ${token}` },
    })
    assertEmailSent(data)
  } catch (cause) {
    throw emailError(cause)
  }
}

export async function sendCustomPasswordResetEmail(email: string): Promise<void> {
  try {
    const { data } = await axiosClientWithoutAuth.post('/authEmail/password-reset', { email })
    assertEmailSent(data)
  } catch (cause) {
    throw emailError(cause)
  }
}
