import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ButtonLoader } from '@/components/ui/loader'
import { useToast } from '@/hooks/use-toast'
import { auth } from '@/lib/firebase'
import { Routes } from '@/routes/constants'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '@/store/redux/store'
import { MFA_COPY } from '@/utils/auth/copy/mfaCopy'
import { getAuthErrorMessage } from '@/utils/auth/helpers/errorMessages'
import { completePostLogin } from '@/utils/auth/helpers/postLogin'
import MfaCodeForm from '@/pages/auth/components/MfaCodeForm'
import { RecaptchaAnchor } from '@/pages/auth/components/RecaptchaAnchor'
import { AuthStepHeader } from '@/pages/auth/components/AuthStepHeader'
import { AuthLegalFootnote } from '@/pages/auth/components/AuthLegalFootnote'
import { authInputClass, authPrimaryButtonClass } from '@/pages/auth/components/authFormStyles'
import {
  clearRecaptchaVerifier,
  completeMfaEnrollment,
  createRecaptchaVerifier,
  hasEnrolledMfa,
  startMfaEnrollment,
} from '@/utils/auth/services/mfaService'
import { isValidPhoneNumber } from 'react-phone-number-input'

const PhoneInput = lazy(() =>
  import('react-phone-number-input').then((mod) => ({ default: mod.default }))
)
import 'react-phone-number-input/style.css'

const RECAPTCHA_CONTAINER_ID = 'recaptcha-mfa-enroll'

export default function MfaEnrollPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { toast } = useToast()

  const [phone, setPhone] = useState<string | undefined>()
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [verificationId, setVerificationId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const check = async () => {
      await auth.authStateReady?.()
      if (!auth.currentUser) {
        navigate(Routes.auth.login, { replace: true })
        return
      }
      if (await hasEnrolledMfa(auth.currentUser)) {
        navigate(Routes.auth.login, { replace: true })
      }
    }
    void check()
    return () => clearRecaptchaVerifier()
  }, [navigate])

  const requestVerificationCode = useCallback(async () => {
    if (!phone || !isValidPhoneNumber(phone)) {
      setError(MFA_COPY.errors.phoneRequired)
      return
    }
    setError('')
    setSending(true)
    try {
      const recaptcha = await createRecaptchaVerifier(RECAPTCHA_CONTAINER_ID)
      const id = await startMfaEnrollment(phone, recaptcha)
      setVerificationId(id)
      setStep('code')
    } catch (e: unknown) {
      setError(getAuthErrorMessage(e))
    } finally {
      setSending(false)
    }
  }, [phone])

  const handleVerify = async (code: string) => {
    if (!verificationId) return
    setVerifying(true)
    setError('')
    try {
      await completeMfaEnrollment(verificationId, code)
      toast({
        title: 'Two-step sign-in is on',
        description: 'We will text you a code when you sign in.',
      })
      await completePostLogin(dispatch, navigate, toast)
    } catch (e: unknown) {
      setError(getAuthErrorMessage(e))
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="relative flex w-full min-w-0 flex-col gap-8 overflow-x-hidden">
      <AuthStepHeader
        title={MFA_COPY.enroll.title}
        description={
          step === 'phone'
            ? MFA_COPY.enroll.subtitle
            : 'Enter the code we sent to your phone to finish setup.'
        }
      />

      <RecaptchaAnchor id={RECAPTCHA_CONTAINER_ID} />

      {step === 'phone' && (
        <div className="space-y-5">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="mfa-phone" className="text-sm font-medium text-slate-700">
              {MFA_COPY.enroll.phoneLabel}
            </Label>
            <div className="max-w-full overflow-hidden">
              <Suspense
                fallback={
                  <div className="h-12 rounded-2xl bg-slate-100 animate-pulse" aria-hidden />
                }
              >
                <PhoneInput
                  id="mfa-phone"
                  international
                  defaultCountry="US"
                  value={phone}
                  onChange={setPhone}
                  className={`PhoneInput flex h-12 w-full max-w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-base ${authInputClass}`}
                />
              </Suspense>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{MFA_COPY.enroll.phoneHelp}</p>
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert" aria-live="polite">
              {error}
            </p>
          )}

          <Button
            type="button"
            disabled={sending}
            onClick={() => void requestVerificationCode()}
            className={authPrimaryButtonClass}
          >
            {sending ? (
              <span className="flex items-center justify-center gap-2">
                <ButtonLoader />
                {MFA_COPY.loading.sendingCode}
              </span>
            ) : (
              MFA_COPY.enroll.sendCode
            )}
          </Button>

          <AuthLegalFootnote />
        </div>
      )}

      {step === 'code' && (
        <>
          <MfaCodeForm
            codeSent
            onVerify={handleVerify}
            onResend={requestVerificationCode}
            verifyLabel={MFA_COPY.enroll.verifyContinue}
            verifying={verifying}
            sending={sending}
            error={error}
          />
          <AuthLegalFootnote />
        </>
      )}
    </div>
  )
}
