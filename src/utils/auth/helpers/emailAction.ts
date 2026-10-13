import { getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, initializeAuth, inMemoryPersistence, type Auth } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Routes } from '@/routes/constants'

const APP_ORIGIN = 'https://app.joincareonboard.com'
export const EMAIL_ACTION_OPERATIONS = {
  resetPassword: 'PASSWORD_RESET',
  verifyEmail: 'VERIFY_EMAIL',
  recoverEmail: 'RECOVER_EMAIL',
  revertSecondFactorAddition: 'REVERT_SECOND_FACTOR_ADDITION',
  verifyAndChangeEmail: 'VERIFY_AND_CHANGE_EMAIL',
  signIn: 'EMAIL_SIGNIN',
} as const

export function continuationPath(value: string | null): string {
  if (!value || value.length > 8192 || /[\\\u0000-\u0020\u007f]/.test(value)) return Routes.auth.login
  try {
    if (/[\\\u0000-\u0020\u007f]/.test(decodeURIComponent(value))) return Routes.auth.login
    const url = new URL(value, APP_ORIGIN)
    const rawPath = value.replace(/^https:\/\/app\.joincareonboard\.com(?=\/|$)/, '').split(/[?#]/, 1)[0]
    if (url.origin !== APP_ORIGIN || url.username || url.password || rawPath !== url.pathname || /%/.test(rawPath)) return Routes.auth.login
    const authPath = ([Routes.auth.login, Routes.auth.familyLogin, Routes.auth.forgotPassword] as string[]).includes(url.pathname)
    const carePath = /^\/agency-care(?:\/(?:clients|review-queue|reports|recovery|settings|notifications)|\/networks\/[A-Za-z0-9_-]+(?:\/(?:overview|team|conversations|documents|updates|activity))?|\/invitations\/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?)?\/?$/.test(url.pathname)
    if ((!authPath && !carePath) || (authPath && (url.search || url.hash))) return Routes.auth.login
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return Routes.auth.login
  }
}

export function emailActionProblem(params: URLSearchParams): string {
  for (const name of ['mode', 'oobCode', 'apiKey', 'continueUrl', 'lang', 'tenantId']) {
    if (params.getAll(name).length > 1) return 'This email link is invalid. Request a new email.'
  }
  const mode = params.get('mode')
  const code = params.get('oobCode')
  if (!mode || !code) return 'This email link is missing its action or code. Request a new email.'
  if (!Object.hasOwn(EMAIL_ACTION_OPERATIONS, mode)) return 'This email action is not supported. Return to your account.'
  if (!/^[A-Za-z0-9_-]{1,2048}$/.test(code)) return 'This email link is invalid. Request a new email.'
  if (auth.app.options.projectId !== 'care-on-board' ||
      (auth.app.options.messagingSenderId && auth.app.options.messagingSenderId !== '524648993620') ||
      (params.has('apiKey') && params.get('apiKey') !== auth.app.options.apiKey)) {
    return 'This email link is for a different Firebase project or API key. Request a new email.'
  }
  const tenant = params.get('tenantId')
  if ((params.has('tenantId') && !/^[A-Za-z0-9_-]{1,128}$/.test(tenant || '')) ||
      (mode === 'signIn' && (tenant || null) !== auth.tenantId)) return 'This email link cannot be used with this account tenant.'
  if (params.has('lang') && !/^[A-Za-z0-9_-]{1,64}$/.test(params.get('lang') || '')) return 'This email link has an invalid language. Request a new email.'
  return ''
}

const actionAuths = new Map<string, Auth>()

export function getEmailActionAuth(params: URLSearchParams): Auth {
  const tenant = params.get('tenantId') || null
  const name = `email-action:${tenant || 'default'}`
  let context = actionAuths.get(name)
  if (!context) {
    const app = getApps().find(app => app.name === name) || initializeApp(auth.app.options, name)
    // Email actions work signed out and must not change the main session's tenant.
    context = initializeAuth(app, { persistence: inMemoryPersistence })
    context.tenantId = tenant
    if (auth.emulatorConfig) connectAuthEmulator(context, `http://${auth.emulatorConfig.host}:${auth.emulatorConfig.port}`, { disableWarnings: true })
    actionAuths.set(name, context)
  }
  context.languageCode = params.get('lang') || 'en'
  return context
}

export function emailActionError(cause: unknown): string {
  const code = (cause as { code?: string })?.code
  if (code === 'auth/network-request-failed') return 'Check your connection and try again.'
  if (code === 'auth/expired-action-code') return 'This email link has expired. Return to your account and request a new email.'
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please wait and try again.'
  return 'This email link is invalid or has already been used. Return to your account and request a new email.'
}
