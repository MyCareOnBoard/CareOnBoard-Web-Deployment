import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Routes } from '@/routes/constants'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '@/store/redux/store'
import { useAuth } from '@/utils/auth'
import { MFA_COPY } from '@/utils/auth/copy/mfaCopy'
import { getAuthErrorMessage } from '@/utils/auth/helpers/errorMessages'
import { completePostLogin } from '@/utils/auth/helpers/postLogin'
import MfaCodeForm from '@/pages/auth/components/MfaCodeForm'
import { RecaptchaAnchor } from '@/pages/auth/components/RecaptchaAnchor'
import { AuthStepHeader } from '@/pages/auth/components/AuthStepHeader'
import { AuthStatusBanner } from '@/pages/auth/components/AuthStatusBanner'
import { AuthLegalFootnote } from '@/pages/auth/components/AuthLegalFootnote'
import { authPrimaryButtonClass } from '@/pages/auth/components/authFormStyles'
import {
  clearRecaptchaVerifier,
  completeMfaSignIn,
  createRecaptchaVerifier,
  startMfaSignInChallenge,
} from '@/utils/auth/services/mfaService'
import {
  clearMfaResolverSession,
  getMfaResolverSession,
} from '@/utils/auth/services/mfaSessionStore'

const RECAPTCHA_CONTAINER_ID = 'recaptcha-mfa-challenge'

type ChallengePhase = 'sending' | 'enter-code' | 'send-failed'

export default function MfaChallengePage() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { toast } = useToast()
  const { logout } = useAuth()

  const [verificationId, setVerificationId] = useState<string | null>(null)
  const [phase, setPhase] = useState<ChallengePhase>('sending')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [maskedPhone, setMaskedPhone] = useState('your phone')
  const autoSendStarted = useRef(false)
  const completedRef = useRef(false)

  const mfaSession = getMfaResolverSession()

  useEffect(() => {
    if (mfaSession) {
      setMaskedPhone(mfaSession.maskedPhone)
      return () => clearRecaptchaVerifier()
    }

    if (!completedRef.current) {
      toast({
        title: 'Sign-in timed out',
        description: MFA_COPY.errors.sessionExpired,
        variant: 'destructive',
      })
      navigate(Routes.auth.login, { replace: true })
    }
  }, [mfaSession, navigate, toast])

  const sendCode = useCallback(async () => {
    const session = getMfaResolverSession()
    if (!session) {
      setError(MFA_COPY.errors.sessionExpired)
      setPhase('send-failed')
      return
    }
    setError('')
    setSending(true)
    setPhase('sending')
    try {
      const recaptcha = await createRecaptchaVerifier(RECAPTCHA_CONTAINER_ID)
      const id = await startMfaSignInChallenge(session.resolver, recaptcha)
      setVerificationId(id)
      setPhase('enter-code')
    } catch (e: unknown) {
      setError(getAuthErrorMessage(e))
      setPhase('send-failed')
    } finally {
      setSending(false)
    }
  }, [])

  useEffect(() => {
    if (!mfaSession || autoSendStarted.current) return
    autoSendStarted.current = true
    void sendCode()
  }, [mfaSession, sendCode])

  const handleVerify = async (code: string) => {
    const session = getMfaResolverSession()
    if (!session || !verificationId) return
    completedRef.current = true
    setVerifying(true)
    setError('')
    try {
      await completeMfaSignIn(session.resolver, verificationId, code)
      await completePostLogin(dispatch, navigate, toast)
      clearMfaResolverSession()
    } catch (e: unknown) {
      completedRef.current = false
      setError(getAuthErrorMessage(e))
    } finally {
      setVerifying(false)
    }
  }

  const handleDifferentAccount = async () => {
    clearMfaResolverSession()
    clearRecaptchaVerifier()
    await logout()
    navigate(Routes.auth.login, { replace: true })
  }

  if (!mfaSession) {
    return null
  }

  const headerDescription =
    phase === 'enter-code'
      ? MFA_COPY.challenge.codeSent(maskedPhone)
      : phase === 'send-failed'
        ? MFA_COPY.challenge.sendFailed
        : undefined

  return (
    <div className="relative flex w-full min-w-0 flex-col gap-8 overflow-x-hidden">
      <AuthStepHeader title={MFA_COPY.challenge.title} description={headerDescription} />

      <RecaptchaAnchor id={RECAPTCHA_CONTAINER_ID} />

      {phase === 'sending' && (
        <AuthStatusBanner message={MFA_COPY.challenge.sending(maskedPhone)} />
      )}

      {phase === 'send-failed' && (
        <div className="space-y-4">
          <p className="text-sm text-red-600" role="alert" aria-live="polite">
            {error}
          </p>
          <Button
            type="button"
            onClick={() => void sendCode()}
            disabled={sending}
            className={authPrimaryButtonClass}
          >
            {MFA_COPY.challenge.sendCode}
          </Button>
        </div>
      )}

      {phase === 'enter-code' && (
        <MfaCodeForm
          codeSent
          onVerify={handleVerify}
          onResend={sendCode}
          verifyLabel={MFA_COPY.challenge.verifySignIn}
          verifying={verifying}
          sending={sending}
          error={error}
          resendCopy={{
            resend: MFA_COPY.challenge.resend,
            resendCountdown: MFA_COPY.challenge.resendCountdown,
          }}
        />
      )}

      <footer className="flex flex-col gap-4 border-t border-[#e5eef5] pt-6">
        <AuthLegalFootnote />
        <Button
          type="button"
          variant="ghost"
          onClick={() => void handleDifferentAccount()}
          className="w-full text-slate-600 hover:text-slate-900"
        >
          {MFA_COPY.challenge.useDifferentAccount}
        </Button>
      </footer>
    </div>
  )
}
