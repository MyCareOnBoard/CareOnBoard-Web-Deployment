import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { applyActionCode, checkActionCode, reload, type Auth } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { clearAuthCache } from '@/lib/axios'
import { Routes } from '@/routes/constants'
import { Button } from '@/components/ui/button'
import { AuthStepHeader } from '@/pages/auth/components/AuthStepHeader'
import { AuthStatusBanner } from '@/pages/auth/components/AuthStatusBanner'
import { authPrimaryButtonClass } from '@/pages/auth/components/authFormStyles'
import { continuationPath, EMAIL_ACTION_OPERATIONS, emailActionError, emailActionProblem, getEmailActionAuth } from '@/utils/auth/helpers/emailAction'

const ACTION_TEXT: Record<string, { title: string; description: string; button: string; complete: string; success: string }> = {
  verifyEmail: { title: 'Verify your email', description: 'Confirm your email address to continue using CareOnboard.', button: 'Verify email', complete: 'Email verified', success: 'Your email address has been verified. You can continue to your account.' },
  recoverEmail: { title: 'Restore your email', description: 'Confirm to restore the original email address on your account.', button: 'Restore email', complete: 'Email restored', success: 'Your original email address has been restored. If you did not make this change, reset your password and review your account security.' },
  verifyAndChangeEmail: { title: 'Confirm your new email', description: 'Confirm to verify this address and change the email on your account.', button: 'Confirm email change', complete: 'Email changed', success: 'Your new email address has been verified and saved.' },
  revertSecondFactorAddition: { title: 'Remove an unrecognized factor', description: 'Confirm to reverse the MFA enrollment identified by this email. Only the newly added factor will be removed.', button: 'Remove added factor', complete: 'Added factor removed', success: 'The unrecognized MFA enrollment has been reversed. Reset your password and review your account security.' },
  signIn: { title: 'Continue to family sign-in', description: 'Continue to confirm the email address this sign-in link was sent to.', button: 'Continue to family sign-in', complete: '', success: '' },
}

export default function AuthActionPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const query = params.toString()
  const mode = params.get('mode')
  const code = params.get('oobCode')
  const continuePath = continuationPath(params.get('continueUrl'))
  const recovery = mode === 'recoverEmail'
  const problem = emailActionProblem(params)
  const valid = !problem
  const [state, setState] = useState<'checking' | 'ready' | 'complete' | 'invalid'>('checking')
  const [email, setEmail] = useState('')
  const [previousEmail, setPreviousEmail] = useState('')
  const [factor, setFactor] = useState('')
  const [error, setError] = useState('')
  const [retryable, setRetryable] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const generation = useRef(0)
  const checkedQuery = useRef('')
  const actionAuth = useRef<Auth | null>(null)

  useEffect(() => {
    const current = ++generation.current
    pending.current = false
    checkedQuery.current = ''
    setBusy(false)
    setError('')
    setEmail('')
    setPreviousEmail('')
    setFactor('')
    setRetryable(false)
    if (!valid) {
      setState('invalid')
      setError(problem)
      return
    }
    if (mode === 'resetPassword') return
    setState('checking')
    try { actionAuth.current = getEmailActionAuth(new URLSearchParams(query)) } catch {
      setState('invalid')
      setError('We could not initialize this email action. Please reload and try again.')
      return
    }
    void checkActionCode(actionAuth.current, code!).then(info => {
      if (generation.current !== current) return
      if (info.operation !== EMAIL_ACTION_OPERATIONS[mode as keyof typeof EMAIL_ACTION_OPERATIONS]) {
        setState('invalid')
        setError('This email link is invalid: its action code does not match the requested operation. Request a new email.')
        return
      }
      setEmail(info.data.email || '')
      setPreviousEmail(info.data.previousEmail || '')
      setFactor(info.data.multiFactorInfo?.displayName || info.data.multiFactorInfo?.factorId || '')
      checkedQuery.current = query
      setState('ready')
    }).catch(cause => {
      if (generation.current !== current) return
      setState('invalid')
      setRetryable((cause as { code?: string })?.code === 'auth/network-request-failed')
      setError(emailActionError(cause))
    })
    return () => { generation.current++ }
  }, [attempt, code, mode, problem, query, valid])

  const confirm = async () => {
    if (!code || !actionAuth.current || checkedQuery.current !== query || state !== 'ready' || pending.current) return
    const current = generation.current
    pending.current = true
    setBusy(true)
    setError('')
    if (mode === 'signIn') {
      navigate(`${Routes.auth.familyLogin}?${query}`, { replace: true })
      return
    }
    try {
      await applyActionCode(actionAuth.current, code)
      clearAuthCache()
      // Redemption succeeds even if refreshing a local session is temporarily unavailable.
      try {
        await auth.authStateReady()
        const user = auth.currentUser
        const sessionEmail = user?.email?.toLowerCase()
        if (user && user.tenantId === actionAuth.current.tenantId && sessionEmail && (sessionEmail === email.toLowerCase() || ((recovery || mode === 'verifyAndChangeEmail') && sessionEmail === previousEmail.toLowerCase()))) {
          await reload(user)
          if (auth.currentUser?.uid === user.uid) await user.getIdToken(true)
        }
      } catch { /* The invitation page can retry its existing identity refresh. */ }
      if (generation.current === current) setState('complete')
    } catch (cause) {
      if (generation.current === current) {
        setError(emailActionError(cause))
        if (['auth/expired-action-code', 'auth/invalid-action-code', 'auth/user-disabled'].includes((cause as { code?: string })?.code || '')) setState('invalid')
      }
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
  const text = ACTION_TEXT[mode || ''] || ACTION_TEXT.verifyEmail
  return <section className="space-y-6" aria-label="Email account action">
    <AuthStepHeader
      title={complete ? text.complete : text.title}
      description={complete ? text.success : state === 'ready' ? text.description : retryable ? 'We could not check your link. Please try again.' : 'Request a new email to continue.'}
    />
    {email && !complete && <p className="break-all text-sm font-medium text-slate-700">{email}</p>}
    {factor && !complete && <p className="break-all text-sm text-slate-700">Added factor: {factor}</p>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {retryable && <Button className={authPrimaryButtonClass} onClick={() => setAttempt(value => value + 1)}>Try again</Button>}
    {state === 'ready' && <Button className={authPrimaryButtonClass} disabled={busy} aria-busy={busy} onClick={() => void confirm()}>
      {busy ? 'Please wait…' : text.button}
    </Button>}
    <Button asChild className={complete ? authPrimaryButtonClass : 'w-full'} variant={complete ? 'default' : 'outline'}>
      <Link to={continuePath}>{complete ? 'Continue' : 'Back to account'}</Link>
    </Button>
  </section>
}
