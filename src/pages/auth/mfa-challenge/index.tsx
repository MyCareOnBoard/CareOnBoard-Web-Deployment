import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { ButtonLoader } from '@/components/ui/loader'
import { useToast } from '@/hooks/use-toast'
import { Routes } from '@/routes/constants'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '@/store/redux/store'
import { useAuth } from '@/utils/auth'
import { MFA_COPY } from '@/utils/auth/copy/mfaCopy'
import { getAuthErrorMessage } from '@/utils/auth/helpers/errorMessages'
import { completePostLogin } from '@/utils/auth/helpers/postLogin'
import MfaCodeForm from '@/pages/auth/components/MfaCodeForm'
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

export default function MfaChallengePage() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { toast } = useToast()
  const { logout } = useAuth()

  const [verificationId, setVerificationId] = useState<string | null>(null)
  const [codeSent, setCodeSent] = useState(false)
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
        title: 'Sign-in expired',
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
      return
    }
    setError('')
    setSending(true)
    try {
      const recaptcha = await createRecaptchaVerifier(RECAPTCHA_CONTAINER_ID)
      const id = await startMfaSignInChallenge(session.resolver, recaptcha)
      setVerificationId(id)
      setCodeSent(true)
    } catch (e: unknown) {
      setError(getAuthErrorMessage(e))
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

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
          {MFA_COPY.challenge.title}
        </h2>
        <p className="text-sm sm:text-base text-slate-500">
          {codeSent
            ? MFA_COPY.challenge.subtitle(maskedPhone)
            : MFA_COPY.challenge.autoSending(maskedPhone)}
        </p>
      </div>

      <div id={RECAPTCHA_CONTAINER_ID} />

      {!codeSent && sending && (
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <ButtonLoader />
          {MFA_COPY.loading.sending}
        </p>
      )}

      {!codeSent && !sending && error && (
        <>
          <p className="text-sm text-red-600" role="alert" aria-live="polite">
            {error}
          </p>
          <Button
            type="button"
            onClick={() => void sendCode()}
            className="w-full h-12 bg-[#00B4B8] hover:bg-[#148a9c] text-white rounded-2xl text-base font-semibold"
          >
            {MFA_COPY.challenge.sendCode}
          </Button>
        </>
      )}

      <MfaCodeForm
        codeSent={codeSent}
        onVerify={handleVerify}
        onResend={sendCode}
        verifyLabel={MFA_COPY.challenge.verifySignIn}
        verifying={verifying}
        sending={sending}
        error={codeSent ? error : undefined}
      />

      <Button
        type="button"
        variant="ghost"
        onClick={() => void handleDifferentAccount()}
        className="w-full text-slate-600"
      >
        {MFA_COPY.challenge.useDifferentAccount}
      </Button>
    </div>
  )
}
