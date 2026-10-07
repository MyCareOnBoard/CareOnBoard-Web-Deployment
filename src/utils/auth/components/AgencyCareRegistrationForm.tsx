import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { createUserWithEmailAndPassword, reload, sendEmailVerification, updateProfile } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import axiosClient, { clearAuthCache } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/utils/auth'
import { hasEnrolledMfa } from '@/utils/auth/services/mfaService'
import { authRouteWithReturnTo } from '@/utils/auth/helpers/agencyCareReturnTo'
import { Routes } from '@/routes/constants'
import { authInputClass, authPrimaryButtonClass } from '@/pages/auth/components/authFormStyles'

interface AgencyCareRegistrationFormProps {
  token: string
  needsOrganization?: boolean
  onRegistered: () => void | Promise<void>
}

/** Registers only through the invitation contract; existing identities keep their product role. */
export function AgencyCareRegistrationForm(props: AgencyCareRegistrationFormProps) {
  return <RegistrationFields key={props.token} {...props} />
}

function RegistrationFields({ token, needsOrganization = false, onRegistered }: AgencyCareRegistrationFormProps) {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(auth.currentUser?.displayName || '')
  const [agencyName, setAgencyName] = useState('')
  const [email, setEmail] = useState(auth.currentUser?.email || '')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [stage, setStage] = useState<'create' | 'verify'>(auth.currentUser ? 'verify' : 'create')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const operationId = useRef(crypto.randomUUID())
  const returnTo = `/agency-care/invitations/${encodeURIComponent(token)}`

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (pending.current) return
    if (!consent || !fullName.trim() || (needsOrganization && !agencyName.trim())) {
      setError('Enter your details and agree to the terms and privacy policy to continue.')
      return
    }
    pending.current = true
    setBusy(true)
    setError('')
    try {
      if (stage === 'create') {
        const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password)
        if (!mounted.current || auth.currentUser?.uid !== user.uid) return
        await updateProfile(user, { displayName: fullName.trim() })
        if (!mounted.current || auth.currentUser?.uid !== user.uid) return
        setStage('verify')
        await sendEmailVerification(user)
        return
      }
      const current = auth.currentUser
      if (!current) throw new Error('Sign in again to continue this invitation.')
      await reload(current)
      if (!mounted.current || auth.currentUser?.uid !== current.uid) return
      if (!current.emailVerified) throw new Error('Verify your email using the link we sent, then check again.')
      await current.getIdToken?.(true)
      if (!mounted.current || auth.currentUser?.uid !== current.uid) return
      clearAuthCache()
      await axiosClient.post(`/agencyCare/invitations/${encodeURIComponent(token)}/register`, {
        ...(needsOrganization ? { organization: { name: agencyName.trim(), contactName: fullName.trim() } } : {}),
        termsVersion: '2026-10-07',
        privacyVersion: '2026-10-07',
        operationId: operationId.current,
      })
      if (!mounted.current || auth.currentUser?.uid !== current.uid) return
      await refreshProfile()
      const enrolled = await hasEnrolledMfa(current)
      if (!mounted.current || auth.currentUser?.uid !== current.uid) return
      if (!enrolled) {
        navigate(authRouteWithReturnTo(Routes.auth.mfaEnroll, returnTo), { replace: true })
        return
      }
      await onRegistered()
    } catch (cause) {
      if (!mounted.current) return
      const message = (cause as { response?: { data?: { error?: string } } })?.response?.data?.error
      const duplicate = (cause as { code?: string })?.code === 'auth/email-already-in-use'
      setError(duplicate ? 'An account already uses this email. Sign in to continue the invitation.' : message || (cause instanceof Error ? cause.message : 'Unable to continue. Please try again.'))
    } finally {
      pending.current = false
      if (mounted.current) setBusy(false)
    }
  }

  return <form onSubmit={submit} className="space-y-4">
    <div className="space-y-2"><Label htmlFor="care-register-name">Full name</Label><Input id="care-register-name" autoComplete="name" required value={fullName} onChange={(event) => setFullName(event.target.value)} className={authInputClass} /></div>
    {needsOrganization && <div className="space-y-2"><Label htmlFor="care-register-agency">Agency name</Label><Input id="care-register-agency" autoComplete="organization" required value={agencyName} onChange={(event) => setAgencyName(event.target.value)} className={authInputClass} /></div>}
    {stage === 'create' ? <>
      <div className="space-y-2"><Label htmlFor="care-register-email">Email</Label><Input id="care-register-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={authInputClass} /></div>
      <div className="space-y-2"><Label htmlFor="care-register-password">Password</Label><Input id="care-register-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className={authInputClass} /></div>
    </> : <p className="text-sm text-slate-600">Continue as {auth.currentUser?.email}. {auth.currentUser?.emailVerified ? 'Your email is verified.' : 'Open the verification link in your email, then check below.'}</p>}
    <label className="flex items-start gap-2 text-sm text-slate-600"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 accent-[#00B4B8]" />I agree to the Agency Care terms and privacy policy (October 7, 2026).</label>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <p className="text-sm text-slate-600">Already have an account? <Link to={authRouteWithReturnTo(Routes.auth.login, returnTo)} className="text-[#00B4B8] hover:underline">Sign in</Link></p>
    <Button type="submit" disabled={busy} className={authPrimaryButtonClass}>{busy ? 'Please wait…' : stage === 'create' ? 'Create account' : auth.currentUser?.emailVerified ? 'Continue with this account' : 'Check email verification'}</Button>
    {stage === 'verify' && !auth.currentUser?.emailVerified && <Button type="button" variant="outline" disabled={busy} onClick={async () => {
      if (!auth.currentUser || pending.current) return
      pending.current = true
      setBusy(true)
      setError('')
      try { await sendEmailVerification(auth.currentUser) } catch { setError('Unable to resend the verification email. Please try again.') } finally { pending.current = false; setBusy(false) }
    }}>Resend verification email</Button>}
  </form>
}
