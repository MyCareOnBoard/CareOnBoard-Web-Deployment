import { useEffect, useRef, useState } from 'react'
import { reload, sendEmailVerification } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { clearAuthCache } from '@/lib/axios'
import { useAuth } from '@/utils/auth/context/AuthContext'
import { Button } from '@/components/ui/button'

/** Verifies the current Firebase identity without applicant onboarding or changing the care URL. */
export function AgencyCareEmailVerification({ onVerified }: { onVerified: () => void }) {
  const { refreshProfile } = useAuth()
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  async function verify(check: boolean) {
    const current = auth.currentUser
    if (!current || pending.current) return
    const stillCurrent = () => mounted.current && auth.currentUser?.uid === current.uid
    pending.current = true
    setBusy(true)
    setError('')
    try {
      if (!check) {
        await sendEmailVerification(current)
        if (stillCurrent()) setSent(true)
        return
      }
      await reload(current)
      if (!stillCurrent()) return
      if (!current.emailVerified) {
        setError('Verify your email using the link in your inbox, then check again.')
        return
      }
      await current.getIdToken(true)
      if (!stillCurrent()) return
      clearAuthCache()
      await refreshProfile()
      if (stillCurrent()) onVerified()
    } catch {
      if (stillCurrent()) setError(check ? 'Could not confirm verification. Check your connection and try again.' : 'Could not send the verification email. Please wait and try again.')
    } finally {
      pending.current = false
      if (mounted.current) setBusy(false)
    }
  }

  return <section className="mx-auto my-8 w-full max-w-xl rounded-xl border border-[#d7dddd] bg-white p-6 text-[#10141a]" aria-label="Agency Care email verification">
    <h2 className="mb-3 text-2xl font-semibold">Verify your email</h2>
    <p className="mb-2 text-sm text-[#596065]">Verify the email on your existing account before opening Agency Care. Your account and current invitation stay in place.</p>
    {auth.currentUser?.email && <p className="mb-5 break-all text-sm font-medium">{auth.currentUser.email}</p>}
    {sent && <p role="status" className="mb-4 text-sm text-[#2d7758]">Verification email sent. Open the link, then return here to check verification.</p>}
    {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" disabled={busy} onClick={() => void verify(false)}>{sent ? 'Resend verification email' : 'Send verification email'}</Button>
      <Button disabled={busy} onClick={() => void verify(true)}>{busy ? 'Please wait…' : 'Check email verification'}</Button>
    </div>
  </section>
}
