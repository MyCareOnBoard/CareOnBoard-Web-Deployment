import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { applyActionCode, checkActionCode, reload } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { clearAuthCache } from '@/lib/axios'
import { Routes } from '@/routes/constants'
import { Button } from '@/components/ui/button'
import { AuthStepHeader } from '@/pages/auth/components/AuthStepHeader'
import { AuthStatusBanner } from '@/pages/auth/components/AuthStatusBanner'
import { authPrimaryButtonClass } from '@/pages/auth/components/authFormStyles'

const APP_ORIGIN = 'https://app.joincareonboard.com'

function continuationPath(value: string | null): string {
  if (!value || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return Routes.auth.login
  try {
    const url = new URL(value, APP_ORIGIN)
    if (url.origin !== APP_ORIGIN || url.username || url.password || url.pathname.startsWith('//')) return Routes.auth.login
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return Routes.auth.login
  }
}

function actionError(cause: unknown): string {
  const code = (cause as { code?: string })?.code
  if (code === 'auth/network-request-failed') return 'Check your connection and try again.'
  if (code === 'auth/expired-action-code') return 'This email link has expired. Return to your account and request a new email.'
  return 'This email link is invalid or has already been used. Return to your account and request a new email.'
}

export default function AuthActionPage() {
  const [params] = useSearchParams()
  const mode = params.get('mode')
  const code = params.get('oobCode')
  const continuePath = continuationPath(params.get('continueUrl'))
  const recovery = mode === 'recoverEmail'
  const valid = !!code && code.length <= 2048 && ['resetPassword', 'verifyEmail', 'recoverEmail'].includes(mode || '')
  const [state, setState] = useState<'checking' | 'ready' | 'complete' | 'invalid'>('checking')
  const [email, setEmail] = useState('')
  const [previousEmail, setPreviousEmail] = useState('')
  const [error, setError] = useState('')
  const [retryable, setRetryable] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const generation = useRef(0)

  useEffect(() => {
    const current = ++generation.current
    pending.current = false
    setBusy(false)
    setError('')
    setEmail('')
    setPreviousEmail('')
    setRetryable(false)
    if (!valid) {
      setState('invalid')
      setError(actionError(null))
      return
    }
    if (mode === 'resetPassword') return
    setState('checking')
    void checkActionCode(auth, code!).then(info => {
      if (generation.current !== current) return
      if (info.operation !== (recovery ? 'RECOVER_EMAIL' : 'VERIFY_EMAIL')) {
        setState('invalid')
        setError(actionError(null))
        return
      }
      setEmail(info.data.email || '')
      setPreviousEmail(info.data.previousEmail || '')
      setState('ready')
    }).catch(cause => {
      if (generation.current !== current) return
      setState('invalid')
      setRetryable((cause as { code?: string })?.code === 'auth/network-request-failed')
      setError(actionError(cause))
    })
    return () => { generation.current++ }
  }, [attempt, code, mode, recovery, valid])

  const confirm = async () => {
    if (!code || state !== 'ready' || pending.current) return
    const current = generation.current
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await applyActionCode(auth, code)
      clearAuthCache()
      // Redemption succeeds even if refreshing a local session is temporarily unavailable.
      try {
        await auth.authStateReady()
        const user = auth.currentUser
        const sessionEmail = user?.email?.toLowerCase()
        if (user && sessionEmail && (sessionEmail === email.toLowerCase() || (recovery && sessionEmail === previousEmail.toLowerCase()))) {
          await reload(user)
          if (auth.currentUser?.uid === user.uid) await user.getIdToken(true)
        }
      } catch { /* The invitation page can retry its existing identity refresh. */ }
      if (generation.current === current) setState('complete')
    } catch (cause) {
      if (generation.current === current) setError(actionError(cause))
    } finally {
      if (generation.current === current) {
        pending.current = false
        setBusy(false)
      }
    }
  }

  if (valid && mode === 'resetPassword') {
    return <Navigate replace to={`${Routes.auth.resetPassword}?${params.toString()}`} />
  }
  if (state === 'checking') return <AuthStatusBanner message="Checking your email link…" />

  const complete = state === 'complete'
  return <section className="space-y-6" aria-label="Email account action">
    <AuthStepHeader
      title={complete ? recovery ? 'Email restored' : 'Email verified' : recovery ? 'Restore your email' : 'Verify your email'}
      description={complete ? recovery ? 'Your original email address has been restored.' : 'Your email address has been verified. You can continue to your account.' : state === 'ready' ? recovery ? 'Confirm to restore the original email address on your account.' : 'Confirm your email address to continue using CareOnboard.' : retryable ? 'We could not check your link. Please try again.' : 'Request a new email to continue.'}
    />
    {email && !complete && <p className="break-all text-sm font-medium text-slate-700">{email}</p>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {retryable && <Button className={authPrimaryButtonClass} onClick={() => setAttempt(value => value + 1)}>Try again</Button>}
    {state === 'ready' && <Button className={authPrimaryButtonClass} disabled={busy} aria-busy={busy} onClick={() => void confirm()}>
      {busy ? 'Please wait…' : recovery ? 'Restore email' : 'Verify email'}
    </Button>}
    <Button asChild className={complete ? authPrimaryButtonClass : 'w-full'} variant={complete ? 'default' : 'outline'}>
      <Link to={continuePath}>{complete ? 'Continue' : 'Back to account'}</Link>
    </Button>
  </section>
}
